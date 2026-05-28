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
 *   📚 left:152 (ChatWindow — topic picker)  ← was wrongly at left:12, hidden behind 🏠
 *   🔄 right:12 (ChatWindow — replay demo)   ← visible only during tracing
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { useSpeech } from "../hooks/useSpeech";
import DiceBearAvatar from "./DiceBearAvatar";
import LetterTracing from "./LetterTracing";
import ColoringCanvas from "./ColoringCanvas";
import { getCharData, getSyllableLetters, getCharDataByKey } from "../data/letterData";
import { getRandomDifferentSubject } from "../data/coloringData";

const MAX_TURNS_BY_AGE   = { 3: 4,  4: 8,  5: 12 };
const REQUIRED_PRACTICES = { 3: 3,  4: 2,  5: 1  };

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
];

// Shared button style that matches App.jsx parent buttons
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
  const [practiceCount,     setPracticeCount]     = useState(0);
  const [tracingKey,        setTracingKey]        = useState(0);
  const [syllableLetterIdx, setSyllableLetterIdx] = useState(0);
  const [syllableSayPhase,  setSyllableSayPhase]  = useState(false);
  // Mastery dialog
  const [masteryDialog,     setMasteryDialog]     = useState(null); // { topicId, nextTopicId }
  // Free drawing
  const [coloringSubject,   setColoringSubject]   = useState(null);
  // Topic picker
  const [topicPickerOpen,    setTopicPickerOpen]    = useState(false);
  const [accessibleTopics,   setAccessibleTopics]   = useState([]);
  const [topicPickerPending, setTopicPickerPending] = useState(false);
  // Tutorial
  const [tutorialStep, setTutorialStep] = useState(null); // null=done, 0-3=active

  const ageProfile        = student ? Math.min(Math.max(parseInt(student.age) || 4, 3), 5) : 4;
  const maxTurns          = MAX_TURNS_BY_AGE[ageProfile]   ?? 12;
  const requiredPractices = REQUIRED_PRACTICES[ageProfile] ?? 1;

  // ── Voice ─────────────────────────────────────────────────────────────────
  const sendRef           = useRef(null);
  const speakRef          = useRef(null);    // always-current speak()
  const masteryDialogRef  = useRef(null);    // always-current masteryDialog state
  const sessionIdRef      = useRef(null);    // always-current sessionId
  const topicPickerOpenRef = useRef(false);  // mirrors topicPickerOpen for stable handleSilence
  const listenFnRef       = useRef(null);    // points to startListeningStable (set after useSpeech)
  const tutorialStepRef   = useRef(null);    // mirrors tutorialStep

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
    // During free drawing: only exit/change commands are processed
    if (coloringSubjectRef.current) {
      console.log("[handleTranscript] coloring mode, subject:", coloringSubjectRef.current, "text:", lower);
      if (/\b(salir|volver|terminar|ya terminé|fin|salgo)\b/i.test(lower)) {
        setColoringSubject(null);
        const msg = "¡Qué bonito dibujo! ¿Continuamos?";
        setLastMessage(msg);
        speakRef.current?.(msg);
      } else if (/\b(otro|cambiar|diferente|nuevo dibujo|otra cosa|cambia|cambiarlo)\b/i.test(lower)) {
        const next = getRandomDifferentSubject(coloringSubjectRef.current);
        setColoringSubject(next);
        const msg = "¡Aquí tienes otro dibujo!";
        setLastMessage(msg);
        speakRef.current?.(msg);
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
    setPracticeCount(0);
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
    const tid = setTimeout(() => advanceTutorial(), 8000);
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

  // Always-on: restart mic whenever it drops and we're not busy
  useEffect(() => {
    if (listening || speaking || loading || !supported) return;
    if (topicPickerOpenRef.current) return;
    const tid = setTimeout(() => startListeningStable(), 600);
    return () => clearTimeout(tid);
  }, [listening, speaking, loading, supported, startListeningStable]);

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
          }
          if (event.bdi_action === "offer_alternatives") {
            setTopicPickerPending(true);
          }
          if (event.bdi_action === "start_free_drawing") {
            setColoringSubject(event.free_drawing_subject || "perro");
          }
          setTurnCount((n) => n + 1);

          if (["attempt_answer", "tracing_complete"].includes(event.detected_intent)) {
            if (event.is_correct === true)
              setSessionStats((s) => ({ ...s, correct: s.correct + 1 }));
            else if (event.is_correct === false)
              setSessionStats((s) => ({ ...s, incorrect: s.incorrect + 1 }));
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

    const nextCount = practiceCount + 1;
    if (nextCount < requiredPractices) {
      setPracticeCount(nextCount);
      setTracingKey((k) => k + 1);
      const msg = passed ? "¡Muy bien! 🌟 Otra vez..." : "¡Casi! 💪 Inténtalo otra vez...";
      setLastMessage(msg);
      speak(msg);
      return;
    }

    setPracticeCount(0);
    const charInfo = getCharData(currentTopicId);
    const key      = charInfo?.key ?? "";
    const isStroke = currentTopicId?.startsWith("trazo_");
    const subject  = isStroke ? `el trazo ${key}` : `la letra ${key}`;
    const msg      = passed
      ? `He trazado ${subject} y me ha salido bien (${score}% de acierto)`
      : `He intentado trazar ${subject} pero necesito practicar más (${score}%)`;
    sendMessage(msg);
  }, [practiceCount, requiredPractices, currentTopicId, syllableLetterIdx, speak, sendMessage]);


  // ── Derived values ────────────────────────────────────────────────────────
  const isPlacementInProgress = currentBeliefs?.placement_in_progress === true;
  const syllableLetters       = isPlacementInProgress ? null : getSyllableLetters(currentTopicId);
  const charData = isPlacementInProgress ? null
    : syllableLetters
      ? (syllableSayPhase ? null : getCharDataByKey(syllableLetters[syllableLetterIdx]))
      : getCharData(currentTopicId);
  charDataRef.current = charData;

  const topicMastery  = currentBeliefs?.mastery?.[currentTopicId] ?? {};
  const topicAttempts = topicMastery.attempts ?? 0;
  const topicCorrect  = topicMastery.correct  ?? 0;
  const topicSR       = topicAttempts > 0 ? Math.round((topicCorrect / topicAttempts) * 100) : null;
  const hintLevel =
    ageProfile <= 3              ? 3 :
    topicSR === null || topicSR < 40 ? 3 :
    topicSR < 70                ? 2 : 1;

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
              {accessibleTopics.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTopicSelect(t.id)}
                  style={{
                    padding: "12px 8px", borderRadius: "14px", cursor: "pointer",
                    border: t.id === currentTopicId ? "3px solid #4a90d9" : "2px solid #e0e0e0",
                    background: t.mastered ? "#f0fdf4" : t.id === currentTopicId ? "#e8f0fb" : "white",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                    fontSize: "13px", fontWeight: t.id === currentTopicId ? "bold" : "normal",
                  }}
                >
                  <span style={{ fontSize: "28px" }}>{t.emoji}</span>
                  <span>{t.display_name}</span>
                  {t.mastered && <span style={{ fontSize: "11px", color: "#16a34a" }}>✓ Dominado</span>}
                  {!t.mastered && t.attempts > 0 && <span style={{ fontSize: "11px", color: "#f59e0b" }}>En progreso</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tutorial overlay ───────────────────────────────────────────────── */}
      {tutorialStep !== null && TUTORIAL_STEPS[tutorialStep] && (() => {
        const step = TUTORIAL_STEPS[tutorialStep];
        // Support both left- and right-anchored spots (🔄 is right-anchored)
        const spotStyle = {
          position: "fixed",
          top:    step.spot.top    != null ? `${step.spot.top}px`    : undefined,
          bottom: step.spot.bottom != null ? `${step.spot.bottom}px` : undefined,
          left:   step.spot.left   != null ? `${step.spot.left}px`   : undefined,
          right:  step.spot.right  != null ? `${step.spot.right}px`  : undefined,
          width: `${step.spot.w}px`, height: `${step.spot.h}px`,
          borderRadius: "50%",
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.76)",
          border: "3px solid rgba(255,255,255,0.9)",
          zIndex: 491, pointerEvents: "none",
          animation: "tutPulse 1.2s ease-in-out infinite",
        };
        const bubbleStyle = {
          position: "fixed",
          top:    step.bubble.top    != null ? `${step.bubble.top}px`    : undefined,
          bottom: step.bubble.bottom != null ? `${step.bubble.bottom}px` : undefined,
          left:   step.bubble.left   != null ? `${step.bubble.left}px`   : undefined,
          right:  step.bubble.right  != null ? `${step.bubble.right}px`  : undefined,
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

      {/* ── 📚 Topic picker — visible when topic active OR spotlighted in tutorial step 2 */}
      {(currentTopicId || tutorialStep === 2) && !masteryDialog && (
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
      {(charData || tutorialStep === 3) && !masteryDialog && (
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

      {/* ── Turn-limit badge — bottom-left ─────────────────────────────────── */}
      {turnCount >= maxTurns && (
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: "16px",
            zIndex: 30,
            fontSize: "28px",
            lineHeight: 1,
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
          }}
        >
          🌟🌟🌟
        </div>
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
            disabled={loading}
            minimal={true}
          />
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
