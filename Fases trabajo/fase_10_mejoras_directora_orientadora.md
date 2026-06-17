# Fase 10 — Mejoras tras evaluación con directora y orientadora (junio 2026)

Recogidas durante la visita al centro escolar. Se añaden además mejoras complementarias
detectadas durante el análisis de cada petición.

---

## Tabla de mejoras

| # | Mejora | Área | Prioridad | Complejidad | Origen | Estado |
|---|--------|------|-----------|-------------|--------|--------|
| 1 | Interfaz simplificada para 3–4 años (ocultar elementos adultos) | Frontend | 🔴 Alta | Baja | Directora | ✅ |
| 2 | Eliminar burbujas de texto visibles; solo audio + altavoz | Frontend | 🔴 Alta | Media | Directora | ✅ |
| 3 | Botones más grandes; conservar solo 🏠 tutorial 🔄 | Frontend | 🔴 Alta | Baja | Directora | ✅ |
| 4 | Navegación tipo YouTube Kids: letra activa + 3 desbloqueadas | Frontend | 🔴 Alta | Media | Directora | ✅ |
| 5 | Guardar progreso de subnivel (fácil→medio→difícil) en DB | Back+Front | 🔴 Alta | Media | Directora | ✅ |
| 6 | Avatar celebra aciertos y completa subniveles con animación | Frontend | 🟡 Media | Media | Directora | ✅ |
| 7 | Modo parejas: dos perfiles juegan por turnos | Back+Front | 🟡 Media | Alta | Directora | ⏳ |
| 8A | Niveles por colores/animales sin referencia a la edad + tooltip para padres | Frontend | 🔴 Alta | Baja | Directora | ✅ |
| 8B | Evaluación inicial automática para asignar nivel | Back+Front | 🟡 Media | Alta | Directora | ⏳ |
| 9 | Inclusión TDA / no-verbal: emociones + modo espera + botones táctiles | Back+Front | 🟡 Media | Alta | Orientadora | ✅ |
| 10 | Pantalla de descanso adaptativo (dibujo ↔ ejercicio según estado emocional) | Back+Front | 🟡 Media | Media | Orientadora | ✅ |
| 11 | Dashboard para docentes / orientadora | Backend+nuevo route | 🟡 Media | Alta | Propuesta | ⏳ |
| 12 | Límite de sesión configurable + aviso de descanso | Frontend | 🟢 Baja | Baja | Propuesta | ✅ |
| 13 | Modo audición: OLIBOT dice un sonido → niño toca la letra correcta | Back+Front | 🟡 Media | Media | Propuesta | ✅ |
| 14 | Modo lectura de palabras (niños 5 años avanzados) | Back+Front | 🟢 Baja | Alta | Propuesta | ⏳ |
| 15 | Control de velocidad TTS: automático por edad + ajuste manual por perfil | Frontend | 🟡 Media | Baja | Propuesta | ✅ |
| 16 | Modo sin conexión (Service Worker + IndexedDB) | Frontend | 🟢 Baja | Alta | Propuesta | ⏳ |
| 17 | Exportar / imprimir informe de progreso (PDF) | Frontend | 🟢 Baja | Baja | Propuesta | ✅ |
| 18 | Detección de entorno ruidoso: sugerir auriculares | Frontend | 🟢 Baja | Baja | Propuesta | ⏳ |
| 19 | Modo alto contraste (accesibilidad visual) | Frontend | 🟢 Baja | Baja | Propuesta | ✅ |
| 20 | Seguimiento emocional a lo largo de sesiones (patrón padre/tutor) | Backend + Informe | 🟡 Media | Media | Propuesta | ⏳ |
| 21 | Exponer historial de mensajes en informe de padres/orientadora | Backend + Frontend | 🔴 Alta | Baja | Verificación | ✅ |

---

## Detalle técnico de cada mejora

---

### 1. Interfaz simplificada para niños de 3–4 años

**Problema:** La pantalla tiene demasiados elementos simultáneos para niños pequeños:
informe de progreso, panel de padres, estadísticas de intento, etc. Abruma y distrae.

**Propuesta:**
- Detectar la edad del perfil activo y aplicar un modo `simplified` (boolean derivado de `age <= 4`).
- En modo `simplified`:
  - Ocultar el botón de informe de padres (📊).
  - Ocultar el panel lateral de intentos de subnivel (las 3 columnas de ●/●/●).
  - Ocultar el botón de cambio de estudiante del toolbar principal.
  - Ocultar el botón del topic picker 📚 (sustituido por la navegación tipo YT Kids, mejora #4).
  - Reducir el número de botones flotantes a los tres esenciales (mejora #3).
- Los elementos no se eliminan del DOM, solo se ocultan con CSS (`display: none` o `visibility: hidden`).
  Esto facilita reactivarlos para padres/docentes.

**Archivos afectados:** `ChatWindow.jsx`, estilos inline.

**Criterio de activación:** `const simplified = currentStudent?.age <= 4`

---

### 2. Eliminar texto visible de la conversación; conservar audio

**Problema:** Las burbujas de texto (lo que dice el niño y OLIBOT) no aportan valor a
un niño de 3–5 años que no lee. Son ruido visual.

**Propuesta:**
- Reemplazar el `ChatWindow` de burbujas de chat por una **pantalla limpia** centrada en:
  - El avatar de OLIBOT (grande, animado).
  - El canvas de trazado.
  - Un único botón 🔊 flotante para reproducir el último mensaje de OLIBOT.
- Los mensajes **se siguen guardando** en `session_repo` con su timestamp (texto + rol).
  Los padres y docentes pueden revisarlos desde el informe.
- Mantener `lastMessage` en estado para que el botón 🔊 sepa qué reproducir.
- El indicador de escucha activa (STT) puede ser el avatar animándose (boca o orejas).

**Archivos afectados:** `ChatWindow.jsx` (eliminar `<div className="messages">...`),
`MessageBubble.jsx` (ya no se renderiza en pantalla principal, se conserva para informe).

**Consideración:** Mantener un modo debug/desarrollo donde las burbujas vuelvan a ser
visibles (variable de entorno `VITE_SHOW_CHAT_BUBBLES=true`).

---

### 3. Toolbar simplificado: botones más grandes

**Problema:** Hay hasta 6 botones pequeños (📚 ❓ 🔄 🎨 📊 y selector de alumno).
Para un niño de 3 años son demasiado pequeños e incomprensibles.

**Propuesta:**
- En modo `simplified` (o siempre), reducir el toolbar a **3 botones fijos visibles**:
  - 🏠 Inicio / cambiar de niño
  - ❓ Tutorial
  - 🔄 Repetir demostración
- El resto (📚, 📊, debug) pasa a un **menú accesible para adultos** activado con
  un gesto largo (long press 2 s) sobre el avatar o una zona discreta de la pantalla.
- Tamaño de botones: mínimo 64×64px con iconos de 32px. `touch-action: none` en todos.
- Distribución: los tres botones en una barra inferior centrada, separados.

**Archivos afectados:** `ChatWindow.jsx` — sección de botones flotantes; constante `CTRL_BTN`.

---

### 4. Navegación tipo YouTube Kids: letra activa + 3 siguientes desbloqueadas

**Problema:** El selector de temas actual (topic picker) es un modal grid que requiere
interacción intencional. Los niños no lo usan libremente.

**Propuesta:**
- Añadir una franja horizontal **siempre visible** en la parte inferior de la pantalla
  con hasta 4 "tarjetas" de actividad:
  - **Tarjeta activa** (izquierda, ligeramente más grande): la letra que se está trabajando ahora.
  - **Hasta 3 tarjetas desbloqueadas** a la derecha: los siguientes temas accesibles.
  - Si no hay temas desbloqueados más allá del actual, no se muestra nada extra.
  - Los temas bloqueados **no aparecen** (no mostrar candados para no frustrar).
- Cada tarjeta muestra: emoji del tema + letra grande.
- Al tocar una tarjeta, se cambia al tema directamente (sin modal).
- La franja ocupa ≈ 80–90px de altura y se superpone sobre la parte baja del canvas.

**Implementación:**
```jsx
// En ChatWindow.jsx
const navTopics = accessibleTopics.filter(t => !t.locked).slice(0, 4);
// accessibleTopics ya existe (los desbloqueados del nivel actual)
```
Nueva constante CSS en el layout: `bottom: 90px` para el canvas (para no quedar tapado).

**Archivos afectados:** `ChatWindow.jsx`, nuevo componente `TopicNavBar.jsx`.

---

### 5. Guardar progreso de subnivel en la base de datos

**Problema:** Cuando el niño cierra la aplicación y vuelve, el subnivel (fácil=0/
medio=1/difícil=2) y los intentos dentro del subnivel se pierden. El niño vuelve a empezar
desde fácil aunque ya hubiera llegado a difícil.

**Propuesta:**

**Base de datos** — extender `beliefs` del estudiante para incluir progreso por tema:
```json
{
  "topics_progress": {
    "vocal_a": { "tracing_level": 2, "level_attempts": [[true,true,true],[true,true,true],[true,false,false]], "mastered": false },
    "vocal_e": { "tracing_level": 1, "level_attempts": [[true,true,true],[true,true,null]], "mastered": false }
  }
}
```
El campo `beliefs` ya es JSON en la tabla `students`. Solo hay que añadir la clave `topics_progress`.

**Frontend** — al cargar un tema:
```js
const saved = student.beliefs?.topics_progress?.[topicId];
if (saved) {
  setTracingLevel(saved.tracing_level ?? 0);
  setLevelAttempts(saved.level_attempts ?? [[],[],[]]);
}
```
**Frontend** — al completar un intento:
- Llamar a `PATCH /api/students/{id}/beliefs` con el beliefs actualizado.
- El endpoint ya existe (o se añade fácilmente).

**Archivos afectados:** `ChatWindow.jsx`, `backend/api/routes/students.py`,
`backend/db/repositories/student_repo.py`.

---

### 6. Avatar: animaciones de celebración

**Problema:** El avatar (DiceBear robot) es estático. No reacciona visualmente a los
logros del niño.

**Propuesta:**

**Acierto individual:** Al recibir `result.passed === true` en `handleTracingComplete`:
- Disparar CSS animation clase `celebrate-small` sobre el avatar:
  - Scale 1.0 → 1.35 → 1.0 en 600ms.
  - Rotación leve ±10°.
  - Posible efecto de "salto" (`translateY: -20px`).

**Subnivel completado** (paso de fácil a medio, de medio a difícil, o cierre del tema):
- Disparar animación más larga `celebrate-big` (1.5 s):
  - Confetti de partículas CSS (biblioteca `canvas-confetti`, 8 KB gzip, sin dependencias).
  - Cohetes: `🚀` animados que salen desde el avatar hacia arriba con `@keyframes`.
  - Sonido de fanfarria con Web Audio API (ya existe el sistema de audio).

**Implementación:**
```jsx
// En ChatWindow.jsx, al detectar avance de tracingLevel:
useEffect(() => {
  if (tracingLevel > prevTracingLevelRef.current) {
    triggerConfetti(); // canvas-confetti
    setAvatarState("level-up"); // props al avatar
  }
}, [tracingLevel]);
```

**Archivos afectados:** `ChatWindow.jsx`, `OlibotAvatar.jsx` o `DiceBearAvatar.jsx`,
nuevo archivo `celebration.js` (wrapper de canvas-confetti).

---

### 7. Modo parejas

**Problema:** Solo se puede jugar con un perfil. Los docentes quisieran usar OLIBOT
con dos niños simultáneamente (p.ej. durante trabajo por rincones).

**Propuesta:**

**Selección:** En `StudentSelector`, añadir botón «Jugar en pareja». Permite
seleccionar 2 perfiles activos.

**Estado en ChatWindow:**
```js
const [players, setPlayers] = useState([player1, player2]); // cuando modo pareja
const [activePlayerIdx, setActivePlayerIdx] = useState(0);
```

**Flujo de turno:**
1. OLIBOT completa una actividad con `player[0]`.
2. Al recibir `onComplete`, esperar 2 s, luego anunciar: *«¡Muy bien [nombre1]! Ahora le toca a [nombre2].»*
3. `setActivePlayerIdx(1)` → carga el perfil y tema de `player[1]`.
4. Al completar, vuelve a `player[0]`. Y así sucesivamente.
5. Cada jugador mantiene su propio progreso (`topics_progress` guardado por separado).

**Consideraciones:**
- En el canvas mostrar el nombre del jugador activo en la esquina (grande, color).
- El avatar puede tener dos "caras" pequeñas (una de cada jugador) en la esquina,
  resaltando la activa.
- Modo parejas NO compatible con modo simplificado de 3 años (requieren más autonomía).

**Archivos afectados:** `StudentSelector.jsx`, `ChatWindow.jsx`,
`backend/api/routes/chat.py` (pasar `active_student_id` en cada mensaje).

---

### 8A. Niveles por colores / animales (sin referencia a la edad)

**Problema:** Mostrar «3 años», «4 años», «5 años» en la selección de nivel hace que
los niños desfasados de su grupo no quieran usar un nivel «para pequeños».

**Propuesta:**

Reemplazar el label de edad por un sistema neutro. Dos opciones equivalentes:

**Opción colores:** Azul → Amarillo → Verde (de menor a mayor nivel)
**Opción animales:** Tortuga (despacio, nivel 1) → Conejo (nivel 2) → Águila (nivel 3)

- Los animales/colores se muestran en el `StudentSelector` como selector visual.
- El nivel guardado en DB sigue siendo `age` (3/4/5) internamente — solo cambia la presentación.
- Al pasar de nivel (p.ej. un niño de 4 años que terminó todo y accede al currículo de 5):
  OLIBOT lo anuncia como *«¡Eres un Águila!»* sin mencionar la edad.
- **Tooltip para padres/docentes:** al hacer hover o long-press sobre el icono de
  información (ℹ️) junto al nivel, aparece un texto como:
  *«Nivel Conejo: vocales completas, consonantes m/l/s/p/t, números 1–5»*.
  Este texto es solo visible para adultos (requiere un gesto deliberado).

**Archivos afectados:** `StudentSelector.jsx`, `backend/pedagogy/curriculum.py` (añadir
`display_label` a los niveles), `frontend/src/data/levelData.js` (nuevo archivo con mapeo).

---

### 8B. Evaluación inicial automática de nivel

**Problema:** Los padres no siempre saben qué nivel corresponde a su hijo. Una
evaluación automática asigna el nivel correcto sin que el adulto tenga que decidir.

**Propuesta:**

- Al crear un nuevo perfil, antes de asignar un nivel, OLIBOT lanza un **mini-test de 5–8 actividades**:
  - 2 del nivel 1 (trazado vocal A y reconocimiento auditivo simple).
  - 3 del nivel 2 (vocal + consonante).
  - 2 del nivel 3 (consonante + número).
- Si el niño supera ≥ 70% de un nivel, empieza en ese nivel o en el siguiente.
- El resultado se guarda en `student.beliefs['initial_eval_done': true, 'age': nivel_asignado]`.
- La evaluación se presenta como un juego, sin mencionar que es un test:
  *«¡Vamos a conocernos! Haremos unos ejercicios juntos.»*
- **Cambio silencioso de nivel:** cuando el niño sube de nivel durante el uso normal,
  OLIBOT **no anuncia el cambio** (evitar que el niño lo compare con sus compañeros).
  Solo la notificación en el informe de padres.

**Compatibilidad con 8A:** El nivel asignado sigue siendo 3/4/5 internamente;
la presentación usa el sistema de colores/animales.

**Archivos afectados:** `ChatWindow.jsx` (nuevo flujo `evaluation_mode`),
`backend/pedagogy/curriculum.py` (método `get_evaluation_sequence()`),
`backend/api/routes/chat.py`.

---

### 9. Inclusión: check-in emocional + botones táctiles para TDA / no verbal

**Problema:** Los niños con TDA o que no se comunican verbalmente pueden frustrarse
sin que OLIBOT lo detecte, llevando a abandono o conductas disruptivas.

**Propuesta — check-in emocional:**

- Al finalizar cada subnivel (o tras N minutos sin respuesta vocal detectada), OLIBOT
  hace una **pausa emocional**:
  *«¿Cómo estás ahora mismo?»*
- Se muestra una fila de 4 botones táctiles grandes (sin texto, solo icono):
  - 😄 Contento   → continuar al siguiente subnivel
  - 😐 Normal     → continuar
  - 😤 Enfadado   → cambiar a modo dibujo libre (mejora #10)
  - 😴 Cansado    → ofrecer pausa de 2 min o cambiar a dibujo
- La respuesta se puede dar tocando el botón O hablando («estoy enfadado»).
- El estado emocional se guarda en la sesión para el informe del docente.

**Propuesta — modo no-verbal:**

- Añadir un toggle en el perfil del alumno: `non_verbal: true`.
- Con este toggle activo:
  - OLIBOT nunca espera respuesta vocal para avanzar.
  - Todas las interacciones se confirman con botones táctiles (Sí ✅ / No ❌ / Más 🔄).
  - El STT sigue activo pero no bloquea el flujo si no hay detección.
  - La evaluación de trazado funciona igual (ya es táctil).

**Detección automática de baja participación:**

- Si en los últimos 3 minutos no hay eventos de voz Y hay más de 2 fallos seguidos:
  activar check-in emocional automáticamente sin esperar a final de subnivel.
- Umbral configurable en `settings.py`: `LOW_ENGAGEMENT_THRESHOLD_MINUTES = 3`.

**Archivos afectados:** `ChatWindow.jsx`, `backend/core/session_manager.py`,
nuevo componente `EmotionPicker.jsx`, `backend/db/models.py` (campo `non_verbal` en Student),
`backend/db/repositories/student_repo.py`.

---

### 10. Pantalla de descanso adaptativo (dibujo ↔ ejercicio)

**Problema:** Cuando el niño está frustrado (detectado por estado emocional o baja
participación), no hay una salida suave. Forzar el ejercicio empeora la situación.

**Propuesta:**

- Al detectar estado `enfadado` o `cansado` en el check-in, OLIBOT dice:
  *«¡Vamos a dibujar un rato!»* y activa el modo de dibujo libre automáticamente.
- Cada 2–3 minutos dentro del dibujo libre, OLIBOT pregunta:
  *«¿Quieres seguir dibujando o volvemos a las letras?»*
  Con dos botones grandes: ✏️ Seguir dibujando / 🔤 Volver a letras.
- Si el niño no responde en 30 s, se asume «seguir dibujando» (no interrumpir).
- Al volver a ejercicios, OLIBOT retoma desde el principio del subnivel
  (no desde donde estaba, para reducir presión).

**Variante para TDA:** La frecuencia de los check-ins puede reducirse
(`TDA_CHECKIN_INTERVAL = 90` segundos en vez de al final del subnivel) para
detectar antes la pérdida de atención.

**Archivos afectados:** `ChatWindow.jsx`, `backend/core/session_manager.py`.

---

### 11. Dashboard para docentes / orientadora (propuesta adicional)

**Motivación:** La orientadora del centro necesita una visión global de todos los
alumnos sin sentarse con cada tablet individualmente.

**Propuesta:**

- Nueva ruta `/teacher` (protegida con PIN o contraseña simple).
- Tabla resumen de todos los estudiantes del centro:
  - Nombre (o pseudónimo), edad/nivel, temas completados / totales, fecha última sesión,
    estado emocional promedio última semana.
- Al hacer clic en un alumno → informe detallado (ya existe `ProgressReport.jsx`).
- Exportar todos los informes en un solo PDF.
- Vista de alertas: alumnos que llevan >5 días sin sesión o con estado emocional negativo recurrente.

**Implementación:**
- Nuevo endpoint `GET /api/reports/center` que devuelve resumen de todos los estudiantes.
- Nuevo componente `TeacherDashboard.jsx`.
- Autenticación: PIN de 4 dígitos guardado en `settings.py` (suficiente para un centro pequeño).

**Archivos afectados:** `backend/api/routes/reports.py`, `frontend/src/App.jsx`,
nuevo `TeacherDashboard.jsx`.

---

### 12. Límite de sesión configurable + aviso de descanso

**Motivación:** Para niños con TDA o simplemente para respetar el tiempo recomendado de
pantalla, es útil un aviso suave (no brusco) de fin de sesión.

**Propuesta:**

- Configuración en el perfil del alumno: `session_max_minutes` (por defecto 20).
- A los 15 min (o al 75% del tiempo): OLIBOT dice suavemente *«Llevamos un rato juntos,
  ¡lo has hecho muy bien! Casi terminamos por hoy.»*
- A los 20 min: *«¡Hasta la próxima! 👋»* y la pantalla vuelve a la selección de alumno.
- El tiempo se puede pausar si el docente usa el menú de adulto.

**Archivos afectados:** `ChatWindow.jsx` (timer en `useEffect`), `backend/db/models.py`.

---

### 13. Modo audición: escuchar un sonido y tocar la letra

**Motivación:** El trazado es una vía motriz de aprendizaje. Pero también es importante
la vía auditiva → visual (escuchar /a/ y reconocer la letra A entre varias opciones).
Esto es útil como calentamiento o para niños con dificultades motoras.

**Propuesta:**

- Nuevo tipo de actividad: `recognition`.
- OLIBOT pronuncia un fonema o nombre de letra. El niño ve 3–4 letras grandes en pantalla
  y debe tocar la correcta.
- Sin trazar, solo tocar. Ideal para niños que aún no tienen control motor fino.
- Se integra en el currículo: antes de trazar una letra, siempre se hace un ejercicio de
  reconocimiento auditivo (si el docente lo activa).

**Archivos afectados:** `backend/pedagogy/curriculum.py`, `ChatWindow.jsx`,
nuevo componente `LetterChoice.jsx`.

---

### 14. Modo palabras (para niños de 5 años avanzados)

**Motivación:** Algunos alumnos de 5 años ya dominan todas las letras individualmente.
El paso natural es formar sílabas y palabras simples.

**Propuesta:**

- Nuevo tipo de actividad: `word_tracing`.
- El niño traza letras en secuencia formando una palabra (mamá, papá, sol, pan).
- Canvas adaptado para mostrar 2–4 letras horizontalmente.
- El currículo de 5 años ya tiene sílabas; este modo es la extensión natural.

**Nota:** Esta mejora es de alta complejidad (requiere re-diseñar el canvas para múltiples
caracteres en secuencia). Candidata a fase 11 o TFM ampliado.

---

### 15. Control de velocidad TTS: automático por edad + ajuste manual

**Verificación:** La velocidad de voz estaba fijada a 0.85 para todos los perfiles.
✅ **Implementado en esta fase.** El hook `useSpeech` ahora acepta un parámetro `ttsRate`
y usa un ref interno para que `speak`/`speakQueued` siempre lean el valor actual sin
necesitar recrear los callbacks.

**Velocidades automáticas por edad (ChatWindow.jsx):**
```js
const ttsRate = ({ 3: 0.72, 4: 0.80, 5: 0.88 })[ageProfile] ?? 0.85;
// Se pasa a: useSpeech({ onTranscript, onSilence, ttsRate })
```

| Edad | Rate | Justificación |
|------|------|---------------|
| 3 años | 0.72 | Procesamiento auditivo lento; vocabulario muy limitado |
| 4 años | 0.80 | Comprensión en desarrollo; puede necesitar repetición |
| 5 años | 0.88 | Capacidad de comprensión cercana a la adulta |

**Ajuste manual futuro:** Un padre/docente puede sobreescribir el rate en el perfil
del alumno (`tts_rate` en `student.beliefs`) para casos de necesidades específicas
(hipoacusia leve, procesamiento auditivo, TDA). El campo existe pero el UI de
configuration está pendiente (`StudentSelector`).

**Archivos modificados:** `useSpeech.js` (parámetro `ttsRate` + `ttsRateRef`),
`ChatWindow.jsx` (constante `ttsRate` derivada de `ageProfile`).

---

### 16. Modo sin conexión (Service Worker + IndexedDB)

**Motivación:** Muchos colegios tienen WiFi inestable. El programa no debería caer
si hay un corte puntual de 5 minutos.

**Propuesta:**

- Service Worker que cachea los assets estáticos y los últimos datos del currículo.
- Cuando no hay conexión: modo offline que permite seguir trazando con respuestas
  pre-generadas (cache de `response_cache.json` ya existente).
- Las sesiones offline se guardan en IndexedDB y se sincronizan al volver la conexión.

**Archivos afectados:** nuevo `public/sw.js`, `vite.config.js` (plugin PWA),
`frontend/src/services/api.js` (interceptor de red).

---

### 17. Exportar / imprimir informe de progreso

**Motivación:** Los tutores necesitan llevar el informe a tutorías o archivarlo.

**Propuesta:**

- Botón «Imprimir» en `ProgressReport.jsx` que invoca `window.print()`.
- CSS `@media print` que oculta el navbar y botones, formatea el informe en A4.
- Alternativa: exportar como PDF usando la API del navegador (`print-to-PDF`).
  No requiere dependencias adicionales.

**Archivos afectados:** `ProgressReport.jsx`, nuevo archivo `print.css`.

---

### 18. Detección de entorno ruidoso: sugerir auriculares

**Motivación:** El STT falla en aulas ruidosas. Informar al docente en lugar de
dejar al niño frustrado.

**Propuesta:**

- Si la confianza media de las últimas 5 transcripciones del STT es < 0.4, mostrar
  un banner suave: *«Hay mucho ruido. Prueba a usar auriculares.»*
- El banner desaparece al siguiente intento exitoso.

**Archivos afectados:** `useSpeech.js`, `ChatWindow.jsx`.

---

### 19. Modo alto contraste (accesibilidad visual)

**Motivación:** Niños con dislexia visual o dificultades de contraste.

**Propuesta:**

- Toggle en el menú de adulto: activa clase CSS `high-contrast` en `<html>`.
- La clase sobreescribe colores: fondo negro, texto blanco, letras en amarillo brillante.
- Persistido en `localStorage`.

**Archivos afectados:** `App.jsx`, `index.css`.

---

### 20. Seguimiento emocional a lo largo de sesiones (para informe docente)

**Motivación:** Si un niño llega consistentemente triste o enfadado los lunes, eso es
información valiosa para la orientadora, más allá del progreso académico.

**Propuesta:**

- Guardar en DB cada check-in emocional con `timestamp`, `emotion`, `topic_id`,
  `sublevel_at_moment`.
- Nueva sección en `ProgressReport`: «Estado emocional» con gráfico de barras simples
  (react-simple-charts o puro SVG) mostrando la distribución de emociones por semana.
- La orientadora puede ver si hay patrones (lunes siempre triste, después de mate siempre enfadado).

**Archivos afectados:** `backend/db/models.py` (tabla `emotional_checkpoints`),
`backend/db/repositories/session_repo.py`, `ProgressReport.jsx`.

---

### 21. Exponer historial de mensajes en el informe de padres/orientadora

**Verificación:** Los mensajes sí se guardan en la base de datos con su contenido
completo. `SessionManager.process_message()` llama a `session_repo.add_message()`
dos veces por turno: una para el mensaje del niño (`role="user"`) y otra para la
respuesta de OLIBOT (`role="agent"`), incluyendo el texto completo, el intent
detectado y si el Safety Shield intervino.

**El gap real:** El modelo `MessageModel` y el repositorio `get_session_messages()`
existen, pero el endpoint de informes (`GET /api/v1/reports/{student_id}`) no los
devuelve. El schema `SessionSummary` solo expone `messages_count`, no la lista de
mensajes.

**Propuesta de implementación:**

1. Añadir schema `MessageRecord` en `backend/api/schemas/report.py`:
```python
class MessageRecord(BaseModel):
    role: str            # "user" | "agent"
    content: str
    detected_intent: str | None
    shield_triggered: bool
    timestamp: datetime
```

2. Añadir nuevo endpoint en `reports.py`:
```python
@router.get("/{student_id}/messages", response_model=list[MessageRecord])
def get_student_messages(student_id: int, session_id: int | None = None, db: ...):
    """Devuelve el historial de mensajes de una sesión o de todas."""
```

3. Añadir sección «Historial de conversación» en `ProgressReport.jsx`:
- Lista paginada (máximo 20 mensajes por página) con burbujas de chat.
- Filtro por sesión (desplegable con fechas).
- El niño no accede a esta vista; solo padres/docentes.

**Archivos afectados:** `backend/api/schemas/report.py`,
`backend/api/routes/reports.py`, `frontend/src/components/ProgressReport.jsx`,
`frontend/src/services/api.js` (nuevo método `getStudentMessages`).

**Estado:** ✅ Implementado

---

## Plan de implementación sugerido

### Sprint A — Impacto inmediato, baja complejidad (1–2 semanas)
- ✅ **#1** UI simplificada para edad ≤ 4 (lock 🔒 en App.jsx, sin 📚 en ChatWindow)
- ✅ **#2** Burbujas de texto ocultas en modo simplificado (solo botón 🔊)
- ✅ **#3** Botones de padres ocultos por defecto para edad ≤ 4 (toggle 🔒/🔓)
- ✅ **#8A** Niveles por animales 🐢 🐇 🦅 (StudentSelector, sin mencionar edad)
- ✅ **#12** Límite de sesión por edad (15/20/25 min) con banner y aviso TTS
- ✅ **#15** Velocidad TTS automática por edad *(implementado en fase anterior)*
- ✅ **#17** Botón imprimir + `@media print` en ProgressReport
- ✅ **#19** Alto contraste (toggle 🌙/☀️ en menú padres, clase `html.high-contrast`)
- ✅ **#21** Historial de mensajes completo en informe (API `GET /reports/{id}/messages` + tab 💬 en ProgressReport)

### Sprint B — Valor pedagógico alto, complejidad media ✅ COMPLETADO
- ✅ **#4** `ActivityPicker` reemplaza `TopicNavBar`: overlay de actividad con resaltado cíclico y voz sincronizada
- ✅ **#5** Progreso de subnivel (tracingLevel + levelAttempts) guardado en `student.beliefs.topics_progress` vía `PATCH /students/{id}/beliefs`
- ✅ **#6** `CelebrationOverlay`: confeti canvas de 120 partículas al subir de nivel; avatar con animación `celebrate-big`
- ✅ **#9** `EmotionPicker`: cuatro emociones sin texto, botones 72 px, OLIBOT habla la opción exactamente al iluminarla
- ✅ **#10** `RestBreakPicker`: overlay descanso adaptativo (timer 3 min); dos botones ✏️/🔤 sin texto, voz sincronizada con highlight
- ✅ **#13** `LetterChoice`: modo audición con 4 botones de letra 110 px, temporizador de ánimo a los 8 s, sin texto

**Mejoras UX transversales aplicadas en Sprint B** (mandato: el niño no sabe leer):
- Todos los overlays: cero texto en pantalla, OLIBOT narra cada opción en el mismo instante en que se ilumina (`onHighlight` prop)
- `ColoringCanvas`: botón 🎨 fijo en esquina superior derecha de pantalla (88 × 88 px, `position: fixed`), opciones de dibujo 68 px sin etiqueta, botón "ver más" sólo 🔄
- Backend: campo `current_screen` en `ChatRequest` → pistas de contexto en `session_manager` para que BDI entienda la pantalla activa
- BDI bloqueado durante overlays modales; enrutado de voz a cada overlay mediante refs estables

### Sprint C — Funcionalidades avanzadas ⭐ EN CURSO
- ⏳ **#7** Modo parejas
- ⏳ **#8B** Evaluación inicial automática
- ⏳ **#11** Dashboard docentes
- ⏳ **#20** Seguimiento emocional

### Fase posterior / TFM ampliado
- **#14** Modo palabras
- **#16** Modo sin conexión
- **#18** Detección de ruido

---

## Notas adicionales

- Las mejoras **#1, #2, #3** deben coordinarse: el objetivo es una pantalla casi vacía
  donde solo se vea el avatar y el canvas. Todo lo demás es secundario.
- La mejora **#5** (guardar progreso) es el prerrequisito técnico de **#8B** y **#20**.
- El **modo no-verbal** (#9) tiene potencial de convertirse en una línea de investigación
  propia para un trabajo académico posterior.
- La **nomenclatura de niveles** (#8A) debe definirse con la directora o la orientadora:
  que ellas elijan el sistema (colores, animales, personajes) para mayor apropiación
  del centro.
