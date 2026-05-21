/*
 * OLIBOT Jason BDI Agent — olibot.asl
 *
 * Implements the "Think BDI, Talk LLM" architecture.
 *
 * ── Communication with Python ────────────────────────────────────────
 *
 *   The agent does NOT communicate directly with Python via messages.
 *   Instead it interacts with the OlibotEnv CArtAgO artifact:
 *
 *     1. OlibotEnv updates observable properties when a percept arrives.
 *        The agent observes property changes as belief updates.
 *     2. When +percept_count(N) fires, all beliefs are already updated.
 *     3. The agent selects a plan, computes the hint level, and calls
 *        the postDecision CArtAgO operation on the OlibotEnv artifact.
 *     4. OlibotEnv enqueues the decision JSON; Python reads it via GET /decision.
 *
 * ── Observable properties → Jason beliefs ────────────────────────────
 *
 *   percept_count(N)           → trigger belief (incremented each percept)
 *   current_student_id(N)
 *   current_intent("...")
 *   current_success_rate(F)
 *   current_topic_id("...")
 *   current_is_correct("true"|"false"|"null")
 *
 * ── Plan selection overview ───────────────────────────────────────────
 *
 *   +percept_count(N)                → reads beliefs, calls !respond(Intent,SR,T)
 *   +!respond(ask_for_answer, SR, T) → give_hint   (shield: NEVER answer)
 *   +!respond(attempt_answer, SR, T) → evaluate_and_encourage / praise / praise_and_advance
 *   +!respond(ask_for_hint,   SR, T) → give_hint
 *   +!respond(greet,          _,  T) → greet_and_start
 *   +!respond(express_emotion, _, T) → acknowledge_emotion   (Fase 2)
 *   +!respond(_,              _,  T) → redirect              (catch-all)
 *   +!calculate_hint_level(SR, HL)   → maps success rate to hint level 1/2/3
 */

// ============================================================
// INITIAL BELIEFS
// ============================================================
zdp_threshold(0.6).
max_hint_level(3).
mastery_threshold(0.75).
min_attempts(3).

// ============================================================
// INITIAL GOALS
// ============================================================
!start.

// ============================================================
// PLANS
// ============================================================

/* Startup: join workspace and focus on the OlibotEnv artifact */
+!start <-
    joinWorkspace("olibot_workspace", WspId);
    lookupArtifact("olibot_env", ArtId);
    focus(ArtId);
    .print("[OLIBOT] BDI agent started. Waiting for percepts from Python backend on port 8080...").

/*
 * TRIGGER: Python sent a new percept.
 *
 * OlibotEnv updates the observable properties (→ beliefs) and then
 * increments percept_count last.  By the time this plan fires, the
 * beliefs current_intent, current_success_rate, current_topic_id, and
 * current_is_correct are already up to date.
 *
 * We read them directly from the belief base using belief queries.
 */
+percept_count(N)
    :  current_intent(Intent)
     & current_success_rate(SR)
     & current_topic_id(T)
     & current_student_id(SId)
     & current_requested_topic(RT)
    <-
    .print("[OLIBOT] Processing percept #", N, " | intent=", Intent,
           " SR=", SR, " topic=", T, " student=", SId, " requested=", RT);
    -+current_student(SId);
    -+current_topic(T);
    !respond(Intent, SR, T).

/*
 * PLAN: ask_for_answer
 *
 * Safety Shield invariant: NEVER reveal the answer regardless of context.
 * Scaffolding level (hint strength) is derived from the session success rate.
 *
 * Python mirror: PythonBDIFallback — ask_for_answer branch
 */
+!respond("ask_for_answer", SR, T) <-
    !calculate_hint_level(SR, HL);
    .print("[OLIBOT] ask_for_answer → give_hint level ", HL);
    postDecision("give_hint", HL, T,
        "Student asked for answer directly. NEVER give it. Provide only a Socratic hint.",
        "null", "null")[artifact_name("olibot_env"), wsp("olibot_workspace")].

/*
 * PLAN: attempt_answer
 *
 * The is_correct field is pre-evaluated by Python (CurriculumEngine) and
 * sent in the percept payload.  The agent reads it from beliefs.
 *
 * If correct AND should advance:   praise_and_advance
 * If correct, no advance yet:      praise
 * If incorrect or unevaluated:     evaluate_and_encourage
 *
 * Python mirror: PythonBDIFallback — attempt_answer branch
 */
+!respond("attempt_answer", SR, T)
    :  current_is_correct("true")
    <-
    .print("[OLIBOT] attempt_answer CORRECT → praise");
    postDecision("praise", 1, T,
        "The student answered CORRECTLY! Celebrate enthusiastically and encourage them to continue.",
        "true", "null")[artifact_name("olibot_env"), wsp("olibot_workspace")].

+!respond("attempt_answer", SR, T)
    :  current_is_correct("false")
    <-
    !calculate_hint_level(SR, HL);
    .print("[OLIBOT] attempt_answer INCORRECT → evaluate_and_encourage level ", HL);
    postDecision("evaluate_and_encourage", HL, T,
        "The student attempted but the answer was INCORRECT. React kindly and give a scaffolding hint.",
        "false", "null")[artifact_name("olibot_env"), wsp("olibot_workspace")].

/* Fallback: is_correct is null (answer could not be evaluated) */
+!respond("attempt_answer", SR, T) <-
    !calculate_hint_level(SR, HL);
    .print("[OLIBOT] attempt_answer NOT EVALUATED → evaluate_and_encourage");
    postDecision("evaluate_and_encourage", HL, T,
        "The student is attempting an answer. Evaluate it kindly. Celebrate if correct, hint if wrong.",
        "null", "null")[artifact_name("olibot_env"), wsp("olibot_workspace")].

/*
 * PLAN: ask_for_hint
 *
 * Python mirror: PythonBDIFallback — ask_for_hint branch
 */
+!respond("ask_for_hint", SR, T) <-
    !calculate_hint_level(SR, HL);
    .print("[OLIBOT] ask_for_hint → give_hint level ", HL);
    postDecision("give_hint", HL, T,
        "Student requested a hint. Give a Socratic clue without revealing the answer.",
        "null", "null")[artifact_name("olibot_env"), wsp("olibot_workspace")].

/*
 * PLAN: greet — proactively propose today's topic and offer to change
 *
 * Python mirror: PythonBDIFallback — greet branch
 */
+!respond("greet", _, T) <-
    .print("[OLIBOT] greet → greet_and_propose, topic=", T);
    postDecision("greet_and_propose", 0, T,
        "Greet the student warmly. Propose today topic enthusiastically and ask if they want to start or try something else.",
        "null", "null")[artifact_name("olibot_env"), wsp("olibot_workspace")].

/*
 * PLAN: request_topic_change
 *
 * Student wants to practice something different.
 * Agent offers alternatives (Python will inject curriculum-aware names via NLG).
 * Python mirror: PythonBDIFallback — request_topic_change branch
 */
+!respond("request_topic_change", _, T) <-
    .print("[OLIBOT] request_topic_change → offer_alternatives, current=", T);
    postDecision("offer_alternatives", 0, T,
        "Student wants to change topic. Offer 2-3 alternatives from the available curriculum enthusiastically.",
        "null", "null")[artifact_name("olibot_env"), wsp("olibot_workspace")].

/*
 * PLAN: request_specific_topic
 *
 * Student explicitly asks for a specific letter or number.
 * The requested topic comes from current_requested_topic belief (set by OlibotEnv).
 * If the topic is available, accept and switch; otherwise redirect.
 *
 * Python mirror: PythonBDIFallback — request_specific_topic branch
 */
+!respond("request_specific_topic", _, T)
    :  current_requested_topic(RT) & RT \== "none"
    <-
    .print("[OLIBOT] request_specific_topic → accept_topic_change, requested=", RT);
    postDecision("accept_topic_change", 0, RT,
        "Student wants to practice a specific topic. Accept enthusiastically and start it.",
        "null", RT)[artifact_name("olibot_env"), wsp("olibot_workspace")].

/* Fallback: no requested topic extracted */
+!respond("request_specific_topic", _, T) <-
    .print("[OLIBOT] request_specific_topic (no topic) → offer_alternatives");
    postDecision("offer_alternatives", 0, T,
        "Student wants something specific but unclear. Ask what they want to practice.",
        "null", "null")[artifact_name("olibot_env"), wsp("olibot_workspace")].

/*
 * PLAN: express_emotion  (Fase 2)
 *
 * Emotional scaffolding: acknowledge first, then guide back to the lesson.
 * Python mirror: PythonBDIFallback — express_emotion branch
 */
+!respond("express_emotion", _, T) <-
    .print("[OLIBOT] express_emotion → acknowledge_emotion");
    postDecision("acknowledge_emotion", 0, T,
        "Student expressed an emotion. Acknowledge it with empathy. If frustrated, reassure. Then return gently to the lesson.",
        "null", "null")[artifact_name("olibot_env"), wsp("olibot_workspace")].

/*
 * PLAN: off-topic / unknown → redirect (catch-all)
 *
 * Python mirror: PythonBDIFallback — redirect catch-all
 */
+!respond(_, _, T) <-
    .print("[OLIBOT] off-topic/unknown → redirect, topic=", T);
    postDecision("redirect", 1, T,
        "Student went off-topic. Gently redirect them back to the lesson.",
        "null", "null")[artifact_name("olibot_env"), wsp("olibot_workspace")].

/*
 * PLAN: Calculate scaffolding hint level from session success rate.
 *
 * Maps success rate to hint strength:
 *   SR >= 0.60  → Level 1 (subtle nudge — student is doing well)
 *   SR >= 0.30  → Level 2 (moderate clue — some difficulty)
 *   SR <  0.30  → Level 3 (near-direct — student is struggling)
 *
 * Mirrors ScaffoldingEngine.get_hint_level() in Python.
 * Mirrors the Jason plan:  +!calculate_hint_level(SR, HL) in Fase 1.
 */
+!calculate_hint_level(SR, 3) <- SR < 0.30.
+!calculate_hint_level(SR, 2) <- SR < 0.60.
+!calculate_hint_level(_, 1).