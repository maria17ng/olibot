/**
 * useSpeech — hook para STT (SpeechRecognition) y TTS (SpeechSynthesis)
 *
 * STT: Web Speech API, reconocimiento en español.
 *   - startListening(): activa el micrófono.
 *   - onTranscript(text): callback cuando el usuario termina de hablar.
 *   - onSilence(): callback cuando la sesión termina sin resultado (silencio/timeout).
 *
 * TTS: Web Speech API, síntesis de voz en español.
 *   - speak(texto): reproduce el texto cancelando cualquier TTS activo.
 *   - speakQueued(texto): añade a la cola sin cancelar.
 *   - stopSpeaking(): cancela la reproducción en curso.
 *
 * Compatibilidad: Chrome/Edge (soporte completo). Firefox: sin SpeechRecognition.
 */
import { useState, useRef, useCallback } from "react";

const STT_LANG        = "es-ES";
const TTS_LANG        = "es-ES";
const TTS_RATE        = 0.85;
const TTS_PITCH       = 1.45;   // high pitch → sounds female even on neutral voices
const TTS_COOLDOWN_MS = 1100;

// ── Voice selection (module-level cache, populated on voiceschanged) ──────────

let _preferredVoice = null;   // null = not yet resolved; undefined = no match found

const FEMALE_NAME_RE = /female|mujer|mónica|monica|elena|penélope|penelope|paulina|luciana|isabel|andrea|carmen|pilar|soledad|maria|laura|rosa|helena/i;

function _pickVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (!voices.length) return undefined;

  const es = voices.filter(v => v.lang?.startsWith("es"));

  return (
    // 1. "Google español 1 (Natural)" — best quality, sounds female in Chrome
    es.find(v => /natural/i.test(v.name) && v.lang === "es-ES") ||
    // 2. Any es-ES Natural voice
    es.find(v => /natural/i.test(v.name)) ||
    // 3. Explicit gender property (deprecated but works in some browsers)
    es.find(v => (v).gender === "female") ||
    // 4. Named female voices (Windows / macOS / mobile)
    es.find(v => FEMALE_NAME_RE.test(v.name)) ||
    // 5. Chrome OS español voices
    es.find(v => /chrome os/i.test(v.name) && v.lang === "es-ES") ||
    // 6. Standard Google español
    es.find(v => /google/i.test(v.name) && v.lang === "es-ES") ||
    es.find(v => v.lang === "es-ES") ||
    es[0] ||
    undefined
  );
}

function getPreferredVoice() {
  if (_preferredVoice !== null) return _preferredVoice ?? null;
  _preferredVoice = _pickVoice();
  return _preferredVoice ?? null;
}

// Re-resolve when browser finishes loading voices (Chrome async pattern)
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    _preferredVoice = null; // force re-pick on next speak()
  });
}

function fixTranscript(text) {
  return text
    .replace(/\bolivot\b/gi,   "OLIBOT")
    .replace(/\bolívot\b/gi,   "OLIBOT")
    .replace(/\boli bot\b/gi,  "OLIBOT")
    .replace(/\bolivbot\b/gi,  "OLIBOT");
}

function cleanForTTS(text) {
  return text
    .replace(/\bOLIBOT\b/g, "Olibót")
    // Strip all emoji ranges: BMP symbols/dingbats + supplemental planes
    .replace(/[\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1FFFF}]/gu, "")
    .trim();
}

export function useSpeech({ onTranscript, onSilence }) {
  const [listening,         setListening]         = useState(false);
  const [speaking,          setSpeaking]           = useState(false);
  const [interimTranscript, setInterimTranscript]  = useState("");

  const recognitionRef        = useRef(null);
  const ttsCooldownUntilRef   = useRef(0);    // absolute timestamp: mic blocked until this time
  const startListeningRef     = useRef(null); // kept current to avoid stale closures in setTimeout

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SpeechRecognition && !!window.speechSynthesis;

  // ── STT ──────────────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (!SpeechRecognition || listening) return;

    // Delay if we're still within the TTS cooldown window (prevents eco-loop)
    const remaining = ttsCooldownUntilRef.current - Date.now();
    if (remaining > 0) {
      setTimeout(() => startListeningRef.current?.(), remaining + 50);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang         = STT_LANG;
    recognition.continuous   = false;
    recognition.interimResults = true;

    let hadResult = false;

    recognition.onstart = () => {
      setListening(true);
      setInterimTranscript("");
    };

    recognition.onresult = (event) => {
      hadResult = true;
      let interim = "";
      let final   = "";
      let maxConf = 0;
      for (const result of event.results) {
        if (result.isFinal) {
          final += result[0].transcript;
          if (result[0].confidence > 0) maxConf = Math.max(maxConf, result[0].confidence);
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimTranscript(interim || final);
      if (final) {
        setInterimTranscript("");
        const cleaned = fixTranscript(final.trim());
        console.log("[STT] final:", JSON.stringify(cleaned), "len:", cleaned.length, "maxConf:", maxConf.toFixed(3));
        // Filter noise: single phoneme, or low-confidence short burst
        if (cleaned.length < 2 || (maxConf > 0 && maxConf < 0.25 && cleaned.length < 5)) {
          console.log("[STT] filtered as noise");
          if (onSilence) onSilence();
          return;
        }
        onTranscript(cleaned);
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech") {
        console.warn("[useSpeech] STT error:", event.error);
      }
      setListening(false);
      setInterimTranscript("");
      // "no-speech" = silencio; notificar para que el componente padre decida reintentar
      if (event.error === "no-speech" && onSilence) onSilence();
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
      // Si terminó sin resultado (p.ej. el navegador cortó por inactividad)
      if (!hadResult && onSilence) onSilence();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [SpeechRecognition, listening, onTranscript, onSilence]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterimTranscript("");
  }, []);

  // ── TTS ──────────────────────────────────────────────────────────────────

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    const clean = cleanForTTS(text);
    if (!clean) return;

    window.speechSynthesis.cancel();

    const utterance   = new SpeechSynthesisUtterance(clean);
    utterance.lang    = TTS_LANG;
    utterance.rate    = TTS_RATE;
    utterance.pitch   = TTS_PITCH;
    const voice = getPreferredVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend   = () => {
      setSpeaking(false);
      ttsCooldownUntilRef.current = Date.now() + TTS_COOLDOWN_MS;
    };
    utterance.onerror = () => {
      setSpeaking(false);
      ttsCooldownUntilRef.current = Date.now() + TTS_COOLDOWN_MS;
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    ttsCooldownUntilRef.current = Date.now() + 300; // breve cooldown al interrumpir
  }, []);

  const speakQueued = useCallback((text) => {
    if (!window.speechSynthesis) return;
    const clean = cleanForTTS(text);
    if (!clean) return;

    const utterance   = new SpeechSynthesisUtterance(clean);
    utterance.lang    = TTS_LANG;
    utterance.rate    = TTS_RATE;
    utterance.pitch   = TTS_PITCH;
    const voice = getPreferredVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend   = () => {
      setSpeaking(false);
      ttsCooldownUntilRef.current = Date.now() + TTS_COOLDOWN_MS;
    };
    utterance.onerror = () => {
      setSpeaking(false);
      ttsCooldownUntilRef.current = Date.now() + TTS_COOLDOWN_MS;
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Keep ref current so cooldown-retry setTimeout always calls latest version
  startListeningRef.current = startListening;

  // Stable wrapper — safe to use in effects/callbacks with [] deps (avoids stale closure)
  const startListeningStable = useCallback(() => {
    startListeningRef.current?.();
  }, []);

  return {
    supported,
    listening,
    speaking,
    interimTranscript,
    startListening,
    startListeningStable,
    stopListening,
    speak,
    speakQueued,
    stopSpeaking,
  };
}