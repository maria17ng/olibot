# Fase 11 — Corrección de bugs de voz, celebración y progresión (junio 2026)

Bugs detectados durante pruebas reales tras la Fase 10. Esta fase documenta la **causa
raíz** de cada problema y el **arreglo** aplicado, para poder verificarlos con logs.

---

## Tabla de bugs

| # | Síntoma observado | Área | Causa raíz | Estado |
|---|-------------------|------|------------|--------|
| 1 | No hay celebración al pasar de nivel fácil → medio | Frontend | El efecto `[tracingLevel]` usaba un guard (`topicJustChangedRef`) que nunca se consumía al montar, "comiéndose" el primer salto 0→1 | ✅ |
| 2 | Al estar cansado lee los botones pero no el 💪 (= continuar) | Frontend | `ActivityPicker` solo narraba temas + "Dibujar"; el botón 💪 no estaba en el ciclo de locución | ✅ |
| 3 | Completar un ejercicio no pasa de nivel ni celebra ni ofrece opciones | Back+Front | El LLM no extraía `entities` de `tracing_complete` (`passed` quedaba `False`) → `encourage_retry` en vez de `mastery_achieved` | ✅ |
| 4 | Usuario "automático" saluda pero "no hace nada" | Back+Front | Al crear alumno "auto" no se activaba `needs_assessment`; además `sendMessage` leía `assessmentActive` con closure obsoleto | ✅ |
| 5 | Verificar: nivel 6 (Rojo) debe empezar por sílabas, orden tutorial, doble saludo | Verificación | — | ✅ |
| 6 | **La voz dice "¡Inténtalo ahora tú!" ANTES del saludo "Hola Amarillo…"** | Frontend | La demo de trazado termina durante el streaming del saludo (latencia Ollama) y mete su prompt en la cola TTS **antes** que el saludo | ✅ |
| 7 | **Latencia alta del saludo (~26–35 s) → la demo y el "¡Ahora tú!" quedan descolgados** | Backend | El saludo siempre pasaba por Ollama (`llama3.1:8b`); no había entrada en la caché para `greet` | ✅ |

---

## Detalle técnico

### #1 — Celebración entre nivel fácil y medio
- **Causa:** el guard `topicJustChangedRef` se ponía a `true` en el efecto de cambio de
  topic, pero al montar `setTracingLevel(0)` no cambia el valor, así que el efecto
  `[tracingLevel]` no corría para consumirlo → el primer 0→1 se silenciaba.
- **Arreglo:** la celebración (`setCelebrationState("big")`) y el check-in emocional se
  disparan **directamente** en `handleTracingComplete`, en la rama de subida de nivel.
- **Archivo:** [frontend/src/components/ChatWindow.jsx](../frontend/src/components/ChatWindow.jsx)

### #2 — Narrar el botón 💪 ("Seguir con lo de ahora")
- **Causa:** el ciclo de resaltado/locución de `ActivityPicker` recorría las tarjetas de
  tema y "Dibujar", pero nunca el botón 💪.
- **Arreglo:** añadidos índices `drawIdx`/`stayIdx`/`totalItems` y un temporizador que
  resalta el botón 💪 y locuta `onHighlight("Seguir con lo de ahora")`.
- **Archivo:** [frontend/src/components/ActivityPicker.jsx](../frontend/src/components/ActivityPicker.jsx)

### #3 — Maestría al completar un ejercicio
- **Causa:** el frontend envía un mensaje en lenguaje natural ("He trazado la letra 1 y me
  ha salido bien… 100%") y se confiaba en que el LLM extrajera `{letter, passed, score}`,
  cosa que fallaba (`entities={}`) → `passed=False` → `encourage_retry_tracing`.
- **Arreglo:** parser **determinista** por regex `_parse_tracing_message()` en
  `nlu.py` que interpreta las plantillas fijas del frontend sin pasar por el LLM
  (más rápido y fiable). El diálogo de maestría (🔄 repetir / ⏭️ siguiente / 🎨 dibujar) ya
  existía; se añade `setCelebrationState("big")` al completar el tema entero.
- **Archivos:** [backend/llm/nlu.py](../backend/llm/nlu.py), [frontend/src/components/ChatWindow.jsx](../frontend/src/components/ChatWindow.jsx)

### #4 — Usuario con nivel "automático"
- **Causa:** la creación con nivel "auto" no marcaba `needs_assessment` en `beliefs`
  (quedaba pendiente de #8B); además `sendMessage` (memoizado) leía `assessmentActive`
  obsoleto.
- **Arreglo:** `StudentSelector.handleCreate` llama a `api.requestAssessment()` tras crear
  un alumno "auto"; se añade `assessmentActiveRef` que se sincroniza en todos los puntos
  donde se conmuta `assessmentActive`, y `currentScreen` se deriva del ref.
- **Nota:** el `RESP (158.5s)` del log es latencia de Ollama (entorno), no un bug de código.
- **Archivos:** [frontend/src/components/StudentSelector.jsx](../frontend/src/components/StudentSelector.jsx), [frontend/src/components/ChatWindow.jsx](../frontend/src/components/ChatWindow.jsx)

### #5 — Verificaciones
- Nivel 6 (Rojo) → `get_next_topic` devuelve `silaba_inv_as`; nivel 5 (Azul) → `vocal_a`;
  niveles 3/4 → trazos. **Sílabas confirmadas para Rojo.**
- Orden del tutorial: el tutorial de botones se muestra primero; al terminar,
  `advanceTutorial` envía "hola" → el BDI saluda. No se locuta bienvenida durante el
  tutorial (evita doble saludo).

### #6 — Orden de voz: saludo antes que "¡Ahora tú!" (NUEVO en esta fase)
- **Causa raíz:** al asignarse el primer topic (evento `meta`, temprano), `LetterTracing`
  renderiza y reproduce su animación de demostración. La demo es corta y termina **mientras
  el saludo del BDI todavía se está generando** (latencia del LLM). `handleDemoEnd` encola
  `speakQueued("¡Ahora tú! ¡Inténtalo!")`, que entra en la cola TTS **antes** que la
  primera frase del saludo → la voz dice primero "¡Inténtalo ahora tú!" y luego "Hola…".
  Los logs del backend mandan bien el saludo; el desajuste es **solo de orden en la cola
  de voz del navegador**.
- **Arreglo:**
  1. `greetingInProgressRef` se pone a `true` justo antes de enviar el "hola" inicial
     (en los 3 puntos: tras tutorial, alumno conocido y modo parejas).
  2. Si la demo termina mientras `greetingInProgressRef` está activo, `handleDemoEnd`
     **aplaza** el prompt (`pendingDemoPromptRef = true`) en lugar de encolarlo.
  3. Cuando el evento `final` del saludo se ha locutado, se libera el guard y se vuelca el
     prompt aplazado con `speakQueued("¡Ahora tú! ¡Inténtalo!")` → queda **después** del
     saludo. Si la demo termina más tarde (guard ya liberado), se locuta normalmente.
- **Logging de voz añadido:** en `useSpeech.js`, tanto `speak()` como `speakQueued()`
  registran en consola con marca de tiempo (1) cuándo se **encola** y (2) cuándo
  **empieza a sonar** (`onstart`). Así se ve el orden real de reproducción vs. el de
  encolado.
- **Archivos:** [frontend/src/hooks/useSpeech.js](../frontend/src/hooks/useSpeech.js), [frontend/src/components/ChatWindow.jsx](../frontend/src/components/ChatWindow.jsx)

---

### #7 — Latencia del saludo (NUEVO en esta fase)
- **Causa raíz:** el saludo del primer turno ("hola") siempre se generaba con Ollama
  (`llama3.1:8b`). Medido en logs: **26.4 s y 35.6 s**. Como la demo de trazado se
  reproduce nada más asignarse el topic (evento `meta`), terminaba ~30 s antes de que
  sonara el saludo y el "¡Ahora tú!", dejándolos descolgados de la demostración.
- **Arreglo:**
  1. **Saludo instantáneo (sin LLM):** en `session_manager.process_message_stream`, si
     `intent == "greet"` y no es modo evaluación, se construye un saludo determinista y
     personalizado con `_build_instant_greeting(name, topic)` (frase amigable por
     categoría del currículo) y se emite directamente. Verificado: **RESP 3.0 s** (el
     resto es NLU+BDI) con log `→ NLG: instant greeting (LLM bypassed)`.
  2. **Ollama más rápido para el resto de turnos:** `keep_alive: "30m"` (mantiene el
     modelo cargado entre turnos) y `options.num_predict: 120` (limita la longitud de
     salida) en `ollama_client.py` (`chat` y `chat_stream`).
- **Efecto colateral positivo:** al ser el saludo instantáneo, la demo y el "¡Ahora tú!"
  quedan **contiguos** justo tras el saludo (ya no hay ~30 s de silencio en medio).
- **Archivos:** [backend/core/session_manager.py](../backend/core/session_manager.py), [backend/llm/ollama_client.py](../backend/llm/ollama_client.py)

---

## Cómo verificar con logs (consola del navegador)

Abrir DevTools → Console. Buscar las líneas `[TTS ...]`.

**Caso A — Alumno nuevo (orden de voz #6):**
1. Crear alumno nuevo → ver tutorial de botones → al terminar se envía "hola".
2. Secuencia esperada en consola:
   ```
   [TTS hh:mm:ss] speakQueued() (a la cola) → "¡Hola Amarillo! ¿Quieres aprender sobre líneas hoy?"
   [TTS hh:mm:ss] demo terminado durante el saludo → se aplaza '¡Ahora tú!'
   [TTS hh:mm:ss] ▶ EMPEZANDO a hablar (queued) → "¡Hola Amarillo! ..."
   [TTS hh:mm:ss] speakQueued() (a la cola) → "¡Ahora tú! ¡Inténtalo!"
   [TTS hh:mm:ss] ▶ EMPEZANDO a hablar (queued) → "¡Ahora tú! ¡Inténtalo!"
   ```
   El saludo SIEMPRE suena antes que "¡Ahora tú!".

**Caso B — Completar un ejercicio (#1 y #3):**
1. Trazar un número/letra y superar los 3 niveles.
2. Backend: `→ NLU: intent=tracing_complete ... entities={'letter':'1','passed':True,'score':100}`
   y `→ BDI: action=mastery_achieved`.
3. Frontend: aparece confeti grande + diálogo con 🔄 / ⏭️ / 🎨.
4. Al pasar fácil→medio: confeti `big` inmediato.

**Caso C — Cansancio (#2):**
1. Decir "estoy cansado" → en el selector, OLIBOT nombra también "Seguir con lo de ahora".

**Caso D — Usuario auto (#4):**
1. Crear alumno con nivel "Automático" → tras el tutorial, `currentScreen=assessment_mode`
   en el backend y la primera interacción es una evaluación.
