/**
 * useSpeech — hook para STT (SpeechRecognition) y TTS (SpeechSynthesis)
 *
 * STT: Web Speech API, reconocimiento en español.
 *   - startListening(): activa el micrófono. Cuando el usuario termina de hablar,
 *     llama a onTranscript(texto) con el resultado final.
 *   - Muestra resultados intermedios (interimTranscript) para feedback visual.
 *
 * TTS: Web Speech API, síntesis de voz en español.
 *   - speak(texto): reproduce el texto. Voz adaptada a niños (velocidad lenta,
 *     tono ligeramente alto).
 *   - stopSpeaking(): cancela la reproducción en curso.
 *
 * Compatibilidad: Chrome/Edge (soporte completo). Firefox tiene soporte
 * parcial de SpeechSynthesis pero no SpeechRecognition — se detecta en `supported`.
 */
import { useState, useRef, useCallback } from "react";

const STT_LANG = "es-ES";

/**
 * Corrige palabras que el STT confunde habitualmente con "OLIBOT".
 * Se amplía según lo que se observe en pruebas reales.
 */
function fixTranscript(text) {
  return text
    .replace(/\bolivot\b/gi, "OLIBOT")
    .replace(/\bolívot\b/gi, "OLIBOT")
    .replace(/\boli bot\b/gi, "OLIBOT")
    .replace(/\bolivbot\b/gi, "OLIBOT");
}
const TTS_LANG = "es-ES";
const TTS_RATE = 0.82;   // más lento — adaptado a niños de 3-5 años
const TTS_PITCH = 1.15;  // tono ligeramente más alto — más amigable

export function useSpeech({ onTranscript }) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef(null);

  // Detectar soporte del navegador
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SpeechRecognition && !!window.speechSynthesis;

  // ── STT ──────────────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (!SpeechRecognition || listening) return;

    // Cancelar cualquier síntesis activa antes de escuchar
    window.speechSynthesis.cancel();
    setSpeaking(false);

    const recognition = new SpeechRecognition();
    recognition.lang = STT_LANG;
    recognition.continuous = false;
    recognition.interimResults = true;  // feedback visual mientras habla

    recognition.onstart = () => {
      setListening(true);
      setInterimTranscript("");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (const result of event.results) {
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimTranscript(interim || final);
      if (final) {
        setInterimTranscript("");
        onTranscript(fixTranscript(final.trim()));
      }
    };

    recognition.onerror = (event) => {
      // "no-speech": el niño no habló — ignorar silenciosamente
      // Otros errores: loguear pero no romper la UI
      if (event.error !== "no-speech") {
        console.warn("[useSpeech] STT error:", event.error);
      }
      setListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [SpeechRecognition, listening, onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterimTranscript("");
  }, []);

  // ── TTS ──────────────────────────────────────────────────────────────────

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;

    // Limpieza para TTS:
    // 1. "OLIBOT" en mayúsculas se deletrea; la versión mixta se pronuncia como palabra.
    // 2. Eliminar emojis (rango Unicode de emojis, diacríticos especiales...).
    const clean = text
      .replace(/\bOLIBOT\b/g, "Olibót")
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
      .trim();
    if (!clean) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = TTS_LANG;
    utterance.rate = TTS_RATE;
    utterance.pitch = TTS_PITCH;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return {
    supported,
    listening,
    speaking,
    interimTranscript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
