/*
 * OLIBOT Jason BDI Agent
 *
 * This agent implements the "Think BDI, Talk LLM" architecture.
 * It receives percepts from the Python backend (via OlibotEnv),
 * reasons about the student's state, and sends back a pedagogical decision.
 *
 * Key concepts:
 *   - Beliefs: What the agent knows about the student's progress
 *   - Desires:  Goals like "ensure student learns topic X"
 *   - Intentions: Active plans being executed (e.g., scaffolding_plan)
 */

// ============================================================
// INITIAL BELIEFS
// ============================================================
zdp_threshold(0.6).
max_hint_level(3).
current_student(none).
current_topic(general).

// ============================================================
// INITIAL GOALS
// ============================================================
!start.

// ============================================================
// PLANS
// ============================================================

/* Startup: initialize the agent */
+!start <-
    .print("OLIBOT BDI Agent started. Waiting for percepts from Python backend...").

/*
 * PLAN: Handle a new percept arriving from the Python backend.
 * The Python backend sends: percept(StudentId, Intent, SuccessRate, Beliefs)
 */
+percept(StudentId, Intent, SuccessRate, Beliefs) <-
    -+current_student(StudentId);
    !respond(Intent, SuccessRate, Beliefs).

/*
 * PLAN: Student asked for the answer directly.
 * Safety Shield rule: NEVER give the answer. Always scaffold.
 */
+!respond(ask_for_answer, SuccessRate, _Beliefs) <-
    !calculate_hint_level(SuccessRate, HintLevel);
    .send(python_backend, tell, decision(give_hint, HintLevel,
        "Student asked for answer directly. Provide Socratic hint only.")).

/*
 * PLAN: Student is attempting an answer.
 */
+!respond(attempt_answer, _SuccessRate, _Beliefs) <-
    .send(python_backend, tell, decision(evaluate_and_encourage, 1,
        "Evaluate the attempt kindly. Celebrate if correct, hint if wrong.")).

/*
 * PLAN: Student asks for a hint.
 */
+!respond(ask_for_hint, SuccessRate, _Beliefs) <-
    !calculate_hint_level(SuccessRate, HintLevel);
    .send(python_backend, tell, decision(give_hint, HintLevel,
        "Student requested a hint. Give a Socratic clue.")).

/*
 * PLAN: Student greeting.
 */
+!respond(greet, _, _) <-
    .send(python_backend, tell, decision(greet_and_start, 0,
        "Greet the student warmly and introduce the activity.")).

/*
 * PLAN: Off-topic or unknown intent — redirect to lesson.
 */
+!respond(_, _, _) <-
    .send(python_backend, tell, decision(redirect, 1,
        "Student went off-topic. Redirect gently to the lesson.")).

/*
 * PLAN: Calculate scaffolding hint level from success rate.
 * Low performance → stronger hints.
 */
+!calculate_hint_level(SuccessRate, 3) <- SuccessRate < 0.3.
+!calculate_hint_level(SuccessRate, 2) <- SuccessRate < 0.6.
+!calculate_hint_level(_, 1).
