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
import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";
import { useSpeech } from "../hooks/useSpeech";
import DiceBearAvatar from "./DiceBearAvatar";
import LetterTracing from "./LetterTracing";
import ColoringCanvas from "./ColoringCanvas";
import CelebrationOverlay from "./CelebrationOverlay";
import ActivityPicker from "./ActivityPicker";
import EmotionPicker from "./EmotionPicker";
import LetterChoice from "./LetterChoice";
import RestBreakPicker from "./RestBreakPicker";
import { getCharData, getSyllableLetters, getCharDataByKey } from "../data/letterData";
import { getRandomDifferentSubject, subjectFromText, isAnimalSubject } from "../data/coloringData";

const MAX_TURNS_BY_AGE   = { 3: 4,  4: 8,  5: 12 };
// Niveles de dificultad de trazado: 0=fácil(muchos puntos), 1=medio, 2=difícil
// Para avanzar de nivel el niño necesita 3 intentos verdes (LEVEL_PASS_REQUIRED) seguidos.
const LEVEL_PASS_REQUIRED = 3;
const BADGE_W = 250; // badge panel width in px (stars + separator + circles + padding)

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

// Tutorial steps: ☰ menu → 🔄 replay → level badge (unified for all ages)
const TUTORIAL_STEPS = [
  {
    voice:  "Este botón de las rayitas tiene el menú. Desde ahí puedes ir a casa, ver el informe de mamá y papá, o repetir este tutorial. ¡Es el botón de opciones!",
    hint:   "Menú de opciones",
    spot:   { top: 12, left: 12, w: 88, h: 88 },
    bubble: { top: 112, left: 12 },
  },
  {
    voice:  "Con este botón puedes ver otra vez cómo se hace el ejercicio. ¡Úsalo si no te acuerdas cómo hacerlo!",
    hint:   "Ver la demostración otra vez",
    spot:   { top: 12, right: 12, w: 88, h: 88 },
    bubble: { top: 112, right: 12 },
  },
  {
    voice:  "¡Mira aquí a la derecha! Hay tres filas, una por nivel. Los circulitos se ponen verdes cuando lo haces bien. ¡Con tres circulitos verdes subes de nivel!",
    hint:   "Tus estrellas y niveles",
    spot:   { top: "calc(50vh - 70px)", right: 4, w: BADGE_W + 8, h: 160, r: "20px" },
    bubble: { top: "calc(50vh + 102px)", right: 4 },
  },
];

// Index of the tutorial step that explains the level badge (= TUTORIAL_STEPS.length - 1)
const LEVEL_BADGE_TUTORIAL_STEP = 2;

const CTRL_BTN = {
  position: "fixed",
  width: "88px", height: "88px", borderRadius: "50%",
  background: "rgba(255,255,255,0.88)", border: "2px solid rgba(0,0,0,0.10)",
  fontSize: "38px", cursor: "pointer", backdropFilter: "blur(8px)",
  boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 300,
};

const MENU_ITEM = {
  display: "flex", alignItems: "center", gap: "12px",
  width: "100%", padding: "15px 22px",
  background: "transparent", border: "none",
  fontSize: "22px", cursor: "pointer", textAlign: "left",
  color: "#1e3a5f", borderRadius: "0",
};


export default function ChatWindow({ players, isNewStudent = false, onExit, onReport }) {
  // ── Pair mode: derive active student from players array ───────────────────
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const student    = players[activePlayerIdx];
  const isPairMode = players.length > 1;

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
  const [tutorialStep, setTutorialStep] = useState(null); // null=done, 0-2=active
  const [menuOpen,     setMenuOpen]     = useState(false);
  // Session time banner
  const [sessionBanner, setSessionBanner] = useState(null); // null | "warning" | "end"

  const ageProfile = student ? Math.min(Math.max(parseInt(student.age) || 4, 3), 5) : 4;
  const maxTurns   = MAX_TURNS_BY_AGE[ageProfile] ?? 12;
  const ttsRate    = ({ 3: 0.72, 4: 0.80, 5: 0.88 })[ageProfile] ?? 0.85;
  const simplified = ageProfile <= 4; // hide parent-facing elements for young children
  // Session time limits by age (minutes)
  const sessionLimitMs = ({ 3: 15, 4: 20, 5: 25 })[ageProfile] * 60 * 1000;
  // Tutorial steps and badge index (unified for all ages — ☰ menu replaces individual buttons)
  const activeSteps    = TUTORIAL_STEPS;
  const activeBadgeStep = TUTORIAL_STEPS.length - 1; // = 2

  // Display name for the current topic (used as title in LetterTracing)
  const currentTopicDisplayName = accessibleTopics.find(t => t.id === currentTopicId)?.display_name ?? "";

  // ── Sprint B state ────────────────────────────────────────────────────────
  const [celebrationState,    setCelebrationState]    = useState(null);  // null | "small" | "big"
  const [emotionPickerActive, setEmotionPickerActive] = useState(false); // #9 check-in
  const [restBreakActive,     setRestBreakActive]     = useState(false); // #10 adaptive rest choice
  const [recognitionMode,     setRecognitionMode]     = useState(false); // #13 letter recognition
  const [activityPickerActive, setActivityPickerActive] = useState(false); // shown when bored/tired
  const [assessmentActive,    setAssessmentActive]    = useState(false); // #8B initial assessment

  // ── Voice ─────────────────────────────────────────────────────────────────
  const sendRef           = useRef(null);
  const speakRef          = useRef(null);    // always-current speak()
  const masteryDialogRef  = useRef(null);    // always-current masteryDialog state
  const sessionIdRef      = useRef(null);    // always-current sessionId
  const topicPickerOpenRef = useRef(false);  // mirrors topicPickerOpen for stable handleSilence
  const listenFnRef       = useRef(null);    // points to startListeningStable (set after useSpeech)
  const tutorialStepRef   = useRef(null);    // mirrors tutorialStep
  const badgeRef          = useRef(null);    // level-progress badge div (kept for future use)
  const tutorialVoiceSpokenRef = useRef(-1); // step whose voice was already spoken by advanceTutorial
  // Sprint B refs
  const prevTracingLevelRef  = useRef(-1);        // for detecting genuine level advances
  const currentBeliefsRef    = useRef({});        // mirrors currentBeliefs (for stable closures)
  const topicJustChangedRef  = useRef(false);     // suppresses level-advance celebration on topic reset
  const recognitionDoneRef   = useRef(new Set()); // topics where recognition was already shown
  const restCheckTimerRef    = useRef(null);      // #10 adaptive rest timer
  // Modal-screen blocking refs — prevent BDI calls while overlays are active
  const emotionPickerActiveRef  = useRef(false);
  const activityPickerActiveRef = useRef(false);
  const recognitionModeRef      = useRef(false);
  const restBreakActiveRef      = useRef(false);
  // Handler refs for voice-routing into overlays (updated via effects)
  const emotionPickerHandleRef  = useRef(null);
  const activityPickerHandleRef = useRef(null);
  const recognitionNudgeRef     = useRef(null);
  const restBreakContinueRef    = useRef(null);
  const restBreakLettersRef     = useRef(null);

  // ── Pair mode refs ────────────────────────────────────────────────────────
  const isPairModeRef          = useRef(false);
  const activePlayerIdxRef     = useRef(0);
  const tracingLevelRef        = useRef(0);     // mirrors tracingLevel for stable closures
  const levelAttemptsRef       = useRef([[], [], []]);
  const playerStateCacheRef    = useRef(players.map(() => null));
  const switchPlayerRef        = useRef(null);  // stable function ref
  const lastHandledPlayerIdxRef = useRef(-1);   // tracks last idx the student-init handled

  const [badgeRight, setBadgeRight] = useState(8);
  const [badgeRect,  setBadgeRect]  = useState(null); // real DOM rect for spotlight

  // ── Session time limit ─────────────────────────────────────────────────────
  useEffect(() => {
    const start   = Date.now();
    const WARNING = sessionLimitMs * 0.75;
    let warnedRef = false;
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      if (!warnedRef && elapsed >= WARNING) {
        warnedRef = true;
        setSessionBanner("warning");
        speakRef.current?.("Llevamos un buen rato juntos. ¡Lo has hecho genial! Casi terminamos por hoy.");
      }
      if (elapsed >= sessionLimitMs) {
        clearInterval(id);
        setSessionBanner("end");
        speakRef.current?.("¡Hasta la próxima! Has trabajado muy bien hoy.");
        setTimeout(() => onExit?.(), 4000);
      }
    }, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLimitMs]);

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

  // ── Badge spotlight — read real DOM rect when step 4 activates ────────────
  useLayoutEffect(() => {
    if (tutorialStep !== activeBadgeStep) return;
    const update = () => {
      if (badgeRef.current) setBadgeRect(badgeRef.current.getBoundingClientRect());
    };
    const timer = setTimeout(update, 60); // wait one frame for badge to render
    window.addEventListener("resize", update);
    return () => { clearTimeout(timer); window.removeEventListener("resize", update); };
  }, [tutorialStep]);

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

    // ── Block BDI when modal overlays are active — route voice to them instead ──
    if (recognitionModeRef.current) {
      // Recognition is tap-based; any speech just gets a gentle nudge
      recognitionNudgeRef.current?.();
      return;
    }
    if (emotionPickerActiveRef.current) {
      if      (/bien|contento|feliz|genial|chachi|muy bien/i.test(lower))      emotionPickerHandleRef.current?.("happy");
      else if (/normal|regular|igual/i.test(lower))                             emotionPickerHandleRef.current?.("neutral");
      else if (/enfadado|enojado|malo|rabia|enfado|frustrad/i.test(lower))      emotionPickerHandleRef.current?.("angry");
      else if (/cansado|canso|sueño|dormid|aburrido|quiero parar/i.test(lower)) emotionPickerHandleRef.current?.("tired");
      return;
    }
    if (activityPickerActiveRef.current) {
      if      (/dibujar|pintar|dibujo|colorear/i.test(lower))  activityPickerHandleRef.current?.({ type: "draw" });
      else if (/seguir|quedar|aquí|mismo|esto/i.test(lower))   activityPickerHandleRef.current?.({ type: "stay" });
      return;
    }
    if (restBreakActiveRef.current) {
      if      (/dibujar|pintar|seguir|más|continuar/i.test(lower)) restBreakContinueRef.current?.();
      else if (/letra|volver|terminar|practicar/i.test(lower))     restBreakLettersRef.current?.();
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
        if (reqSubject && isAnimalSubject(reqSubject) && reqSubject !== coloringSubjectRef.current) {
          setColoringSubject(reqSubject);
          const msg = `¡Vamos a dibujar un ${reqSubject}!`;
          setLastMessage(msg);
          speakRef.current?.(msg);
        } else if (reqSubject && !isAnimalSubject(reqSubject)) {
          // Non-animal subject requested: redirect to animals
          const msg = "Solo tengo animales para colorear 🐾 ¡Dime qué animal quieres pintar!";
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
      setActivityPickerActive(true);
      const msg = "¡Vale! ¿Qué quieres hacer?";
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
  } = useSpeech({ onTranscript: handleTranscript, onSilence: handleSilence, ttsRate });

  speakRef.current      = speak;              // keep refs current after useSpeech
  listenFnRef.current   = startListeningStable;

  const prevSpeakingRef    = useRef(false);
  const prevLoadingRef     = useRef(false);
  const charDataRef        = useRef(null);
  const coloringSubjectRef = useRef(null);

  // ── Initialise on student change ─────────────────────────────────────────
  useEffect(() => {
    if (!student) return;

    // ── Pair mode: turn switch (restore / first-time init for this player) ─
    const isPairTurnSwitch =
      isPairModeRef.current &&
      lastHandledPlayerIdxRef.current >= 0 &&         // not the very first render
      activePlayerIdx !== lastHandledPlayerIdxRef.current;

    lastHandledPlayerIdxRef.current = activePlayerIdx;

    if (isPairTurnSwitch) {
      const saved = playerStateCacheRef.current[activePlayerIdx];
      api.getAccessibleTopics(student.id).then(setAccessibleTopics).catch(console.error);

      if (saved) {
        // Restore previous session state for this player
        setCurrentTopicId(saved.currentTopicId);
        setTracingLevel(saved.tracingLevel);
        setLevelAttempts(saved.levelAttempts);
        setCurrentBeliefs(saved.currentBeliefs);
        setSessionId(saved.sessionId);
        currentBeliefsRef.current   = saved.currentBeliefs;
        prevTracingLevelRef.current  = saved.prevTracingLevel;
      } else {
        // First time this player appears in this pair session
        setCurrentTopicId(null);
        setSessionId(null);
        setCurrentBeliefs(student.beliefs || {});
        currentBeliefsRef.current  = student.beliefs || {};
        setTracingLevel(0);
        setLevelAttempts([[], [], []]);
        prevTracingLevelRef.current = 0;
        setTimeout(() => { if (sendRef.current) sendRef.current("hola"); }, 500);
      }

      // Always reset session stats and clear every overlay on turn switch
      setSessionStats({ correct: 0, incorrect: 0, hints: 0 });
      setColoringSubject(null);
      coloringSubjectRef.current    = null;
      setRecognitionMode(false);
      recognitionModeRef.current    = false;
      setEmotionPickerActive(false);
      emotionPickerActiveRef.current = false;
      setRestBreakActive(false);
      restBreakActiveRef.current    = false;
      setActivityPickerActive(false);
      activityPickerActiveRef.current = false;
      setCelebrationState(null);
      setMasteryDialog(null);
      if (restCheckTimerRef.current) clearTimeout(restCheckTimerRef.current);
      restCheckTimerRef.current = null;
      return;
    }

    // ── Normal (non-pair) student init ────────────────────────────────────
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
    currentBeliefsRef.current = student.beliefs || {};
    // Load accessible topics for TopicNavBar in background
    api.getAccessibleTopics(student.id).then(setAccessibleTopics).catch(console.error);

    // #8B — activate assessment mode if flagged in beliefs
    if (student.beliefs?.needs_assessment) {
      setAssessmentActive(true);
      // Clear the flag so it doesn't re-trigger on next session
      const clearedBeliefs = { ...student.beliefs, needs_assessment: false };
      currentBeliefsRef.current = clearedBeliefs;
      setCurrentBeliefs(clearedBeliefs);
      api.updateStudentBeliefs(student.id, clearedBeliefs).catch(console.error);
    } else {
      setAssessmentActive(false);
    }

    const tutKey = `olibot_tutorial_${student.id}`;
    const showTutorial = isNewStudent || !localStorage.getItem(tutKey);
    console.log("[TUTORIAL] student.id:", student.id, "isNewStudent:", isNewStudent, "tutKey:", tutKey, "stored:", localStorage.getItem(tutKey), "→ showTutorial:", showTutorial);
    if (showTutorial) {
      // Nuevo estudiante: tutorial primero, BDI arranca cuando el tutorial termina
      speak(welcome);   // only speak welcome when the tutorial will show
      const tid = setTimeout(() => {
        console.log("[TUTORIAL] Firing setTutorialStep(0)");
        setTutorialStep(0);
      }, 2200);
      return () => clearTimeout(tid);
    } else {
      // Estudiante conocido: el BDI ya saluda — no hablar bienvenida para evitar solapamiento
      const tid = setTimeout(() => { if (sendRef.current) sendRef.current("hola"); }, 1200);
      return () => clearTimeout(tid);
    }
  }, [student, activePlayerIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Demo-shown tracking
  const demoShownRef    = useRef(null);
  const failureStreakRef = useRef(0);
  const currentTopicIdRef = useRef(currentTopicId);
  useEffect(() => { currentTopicIdRef.current = currentTopicId; }, [currentTopicId]);

  // Reset practice counter, syllable step on topic change + queue tutorial text
  const prevTopicIdRef = useRef(null);
  useEffect(() => {
    // Restore saved subnivel progress if available (#5), otherwise reset to 0
    const saved = currentBeliefsRef.current?.topics_progress?.[currentTopicId];
    const restoredLevel = saved?.tracing_level ?? 0;
    setTracingLevel(restoredLevel);
    setLevelAttempts(saved?.level_attempts ?? [[], [], []]);
    setSyllableLetterIdx(0);
    setSyllableSayPhase(false);
    setTracingKey((k) => k + 1);
    demoShownRef.current    = null;
    failureStreakRef.current = 0;
    // Set prev level synchronously so the [tracingLevel] effect detects the first 0→1 advance
    prevTracingLevelRef.current = restoredLevel;
    // Mark that this level change is from a topic reset (not a genuine advance)
    topicJustChangedRef.current = true;
    // Show recognition exercise for new letter/number topics (#13)
    if (currentTopicId && !currentTopicId.startsWith("trazo_") &&
        !recognitionDoneRef.current.has(currentTopicId) && !saved) {
      setRecognitionMode(true);
      const charKey = getCharData(currentTopicId)?.key;
      if (charKey) setTimeout(() => speakRef.current?.(`¿Dónde está la letra ${charKey}?`), 600);
    }

    if (currentTopicId && currentTopicId !== prevTopicIdRef.current) {
      const wasFirstTopic = prevTopicIdRef.current === null;
      prevTopicIdRef.current = currentTopicId;
      const tut = getCharData(currentTopicId)?.tutorial;
      // Skip tutorial voice on the very first topic assignment (BDI greeting already
      // introduces the exercise; speaking tutorial mid-stream causes triple overlap).
      if (tut && !wasFirstTopic) {
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
  useEffect(() => { currentBeliefsRef.current   = currentBeliefs;    }, [currentBeliefs]);
  // Modal-screen refs — kept in sync so stable handleTranscript can read them
  useEffect(() => { emotionPickerActiveRef.current  = emotionPickerActive;  }, [emotionPickerActive]);
  useEffect(() => { activityPickerActiveRef.current = activityPickerActive; }, [activityPickerActive]);
  useEffect(() => { recognitionModeRef.current      = recognitionMode;      }, [recognitionMode]);
  useEffect(() => { restBreakActiveRef.current      = restBreakActive;      }, [restBreakActive]);
  // Pair mode ref mirrors
  useEffect(() => { isPairModeRef.current       = isPairMode;        }, [isPairMode]);
  useEffect(() => { activePlayerIdxRef.current  = activePlayerIdx;   }, [activePlayerIdx]);
  useEffect(() => { tracingLevelRef.current     = tracingLevel;      }, [tracingLevel]);
  useEffect(() => { levelAttemptsRef.current    = levelAttempts;     }, [levelAttempts]);

  // Save subnivel progress to DB when it changes (debounced) — #5
  useEffect(() => {
    if (!currentTopicId || !student) return;
    const timer = setTimeout(() => {
      const existing = currentBeliefsRef.current ?? {};
      const newBeliefs = {
        ...existing,
        topics_progress: {
          ...(existing.topics_progress ?? {}),
          [currentTopicId]: { tracing_level: tracingLevel, level_attempts: levelAttempts },
        },
      };
      currentBeliefsRef.current = newBeliefs;
      setCurrentBeliefs(newBeliefs);
      api.updateStudentBeliefs(student.id, newBeliefs).catch(console.error);
    }, 800);
    return () => clearTimeout(timer);
  }, [tracingLevel, levelAttempts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Celebrate when tracingLevel genuinely advances (not on topic reset) — #6
  useEffect(() => {
    if (topicJustChangedRef.current) {
      // prevTracingLevelRef already set synchronously in [currentTopicId] effect
      topicJustChangedRef.current = false;
      return;
    }
    if (tracingLevel > prevTracingLevelRef.current) {
      setCelebrationState("big");  // cleared by CelebrationOverlay.onDone
      // Show emotion check-in after the celebration — #9
      setTimeout(() => setEmotionPickerActive(true), 2800);
    }
    prevTracingLevelRef.current = tracingLevel;
  }, [tracingLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Adaptive rest: start countdown when entering free drawing — #10
  useEffect(() => {
    if (restCheckTimerRef.current) clearTimeout(restCheckTimerRef.current);
    restCheckTimerRef.current = null;
    setRestBreakActive(false);
    if (!coloringSubject) return;
    restCheckTimerRef.current = setTimeout(() => {
      if (coloringSubjectRef.current) {
        setRestBreakActive(true);
        speakRef.current?.("¿Seguimos dibujando o volvemos a las letras?");
      }
    }, 3 * 60 * 1000); // 3 min
    return () => { if (restCheckTimerRef.current) clearTimeout(restCheckTimerRef.current); };
  }, [coloringSubject]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh accessible topics after topic changes (new unlocks) — #4
  useEffect(() => {
    if (!student || !currentTopicId) return;
    api.getAccessibleTopics(student.id).then(setAccessibleTopics).catch(console.error);
  }, [currentTopicId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close open popups when the child enters free drawing
  // Also speak a short welcome so the child knows about the drawing picker button
  const prevColoringSubjectRef = useRef(null);
  useEffect(() => {
    const wasColoring = !!prevColoringSubjectRef.current;
    const isColoring  = !!coloringSubject;

    if (isColoring && !wasColoring) {
      // Just entered coloring mode — give the child a hint about the picker pill
      setTimeout(() => speakRef.current?.("¡A pintar! Toca el botón amarillo para elegir otro dibujo."), 1400);
      // #20 — log coloring_start checkpoint
      if (student) api.createEmotionalCheckpoint(student.id, "coloring_start").catch(console.error);
    } else if (!isColoring && wasColoring && student) {
      // Returned to tracing from coloring
      // #20 — log tracing_resume checkpoint
      api.createEmotionalCheckpoint(student.id, "tracing_resume").catch(console.error);
    }

    prevColoringSubjectRef.current = coloringSubject;
    if (!coloringSubject) return;
    setMasteryDialog(null);
    setTopicPickerOpen(false);
  }, [coloringSubject]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Tutorial: speak each step and auto-advance. Speaking is skipped here if
  // advanceTutorial() already called speak() within the click handler (iOS/Android TTS fix).
  useEffect(() => {
    if (tutorialStep === null) return;
    const step = activeSteps[tutorialStep];
    if (!step) return;
    if (tutorialVoiceSpokenRef.current === tutorialStep) {
      tutorialVoiceSpokenRef.current = -1; // already spoken — just set the auto-advance timer
    } else {
      speakRef.current?.(step.voice);
    }
    // Badge step has longer text → give it more time
    const autoAdvanceMs = tutorialStep === activeBadgeStep ? 16000 : 9000;
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

    // Derive current screen for backend context-awareness
    const currentScreen = coloringSubjectRef.current ? "drawing"
      : recognitionModeRef.current     ? "recognition"
      : emotionPickerActiveRef.current  ? "emotion_picker"
      : activityPickerActiveRef.current ? "activity_picker"
      : assessmentActive                ? "assessment_mode"
      : "tracing";

    const sentenceEnd = /^([\s\S]+?[.!?])(\s|$)/;
    let accumulated = "";
    let ttsBuffer   = "";
    let firstQueued = false;

    try {
      for await (const event of api.sendMessageStream(student.id, trimmed, sessionId, currentScreen)) {

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
          const prevSid = sessionIdRef.current;
          setSessionId(event.session_id);
          // #20 — log session_start checkpoint when a new BDI session is created
          if (event.session_id && event.session_id !== prevSid && student) {
            api.createEmotionalCheckpoint(student.id, "session_start").catch(console.error);
          }
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
    const prev = tutorialStepRef.current;
    if (prev === null) return;
    const next = prev + 1;
    if (next >= activeSteps.length) {
      if (student) localStorage.setItem(`olibot_tutorial_${student.id}`, "1");
      // Cancel tutorial TTS, then start BDI after a comfortable pause
      window.speechSynthesis?.cancel();
      setTimeout(() => { if (sendRef.current) sendRef.current("hola"); }, 2000);
      setTutorialStep(null);
      return;
    }
    // Speak NEXT step voice synchronously (inside click handler → iOS/Android TTS fix)
    const nextStep = activeSteps[next];
    if (nextStep) {
      tutorialVoiceSpokenRef.current = next;
      speakRef.current?.(nextStep.voice);
    }
    setTutorialStep(next);
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
      if (isPairModeRef.current) setTimeout(() => switchPlayerRef.current?.(), 2500);
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
        if (isPairModeRef.current) setTimeout(() => switchPlayerRef.current?.(), 2500);
        return;
      } else {
        // ── Nivel difícil completado → reportar al agente (posible mastery) ─
        const charInfo = getCharData(currentTopicId);
        const key      = charInfo?.key ?? "";
        const isStroke = currentTopicId?.startsWith("trazo_");
        const subject  = isStroke ? `el trazo ${key}` : `la letra ${key}`;
        const msg = `He trazado ${subject} y me ha salido bien en todos los niveles (${score}% de acierto)`;
        sendMessage(msg);
        if (isPairModeRef.current) setTimeout(() => switchPlayerRef.current?.(), 2500);
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
      if (isPairModeRef.current) setTimeout(() => switchPlayerRef.current?.(), 2500);
      return;
    }
    setTracingKey((k) => k + 1);
    const msg = passed ? "¡Muy bien! 🌟 Otra vez..." : "¡Casi! 💪 Inténtalo otra vez...";
    setLastMessage(msg);
    speak(msg);
    // Small avatar celebration on correct answer — #6
    if (passed) {
      setCelebrationState("small");
      setTimeout(() => setCelebrationState(null), 900);
    }
    if (isPairModeRef.current) setTimeout(() => switchPlayerRef.current?.(), 2500);
  }, [tracingLevel, levelAttempts, currentTopicId, syllableLetterIdx, speak, sendMessage]);

  // ── Pair mode: switch active player ──────────────────────────────────────
  const switchPlayer = useCallback(() => {
    if (!isPairModeRef.current) return;
    const currentIdx = activePlayerIdxRef.current;
    const nextIdx    = 1 - currentIdx;
    const currentPlayer = players[currentIdx];
    const nextPlayer    = players[nextIdx];

    // Save current player state
    playerStateCacheRef.current[currentIdx] = {
      currentTopicId:  currentTopicIdRef.current,
      tracingLevel:    tracingLevelRef.current,
      levelAttempts:   levelAttemptsRef.current,
      currentBeliefs:  currentBeliefsRef.current,
      sessionId:       sessionIdRef.current,
      prevTracingLevel: prevTracingLevelRef.current,
    };

    // Announce transition (OLIBOT voice only — no visual banner)
    speakRef.current?.(`¡Muy bien, ${currentPlayer.name}! Ahora le toca a ${nextPlayer.name}.`);

    // Switch player after announcement completes (~2.5 s)
    setTimeout(() => setActivePlayerIdx(nextIdx), 2500);
  }, [players]); // players is stable (from App state)

  // Keep switchPlayerRef always pointing to the latest switchPlayer
  useEffect(() => { switchPlayerRef.current = switchPlayer; }, [switchPlayer]);
  const handleEmotionSelect = useCallback((emotion) => {
    emotionPickerActiveRef.current = false; // update ref immediately (avoid transition window)
    setEmotionPickerActive(false);
    // #20 — log emotional checkpoint after level-up check-in
    if (student) api.createEmotionalCheckpoint(student.id, "post_levelup", emotion).catch(console.error);
    if (emotion === "angry" || emotion === "tired") {
      // Show activity picker so child chooses between alternatives or free drawing
      activityPickerActiveRef.current = true;
      setActivityPickerActive(true);
      const msg = emotion === "tired"
        ? "¡Tranqui! ¿Qué quieres hacer ahora?"
        : "¡Vamos a cambiar un poco! ¿Qué te apetece?";
      setLastMessage(msg);
      speak(msg);
    } else {
      const msg = emotion === "happy" ? "¡Qué bien! ¡Seguimos! 🌟" : "¡Vamos a seguir! 💪";
      setLastMessage(msg);
      speak(msg);
    }
  }, [speak]);
  useEffect(() => { emotionPickerHandleRef.current = handleEmotionSelect; }, [handleEmotionSelect]);

  // ── Activity picker handler ───────────────────────────────────────────────
  const handleActivitySelect = useCallback(({ type, topicId }) => {
    activityPickerActiveRef.current = false; // update ref immediately
    setActivityPickerActive(false);
    if (type === "draw") {
      coloringSubjectRef.current = "perro"; // update ref immediately
      setColoringSubject("perro");
      const msg = "¡A pintar! 🎨";
      setLastMessage(msg);
      speak(msg);
    } else if (type === "topic" && topicId) {
      handleTopicSelect(topicId);
    } else {
      // Stay
      const msg = "¡Dale, seguimos! 💪";
      setLastMessage(msg);
      speak(msg);
    }
  }, [speak, handleTopicSelect]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { activityPickerHandleRef.current = handleActivitySelect; }, [handleActivitySelect]);

  // ── Rest break handlers (#10) ─────────────────────────────────────────────
  const handleRestContinueDraw = useCallback(() => {
    restBreakActiveRef.current = false;
    setRestBreakActive(false);
    // Restart the 3-min timer
    restCheckTimerRef.current = setTimeout(() => {
      if (coloringSubjectRef.current) {
        setRestBreakActive(true);
        speakRef.current?.("¿Seguimos dibujando o volvemos a las letras?");
      }
    }, 3 * 60 * 1000);
    const msg = "¡Sigue pintando! 🎨";
    setLastMessage(msg);
    speak(msg);
  }, [speak]);
  useEffect(() => { restBreakContinueRef.current = handleRestContinueDraw; }, [handleRestContinueDraw]);

  const handleRestGoToLetters = useCallback(() => {
    restBreakActiveRef.current = false;
    setRestBreakActive(false);
    setColoringSubject(null);
    const msg = "¡Volvemos a las letras! 🔤";
    setLastMessage(msg);
    speak(msg);
  }, [speak]);
  useEffect(() => { restBreakLettersRef.current = handleRestGoToLetters; }, [handleRestGoToLetters]);

  // ── Recognition mode handlers (#13) ──────────────────────────────────────
  const handleRecognitionCorrect = useCallback(() => {
    recognitionDoneRef.current.add(currentTopicId);
    recognitionModeRef.current = false; // update immediately
    setRecognitionMode(false);
    const msg = "¡Muy bien! Ahora vamos a trazarla. 🖊️";
    setLastMessage(msg);
    speak(msg);
  }, [currentTopicId, speak]);

  const handleRecognitionSkip = useCallback(() => {
    recognitionDoneRef.current.add(currentTopicId);
    recognitionModeRef.current = false;
    setRecognitionMode(false);
  }, [currentTopicId]);

  const handleRecognitionNudge = useCallback(() => {
    speakRef.current?.("¡Venga! Toca una de las letras. ¡No pasa nada si te equivocas! 😊");
  }, []);
  useEffect(() => { recognitionNudgeRef.current = handleRecognitionNudge; }, [handleRecognitionNudge]);

  // ── Speak when emotion/activity/rest pickers open ────────────────────────
  useEffect(() => {
    if (!emotionPickerActive) return;
    // Speak the intro question; each option label is spoken by EmotionPicker via onHighlight
    const tid = setTimeout(() => speakRef.current?.("¿Cómo estás ahora mismo?"), 300);
    return () => clearTimeout(tid);
  }, [emotionPickerActive]);

  useEffect(() => {
    if (!activityPickerActive) return;
    // Speak the intro question; each option label is spoken by ActivityPicker via onHighlight
    const tid = setTimeout(() => speakRef.current?.("¿Qué hacemos?"), 300);
    return () => clearTimeout(tid);
  }, [activityPickerActive]);

  useEffect(() => {
    // Initial question is spoken by the 3-min timer callback.
    // Each button label is spoken by RestBreakPicker via onHighlight — no extra timers needed here.
  }, [restBreakActive]);


  // ── Derived values ────────────────────────────────────────────────────────
  const isPlacementInProgress = currentBeliefs?.placement_in_progress === true;

  // hintLevel viene directamente del nivel local (0=fácil→3, 1=medio→2, 2=difícil→1)
  const hintLevel         = 3 - tracingLevel;
  const tracingDifficulty = tracingLevel;

  const syllableLetters       = isPlacementInProgress ? null : getSyllableLetters(currentTopicId);
  const charData = useMemo(() => {
    if (isPlacementInProgress) return null;
    if (syllableLetters) {
      if (syllableSayPhase) return null;
      return getCharDataByKey(syllableLetters[syllableLetterIdx], tracingDifficulty);
    }
    return getCharData(currentTopicId, tracingDifficulty);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlacementInProgress, syllableSayPhase, syllableLetterIdx, tracingDifficulty, currentTopicId]);
  charDataRef.current = charData;

  const avatarState = speaking ? "speaking" : listening ? "listening" : loading ? "thinking" : "idle";
  const avatarSize  = charData ? 160 : 200;

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
      {/* ── Pair mode indicator: two small avatars, active player highlighted ── */}
      {isPairMode && (
        <div style={{
          position: "fixed", top: 12, left: 112, zIndex: 40,
          display: "flex", gap: 6, alignItems: "center",
        }}>
          {players.map((p, i) => {
            const seed = p.avatar_id && p.avatar_id !== "robot" ? p.avatar_id : p.name;
            const isActive = i === activePlayerIdx;
            return (
              <div key={p.id} style={{
                borderRadius: "50%",
                border: isActive ? "3px solid #f59e0b" : "2px solid rgba(255,255,255,0.4)",
                boxShadow: isActive ? "0 0 0 4px rgba(245,158,11,0.35)" : "none",
                transition: "border 0.35s, box-shadow 0.35s",
                flexShrink: 0,
              }}>
                <DiceBearAvatar seed={seed} size={48} state="idle" />
              </div>
            );
          })}
        </div>
      )}
      {/* ── Assessment mode badge (#8B) ─────────────────────────────────────── */}
      {assessmentActive && (
        <div style={{
          position: "fixed", top: isPairMode ? 72 : 12, left: 112, zIndex: 40,
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(245,158,11,0.92)", borderRadius: "20px",
          padding: "4px 12px 4px 8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}>
          <span style={{ fontSize: 16 }}>🎯</span>
          <span style={{ fontSize: 12, fontWeight: "bold", color: "white" }}>Evaluando</span>
          <button
            onClick={() => setAssessmentActive(false)}
            style={{ marginLeft: 4, background: "rgba(255,255,255,0.3)", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 11, color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}
          >✕</button>
        </div>
      )}
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
            <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "8px" }}>
              <button
                onClick={handleMasteryContinue}
                title="Seguir practicando"
                style={{ width: "80px", height: "80px", borderRadius: "50%", border: "3px solid #dce8f5", background: "white", fontSize: "40px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
              >
                🔄
              </button>
              {masteryDialog.nextTopicId && (
                <button
                  onClick={handleMasteryNext}
                  title="Siguiente actividad"
                  style={{ width: "80px", height: "80px", borderRadius: "50%", border: "none", background: "#4a90d9", fontSize: "40px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.22)" }}
                >
                  ⏭️
                </button>
              )}
              <button
                onClick={handleMasteryFreeDraw}
                title="Dibujo libre"
                style={{ width: "80px", height: "80px", borderRadius: "50%", border: "none", background: "#f59e0b", fontSize: "40px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.22)" }}
              >
                🎨
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
      {tutorialStep !== null && activeSteps[tutorialStep] && (() => {
        const step = activeSteps[tutorialStep];
        // Support both left- and right-anchored spots (🔄 is right-anchored)
        const toCss = v => v == null ? undefined : typeof v === "string" ? v : `${v}px`;
        const SP = 6; // spotlight padding around badge
        const useBR = tutorialStep === activeBadgeStep && badgeRect;
        const spotStyle = {
          position: "fixed",
          top:    useBR ? `${badgeRect.top    - SP}px` : toCss(step.spot.top),
          bottom: useBR ? undefined              : toCss(step.spot.bottom),
          left:   useBR ? `${badgeRect.left   - SP}px` : toCss(step.spot.left),
          right:  useBR ? undefined              : toCss(tutorialStep === activeBadgeStep ? badgeRight - 4 : step.spot.right),
          width:  useBR ? `${badgeRect.width  + 2*SP}px` : `${step.spot.w}px`,
          height: useBR ? `${badgeRect.height + 2*SP}px` : `${step.spot.h}px`,
          borderRadius: step.spot.r ?? "50%",
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.76)",
          border: "3px solid rgba(255,255,255,0.9)",
          zIndex: 491, pointerEvents: "none",
          animation: "tutPulse 1.2s ease-in-out infinite",
        };
        const bubbleStyle = {
          position: "fixed",
          top:    useBR ? `${badgeRect.bottom + 16}px` : toCss(step.bubble.top),
          bottom: useBR ? undefined : toCss(step.bubble.bottom),
          left:   useBR ? `${badgeRect.left - SP}px`   : toCss(step.bubble.left),
          right:  useBR ? undefined : toCss(tutorialStep === activeBadgeStep ? badgeRight - 4 : step.bubble.right),
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
                {activeSteps.map((_, i) => (
                  <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: i === tutorialStep ? "#4a90d9" : "#dce8f5" }} />
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── ☰ Menu button ──────────────────────────────────────────────── */}
      {menuOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 498 }}
          onClick={() => setMenuOpen(false)}
        />
      )}
      <button
        onClick={tutorialStep !== null ? advanceTutorial : () => setMenuOpen(o => !o)}
        style={{ ...CTRL_BTN, top: "12px", left: "12px",
                 zIndex: tutorialStep === 0 ? 492 : 499 }}
        title="Menú"
      >
        ☰
      </button>
      {menuOpen && tutorialStep === null && (
        <div style={{
          position: "fixed", top: "114px", left: "12px", zIndex: 499,
          background: "rgba(255,255,255,0.97)",
          borderRadius: "18px", padding: "8px 0",
          boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
          minWidth: "200px",
          border: "2px solid rgba(0,0,0,0.08)",
        }}>
          <button onClick={() => { setMenuOpen(false); onExit?.(); }}   style={MENU_ITEM}>🏠 Casa</button>
          {!simplified && <button onClick={() => { setMenuOpen(false); onReport?.(student); }} style={MENU_ITEM}>📋 Informe</button>}
          {!simplified && !!currentTopicId && !masteryDialog && (
            <button onClick={() => { setMenuOpen(false); openTopicPicker(); }} style={MENU_ITEM}>📚 Ejercicio</button>
          )}
          {!simplified && (
            <button
              onClick={() => {
                setMenuOpen(false);
                if (!student) return;
                api.requestAssessment(student.id).then(() => {
                  setAssessmentActive(true);
                  speakRef.current?.("Empezamos la evaluación inicial.");
                  setTimeout(() => { if (sendRef.current) sendRef.current("quiero evaluar el nivel del niño"); }, 800);
                }).catch(console.error);
              }}
              style={MENU_ITEM}
            >
              🎯 Evaluar nivel
            </button>
          )}
          <button onClick={() => { setMenuOpen(false); showTutorialAgain(); }} style={MENU_ITEM}>❓ Tutorial</button>
        </div>
      )}

      {/* ── 🔄 Replay-demo — visible during tracing OR spotlighted in tutorial step 1 */}
      {(charData || tutorialStep === 1) && !masteryDialog && !coloringSubject && (
        <button
          onClick={tutorialStep !== null ? undefined : handleReplayDemo}
          style={{ ...CTRL_BTN, top: "12px", right: "12px", left: "auto",
                   cursor: tutorialStep !== null ? "default" : "pointer",
                   zIndex: tutorialStep === 1 ? 492 : 300 }}
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
      {(charData || tutorialStep === activeBadgeStep) && !coloringSubject && (
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
                <div style={{ display: "flex", gap: "2px" }}>
                  {[0, 1, 2].map(si => (
                    <span key={si} style={{ fontSize: "34px", lineHeight: 1 }}>
                      {si <= lvl ? (allGreenDone ? "⭐" : "★") : "☆"}
                    </span>
                  ))}
                </div>
                {/* Separador */}
                <div style={{ width: "1px", height: "34px", background: "#d1d5db", margin: "0 4px" }} />
                {/* Círculos de intento */}
                {[0, 1, 2].map(ai => {
                  const val = attempts[ai];
                  const isNext = isActive && ai === attempts.length;
                  return (
                    <div
                      key={ai}
                      style={{
                        width: "34px",
                        height: "34px",
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
            onPickerOpen={() => speakRef.current?.("¿Qué quieres dibujar? Toca uno")}  />
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
        {/* Interim STT indicator — no transcript text shown */}
        {interimTranscript && (
          <div
            style={{
              fontSize: "20px",
              background: "rgba(220,38,38,0.82)",
              borderRadius: "20px",
              padding: "6px 14px",
              letterSpacing: "4px",
            }}
          >
            🎙️
          </div>
        )}

        {/* 🔊 Replay last TTS message — no text bubble for any age */}
        {lastMessage && (
          <button
            onClick={() => speak(lastMessage)}
            title="Escuchar otra vez"
            style={{
              width: "52px", height: "52px", borderRadius: "50%",
              border: "none", background: "rgba(74,144,217,0.85)",
              color: "white", fontSize: "24px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            🔊
          </button>
        )}

        <DiceBearAvatar
          seed={(student?.avatar_id && student.avatar_id !== "robot") ? student.avatar_id : (student?.name ?? "olibot")}
          state={avatarState}
          size={avatarSize}
          celebration={celebrationState}
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

      {/* ── Letter recognition mode (#13) — shown before tracing for new topics ── */}
      {recognitionMode && charData && !coloringSubject && !masteryDialog && (
        <div style={{ position: "absolute", inset: 0, zIndex: 25 }}>
          <LetterChoice
            charKey={charData.key}
            onCorrect={handleRecognitionCorrect}
            onIncorrect={() => {}}
            onSkip={handleRecognitionSkip}
            onNudge={handleRecognitionNudge}
          />
        </div>
      )}

      {/* ── Celebration confetti burst — big level-up (#6) ───────────────── */}
      <CelebrationOverlay
        active={celebrationState === "big"}
        onDone={() => setCelebrationState(null)}
      />

      {/* ── Emotion picker (#9) ───────────────────────────────────────────── */}
      {emotionPickerActive && !sessionBanner && (
        <EmotionPicker
          onSelect={handleEmotionSelect}
          onHighlight={(label) => speakRef.current?.(label)}
        />
      )}

      {/* ── Adaptive rest break choice (#10) ─────────────────────────────── */}
      {restBreakActive && coloringSubject && (
        <RestBreakPicker
          onContinueDraw={handleRestContinueDraw}
          onGoToLetters={handleRestGoToLetters}
          onHighlight={(label) => speakRef.current?.(label)}
        />
      )}

      {/* ── Activity picker — shown when bored/tired (replaces TopicNavBar) ── */}
      {activityPickerActive && (
        <ActivityPicker
          alternatives={accessibleTopics.filter(t => !t.locked && t.id !== currentTopicId).slice(0, 3)}
          onSelect={handleActivitySelect}
          onHighlight={(label) => speakRef.current?.(label)}
        />
      )}

      {/* ── Session time banner ────────────────────────────────────────────── */}
      {sessionBanner && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 600,
            background: sessionBanner === "end" ? "rgba(239,68,68,0.92)" : "rgba(245,158,11,0.92)",
            color: "white",
            borderRadius: "24px",
            padding: "24px 32px",
            textAlign: "center",
            fontSize: "20px",
            fontWeight: "bold",
            boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
            backdropFilter: "blur(8px)",
            maxWidth: "340px",
          }}
          onClick={() => setSessionBanner(null)}
        >
          {sessionBanner === "end" ? "⏰ ¡Hasta la próxima! 👋" : "⏱️ ¡Casi terminamos por hoy!"}
          <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "6px", fontWeight: "normal" }}>
            {sessionBanner === "end" ? "¡Lo has hecho genial hoy!" : "Toca para seguir un poco más."}
          </div>
        </div>
      )}

    </div>
  );
}
