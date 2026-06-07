# Fase 09 — Mejoras v2 (mayo 2026)

Caso de uso principal validado: **niño de 3 años**.

---

## Estado de implementación

| # | Mejora | Área | Estado |
|---|--------|------|--------|
| 1 | BDI: saludos + cajón desastre para intents desconocidos | Backend | ✅ Implementado |
| 2 | BDI: eliminar preguntas meta como "¿qué es una línea?" | Backend NLG | ✅ Implementado |
| 3 | Sonido de acierto/fallo (Web Audio API) | Frontend | ✅ Implementado |
| 4 | Bloqueo del canvas cuando OLIBOT habla | Frontend | ✅ Implementado |
| 5 | Estrellas de progreso del ejercicio actual (X/N ★) | Frontend | ✅ Implementado |
| 6 | Topic picker: mostrar TODOS los niveles con candado 🔒 si bloqueados | Back+Front | ✅ Implementado |
| 7 | Dibujo libre: modo lápiz por defecto + toggle 🖊/🪣 | Frontend | ✅ Implementado |
| 8 | Colores ejercicios: verde si superado, rojo si fallado (topic picker) | Frontend | ✅ Implementado |
| 9 | Informes padres: actividades agrupadas por edad + mensaje al terminar | Backend+Front | ✅ Implementado |
| 10 | DB: evitar agotamiento de conexiones (QueuePool) | Backend | ✅ Implementado (NullPool) |
| 11 | Título en las figuras de trazado | Frontend | ✅ Implementado |
| 12 | Figuras más pequeñas, más puntos guía | Frontend letterData | ⏳ Pendiente |
| 13 | Carpeta de figuras para revisión offline | Data/scripts | ⏳ Pendiente |
| 14 | Sílabas para niños de 5 años — revisar contenido | Curriculum | ⏳ Pendiente |
| 15 | No interrumpir el dibujo cuando OLIBOT habla (bug ratón) | Frontend | ✅ Implementado |
| 16 | Reducción de ruido STT: filtro de confianza más agresivo | Frontend (useSpeech) | ✅ Implementado |
| 17 | Variedad en frases de alabanza — no repetir "¡Muy bien!" | Backend NLG | ✅ Implementado |
| 18 | Pistas de trazado contextualmente correctas | Backend curriculum | ✅ Implementado |
| 19 | Overlay gris semitransparente durante tutorial (en vez de bloqueo total) | Frontend LetterTracing | ✅ Implementado |
| 20 | Cajón desastre contextual: redirigir según actividad activa | Backend BDI + Frontend | ✅ Implementado |
| 21 | Pop-up edad completada: notificar a padres si niño < 5 años lo terminó todo | Backend + Frontend | ✅ Implementado |

---

## Detalle de cada mejora

### 1. BDI: saludos y cajón desastre
**Problema:** Cuando el niño dice algo fuera del BDI (cosas sin sentido, palabras
sueltas) el agente no responde o ignora al niño.

**Solución implementada:**
- El `PythonBDIFallback` ya tenía un catch-all para `off_topic`/`unknown`.
- Se refuerza la instrucción para que SIEMPRE anime al niño a volver a la tarea
  activa de forma cálida y sin confusión.
- Para el saludo (`greet`), si hay tema activo, OLIBOT propone el ejercicio del
  día directamente sin preguntar.

### 2. Preguntas meta del BDI
**Problema:** El agente preguntaba "¿Qué es una línea?" en lugar de dar instrucciones
de acción ("¡Traza de arriba abajo!").

**Solución implementada:**
- Se añade prohibición explícita en el `OLIBOT_PERSONA_PROMPT` del NLG:
  *NUNCA preguntar qué es un concepto. Siempre dar instrucciones de ACCIÓN.*

### 3. Sonidos de acierto/fallo
**Problema:** El "¡Muy bien!" de texto repetido resulta cansado.

**Solución implementada:**
- Web Audio API: acorde ascendente C5→E5→G5 en acierto (🔔 tipo "ding")
- Web Audio API: nota descendente A3→G3 en fallo (❌ tipo "buzz" suave)
- Los sonidos se reproducen ADEMÁS del TTS (no lo sustituyen)

### 4. Bloqueo del canvas durante habla
**Problema:** Si el niño empieza a dibujar mientras OLIBOT habla, el gesto se
pierde o el canvas queda en estado inconsistente.

**Solución implementada:**
- `LetterTracing` ya tenía `disabled` prop; se extiende a `speaking || loading`
- `ColoringCanvas` recibe nueva prop `disabled`; bloquea todos los eventos
  de puntero cuando está activa
- Overlay semitransparente visible sobre el canvas cuando está bloqueado

### 5. Estrellas de progreso del ejercicio
**Problema:** El niño no sabe cuántos intentos le quedan para pasar al siguiente
ejercicio.

**Solución implementada:**
- Barra de estrellas fija encima del canvas: `★★☆☆` (practiceCount / requiredPractices)
- `requiredPractices` es {3: 3, 4: 2, 5: 1} según edad
- Se muestra solo durante el trazado activo
- Color: dorado (★) para completados, gris (☆) para pendientes

### 6. Topic picker con candados
**Problema:** Solo se mostraban los ejercicios accesibles; el niño no sabía qué
ejercicios había por desbloquear.

**Solución implementada:**
- `GET /api/v1/chat/student/{id}/topics` ahora devuelve TODOS los temas para la
  edad del niño (accesibles + bloqueados)
- Campo `locked: bool` en la respuesta
- Topics bloqueados se muestran con 🔒 overlay y fondo gris; no son clickeables

### 7. Dibujo libre — modo lápiz
**Problema:** En modo imagen, el toque rellenaba toda un área (flood-fill).
El niño quería pintar con lápiz libremente.

**Solución implementada:**
- `drawMode` state: `"pencil"` (por defecto) | `"bucket"`
- Toggle 🖊/🪣 en la paleta
- Modo lápiz: trazo libre con pincel (igual que el modo SVG)
- Modo cubo: flood-fill (comportamiento anterior, ahora opcional)

### 8. Colores en topic picker
**Problema:** Las estrellas en el topic picker no tenían significado claro.

**Solución implementada:**
- Topic superado (`mastered=true`): fondo verde ✅
- Topic con intentos fallidos (success_rate < 0.5): fondo rojo leve
- Topic sin intentos: fondo blanco neutro
- Se eliminan las estrellas del topic picker (queda solo el estado de color)

### 9. Informes padres por grupo de edad
**Problema:** Los padres no saben qué actividades corresponden a cada edad,
ni si su hijo ha superado las de su franja.

**Solución implementada:**
- Nueva sección "📅 Por Edades" en el informe
- Agrupa los temas por `min_age` (3, 4, 5 años)
- Muestra cuántos temas superados / total para cada edad
- Mensaje especial cuando el niño supera el 100% de su grupo de edad:
  *"¡[Nombre] ha superado todos los niveles de X años!"*
- Para niños de 3-4 años: mensaje pidiendo que un adulto esté presente
  para avanzar a la siguiente franja

### 10. DB: NullPool
**Solución:** Ya implementada en la sesión anterior (database.py).

### 11-15. Pendientes
Estas mejoras requieren más análisis o son cambios de contenido/assets:
- **Título figuras**: añadir etiqueta de texto descriptiva bajo cada figura en LetterTracing.
- **Figuras más pequeñas + puntos**: revisar `letterData.js`; reducir escala y añadir
  puntos intermedios en los strokes.
- **Carpeta figuras**: script para exportar todos los SVG a PNG para revisión.
- **Sílabas a 5 años**: revisar si los temas `silaba_*` y `palabra_*` son apropiados
  pedagógicamente para 5 años (currículum Decreto 36/2022 Madrid).
- **Bug ratón/dibujo**: con el bloqueo de canvas implementado en #4 debería
  mejorar, pero pendiente de probar si el gesto "interrumpido" al soltar el bloqueo
  causa estado inconsistente en `drawingRef`.

---

## Notas técnicas

- **Puerto backend**: El frontend espera el backend en `localhost:5050`. Arrancar
  uvicorn con `--port 5050`.
- **JaCaMo**: `jacamo_enabled=True`. Si el agente no responde en 8s, cae al
  fallback Python automáticamente.
- **Ollama**: requiere `llama3.1:8b` para NLG. El NLU funciona solo con embeddings
  si `nlu_embeddings.json` está generado.

---

### 16. Reducción de ruido STT

**Problema:** Si hay ruido de fondo (TV, personas), el Speech Recognition lo captura como si fuera el niño.

**Solución:**
- En `useSpeech.js`, se sube el umbral de confianza del filtro de ruido de **0.25 → 0.45**, y la longitud mínima para ese filtro de 5 → 8 caracteres.
- Esto significa que transcripciones cortas (< 8 chars) con confianza baja (< 0.45) se descartan silenciosamente y no se envían al backend.
- Las respuestas legítimas del niño (alta confianza o texto largo) siguen pasando normalmente.
- **Fichero:** `frontend/src/hooks/useSpeech.js`

---

### 17. Variedad en frases de alabanza

**Problema:** El LLM tiende a usar "¡Muy bien!" para casi todas las respuestas de acierto, resultando repetitivo.

**Solución:**
- Se añade al `OLIBOT_PERSONA_PROMPT` (en `backend/llm/nlg.py`) una instrucción explícita que prohíbe repetir "¡Muy bien!" y proporciona una lista de alternativas: ¡Genial!, ¡Fantástico!, ¡Bravo!, ¡Qué bien!, ¡Eso es!, ¡Lo has conseguido!, ¡Estupendo!, ¡Increíble!, ¡Chévere!, ¡Súper!, ¡Perfecto!, ¡Olé!
- **Fichero:** `backend/llm/nlg.py`

---

### 18. Pistas de trazado correctas

**Problema:** Los hints de los temas `trazo_*` en el curriculum eran metafóricos ("como un tren en sus raíles") y no decían al niño qué hacer en la pantalla.

**Solución:** Se reemplazan los 3 niveles de hint de todos los temas de pregrafomotricidad por instrucciones de acción directas:
1. "Sigue la línea roja de ejemplo 🖊️"
2. "Sigue los puntos de guía 🔴"
3. "¡Mira el tutorial otra vez! ▶️"

Los hints de letras, números y sílabas (ya orientados al concepto) se dejan sin cambios.
- **Fichero:** `backend/pedagogy/curriculum.py`

---

### 19. Overlay gris durante tutorial

**Problema:** Cuando OLIBOT habla (speaks), el canvas de LetterTracing mostraba un overlay blanco opaco con spinner, tapando la animación del tutorial.

**Solución:**
- Se añade un prop `isThinking` (bool) a `LetterTracing`.
- Cuando `disabled && isThinking`: muestra el overlay original con spinner ("OLIBOT está pensando…").
- Cuando `disabled && !isThinking`: muestra solo un overlay gris semitransparente (`rgba(0,0,0,0.15)`) sin spinner, permitiendo ver la animación de trazado.
- En `ChatWindow.jsx`: `disabled={loading || speaking}` + `isThinking={loading}`.
- **Ficheros:** `frontend/src/components/LetterTracing.jsx`, `frontend/src/components/ChatWindow.jsx`

---

### 20. Cajón desastre contextual

**Problema:** Si el niño dice algo no reconocido mientras pinta, no ocurría nada (silencio). Durante ejercicios, la redirección no ofrecía alternativas según el contexto.

**Solución en modo pintura (frontend):**
- En `ChatWindow.jsx`, si el texto en coloring mode no coincide con ningún patrón ni animal, se responde con un mensaje local de ánimo: "¡Sigue pintando tu [animal]! 🎨" (aleatorio entre variantes).

**Solución en modo ejercicio (backend):**
- En `bdi_bridge.py`, `express_emotion` handler: si detecta cansancio/aburrimiento (`cansado`, `aburrido`, `no quiero`), la instrucción incluye ofrecer descanso con dibujo libre.
- En el catch-all redirect: la instrucción incluye "si el niño parece cansado, ofrécele pintar".
- **Ficheros:** `frontend/src/components/ChatWindow.jsx`, `backend/core/bdi_bridge.py`

---

### 21. Pop-up edad completada

**Problema:** Cuando un niño ha completado TODOS los ejercicios de su grupo de edad, el sistema no notifica a los padres ni propone avanzar.

**Solución:**
- En `session_manager.py`, cuando la acción BDI es `mastery_achieved` o `praise_and_advance`, se comprueba si todos los temas de la edad del alumno están ya dominados. Si es así, el evento `final` incluye `"all_age_topics_complete": true`.
- En `ChatWindow.jsx`, al recibir `all_age_topics_complete` y si `student.age < 5`, se muestra un nuevo popup dirigido a los padres: informa de que el niño ha completado todas las actividades de su edad y pregunta si desean avanzar a la siguiente edad. Si confirman, se actualiza la edad del alumno via API y se reinicia la sesión.
- Para niños de 5 años el flag nunca se activa (no hay edad siguiente).
- **Ficheros:** `backend/core/session_manager.py`, `frontend/src/components/ChatWindow.jsx`, `frontend/src/services/api.js`
