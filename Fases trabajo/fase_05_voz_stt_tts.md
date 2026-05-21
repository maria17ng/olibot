# Fase 5 — Voz: STT y TTS para niños de 3-6 años

> Documento de referencia para el desarrollo y la memoria del TFM.  
> Describe la integración de reconocimiento y síntesis de voz, el diseño de la interfaz vocal y las decisiones de implementación.

---

## Índice

1. [Motivación pedagógica](#1-motivación-pedagógica)
2. [Arquitectura de voz](#2-arquitectura-de-voz)
3. [El hook useSpeech](#3-el-hook-usespeech)
4. [STT — Reconocimiento de voz](#4-stt--reconocimiento-de-voz)
5. [TTS — Síntesis de voz](#5-tts--síntesis-de-voz)
6. [Integración en ChatWindow](#6-integración-en-chatwindow)
7. [Decisiones de diseño importantes](#7-decisiones-de-diseño-importantes)
8. [Problemas conocidos y sus soluciones](#8-problemas-conocidos-y-sus-soluciones)
9. [Pruebas manuales](#9-pruebas-manuales)

---

## 1. Motivación pedagógica

OLIBOT se dirige a niños de 3-6 años que están en proceso de adquisición de la lecto-escritura. Para este rango de edad:

- **No se puede asumir lectura**: un niño de 3 años no puede leer un cuadro de texto.
- **La voz es la interfaz natural**: los niños de esta edad son hablantes nativos antes que escritores.
- **El texto escrito es fallback, no canal principal**: se mantiene para desarrollo y para niños de 5-6 años.

La voz transforma OLIBOT de un chatbot de texto (adecuado para adultos) a un **tutor oral** comparable a un maestro de Educación Infantil.

### Rol de la voz en el ciclo pedagógico

```
OLIBOT habla (TTS) → niño escucha → niño habla (STT) → OLIBOT escucha → responde
```

Este ciclo replica exactamente la interacción oral de un aula de Infantil: el tutor propone, el alumno responde hablando.

---

## 2. Arquitectura de voz

La voz se implementa íntegramente en el **frontend React** usando la **Web Speech API** del navegador. No requiere ningún servicio externo de terceros.

```
┌─────────────────────────────────────────────────────┐
│               ChatWindow.jsx                         │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │           useSpeech hook                     │   │
│  │                                              │   │
│  │  SpeechRecognition API  →  onTranscript()    │   │
│  │  (STT, es-ES)              │                 │   │
│  │                            ▼                 │   │
│  │                        sendMessage()         │   │
│  │                                              │   │
│  │  SpeechSynthesis API   ←  speak(text)        │   │
│  │  (TTS, es-ES)                                │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Botón 🎙️  → startListening()                       │
│  Respuesta agente → speak(response)  automático     │
└─────────────────────────────────────────────────────┘
```

**Ventajas de usar la Web Speech API del navegador:**
- Sin coste: no hay llamadas a APIs de pago (Google Cloud Speech, AWS Polly, etc.)
- Sin latencia de red extra: el STT procesa en el dispositivo o vía el motor del navegador
- Sin datos de voz de menores en servidores externos (GDPR)
- Funciona offline para TTS (la síntesis es local en Chrome/Edge)

**Limitaciones:**
- STT requiere Chrome o Edge (Firefox no lo soporta). Se detecta con `supported`.
- La calidad del reconocimiento depende del micrófono y del ruido ambiente — relevante para aulas.

---

## 3. El hook useSpeech

Ubicación: `frontend/src/hooks/useSpeech.js`

### Interfaz del hook

```javascript
const {
  supported,          // boolean: ¿el navegador soporta STT + TTS?
  listening,          // boolean: ¿micrófono activo?
  speaking,           // boolean: ¿OLIBOT está hablando?
  interimTranscript,  // string: texto provisional mientras el niño habla
  startListening,     // () => void  — activa el micrófono
  stopListening,      // () => void  — detiene el micrófono manualmente
  speak,              // (text: string) => void  — reproduce texto
  stopSpeaking,       // () => void  — cancela TTS en curso
} = useSpeech({ onTranscript });
```

### Parámetros de voz configurados

| Parámetro | Valor | Justificación |
|-----------|-------|---------------|
| `lang` (STT y TTS) | `"es-ES"` | Español de España — Real Decreto 95/2022 Educación Infantil |
| `TTS_RATE` | `0.82` | 18% más lento que la velocidad por defecto — adaptado a niños que procesan más despacio |
| `TTS_PITCH` | `1.15` | Tono ligeramente más alto — voz más amigable y diferenciada de la del adulto |

---

## 4. STT — Reconocimiento de voz

### Configuración de SpeechRecognition

```javascript
recognition.lang            = "es-ES";
recognition.continuous      = false;   // una frase por activación — apropiado para niños
recognition.interimResults  = true;    // feedback visual mientras habla
```

`continuous = false` es una decisión pedagógica: el niño pulsa el botón, habla su respuesta, y el micrófono se desactiva solo. Esto es más predecible que el modo continuo y evita capturar ruido de fondo de otras personas en el aula.

### Corrección del nombre del agente

El motor STT español comete errores frecuentes al transcribir "OLIBOT" (nombre inventado):

```javascript
function fixTranscript(text) {
  return text
    .replace(/\bolivot\b/gi, "OLIBOT")
    .replace(/\bolívot\b/gi, "OLIBOT")
    .replace(/\boli bot\b/gi, "OLIBOT")
    .replace(/\bolivbot\b/gi, "OLIBOT");
}
```

Esta función se amplía con errores observados durante las pruebas.

### Estados del STT

```
Reposo → [pulsa 🎙️] → Escuchando (rojo pulsante)
         → [niño habla] → interimTranscript visible
         → [silencio] → onTranscript(texto) → sendMessage()
         → Reposo
```

El estado `listening` bloquea el envío de texto por teclado y deshabilita el botón de micrófono (no se pueden activar dos instancias de SpeechRecognition en paralelo).

### Manejo de errores STT

| Error | Causa | Acción |
|-------|-------|--------|
| `no-speech` | El niño no habló en el tiempo límite | Ignorar silenciosamente — no mostrar error al niño |
| `audio-capture` | Sin micrófono | Mostrar mensaje y ofrecer entrada de texto |
| `network` | Sin conectividad para el motor STT | Fallback a texto |
| Otros | Error interno | `console.warn` — no romper la UI |

---

## 5. TTS — Síntesis de voz

### Activación automática

Cada respuesta del agente se reproduce automáticamente:

```javascript
// En ChatWindow, tras recibir la respuesta del backend:
speak(response.agent_response);
```

Esto garantiza que el niño **siempre escuche** la respuesta aunque no sepa leer, cumpliendo el requisito de accesibilidad para la edad de 3-4 años.

### Limpieza de texto para TTS

Los emojis del texto interrumpen o producen errores en algunos motores TTS:

```javascript
const clean = text.replace(/[\u{1F000}-\u{1FFFF}]/gu, "").trim();
```

Se elimina el rango Unicode de emojis antes de pasar el texto a `SpeechSynthesisUtterance`. El texto visual (con emojis) se muestra en pantalla sin cambios.

### Gestión de estados

```
Respuesta llega → speak(texto) → speaking=true → 🔊 (botón naranja)
                                                 → TTS reproduce
                → [TTS termina] → speaking=false → 🎙️ (botón azul)
```

El botón de micrófono se deshabilita mientras `speaking=true` para evitar que el niño hable mientras OLIBOT está hablando — comportamiento que confundiría a niños pequeños.

Cuando el alumno pulsa el micrófono mientras OLIBOT habla: `stopSpeaking()` interrumpe el TTS y activa el STT inmediatamente.

---

## 6. Integración en ChatWindow

### Botón de micrófono principal

```jsx
<button onClick={listening ? undefined : startListening}
        disabled={loading || speaking}>
  {listening ? "🔴" : speaking ? "🔊" : "🎙️"}
</button>
```

El botón tiene **tres estados visuales** distinguibles para el niño:
- 🎙️ Azul pulsante → listo para escuchar
- 🔴 Rojo con animación `pulse` → escuchando ahora (recording)
- 🔊 Naranja → OLIBOT está hablando, espera

El efecto `pulse` (CSS `@keyframes`) refuerza visualmente que el micrófono está activo — importante para niños que no leen el texto de estado.

### Texto de estado bajo el botón

```
"Pulsa el micrófono y habla"
"Te estoy escuchando…"           ← listening
"OLIBOT está hablando…"          ← speaking
```

### Input de texto como fallback

El campo de texto se mantiene visible pero en segundo plano. Sirve para:
1. Navegadores sin soporte STT (Firefox)
2. Modo desarrollo (el desarrollador puede probar sin hablar)
3. Niños de 5-6 años que prefieren escribir

El placeholder cambia según el contexto: `"O escribe aquí…"` (si hay voz) vs `"Escribe aquí…"` (si no hay voz).

---

## 7. Decisiones de diseño importantes

### 1. Web Speech API vs API externa

Se eligió la Web Speech API del navegador frente a alternativas como Google Cloud Speech-to-Text o AWS Polly por:
- **Privacidad de datos de menores**: ningún audio sale del dispositivo del usuario (cumple GDPR Art. 8 sobre datos de menores)
- **Coste cero**: relevante para una herramienta educativa que podría desplegarse en colegios públicos
- **Latencia mínima**: el STT y TTS funcionan sin round-trip al servidor

La contrapartida es la dependencia de Chrome/Edge, que es aceptable dado que en entornos escolares se controla el navegador.

### 2. continuous = false (modo "push-to-talk")

El modo push-to-talk (pulsar botón → hablar → soltar) es más apropiado que el modo continuo porque:
- El niño tiene control explícito sobre cuándo está "escuchando el robot"
- Evita capturas accidentales de conversaciones de aula
- Es más predecible para niños con dificultades de atención

### 3. TTS automático (no opcional)

La reproducción automática de cada respuesta es una decisión de accesibilidad: para un niño de 3 años que no sabe leer, el texto en pantalla no es información — solo la voz lo es.

### 4. No hay SpeechGrammarList

La Web Speech API permite definir una gramática restringida (SpeechGrammarList) para mejorar el reconocimiento de respuestas cortas ("a", "e", "uno", "dos"...). Se decidió **no usar gramáticas** porque el NLU del backend ya maneja el mapeo de respuestas y restringir la gramática generaría falsos negativos cuando el niño dice algo fuera de la lista esperada.

---

## 8. Problemas conocidos y sus soluciones

### TTS no se activa en iOS Safari

**Causa:** iOS requiere que `speechSynthesis.speak()` se llame directamente desde un evento de usuario (click), no de forma asíncrona.  
**Solución pendiente:** Fase 7 — añadir un botón "Escuchar de nuevo" que el usuario activa manualmente.

### STT clasifica "a" como "ha" o "á"

**Causa:** El motor STT de Chrome a veces confunde respuestas monosilábicas con homófonos ortográficos.  
**Solución:** El NLU del backend normaliza el texto (`.lower().strip()`) y los `expected_answers` incluyen variantes. La función `fixTranscript` puede ampliarse con casos adicionales observados.

### Firefox muestra el input de texto pero no el micrófono

**Comportamiento esperado:** Si `SpeechRecognition` no está disponible, `supported = false` y el botón de micrófono no se renderiza. Solo aparece el input de texto con el mensaje "Tu navegador no soporta voz. Usa el texto."

---

## 9. Pruebas manuales

### Prueba STT básica

1. Abrir `http://localhost:5173` en Chrome
2. Seleccionar un alumno
3. Pulsar el botón 🎙️ → debe volverse rojo y pulsar
4. Decir "hola" → el texto debe aparecer en el input y enviarse automáticamente
5. Verificar que la respuesta del agente se reproduce en voz

### Prueba TTS

1. Enviar cualquier mensaje de texto
2. La respuesta del agente debe reproducirse automáticamente
3. El botón 🎙️ debe volverse naranja (🔊) mientras habla
4. Verificar que los emojis del texto NO se pronuncian en el audio

### Prueba de estados concurrentes

| Acción | Estado esperado |
|--------|----------------|
| Clic en 🎙️ mientras OLIBOT habla | Interrumpe TTS e inicia STT |
| Hablar mientras loading=true | El botón está deshabilitado — no activa STT |
| Mensaje llega mientras listening=true | No ocurre (loading bloquea la recepción hasta completar el turno) |

### Prueba de fallback (Firefox)

1. Abrir en Firefox
2. Verificar que aparece el mensaje "Tu navegador no soporta voz. Usa el texto."
3. Verificar que el input de texto funciona normalmente