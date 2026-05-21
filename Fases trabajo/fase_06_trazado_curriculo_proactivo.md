# Fase 6 — Trazado de letras, currículo mayúsculas/minúsculas y agente proactivo

> Documento de referencia para el desarrollo y la memoria del TFM.  
> Cubre tres ampliaciones interrelacionadas: el módulo de trazado libre en canvas, la extensión del currículo con variantes minúsculas, y el comportamiento proactivo del agente en el saludo.

---

## Índice

1. [Visión general de la fase](#1-visión-general-de-la-fase)
2. [Módulo de trazado — arquitectura](#2-módulo-de-trazado--arquitectura)
3. [Datos de trazado — letterData.js](#3-datos-de-trazado--letterdatajs)
4. [El hook useLetterTracing](#4-el-hook-uselettertracing)
5. [El componente LetterTracing](#5-el-componente-lettertracing)
6. [Integración en ChatWindow](#6-integración-en-chatwindow)
7. [Currículo extendido — vocales minúsculas](#7-currículo-extendido--vocales-minúsculas)
8. [Agente proactivo en el saludo](#8-agente-proactivo-en-el-saludo)
9. [Nuevos intents — cambio de tema](#9-nuevos-intents--cambio-de-tema)
10. [Decisiones de diseño importantes](#10-decisiones-de-diseño-importantes)
11. [Problemas conocidos](#11-problemas-conocidos)

---

## 1. Visión general de la fase

La Fase 6 añade tres capacidades complementarias:

| Capacidad | Componentes afectados | Justificación |
|-----------|----------------------|---------------|
| **Trazado libre de letras** | `LetterTracing.jsx`, `useLetterTracing.js`, `letterData.js` | OLIBOT es un "cuadernillo digital" — el niño no solo reconoce letras, también las escribe |
| **Currículo mayúsculas/minúsculas** | `curriculum.py` | El CEIP enseña primero la mayúscula de imprenta (forma) y luego la minúscula; OLIBOT replica esta secuencia |
| **Agente proactivo en saludo** | `bdi_bridge.py`, `nlu.py` | El agente no espera pasivamente a que el niño pida un tema; lo propone activamente basándose en la ZDP |

### Relación con el paper ChatBDI (AAMAS 2025)

El paper "ChatBDI: Think BDI, Talk LLM" (Gatti, Mascardi, Ferrando) valida arquitectónicamente OLIBOT: el agente Jason **razona** (selecciona la acción pedagógica: `trace_letter`, `praise`, `give_hint`) y el LLM **habla** (genera el texto amigable para el niño). El trazado amplía el canal de actuación del agente más allá del texto: la acción pedagógica puede ahora ser "mostrar guía de trazado nivel 3" además de "dar una pista verbal".

---

## 2. Módulo de trazado — arquitectura

```
ChatWindow.jsx
  │
  ├── getCharData(currentTopicId)   ← letterData.js (TOPIC_MAP)
  │     └── { key: "A", strokes: [...] }
  │
  ├── hintLevel  ← successRate del alumno en este topic
  │     (< 40% → 3, 40-70% → 2, ≥ 70% → 1)
  │
  └── <LetterTracing charData hintLevel onComplete>
          │
          └── useLetterTracing({ charData, hintLevel, onComplete })
                  │
                  ├── canvas ref  (dibujo libre del niño)
                  ├── evaluateStroke()  (shapeScore + orderOk)
                  └── finalize()  → onComplete({ shapeScore, orderScore, passed })
                                         │
                                    ChatWindow.handleTracingComplete()
                                         │
                                    sendMessage("He trazado la letra A...")
```

El trazado está **acoplado** al turno conversacional: completar un trazo genera un mensaje que el backend procesa como cualquier otro turno, permitiendo que el BDI actualice la mastery del alumno.

---

## 3. Datos de trazado — letterData.js

Ubicación: `frontend/src/data/letterData.js`

### Formato de un trazo

```javascript
// Cada letra tiene uno o más strokes (trazos que el niño hace en orden)
"A": {
  strokes: [
    { points: [{x:0.50,y:0.06}, {x:0.38,y:0.38}, ...], arrowAngle: 135 },
    { points: [{x:0.50,y:0.06}, {x:0.62,y:0.38}, ...], arrowAngle: 45  },
    { points: [{x:0.30,y:0.57}, {x:0.70,y:0.57}],      arrowAngle: 0   },
  ]
}
```

- **points**: waypoints normalizados en `[0,1]×[0,1]`. Se escalan al tamaño real del canvas en runtime.
- **arrowAngle**: dirección de la flecha de inicio en grados (0=derecha, 90=abajo, 180=izquierda, 270=arriba). Se usa en `hintLevel=3` para mostrar la dirección de escritura.

### Letras incluidas

| Grupo | Claves | Nota |
|-------|--------|------|
| Vocales mayúsculas | `A E I O U` | Letra de imprenta — trazo pedagógico |
| Vocales minúsculas | `a e i o u` | Zona central del canvas (`y: 0.20–0.85`) — proporción de línea de escritura |
| Consonantes (mayúsculas) | `B C D F G H J K L M N P Q R S T V W X Y Z` | Alfabeto completo — para fases futuras |
| Dígitos | `0 1 2 3 4 5 6 7 8 9` | Para los temas `numero_N` del currículo |

### Mapeo topicId → clave de letra

```javascript
const TOPIC_MAP = {
  vocal_a: "A",  vocal_a_min: "a",
  vocal_e: "E",  vocal_e_min: "e",
  vocal_i: "I",  vocal_i_min: "i",
  vocal_o: "O",  vocal_o_min: "o",
  vocal_u: "U",  vocal_u_min: "u",
  numero_1: "1", ..., numero_9: "9",
  consonante_m: "M", consonante_p: "P", ...
};
```

La función pública es `getCharData(topicId)`. Devuelve `null` para topics sin trazado (e.g., si en el futuro se añadieran topics de comprensión oral).

---

## 4. El hook useLetterTracing

Ubicación: `frontend/src/hooks/useLetterTracing.js`

### Evaluación de trazos

Cada trazo se evalúa al levantar el puntero (`pointerup`):

```
evaluateStroke(drawnPath, waypoints, hitRadius)
  │
  ├── shapeScore: fracción de waypoints cubiertos por algún punto del camino dibujado
  │     Un waypoint está "cubierto" si algún punto del trazo cae a ≤ hitRadius
  │     hitRadius = 10% del lado corto del canvas (HIT_RADIUS_RATIO = 0.10)
  │
  └── orderOk: el inicio del trazo está próximo al primer waypoint (< 18%)
               Y la dirección inicial apunta al segundo waypoint (producto escalar > 0)
```

### Resultado final

```javascript
// Cuando todos los trazos están evaluados:
shapeScore  = media de shapeScore de todos los trazos
orderScore  = fracción de trazos con orderOk === true
passed      = shapeScore >= 0.60 AND orderScore >= 0.50
```

### Niveles de pista (hintLevel)

| Nivel | Qué se dibuja en el canvas |
|-------|--------------------------|
| 3 | Letra guía semitransparente (α=0.12) + puntos numerados + flecha de dirección |
| 2 | Puntos numerados (sin letra guía) |
| 1 | Solo punto de inicio (azul) y fin de cada trazo |

La guía en nivel 3 replica visualmente la pauta que usa el profesorado en los cuadernillos de escritura Rubio o Palau.

### Ciclo de vida del canvas

```
charData cambia → reset (strokeIdx=0, phase="tracing") → redraw()
                                                              │
pointerDown → currentPath = [p0]                             │
pointerMove → currentPath.push(p) → scheduleRedraw()        │
pointerUp   → evaluateStroke() → strokeResults.push()       │
            → strokeIdx++                                    │
            → si todos los trazos: finalize() → phase="done"│
                                                             │
reset() → vuelve al estado inicial                          ◄┘
```

---

## 5. El componente LetterTracing

Ubicación: `frontend/src/components/LetterTracing.jsx`

### Props

| Prop | Tipo | Descripción |
|------|------|-------------|
| `charData` | `{key, strokes}` o `null` | Datos de trazado de `letterData.js`. Si `null`, el componente no se renderiza. |
| `hintLevel` | `1 \| 2 \| 3` | Nivel de guía visual. Derivado de `successRate` en ChatWindow. |
| `onComplete` | `(result) => void` | Callback con `{ shapeScore, orderScore, passed, partial? }`. |

### Estructura visual

```
┌────────────────────────────────┐
│  [A]  ¡Traza la letra A!       │  ← cabecera: letra + título
│       Solo puntos · Trazo 1/3  │  ← subtítulo: hintLabel + progreso
│                       ● ● ○    │  ← indicador de trazos (verde/azul/gris)
├────────────────────────────────┤
│                                │
│         [canvas 280×280]       │  ← área de dibujo libre
│                                │
├────────────────────────────────┤
│  Empieza por el punto azul 🔵  │  ← instrucción dinámica
│  [🔄 Repetir]  [✅ ¡Listo!]   │  ← botones de acción
└────────────────────────────────┘
```

El overlay de resultado (⭐ ¡Muy bien! / 💪 ¡Casi!) se superpone sobre el canvas cuando `phase === "done"`.

---

## 6. Integración en ChatWindow

El panel de trazado aparece automáticamente cuando el topic activo tiene datos de letra:

```javascript
const charData = getCharData(currentTopicId);  // null si el topic no es letra/número
const hintLevel =
  successRate === null || successRate < 40 ? 3 :
  successRate < 70                          ? 2 : 1;
```

### Flujo de completar un trazo

```javascript
const handleTracingComplete = ({ shapeScore, orderScore, passed, partial }) => {
  if (partial) return;  // botón "¡Listo!" antes de terminar — ignorar
  const key   = getCharData(currentTopicId)?.key ?? "";
  const score = Math.round(((shapeScore + orderScore) / 2) * 100);
  const msg   = passed
    ? `He trazado la letra ${key} y me ha salido bien (${score}% de acierto)`
    : `He intentado trazar la letra ${key} pero necesito practicar más (${score}%)`;
  sendMessage(msg);   // ← entra al pipeline NLU → BDI → NLG como un turno normal
};
```

Este mensaje lo clasifica el NLU como `attempt_answer`, lo que permite que el BDI actualice la mastery del alumno en ese topic de trazado.

---

## 7. Currículo extendido — vocales minúsculas

### Nuevos topics añadidos

```python
# backend/pedagogy/curriculum.py

"vocal_a_min": CurriculumTopic(
    id="vocal_a_min",
    display_name="La vocal a (minúscula)",
    prerequisites=["vocal_a"],   # ← la mayúscula es prereq de la minúscula
    difficulty=1,
    ...
)
# Ídem para vocal_e_min, vocal_i_min, vocal_o_min, vocal_u_min
```

### Justificación pedagógica de los prerequisitos

La secuencia mayúscula → minúscula está justificada por la práctica estándar en Educación Infantil en España:

1. La **mayúscula de imprenta** es más simple gráficamente (trazos rectos, sin curvas complejas).
2. El niño primero aprende la **forma** de la letra (reconocimiento perceptivo).
3. Solo después aprende la **variante de escritura corriente** (minúscula cursiva/imprenta).

Esta secuencia se alinea con los materiales de la editorial Santillana y los cuadernillos Rubio usados en las aulas.

### Convención de nombres de topics

| Grupo | Sufijo | Ejemplo |
|-------|--------|---------|
| Mayúscula | (ninguno) | `vocal_a` → "La vocal A (mayúscula)" |
| Minúscula | `_min` | `vocal_a_min` → "La vocal a (minúscula)" |
| Número | `numero_` | `numero_1` → "El número 1" |
| Consonante | `consonante_` | `consonante_m` → "La consonante M" |

---

## 8. Agente proactivo en el saludo

### Comportamiento anterior (Fase 3)

El agente respondía al saludo genéricamente, sin proponer ninguna actividad concreta:
```
Alumno: "hola"
OLIBOT: "¡Hola! ¿Qué quieres practicar hoy?"
```

### Comportamiento nuevo (Fase 6)

El agente **propone activamente** el tema más adecuado según la ZDP del alumno, y ofrece alternativas:

```python
# bdi_bridge.py — PythonBDIFallback.decide(), rama intent=="greet"
if intent.name == "greet":
    if current_topic:
        alternatives = _curriculum.get_alternatives(beliefs, topic_id, 3)
        instruction = (
            f"Greet the student warmly and PROPOSE today's activity: "
            f"'{current_topic.display_name}'. {current_topic.description_for_student} "
            f"Ask: '¿Empezamos con esto o prefieres otra cosa? "
            f"También podemos practicar {alt_names}.'"
        )
```

Ejemplo de conversación resultante:
```
Alumno: "hola"
OLIBOT: "¡Hola Lucía! 🌟 Hoy podemos practicar 'La vocal a (minúscula)'.
         ¡Ya sabes la A grande, ahora aprenderemos la pequeñita!
         ¿Empezamos con esto o prefieres otra cosa?
         También podemos practicar 'El número 2' o 'La vocal E'. 😊"
```

Este comportamiento implementa el principio de **iniciativa pedagógica del tutor**: en lugar de esperar que el alumno elija, el tutor propone basándose en el diagnóstico del nivel del alumno (ZDP).

---

## 9. Nuevos intents — cambio de tema

### `request_topic_change`

El alumno quiere practicar otra cosa sin especificar cuál:
```
"quiero otra cosa", "esto es aburrido", "¿podemos cambiar?", "no quiero esto"
```

**Plan BDI**: `offer_alternatives` — el agente ofrece los 3 topics elegibles más adecuados (ZDP → sin iniciar → revisión).

### `request_specific_topic`

El alumno pide un topic concreto:
```
"quiero practicar la E", "quiero la a pequeña", "ponme el número 3"
```

El NLU extrae la entidad `requested_topic_id`:
```
"la a pequeña" → vocal_a_min
"la A" → vocal_a
"la a minúscula" → vocal_a_min
"el tres" → numero_3
```

**Plan BDI**:
- Si el topic existe y los prerequisitos están cumplidos → `accept_topic_change` + `next_topic_id = requested_topic_id`
- Si los prerequisitos no están cumplidos → `redirect` con explicación amable
- Si el topic no existe → `offer_alternatives`

### Procesamiento del cambio de tema en SessionManager

El cambio de topic se implementa usando el flujo existente de `next_topic_id`:

```python
# session_manager.py — ya implementado desde Fase 2
if next_topic_id and next_topic_id != session.topic:
    self.session_repo.close_session(session.id)
    new_session = self.session_repo.create_session(
        student_id=student_id, topic=next_topic_id
    )
```

No fue necesario código adicional: `request_specific_topic` simplemente usa el mismo mecanismo de avance de topic que `attempt_answer` (cuando se domina el topic actual).

---

## 10. Decisiones de diseño importantes

### 1. Trazado acoplado al turno conversacional

El resultado del trazado se envía como un mensaje de texto al backend en lugar de llamar a un endpoint dedicado. Ventajas:
- Reutiliza todo el pipeline NLU → BDI → NLG → Shield sin duplicación de código
- El BDI puede responder al trazado con el mismo tipo de reasoning que a cualquier otra interacción
- El historial de conversación incluye las sesiones de trazado (auditable)

### 2. Coordenadas normalizadas en letterData.js

Los waypoints están en `[0,1]×[0,1]` en lugar de píxeles. Ventajas:
- El canvas puede redimensionarse sin recalcular las coordenadas
- Los datos son independientes del dispositivo (tablet 768px o PC 1920px)
- Facilita añadir nuevas letras sin conocer el tamaño del canvas

### 3. HIT_RADIUS_RATIO = 0.10

El radio de "toque" (10% del lado corto del canvas) está calibrado para dedos de niños de 3-5 años. Un radio más pequeño (p.ej. 5%) penalizaría la motricidad fina de esta edad. Un radio mayor (p.ej. 20%) haría la evaluación trivial — cualquier garabato pasaría.

### 4. PASS_SHAPE = 0.60, PASS_ORDER = 0.50

Umbrales calibrados para ser **alcanzables** por niños sin penalizar la falta de precisión motriz:
- Un niño puede cubrir el 60% de los waypoints aunque su trazo no sea perfecto
- El 50% de trazos en orden correcto es la mitad — razonable para un primer intento

### 5. topicId con sufijo `_min` en lugar de nueva categoría

Las vocales minúsculas son el mismo concepto que las mayúsculas con una representación gráfica diferente. Usar `_min` como sufijo en lugar de crear una nueva `CurriculumCategory` ("LECTOESCRITURA_MIN") evita duplicar la lógica del `CurriculumEngine` y mantiene la coherencia semántica: son el mismo fonema.

---

## 11. Problemas conocidos

### Bug: `CURRICULUM` no importado en bdi_bridge.py

**Ubicación:** `backend/core/bdi_bridge.py`, línea que usa `CURRICULUM.get(requested_id)`.  
**Causa:** `CURRICULUM` (el diccionario) no está en los imports; solo se importa `CurriculumEngine` y `CurriculumTopic`.  
**Efecto:** `NameError` al intentar cambiar a un topic específico mediante `request_specific_topic`.  
**Solución:** Cambiar `CURRICULUM.get(requested_id)` por `_curriculum.get_topic(requested_id)`, o añadir `CURRICULUM` a los imports.

### La respuesta al trazado es genérica

El intent `attempt_answer` que genera `handleTracingComplete` se procesa con la misma instrucción BDI que cualquier respuesta verbal. El LLM puede generar texto incoherente con el resultado real del trazado.

**Solución propuesta (Fase 7):** Añadir intent `tracing_complete` con plan BDI específico que recibe `passed` y `score` como entidades.

### El hintLevel del trazado es de sesión, no de topic

`successRate` en ChatWindow es la tasa de éxito **de toda la sesión** (aciertos / intentos totales), no específica del topic de trazado actual. Si el alumno lleva muchos aciertos en números y luego empieza con una letra nueva, recibirá `hintLevel=1` (poca guía) aunque no haya trazado nunca esa letra.

**Solución propuesta:** Calcular `hintLevel` a partir del `successRate` por topic, disponible en `student.beliefs.mastery[topicId]`.