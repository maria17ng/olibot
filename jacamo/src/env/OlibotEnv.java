package env;

import cartago.*;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Queue;
import java.util.concurrent.*;
import java.util.regex.*;
import java.util.logging.Logger;

/**
 * OlibotEnv — CArtAgO Environment Artifact
 *
 * Bridge between the Python FastAPI backend and the Jason BDI agent.
 * Embeds a lightweight HTTP server on the configured port.
 *
 * ── Communication protocol ───────────────────────────────────────────
 *
 *   1. Python sends a percept:
 *        POST /percept  {student_id, intent, entities, success_rate,
 *                        current_beliefs, current_topic, is_correct}
 *      → OlibotEnv parses the JSON and updates observable properties.
 *      → The Jason agent sees the updated beliefs and fires !respond(...).
 *
 *   2. Jason agent produces a decision:
 *        Jason plan calls the CArtAgO operation:
 *          postDecision(action, hintLevel, topicId, instruction,
 *                       isCorrect, nextTopicId)
 *      → OlibotEnv serialises the decision to JSON and adds it to a queue.
 *
 *   3. Python reads the decision:
 *        GET /decision
 *      → Server blocks (up to DECISION_TIMEOUT_MS) waiting for the agent.
 *      → Returns the JSON decision or HTTP 408 on timeout.
 *
 * ── Observable properties (→ Jason beliefs) ─────────────────────────
 *
 *   percept_count(N)              — incremented on each new percept (trigger)
 *   current_student_id(N)
 *   current_intent("...")
 *   current_success_rate(F)
 *   current_topic_id("...")
 *   current_is_correct("null"|"true"|"false")
 *   current_requested_topic("...") — topic ID from request_specific_topic intent ("none" if absent)
 *
 * ── CArtAgO operations (callable from Jason plans) ──────────────────
 *
 *   postDecision(action, hintLevel, topicId, instruction,
 *                isCorrect, nextTopicId)
 *     Formats and enqueues the JSON decision so Python can retrieve it.
 *
 * ── Robustness improvements ──────────────────────────────────────────
 *
 *   - DECISION_TIMEOUT_MS reduced to 5 000 ms (was 8 000) so Python's
 *     fallback kicks in faster when the agent is unresponsive.
 *   - execInternalOp("applyPercept") is now wrapped in a try/catch so
 *     a scheduling failure does not crash the HTTP handler thread.
 *   - postDecision() is fully synchronous and non-blocking (queue.offer
 *     is O(1)); no external HTTP call is made from an @OPERATION context.
 *   - GET /health endpoint added for liveness probes.
 */
public class OlibotEnv extends Artifact {

    private static final Logger log = Logger.getLogger(OlibotEnv.class.getName());

    /**
     * How long GET /decision waits for the agent before returning 408.
     * Set to 5 s (was 8 s): fail fast so Python falls back to PythonBDIFallback
     * sooner and latency degrades gracefully instead of hard-blocking.
     */
    private static final int DECISION_TIMEOUT_MS = 5_000;

    private HttpServer httpServer;
    private int port;
    private int perceptCount = 0;

    /**
     * Thread-safe queue: Java agent posts decisions, Python reads them.
     * Capacity=1 prevents stale decisions accumulating across percept cycles.
     */
    private final BlockingQueue<String> decisionQueue = new ArrayBlockingQueue<>(1);

    /**
     * Queue for incoming percept JSON bodies from HTTP handler threads.
     * The HTTP thread enqueues here and schedules an @INTERNAL_OPERATION
     * via execInternalOp("applyPercept") so that updateObsProperty is
     * always called from within the CArtAgO operation context.
     */
    private final Queue<String> perceptJsonQueue = new ConcurrentLinkedQueue<>();

    // ── Artifact lifecycle ──────────────────────────────────────────────

    /**
     * Called by JaCaMo when the artifact is created (port comes from olibot.jcm).
     * Initialises observable properties and starts the HTTP server.
     */
    void init(int port) {
        this.port = port;

        // All observable properties become beliefs in the focused Jason agent.
        // They are initialised here and updated on each incoming percept.
        defineObsProperty("percept_count",            0);
        defineObsProperty("current_student_id",       0);
        defineObsProperty("current_intent",           "none");
        defineObsProperty("current_success_rate",     0.0);
        defineObsProperty("current_topic_id",         "general");
        defineObsProperty("current_is_correct",       "null");
        defineObsProperty("current_requested_topic",  "none");

        try {
            startHttpServer();
            log.info("[OlibotEnv] HTTP server started on port " + port
                     + " | decision_timeout=" + DECISION_TIMEOUT_MS + " ms");
        } catch (IOException e) {
            log.severe("[OlibotEnv] Failed to start HTTP server: " + e.getMessage());
        }
    }

    // ── CArtAgO operations (called from olibot.asl) ─────────────────────

    /**
     * Called by the Jason agent to send its pedagogical decision back to Python.
     *
     * This operation is purely in-memory (string formatting + queue.offer).
     * It does NOT make any outbound HTTP call, so it is safe to run synchronously
     * in the CArtAgO execution thread without risk of blocking the agent.
     *
     * @param action      BDI action name  (e.g. "give_hint", "praise")
     * @param hintLevel   Scaffolding level (1–3)
     * @param topicId     Active curriculum topic ID
     * @param instruction Human-readable directive for the NLG module
     * @param isCorrect   "true" / "false" / "null"
     * @param nextTopicId Next topic ID or "null"
     */
    @OPERATION
    void postDecision(String action, int hintLevel, String topicId,
                      String instruction, String isCorrect, String nextTopicId) {

        // Escape double-quotes in the instruction string to keep JSON valid
        String safeInstruction = instruction.replace("\\", "\\\\").replace("\"", "'");

        String nextTopicJson = nextTopicId.equals("null")
                ? "null"
                : "\"" + nextTopicId + "\"";

        String json = "{"
                + "\"action\":\"" + action + "\","
                + "\"hint_level\":" + hintLevel + ","
                + "\"topic_id\":\"" + topicId + "\","
                + "\"instruction\":\"" + safeInstruction + "\","
                + "\"is_correct\":" + isCorrect + ","
                + "\"next_topic_id\":" + nextTopicJson
                + "}";

        // Drain any stale decision before offering the new one so a stuck
        // previous cycle never blocks the current one.
        decisionQueue.clear();
        boolean offered = decisionQueue.offer(json);
        if (!offered) {
            log.warning("[OlibotEnv] decisionQueue.offer failed (queue full?) — draining and retrying");
            decisionQueue.clear();
            decisionQueue.offer(json);
        }
        log.info("[OlibotEnv] Decision posted: action=" + action + " hint=" + hintLevel
                 + " topic=" + topicId);
    }

    /**
     * @INTERNAL_OPERATION — runs inside CArtAgO's managed thread context.
     *
     * Dequeues one percept JSON body and updates all observable properties.
     * Because this runs in the CArtAgO context, updateObsProperty correctly
     * propagates belief updates to every focused Jason agent.
     *
     * Scheduled from the HTTP handler thread via execInternalOp("applyPercept").
     */
    @INTERNAL_OPERATION
    void applyPercept() {
        String body = perceptJsonQueue.poll();
        if (body == null) {
            log.warning("[OlibotEnv] applyPercept called but queue is empty");
            return;
        }

        try {
            int    studentId      = extractInt(body,    "student_id");
            String intent         = extractString(body, "intent");
            double successRate    = extractDouble(body,  "success_rate");
            String topicId        = extractString(body, "current_topic");
            String isCorrect      = extractNullableBoolean(body, "is_correct");
            String requestedTopic = extractString(body, "requested_topic");

            updateObsProperty("current_student_id",     studentId);
            updateObsProperty("current_intent",          intent.isEmpty() ? "unknown" : intent);
            updateObsProperty("current_success_rate",    successRate);
            updateObsProperty("current_topic_id",        topicId.isEmpty() ? "general" : topicId);
            updateObsProperty("current_is_correct",      isCorrect);
            updateObsProperty("current_requested_topic", requestedTopic.isEmpty() ? "none" : requestedTopic);

            // Trigger last — by the time +percept_count(N) fires in the agent,
            // all other beliefs are already updated.
            updateObsProperty("percept_count", ++perceptCount);
            log.info("[OlibotEnv] applyPercept done: count=" + perceptCount
                    + " intent=" + intent + " SR=" + successRate);

        } catch (Exception e) {
            log.severe("[OlibotEnv] applyPercept FAILED to parse percept body: " + e.getMessage());
            // Still increment percept_count to prevent the agent from stalling.
            updateObsProperty("percept_count", ++perceptCount);
        }
    }

    // ── HTTP server ─────────────────────────────────────────────────────

    private void startHttpServer() throws IOException {
        httpServer = HttpServer.create(new InetSocketAddress(port), 0);
        httpServer.createContext("/percept",  new PerceptHandler());
        httpServer.createContext("/decision", new DecisionHandler());
        httpServer.createContext("/health",   new HealthHandler());
        httpServer.setExecutor(Executors.newCachedThreadPool());
        httpServer.start();
    }

    /**
     * POST /percept
     *
     * Receives a JSON percept from Python, enqueues it, and schedules
     * the @INTERNAL_OPERATION applyPercept to update observable properties
     * inside the CArtAgO context. The HTTP thread blocks on execInternalOp
     * until the properties are updated (ensuring Python knows the percept
     * was processed by the time it gets the 200 response).
     *
     * If execInternalOp fails (rare — means CArtAgO is shutting down),
     * the error is logged and a 500 is returned so Python falls back to
     * PythonBDIFallback immediately rather than waiting for GET /decision.
     */
    private class PerceptHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
                ex.sendResponseHeaders(405, -1);
                return;
            }

            // Clear any stale decision from the previous cycle
            decisionQueue.clear();

            String body;
            try {
                body = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                log.warning("[OlibotEnv] Failed to read percept body: " + e.getMessage());
                respond(ex, 400, "{\"error\":\"could not read request body\"}");
                return;
            }

            log.info("[OlibotEnv] Percept received: "
                     + body.substring(0, Math.min(body.length(), 120)));

            perceptJsonQueue.offer(body);

            try {
                execInternalOp("applyPercept");
            } catch (Exception e) {
                // execInternalOp can throw if CArtAgO is shutting down or the
                // artifact is in an unexpected state. Log and return 500 so
                // Python does not block on GET /decision for the full timeout.
                log.severe("[OlibotEnv] execInternalOp(applyPercept) failed: " + e.getMessage());
                perceptJsonQueue.clear(); // discard the unprocessed percept
                respond(ex, 500, "{\"error\":\"artifact_unavailable\"}");
                return;
            }

            respond(ex, 200,
                    "{\"status\":\"received\",\"percept_id\":" + perceptCount + "}");
        }
    }

    /**
     * GET /decision
     *
     * Blocks until the Jason agent calls postDecision (up to DECISION_TIMEOUT_MS).
     * Returns the JSON decision or HTTP 408 on timeout.
     *
     * Python's _call_jacamo does:
     *   1. POST /percept
     *   2. GET  /decision  ← this call
     */
    private class DecisionHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
                ex.sendResponseHeaders(405, -1);
                return;
            }

            try {
                String decision = decisionQueue.poll(DECISION_TIMEOUT_MS, TimeUnit.MILLISECONDS);
                if (decision != null) {
                    respond(ex, 200, decision);
                } else {
                    log.warning("[OlibotEnv] Timeout waiting for agent decision ("
                                + DECISION_TIMEOUT_MS + " ms) — Python will use fallback");
                    respond(ex, 408, "{\"error\":\"agent_timeout\"}");
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                respond(ex, 500, "{\"error\":\"interrupted\"}");
            }
        }
    }

    /**
     * GET /health
     *
     * Liveness probe for Python's BDI bridge startup checks.
     * Returns 200 with agent status so Python can wait for JaCaMo to be ready.
     */
    private class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            String body = "{\"status\":\"ok\",\"percept_count\":" + perceptCount
                        + ",\"decision_timeout_ms\":" + DECISION_TIMEOUT_MS + "}";
            respond(ex, 200, body);
        }
    }

    // ── JSON parsing helpers (no external library) ──────────────────────

    private String extractString(String json, String key) {
        Pattern p = Pattern.compile("\"" + key + "\"\\s*:\\s*\"([^\"]+)\"");
        Matcher m = p.matcher(json);
        return m.find() ? m.group(1) : "";
    }

    private int extractInt(String json, String key) {
        Pattern p = Pattern.compile("\"" + key + "\"\\s*:\\s*(-?\\d+)");
        Matcher m = p.matcher(json);
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }

    private double extractDouble(String json, String key) {
        Pattern p = Pattern.compile("\"" + key + "\"\\s*:\\s*(-?[0-9]*\\.?[0-9]+)");
        Matcher m = p.matcher(json);
        return m.find() ? Double.parseDouble(m.group(1)) : 0.0;
    }

    /** Extracts a JSON boolean or null field as a string: "true", "false", "null". */
    private String extractNullableBoolean(String json, String key) {
        Pattern p = Pattern.compile("\"" + key + "\"\\s*:\\s*(true|false|null)");
        Matcher m = p.matcher(json);
        return m.find() ? m.group(1) : "null";
    }

    // ── Utility ─────────────────────────────────────────────────────────

    private static void respond(HttpExchange ex, int code, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json");
        ex.sendResponseHeaders(code, bytes.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(bytes);
        }
    }
}
