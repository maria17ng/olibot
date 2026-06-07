/**
 * ChatWindow — full-screen child-facing interface for OLIBOT.
 *
 * Layout (child mode):
 *   - Gradient background fills the whole screen
 *   - Letter-tracing canvas is the main stage (full screen, centered) when active
 *   - Avatar + speech bubble are fixed in the bottom-right corner at all times
 *   - Emoji-only stats bar at the top (no text labels)
 *   - No text input — children don't type; voice is the only input channel
 *   - No mic button — always-on listening activates automatically after each OLIBOT turn
 *
 * Control buttons (fixed, top-left, same row as App.jsx parent buttons):
 *   🏠 left:12  (App.jsx — home)
 *   📋 left:82  (App.jsx — reports)
 *   📚 left:152 (ChatWindow — topic picker)
 *   🔄 right:12 (ChatWindow — replay demo)   ← visible only during tracing
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { useSpeech } from "../hooks/useSpeech";
import DiceBearAvatar from "./DiceBearAvatar";
import LetterTracing from "./LetterTracing";
import ColoringCanvas from "./ColoringCanvas";
import { getCharData, getSyllableLetters, getCharDataByKey } from "../data/letterData";
import { getRandomDifferentSubject, subjectFromText } from "../data/coloringData";

const MAX_TURNS_BY_AGE   = { 3: 4,  4: 8,  5: 12 };
// Niveles de dificultad de trazado: 0=fácil(muchos puntos), 1=medio, 2=difícil
// Para avanzar de nivel el niño necesita 3 intentos verdes (LEVEL_PASS_REQUIRED) seguidos.
const LEVEL_PASS_REQUIRED = 3;
const BADGE_W = 186; // badge panel width in px (stars + separator + circles + padding)

// ── Web Audio feedback sounds ─────────────────────────────────────────────
function playFeedbackSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";

    if (type === "correct") {
      // Rising chord: C5 → E5 → G5 (cheerful ding)
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.55);
    } else {
      // Descending: A3 → G3 (soft buzz)
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(196, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    }
    // Auto-close AudioContext after sound finishes to free resources
    setTimeout(() => ctx.close(), 800);
  } catch {
    // AudioContext not available — silent fallback
  }
}

// Tutorial steps: explain each control button to new students
// spot.right is used instead of spot.left for right-anchored buttons (🔄)
const TUTORIAL_STEPS = [
  {
    voice:  "El botón de la casita sirve para volver atrás y elegir quién va a jugar",
    hint:   "Vuelve atrás",
    spot:   { top: 12, left: 12, w: 60, h: 60 },
    bubble: { top: 84, left: 12 },
  },
  {
    voice:  "El botón con el cuadernito es para mamá y papá, para ver tu progreso",
    hint:   "Para mamá y papá",
    spot:   { top: 12, left: 82, w: 60, h: 60 },
    bubble: { top: 84, left: 82 },
  },
  {
    voice:  "Con el botón de los libros puedes elegir qué ejercicio quieres practicar",
    hint:   "Elegir ejercicio",
    spot:   { top: 12, left: 152, w: 60, h: 60 },
    bubble: { top: 84, left: 152 },
  },
  {
    voice:  "Con este botón puedes ver otra vez cómo se hace el ejercicio. ¡Úsalo si no te acuerdas cómo hacerlo!",
    hint:   "Ver la demostración otra vez",
    spot:   { top: 12, right: 12, w: 60, h: 60 },   // right-anchored
    bubble: { top: 84, right: 12 },
  },
  {
    voice:  "¡Mira aquí a la derecha! Hay tres filas, una por nivel. Los circulitos se ponen verdes cuando lo haces bien. ¡Con tres circulitos verdes subes de nivel!",
    hint:   "Tus estrellas y niveles",
    spot:   { top: "calc(50vh - 85px)", right: 4, w: BADGE_W + 8, h: 170, r: "20px" },
    bubble: { top: "calc(50vh + 96px)", right: 4 },
  },
];

// Index of the tutorial step that explains the level badge (0-based)
const LEVEL_BADGE_TUTORIAL_STEP = 4;
const CTRL_BTN = {
  position: "fixed",
  width: "60px", height: "60px", borderRadius: "50%",
  background: "rgba(255,255,255,0.88)", border: "2px solid rgba(0,0,0,0.10)",
  fontSize: "28px", cursor: "pointer", backdropFilter: "blur(8px)",
  boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 300,
};


export default function ChatWindow({ student, isNewStudent = false }) {
  const [lastMessage,    setLastMessage]    = useState("");
  const [sessionId,      setSessionId]      = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [currentTopicId, setCurrentTopicId] = useState(null);
  const [sessionStats,   setSessionStats]   = useState({ correct: 0, incorrect: 0, hints: 0 });
  const [turnCount,      setTurnCount]      = useState(0);
  const [currentBeliefs, setCurrentBeliefs] = useState({});
  // Nivel de trazado local (0=fácil, 1=medio, 2=difícil) y registro de intentos por nivel
  const [tracingLevel,  setTracingLevel]  = useState(0);          // 0|1|2
  const [levelAttempts, setLevelAttempts] = useState([[], [], []]); // por nivel: últimos N booleans
  const [tracingKey,        setTracingKey]        = useState(0);
  const [syllableLetterIdx, setSyllableLetterIdx] = useState(0);
  const [syllableSayPhase,  setSyllableSayPhase]  = useState(false);
  // Mastery dialog
  const [masteryDialog,     setMasteryDialog]     = useState(null); // { topicId, nextTopicId }
  // Age-complete popup (parents)
  const [ageCompleteDialog, setAgeCompleteDialog] = useState(false);
  // Free drawing
  const [coloringSubject,   setColoringSubject]   = useState(null);
  // Topic picker
  const [topicPickerOpen,    setTopicPickerOpen]    = useState(false);
  const [accessibleTopics,   setAccessibleTopics]   = useState([]);
  const [topicPickerPending, setTopicPickerPending] = useState(false);
  // Tutorial
  const [tutorialStep, setTutorialStep] = useState(null); // null=done, 0-3=active

  const ageProfile = student ? Math.min(Math.max(parseInt(student.age) || 4, 3), 5) : 4;
  const maxTurns   = MAX_TURNS_BY_AGE[ageProfile] ?? 12;

  // Display name for the current topic (used as title in LetterTracing)
  const currentTopicDisplayName = accessibleTopics.find(t => t.id === currentTopicId)?.display_name ?? "";

  // ── Voice ─────────────────────────────────────────────────────────────────
  const sendRef           = useRef(null);
  const speakRef          = useRef(null);    // always-current speak()
  const masteryDialogRef  = useRef(null);    // always-current masteryDialog state
  const sessionIdRef      = useRef(null);    // always-current sessionId
  const topicPickerOpenRef = useRef(false);  // mirrors topicPickerOpen for stable handleSilence
  const listenFnRef       = useRef(null);    // points to startListeningStable (set after useSpeech)
  const tutorialStepRef   = useRef(null);    // mirrors tutorialStep
  const badgeRef          = useRef(null);    // level-progress badge div (kept for future use)
  const [badgeRight, setBadgeRight] = useState(8);

  // ── Badge responsive positioning ──────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const canvasSize = Math.max(Math.min(window.innerWidth - 16, window.innerHeight - 16, 1200), 200);
      const rightMargin = (window.innerWidth - canvasSize) / 2;
      setBadgeRight(Math.max(4, (rightMargin - BADGE_W) / 2));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable transcript handler — uses refs so useSpeech never recreates the listener
  const handleTranscript = useCallback((text) => {
    // During tutorial, any speech advances to next step
    if (tutorialStepRef.current !== null) {
      advanceTutorial();
      return;
    }
    // Re-open tutorial on help request
    const lower = text.toLowerCase();
    if (/\b(ayuda|explica|no entiendo|qué es|que es el botón|que hace)\b/i.test(lower)) {
      setTutorialStep(0);
      return;
    }
    // During free drawing: exit/change/resume commands only
    if (coloringSubjectRef.current) {
      console.log("[handleTranscript] coloring mode, subject:", coloringSubjectRef.current, "text:", lower);
      if (/\b(salir|volver|terminar|ya terminé|fin|salgo)\b/i.test(lower)) {
        setColoringSubject(null);
        const msg = "¡Qué bonito dibujo! ¿Continuamos?";
        setLastMessage(msg);
        speakRef.current?.(msg);
      } else if (/\b(seguir|continuar|practicar|ejercicio|aprender|lección|leccion|clase|estudio)\b/i.test(lower)) {
        // Child wants to go back to the lesson
        setColoringSubject(null);
        const msg = "¡Vamos a practicar!";
        setLastMessage(msg);
        speakRef.current?.(msg);
      } else if (/\b(otro|cambiar|diferente|nuevo dibujo|otra cosa|cambia|cambiarlo)\b/i.test(lower)) {
        const next = getRandomDifferentSubject(coloringSubjectRef.current);
        setColoringSubject(next);
        const msg = "¡Aquí tienes otro dibujo!";
        setLastMessage(msg);
        speakRef.current?.(msg);
      } else {
        // Detect a specific animal request: "quiero un perro", "pon un tigre", etc.
        const reqSubject = subjectFromText(lower);
        if (reqSubject && reqSubject !== coloringSubjectRef.current) {
          setColoringSubject(reqSubject);
          const msg = `¡Vamos a dibujar ${reqSubject}!`;
          setLastMessage(msg);
          speakRef.current?.(msg);
        } else {
          // Catch-all in coloring mode: encourage painting
          const subject = coloringSubjectRef.current;
          const encouragements = [
            `¡Sigue pintando tu ${subject}! 🎨`,
            `¡Qué bonito te está quedando! Sigue así 🌈`,
            `¡Pon muchos colores! ¿Qué color vas a usar? 🖌️`,
            `¡Lo estás haciendo genial! ¡Sigue pintando! 🎨`,
          ];
          const msg = encouragements[Math.floor(Math.random() * encouragements.length)];
          setLastMessage(msg);
          speakRef.current?.(msg);
        }
      }
      return;
    }
    if (masteryDialogRef.current) {
      if (/seguir|continuar/i.test(lower)) {
        setMasteryDialog(null);
        setTracingKey(k => k + 1);
        const msg = "¡Muy bien! Sigue practicando.";
        setLastMessage(msg);
        speakRef.current?.(msg);
        return;
      }
      if (/siguiente|próxima|proxima/i.test(lower) && masteryDialogRef.current.nextTopicId) {
        const nextId = masteryDialogRef.current.nextTopicId;
        const sid    = sessionIdRef.current;
        setMasteryDialog(null);
        setCurrentTopicId(nextId);
        const msg = "¡Vamos al siguiente ejercicio! ¡Tú puedes!";
        setLastMessage(msg);
        speakRef.current?.(msg);
        if (sid) api.advanceSession(sid, nextId).then(r => setSessionId(r.session_id)).catch(console.error);
        return;
      }
      if (/dibujar|pintar|dibujo/i.test(lower)) {
        setMasteryDialog(null);
        setColoringSubject("perro");
        const msg = "¡Vamos a dibujar!";
        setLastMessage(msg);
        speakRef.current?.(msg);
        return;
      }
      speakRef.current?.("No entendí. Di continuar, siguiente o dibujar.");
      return;
    }
    // Child is tired/bored: offer topic picker with accessible activities
    if (/\b(me canso|estoy cansad[ao]|cansad[ao]|no quiero más|ya no quiero|me aburro|aburrid[ao]|quiero parar|quiero descansar|me cansé)\b/i.test(lower)) {
      setTopicPickerPending(true);
      const msg = "¡Vale! ¿Qué actividad quieres hacer?";
      setLastMessage(msg);
      speakRef.current?.(msg);
      return;
    }

    // Signal 'thinking' immediately — before the async API call starts.
    // This gives visual feedback the instant STT finishes, instead of waiting
    // for sendMessage to set loading=true after stopListening() resolves.
    setLoading(true);
    if (sendRef.current) sendRef.current(text);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally stable via refs

  // Stable silence handler — restart unless topic picker is blocking
  const handleSilence = useCallback(() => {
    if (!topicPickerOpenRef.current) {
      setTimeout(() => listenFnRef.current?.(), 600);
    }
  }, []); // stable — all from refs

  const {
    supported, listening, speaking, interimTranscript,
    startListening, startListeningStable, stopListening, speak, speakQueued, stopSpeaking,
  } = useSpeech({ onTranscript: handleTranscript, onSilence: handleSilence });

  speakRef.current      = speak;              // keep refs current after useSpeech
  listenFnRef.current   = startListeningStable;

  const prevSpeakingRef    = useRef(false);
  const prevLoadingRef     = useRef(false);
  const charDataRef        = useRef(null);
  const coloringSubjectRef = useRef(null);

  // ── Initialise on student change ─────────────────────────────────────────
  useEffect(() => {
    if (!student) return;
    const age     = Math.min(Math.max(parseInt(student.age) || 4, 3), 5);
    const welcome = age <= 3
      ? `¡Hola ${student.name}! 🌟`
      : `¡Hola ${student.name}! Soy OLIBOT, tu robot amigo. ¿Estás listo para aprender? 🌈🚀`;

    setLastMessage(welcome);
    setSessionId(null);
    setCurrentTopicId(null);
    setSessionStats({ correct: 0, incorrect: 0, hints: 0 });
    setTurnCount(0);
    setCurrentBeliefs(student.beliefs || {});
    speak(welcome);

    const tutKey = `olibot_tutorial_${student.id}`;
    const showTutorial = isNewStudent || !localStorage.getItem(tutKey);
    console.log("[TUTORIAL] student.id:", student.id, "isNewStudent:", isNewStudent, "tutKey:", tutKey, "stored:", localStorage.getItem(tutKey), "→ showTutorial:", showTutorial);
    if (showTutorial) {
      // Nuevo estudiante: tutorial primero, BDI arranca cuando el tutorial termina
      const tid = setTimeout(() => {
        console.log("[TUTORIAL] Firing setTutorialStep(0)");
        setTutorialStep(0);
      }, 2200);
      return () => clearTimeout(tid);
    } else {
      // Estudiante conocido: arrancar BDI directamente
      const tid = setTimeout(() => { if (sendRef.current) sendRef.current("hola"); }, 1200);
      return () => clearTimeout(tid);
    }
  }, [student]); // eslint-disable-line react-hooks/exhaustive-deps

  // Demo-shown tracking
  const demoShownRef    = useRef(null);
  const failureStreakRef = useRef(0);
  const currentTopicIdRef = useRef(currentTopicId);
  useEffect(() => { currentTopicIdRef.current = currentTopicId; }, [currentTopicId]);

  // Reset practice counter, syllable step on topic change + queue tutorial text
  const prevTopicIdRef = useRef(null);
  useEffect(() => {
    setTracingLevel(0);
    setLevelAttempts([[], [], []]);
    setSyllableLetterIdx(0);
    setSyllableSayPhase(false);
    setTracingKey((k) => k + 1);
    demoShownRef.current    = null;
    failureStreakRef.current = 0;

    if (currentTopicId && currentTopicId !== prevTopicIdRef.current) {
      prevTopicIdRef.current = currentTopicId;
      const tut = getCharData(currentTopicId)?.tutorial;
      if (tut) {
        const tid = setTimeout(() => speakQueued(tut), 600);
        return () => clearTimeout(tid);
      }
    }
  }, [currentTopicId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep refs current
  useEffect(() => { masteryDialogRef.current    = masteryDialog;     }, [masteryDialog]);
  useEffect(() => { sessionIdRef.current        = sessionId;         }, [sessionId]);
  useEffect(() => { topicPickerOpenRef.current  = topicPickerOpen;   }, [topicPickerOpen]);
  useEffect(() => { tutorialStepRef.current     = tutorialStep;      }, [tutorialStep]);
  useEffect(() => { coloringSubjectRef.current  = coloringSubject;   }, [coloringSubject]);

  // Close open popups when the child enters free drawing
  useEffect(() => {
    if (!coloringSubject) return;
    setMasteryDialog(null);
    setTopicPickerOpen(false);
  }, [coloringSubject]);

  // Close topic picker when the active topic changes externally
  useEffect(() => {
    setTopicPickerOpen(false);
  }, [currentTopicId]);

  // Fetch accessible topics when picker is requested
  useEffect(() => {
    if (!topicPickerPending || !student) return;
    setTopicPickerPending(false);
    api.getAccessibleTopics(student.id)
      .then(topics => { setAccessibleTopics(topics); setTopicPickerOpen(true); })
      .catch(e => console.error("[topics]", e));
  }, [topicPickerPending, student]);

  // Mastery dialog: queue verbal options
  useEffect(() => {
    if (!masteryDialog) return;
    const options = masteryDialog.nextTopicId
      ? "Di continuar para seguir practicando, siguiente para la próxima actividad, o dibujar para pintar algo bonito."
      : "Di continuar para seguir practicando, o dibujar para pintar algo bonito.";
    speakQueued(options);
  }, [masteryDialog]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep mic active during mastery dialog
  useEffect(() => {
    if (!masteryDialog || speaking || loading || listening) return;
    const tid = setTimeout(() => startListeningStable(), 1300);
    return () => clearTimeout(tid);
  }, [masteryDialog, speaking, loading, listening, startListeningStable]);

  // Tutorial: speak each step and auto-advance after ~8s (enough for any TTS + pause)
  useEffect(() => {
    if (tutorialStep === null) return;
    const step = TUTORIAL_STEPS[tutorialStep];
    console.log("[TUTORIAL] Step changed to:", tutorialStep, "step:", step);
    if (!step) return;
    speakRef.current?.(step.voice);
    // Step 4 (badge explanation) has a longer text → give it more time
    const autoAdvanceMs = tutorialStep === LEVEL_BADGE_TUTORIAL_STEP ? 16000 : 9000;
    const tid = setTimeout(() => advanceTutorial(), autoAdvanceMs);
    return () => clearTimeout(tid);
  }, [tutorialStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-listen: restart after speaking ends
  useEffect(() => {
    const wasJustSpeaking = prevSpeakingRef.current && !speaking;
    prevSpeakingRef.current = speaking;
    if (wasJustSpeaking && !loading && supported && !listening) {
      setTimeout(() => startListeningStable(), 300);
    }
  }, [speaking]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-listen: restart after loading ends
  useEffect(() => {
    const wasJustLoading = prevLoadingRef.current && !loading;
    prevLoadingRef.current = loading;
    if (wasJustLoading && !speaking && supported && !listening) {
      setTimeout(() => startListeningStable(), 300);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Always-on: restart mic whenever it drops and we're not busy.
  // topicPickerOpen is in deps so the effect re-fires when the picker closes,
  // which is what actually re-enables the mic after the picker dismissal.
  useEffect(() => {
    if (listening || speaking || loading || !supported) return;
    if (topicPickerOpen) return;
    const tid = setTimeout(() => startListeningStable(), 600);
    return () => clearTimeout(tid);
  }, [listening, speaking, loading, supported, startListeningStable, topicPickerOpen]);

  // ── Core send (streaming) ─────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    stopSpeaking();
    stopListening();
    setLoading(true);

    const sentenceEnd = /^([\s\S]+?[.!?])(\s|$)/;
    let accumulated = "";
    let ttsBuffer   = "";
    let firstQueued = false;

    try {
      for await (const event of api.sendMessageStream(student.id, trimmed, sessionId)) {

        if (event.type === "meta") {
          const masteryActions = ["mastery_achieved", "praise_and_advance"];
          const earlyTopic = event.next_topic_id || event.current_topic_id;
          if (earlyTopic && !masteryActions.includes(event.bdi_action)) setCurrentTopicId(earlyTopic);
          if (event.bdi_action === "start_free_drawing" && event.free_drawing_subject) {
            setColoringSubject(event.free_drawing_subject);
          }

        } else if (event.type === "token") {
          accumulated += event.text;
          ttsBuffer   += event.text;
          setLastMessage(accumulated);

          if (!firstQueued) {
            const match = sentenceEnd.exec(ttsBuffer);
            if (match) {
              speakQueued(match[1]);
              firstQueued = true;
              ttsBuffer   = ttsBuffer.slice(match[0].length);
            }
          }

        } else if (event.type === "final") {
          setSessionId(event.session_id);
          const masteryActions = ["mastery_achieved", "praise_and_advance"];
          // For mastery actions: keep the current (just-mastered) topic while dialog is shown
          const newTopicId = masteryActions.includes(event.bdi_action)
            ? event.current_topic_id
            : (event.next_topic_id || event.current_topic_id);
          if (newTopicId) setCurrentTopicId(newTopicId);
          if (event.current_beliefs) setCurrentBeliefs(event.current_beliefs);

          if (masteryActions.includes(event.bdi_action)) {
            setMasteryDialog({ topicId: event.current_topic_id, nextTopicId: event.next_topic_id });
            if (event.all_age_topics_complete && student && student.age < 5) {
              setAgeCompleteDialog(true);
            }
          }
          if (event.bdi_action === "offer_alternatives") {
            setTopicPickerPending(true);
          }
          if (event.bdi_action === "start_free_drawing") {
            setColoringSubject(event.free_drawing_subject || "perro");
          }
          setTurnCount((n) => n + 1);

          if (["attempt_answer", "tracing_complete"].includes(event.detected_intent)) {
            if (event.is_correct === true) {
              setSessionStats((s) => ({ ...s, correct: s.correct + 1 }));
              playFeedbackSound("correct");
            } else if (event.is_correct === false) {
              setSessionStats((s) => ({ ...s, incorrect: s.incorrect + 1 }));
              playFeedbackSound("incorrect");
            }
          }
          if (["ask_for_hint", "ask_for_answer"].includes(event.detected_intent)) {
            setSessionStats((s) => ({ ...s, hints: s.hints + 1 }));
          }

          const finalText = event.agent_response;
          setLastMessage(finalText);

          if (event.detected_intent === "attempt_answer") {
            setSyllableSayPhase(false);
          }

          if (event.shield_triggered || !firstQueued) {
            stopSpeaking();
            speak(finalText);
          } else if (ttsBuffer.trim()) {
            speakQueued(ttsBuffer.trim());
          }

          setLoading(false);

        } else if (event.type === "error") {
          throw new Error(event.detail || "Stream error");
        }
      }
    } catch (e) {
      console.error("[OLIBOT] pipeline error:", e?.message || e);
      const err = "Lo siento, tuve un problema. ¿Lo intentamos otra vez?";
      setLastMessage(err + " 🙈");
      stopSpeaking();
      speak(err);
      setLoading(false);
    }
  }, [loading, sessionId, student, speak, speakQueued, stopSpeaking, stopListening]);

  useEffect(() => { sendRef.current = sendMessage; }, [sendMessage]);

  // ── Mastery dialog actions ────────────────────────────────────────────────
  const handleMasteryContinue = useCallback(() => {
    setMasteryDialog(null);
    setTracingKey((k) => k + 1);
    const msg = "¡Muy bien! Sigue practicando.";
    setLastMessage(msg);
    speak(msg);
  }, [speak]);

  const handleMasteryNext = useCallback(() => {
    const nextId = masteryDialog?.nextTopicId;
    const sid    = sessionId;
    setMasteryDialog(null);
    if (nextId) {
      setCurrentTopicId(nextId);
      const msg = "¡Vamos al siguiente ejercicio! ¡Tú puedes!";
      setLastMessage(msg);
      speak(msg);
      if (sid) api.advanceSession(sid, nextId).then(r => setSessionId(r.session_id)).catch(console.error);
    }
  }, [masteryDialog, sessionId, speak]);

  const handleMasteryFreeDraw = useCallback(() => {
    setMasteryDialog(null);
    setColoringSubject("perro");
    const msg = "¡Vamos a dibujar! Elige lo que quieras.";
    setLastMessage(msg);
    speak(msg);
  }, [speak]);

  const handleAgeAdvance = useCallback(() => {
    if (!student) return;
    const newAge = Math.min(parseInt(student.age) + 1, 5);
    setAgeCompleteDialog(false);
    api.updateStudentAge(student.id, newAge)
      .then(() => {
        // Reload page so the parent component refreshes the student with new age
        window.location.reload();
      })
      .catch(e => console.error("[ageAdvance]", e));
  }, [student]);

  // ── Topic picker ──────────────────────────────────────────────────────────
  const openTopicPicker = useCallback(() => setTopicPickerPending(true), []);

  const handleTopicSelect = useCallback(async (topicId) => {
    setTopicPickerOpen(false);
    setColoringSubject(null);
    const sid = sessionId;
    setCurrentTopicId(topicId);
    const msg = "¡Vamos a practicar!";
    setLastMessage(msg);
    speak(msg);
    if (sid) {
      try {
        const { session_id: newSid } = await api.advanceSession(sid, topicId);
        setSessionId(newSid);
      } catch (e) { console.error("[topic switch]", e); }
    }
  }, [sessionId, speak]);

  // ── Tutorial advancement ──────────────────────────────────────────────────
  const advanceTutorial = useCallback(() => {
    setTutorialStep(prev => {
      if (prev === null) return null;
      const next = prev + 1;
      if (next >= TUTORIAL_STEPS.length) {
        if (student) localStorage.setItem(`olibot_tutorial_${student.id}`, "1");
        // Start BDI conversation now that the tutorial is done
        setTimeout(() => { if (sendRef.current) sendRef.current("hola"); }, 600);
        return null;
      }
      return next;
    });
  }, [student]);

  const showTutorialAgain = useCallback(() => setTutorialStep(0), []);

  // ── Demo end ──────────────────────────────────────────────────────────────
  const handleDemoEnd = useCallback(() => {
    demoShownRef.current = currentTopicIdRef.current;
    speakQueued("¡Ahora tú! ¡Inténtalo!");
  }, [speakQueued]);

  // ── Replay demo button ────────────────────────────────────────────────────
  const handleReplayDemo = useCallback(() => {
    demoShownRef.current = null;
    setTracingKey(k => k + 1);
    const msg = "¡Mira cómo se hace!";
    setLastMessage(msg);
    speak(msg);
  }, [speak]);

  // ── Tracing completion ────────────────────────────────────────────────────
  const handleTracingComplete = useCallback(({ shapeScore, orderScore, passed, partial }) => {
    if (partial) return;

    const syllableLetters = getSyllableLetters(currentTopicId);
    const score = Math.round(((shapeScore + orderScore) / 2) * 100);

    if (syllableLetters) {
      const nextIdx = syllableLetterIdx + 1;
      if (nextIdx < syllableLetters.length) {
        setSyllableLetterIdx(nextIdx);
        setTracingKey((k) => k + 1);
        const msg = passed ? "¡Muy bien! 🌟" : "¡Casi! 💪 Inténtalo otra vez...";
        setLastMessage(msg);
        speak(msg);
        return;
      }
      setSyllableLetterIdx(0);
      setSyllableSayPhase(true);
      const syllableKey = syllableLetters.join("");
      const msg = passed
        ? `He trazado la sílaba ${syllableKey} y me ha salido bien (${score}% de acierto)`
        : `He intentado trazar la sílaba ${syllableKey} pero necesito practicar más (${score}%)`;
      sendMessage(msg);
      return;
    }

    if (passed) {
      failureStreakRef.current = 0;
    } else {
      failureStreakRef.current += 1;
      if (failureStreakRef.current >= 2) {
        failureStreakRef.current = 0;
        demoShownRef.current = null;
      }
    }

    // ── Registro de intento en el nivel actual ────────────────────────────
    const curLevelAttempts = [...levelAttempts[tracingLevel], passed].slice(-LEVEL_PASS_REQUIRED);
    setLevelAttempts(prev => prev.map((a, i) => i === tracingLevel ? curLevelAttempts : a));

    const allGreen = curLevelAttempts.length === LEVEL_PASS_REQUIRED
      && curLevelAttempts.every(Boolean);

    if (allGreen) {
      if (tracingLevel < 2) {
        // ── Avanzar al siguiente nivel (más difícil) ──────────────────────
        const nextLevel = tracingLevel + 1;
        setTracingLevel(nextLevel);
        // Limpiar los intentos del nuevo nivel para que empiece fresco
        setLevelAttempts(prev => prev.map((a, i) => i === nextLevel ? [] : a));
        setTracingKey(k => k + 1);
        const levelMsg = nextLevel === 1
          ? "¡Genial! ¡Ahora sin tantos puntos! 🌟🌟"
          : "¡Increíble! ¡Ahora el nivel más difícil! 🌟🌟🌟";
        setLastMessage(levelMsg);
        speak(levelMsg);
        return;
      } else {
        // ── Nivel difícil completado → reportar al agente (posible mastery) ─
        const charInfo = getCharData(currentTopicId);
        const key      = charInfo?.key ?? "";
        const isStroke = currentTopicId?.startsWith("trazo_");
        const subject  = isStroke ? `el trazo ${key}` : `la letra ${key}`;
        const msg = `He trazado ${subject} y me ha salido bien en todos los niveles (${score}% de acierto)`;
        sendMessage(msg);
        return;
      }
    }

    // ── Continuar en el mismo nivel ───────────────────────────────────────
    // Si los 3 huecos están llenos y no son todos verdes → mensaje especial + reset
    if (curLevelAttempts.length === LEVEL_PASS_REQUIRED) {
      setLevelAttempts(prev => prev.map((a, i) => i === tracingLevel ? [] : a));
      const msg = "¡Ánimo! Para subir de estrella necesitas tres círculos verdes. ¡Lo intentamos de nuevo!";
      setLastMessage(msg);
      speak(msg);
      setTracingKey((k) => k + 1);
      return;
    }
    setTracingKey((k) => k + 1);
    const msg = passed ? "¡Muy bien! 🌟 Otra vez..." : "¡Casi! 💪 Inténtalo otra vez...";
    setLastMessage(msg);
    speak(msg);
  }, [tracingLevel, levelAttempts, currentTopicId, syllableLetterIdx, speak, sendMessage]);


  // ── Derived values ────────────────────────────────────────────────────────
  const isPlacementInProgress = currentBeliefs?.placement_in_progress === true;

  // hintLevel viene directamente del nivel local (0=fácil→3, 1=medio→2, 2=difícil→1)
  const hintLevel         = 3 - tracingLevel;
  const tracingDifficulty = tracingLevel;

  const syllableLetters       = isPlacementInProgress ? null : getSyllableLetters(currentTopicId);
  const charData = isPlacementInProgress ? null
    : syllableLetters
      ? (syllableSayPhase ? null : getCharDataByKey(syllableLetters[syllableLetterIdx], tracingDifficulty))
      : getCharData(currentTopicId, tracingDifficulty);
  charDataRef.current = charData;

  const avatarState = speaking ? "speaking" : listening ? "listening" : loading ? "thinking" : "idle";
  const avatarSize  = charData ? 90 : 130;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "linear-gradient(180deg, #e8f4ff 0%, #f5faff 100%)",
      }}
    >
      {/* ── Mastery dialog ──────────────────────────────────────────────────── */}
      {masteryDialog && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "24px",
              padding: "28px 24px",
              maxWidth: "340px",
              width: "90vw",
              textAlign: "center",
              boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ fontSize: "56px", marginBottom: "8px" }}>⭐</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1e3a5f", marginBottom: "6px" }}>
              ¡Lo has conseguido!
            </div>
            <div style={{ fontSize: "15px", color: "#4a5568", marginBottom: "20px" }}>
              ¿Qué quieres hacer ahora?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                onClick={handleMasteryContinue}
                style={{ padding: "14px", borderRadius: "16px", border: "2px solid #dce8f5", background: "white", fontSize: "16px", cursor: "pointer", fontWeight: "500" }}
              >
                🔄 Seguir practicando
              </button>
              {masteryDialog.nextTopicId && (
                <button
                  onClick={handleMasteryNext}
                  style={{ padding: "14px", borderRadius: "16px", border: "none", background: "#4a90d9", color: "white", fontSize: "16px", cursor: "pointer", fontWeight: "bold" }}
                >
                  ➡️ Siguiente actividad
                </button>
              )}
              <button
                onClick={handleMasteryFreeDraw}
                style={{ padding: "14px", borderRadius: "16px", border: "none", background: "#f59e0b", color: "white", fontSize: "16px", cursor: "pointer", fontWeight: "bold" }}
              >
                🎨 Dibujo libre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Age-complete popup (for parents) ──────────────────────────────── */}
      {ageCompleteDialog && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 55,
            background: "rgba(0,0,0,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white", borderRadius: "24px", padding: "28px 24px",
              maxWidth: "360px", width: "90vw", textAlign: "center",
              boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ fontSize: "56px", marginBottom: "8px" }}>🎓</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1e3a5f", marginBottom: "8px" }}>
              ¡Mensaje para mamá o papá!
            </div>
            <div style={{ fontSize: "15px", color: "#4a5568", marginBottom: "20px", lineHeight: 1.5 }}>
              <strong>{student?.name}</strong> ha completado todas las actividades
              de <strong>{student?.age} años</strong>. ¿Deseas que continúe con
              las actividades de <strong>{(student?.age || 4) + 1} años</strong>?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                onClick={handleAgeAdvance}
                style={{ padding: "14px", borderRadius: "16px", border: "none", background: "#4a90d9", color: "white", fontSize: "16px", cursor: "pointer", fontWeight: "bold" }}
              >
                ✅ Sí, avanzar a {(student?.age || 4) + 1} años
              </button>
              <button
                onClick={() => setAgeCompleteDialog(false)}
                style={{ padding: "14px", borderRadius: "16px", border: "2px solid #dce8f5", background: "white", fontSize: "16px", cursor: "pointer" }}
              >
                ⏳ Seguir repasando por ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Topic picker overlay ───────────────────────────────────────────── */}
      {topicPickerOpen && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 60,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setTopicPickerOpen(false)}
        >
          <div
            style={{
              background: "white", borderRadius: "24px", padding: "20px",
              maxWidth: "360px", width: "92vw", maxHeight: "75vh", overflowY: "auto",
              boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: "18px", fontWeight: "bold", textAlign: "center", marginBottom: "14px" }}>
              ¿Qué quieres practicar?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {accessibleTopics.map(t => {
                const isLocked   = t.locked === true;
                const bgColor    = isLocked          ? "#f3f4f6"
                                 : t.mastered        ? "#f0fdf4"
                                 : t.attempts > 0 && t.success_rate < 0.5 ? "#fff1f2"
                                 : t.id === currentTopicId ? "#e8f0fb"
                                 : "white";
                const borderColor = isLocked         ? "#e0e0e0"
                                  : t.mastered       ? "#86efac"
                                  : t.id === currentTopicId ? "#4a90d9"
                                  : "#e0e0e0";
                return (
                  <button
                    key={t.id}
                    onClick={isLocked ? undefined : () => handleTopicSelect(t.id)}
                    style={{
                      padding: "12px 8px", borderRadius: "14px", cursor: isLocked ? "default" : "pointer",
                      border: `${t.id === currentTopicId ? "3px" : "2px"} solid ${borderColor}`,
                      background: bgColor,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                      fontSize: "13px", fontWeight: t.id === currentTopicId ? "bold" : "normal",
                      opacity: isLocked ? 0.55 : 1,
                      position: "relative",
                    }}
                  >
                    <span style={{ fontSize: "28px" }}>{isLocked ? "🔒" : t.emoji}</span>
                    <span style={{ textAlign: "center" }}>{t.display_name}</span>
                    {t.mastered && <span style={{ fontSize: "11px", color: "#15803d", fontWeight: "bold" }}>✅ Superado</span>}
                    {!t.mastered && t.attempts > 0 && !isLocked && (
                      <span style={{ fontSize: "11px", color: t.success_rate >= 0.5 ? "#b45309" : "#dc2626" }}>
                        {Math.round(t.success_rate * 100)}% acierto
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Tutorial overlay ───────────────────────────────────────────────── */}
      {tutorialStep !== null && TUTORIAL_STEPS[tutorialStep] && (() => {
        const step = TUTORIAL_STEPS[tutorialStep];
        // Support both left- and right-anchored spots (🔄 is right-anchored)
        const toCss = v => v == null ? undefined : typeof v === "string" ? v : `${v}px`;
        const spotStyle = {
          position: "fixed",
          top:    toCss(step.spot.top),
          bottom: toCss(step.spot.bottom),
          left:   toCss(step.spot.left),
          right:  toCss(tutorialStep === LEVEL_BADGE_TUTORIAL_STEP ? badgeRight - 4 : step.spot.right),
          width: `${step.spot.w}px`, height: `${step.spot.h}px`,
          borderRadius: step.spot.r ?? "50%",
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.76)",
          border: "3px solid rgba(255,255,255,0.9)",
          zIndex: 491, pointerEvents: "none",
          animation: "tutPulse 1.2s ease-in-out infinite",
        };
        const bubbleStyle = {
          position: "fixed",
          top:    toCss(step.bubble.top),
          bottom: toCss(step.bubble.bottom),
          left:   toCss(step.bubble.left),
          right:  toCss(tutorialStep === LEVEL_BADGE_TUTORIAL_STEP ? badgeRight - 4 : step.bubble.right),
          maxWidth: "230px",
          background: "white", borderRadius: "16px", padding: "14px 16px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          fontSize: "15px", fontWeight: "500", color: "#1e3a5f",
          zIndex: 492, pointerEvents: "none",
        };
        return (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 490, pointerEvents: "all" }}
            onClick={advanceTutorial}
          >
            <div style={spotStyle} />
            <style>{`
              @keyframes tutPulse {
                0%,100% { border-color: rgba(255,255,255,0.9); transform: scale(1); }
                50%      { border-color: rgba(255,230,80,1);   transform: scale(1.07); }
              }
            `}</style>
            <div style={bubbleStyle}>
              {step.hint}
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#888" }}>
                Toca la pantalla para continuar →
              </div>
              <div style={{ marginTop: "4px", display: "flex", gap: "4px" }}>
                {TUTORIAL_STEPS.map((_, i) => (
                  <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: i === tutorialStep ? "#4a90d9" : "#dce8f5" }} />
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 📚 Topic picker — visible when topic active OR during any tutorial step */}
      {(currentTopicId || tutorialStep !== null) && !masteryDialog && (
        <button
          onClick={tutorialStep !== null ? undefined : openTopicPicker}
          style={{ ...CTRL_BTN, top: "12px", left: "152px",
                   cursor: tutorialStep !== null ? "default" : "pointer",
                   zIndex: tutorialStep === 2 ? 492 : 300 }}
          title="Cambiar ejercicio"
        >
          📚
        </button>
      )}

      {/* ── ❓ Help / re-run tutorial — always visible, top row after 📚 ───── */}
      <button
        onClick={showTutorialAgain}
        style={{ ...CTRL_BTN, top: "12px", left: "222px" }}
        title="¿Qué es cada botón?"
      >
        ❓
      </button>

      {/* ── 🔄 Replay-demo — visible during tracing OR spotlighted in tutorial step 3 */}
      {(charData || tutorialStep === 3) && !masteryDialog && !coloringSubject && (
        <button
          onClick={tutorialStep !== null ? undefined : handleReplayDemo}
          style={{ ...CTRL_BTN, top: "12px", right: "12px", left: "auto",
                   cursor: tutorialStep !== null ? "default" : "pointer",
                   zIndex: tutorialStep === 3 ? 492 : 300 }}
          title="Ver demostración otra vez"
        >
          🔄
        </button>
      )}


      {/* ── Letter tracing — hidden while free-drawing ─────────────────────── */}
      {charData && !coloringSubject && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px",
          }}
        >
          <LetterTracing
            key={tracingKey}
            charData={charData}
            hintLevel={hintLevel}
            onComplete={handleTracingComplete}
            onDemoEnd={handleDemoEnd}
            skipInitialDemo={demoShownRef.current === currentTopicId}
            disabled={loading || speaking}
            isThinking={loading}
            minimal={true}
            title={currentTopicDisplayName}
          />
        </div>
      )}

      {/* ── Level progress badge (right side, shown during tracing OR tutorial step) ─ */}
      {(charData || tutorialStep === LEVEL_BADGE_TUTORIAL_STEP) && !coloringSubject && (
        <div
          ref={badgeRef}
          style={{
            position: "fixed",
            right: `${badgeRight}px`,
            top: 0,
            bottom: 0,
            marginTop: "auto",
            marginBottom: "auto",
            height: "fit-content",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            background: "rgba(255,255,255,0.95)",
            borderRadius: "20px",
            padding: "16px 14px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.16)",
            pointerEvents: "none",
          }}
        >
          {[0, 1, 2].map(lvl => {
            const isActive = lvl === tracingLevel;
            const isDone   = lvl < tracingLevel;
            const attempts = levelAttempts[lvl] ?? [];
            const allGreenDone = isDone || (isActive && attempts.length === LEVEL_PASS_REQUIRED && attempts.every(Boolean));
            return (
              <div
                key={lvl}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  opacity: !isDone && !isActive ? 0.30 : 1,
                  transition: "opacity 0.3s",
                }}
              >
                {/* Estrellas: lvl+1 rellenas, el resto vacías */}
                <div style={{ display: "flex", gap: "1px" }}>
                  {[0, 1, 2].map(si => (
                    <span key={si} style={{ fontSize: "20px", lineHeight: 1 }}>
                      {si <= lvl ? (allGreenDone ? "⭐" : "★") : "☆"}
                    </span>
                  ))}
                </div>
                {/* Separador */}
                <div style={{ width: "1px", height: "22px", background: "#d1d5db", margin: "0 4px" }} />
                {/* Círculos de intento */}
                {[0, 1, 2].map(ai => {
                  const val = attempts[ai];
                  const isNext = isActive && ai === attempts.length;
                  return (
                    <div
                      key={ai}
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: val === undefined ? "#e5e7eb" : val ? "#16a34a" : "#dc2626",
                        border: isNext ? "2px solid #4a90d9" : "2px solid transparent",
                        flexShrink: 0,
                        transition: "background 0.25s",
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Free drawing — inline, robot stays visible on top ─────────────── */}
      {coloringSubject && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            paddingTop: "80px",
            paddingLeft: "8px",
            paddingRight: "8px",
            paddingBottom: "8px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ColoringCanvas
            key={coloringSubject}
            inline
            subject={coloringSubject}
            disabled={speaking || loading}
            onBack={() => {
              setColoringSubject(null);
              const msg = "¡Qué bonito dibujo! ¿Continuamos?";
              setLastMessage(msg);
              speak(msg);
            }}
          />
        </div>
      )}

      {/* ── Avatar + bubble — fixed bottom-right ───────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          right: "16px",
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "8px",
          maxWidth: "300px",
        }}
      >
        {/* Interim STT transcript */}
        {interimTranscript && (
          <div
            style={{
              fontSize: "13px",
              color: "white",
              fontStyle: "italic",
              background: "rgba(220,38,38,0.82)",
              borderRadius: "12px",
              padding: "4px 10px",
            }}
          >
            🎙️ {interimTranscript}…
          </div>
        )}

        {/* Speech bubble + 🔊 replay button */}
        {lastMessage && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
            {/* 🔊 replay — replays last message via TTS */}
            <button
              onClick={() => speak(lastMessage)}
              title="Escuchar otra vez"
              style={{
                width: "36px", height: "36px", borderRadius: "50%",
                border: "none", background: "rgba(74,144,217,0.85)",
                color: "white", fontSize: "18px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                flexShrink: 0,
              }}
            >
              🔊
            </button>
            <div
              style={{
                position: "relative",
                background: "white",
                border: "2px solid #dce8f5",
                borderRadius: "20px 20px 4px 20px",
                padding: "12px 16px",
                fontSize: ageProfile <= 3 ? "17px" : "14px",
                color: "#1e3a5f",
                lineHeight: 1.5,
                boxShadow: "0 4px 20px rgba(74,144,217,0.18)",
                wordBreak: "break-word",
                maxWidth: "260px",
              }}
            >
              {lastMessage}
              {loading && <span style={{ color: "#4a90d9" }}> …</span>}
            </div>
          </div>
        )}

        <DiceBearAvatar
          seed={(student?.avatar_id && student.avatar_id !== "robot") ? student.avatar_id : (student?.name ?? "olibot")}
          state={avatarState}
          size={avatarSize}
        />
      </div>

      {/* ── Mic status indicator — always-on, no button, no emoji ─────────── */}
      {supported && (
        <div
          style={{
            position: "fixed",
            bottom: "22px",
            left: "22px",
            zIndex: 495,
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            background: listening ? "#22c55e" : speaking ? "#f59e0b" : "#cbd5e1",
            boxShadow: listening
              ? "0 0 0 5px rgba(34,197,94,0.22), 0 0 0 10px rgba(34,197,94,0.08)"
              : "none",
            transition: "background 0.3s, box-shadow 0.3s",
          }}
        />
      )}

    </div>
  );
}
