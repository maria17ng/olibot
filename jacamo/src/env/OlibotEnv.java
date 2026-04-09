package env;

import cartago.*;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import java.util.logging.Logger;

/**
 * OlibotEnv — CArtAgO Environment Artifact
 *
 * This artifact acts as the bridge between the Python FastAPI backend
 * and the JaCaMo Jason agent. It embeds a lightweight HTTP server that
 * receives percepts from Python and exposes them to the agent.
 *
 * Communication flow:
 *   Python POST /percept  →  OlibotEnv  →  Jason agent belief update
 *   Jason agent decision  →  OlibotEnv  →  Python GET /decision
 *
 * The artifact uses Java's built-in com.sun.net.httpserver (no extra deps).
 */
public class OlibotEnv extends Artifact {

    private static final Logger logger = Logger.getLogger(OlibotEnv.class.getName());

    private HttpServer httpServer;
    private int port;

    // Thread-safe queue: Python posts percepts, agent consumes them
    private final BlockingQueue<String> perceptQueue = new LinkedBlockingQueue<>();

    // Thread-safe slot: agent posts decisions, Python reads them
    private volatile String lastDecision = "";

    /**
     * Called by JaCaMo on artifact initialization.
     *
     * @param port The HTTP port to listen on (configured in olibot.jcm)
     */
    void init(int port) {
        this.port = port;
        try {
            startHttpServer();
            logger.info("[OlibotEnv] HTTP server started on port " + port);
        } catch (IOException e) {
            logger.severe("[OlibotEnv] Failed to start HTTP server: " + e.getMessage());
        }
    }

    /**
     * CArtAgO operation: called by the Jason agent to post its decision
     * so the Python backend can pick it up via GET /decision.
     */
    @OPERATION
    void postDecision(String decisionJson) {
        this.lastDecision = decisionJson;
        logger.info("[OlibotEnv] Decision posted: " + decisionJson);
    }

    /**
     * CArtAgO operation: agent polls this to get the next pending percept.
     * Blocks up to 100ms then returns empty string if none available.
     */
    @OPERATION
    void getNextPercept(OpFeedbackParam<String> result) {
        try {
            String percept = perceptQueue.poll(100, TimeUnit.MILLISECONDS);
            result.set(percept != null ? percept : "");
        } catch (InterruptedException e) {
            result.set("");
        }
    }

    // -------------------------------------------------------
    // Internal HTTP server
    // -------------------------------------------------------

    private void startHttpServer() throws IOException {
        httpServer = HttpServer.create(new InetSocketAddress(port), 0);

        // POST /percept — Python sends a new student percept
        httpServer.createContext("/percept", new PerceptHandler());

        // GET /decision — Python reads the agent's last decision
        httpServer.createContext("/decision", new DecisionHandler());

        httpServer.setExecutor(Executors.newCachedThreadPool());
        httpServer.start();
    }

    private class PerceptHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(405, -1);
                return;
            }
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            perceptQueue.offer(body);

            // Signal the Jason agent that a new percept arrived
            defineObsProperty("new_percept", body);

            String response = "{\"status\": \"received\"}";
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length());
            exchange.getResponseBody().write(response.getBytes(StandardCharsets.UTF_8));
            exchange.close();
        }
    }

    private class DecisionHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(405, -1);
                return;
            }
            byte[] bytes = lastDecision.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        }
    }
}
