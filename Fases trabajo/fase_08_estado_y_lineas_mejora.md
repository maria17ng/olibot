# Fase 8 — Estado del sistema y líneas de mejora

> Documento de análisis y planificación.  
> Recoge lo implementado hasta la Fase 7, las líneas de mejora identificadas desde el paper base (ChatBDI, AAMAS 2025) y trabajos relacionados, y las mejoras de diseño UX orientadas a niños pre-lectores de 3-5 años.

---

## Índice

1. [Estado del sistema — resumen de fases](#1-estado-del-sistema--resumen-de-fases)
2. [Rendimiento LLM — comunicación lenta](#2-rendimiento-llm--comunicación-lenta)
3. [Interfaz sin texto — niños pre-lectores](#3-interfaz-sin-texto--niños-pre-lectores)
4. [Rediseño de layout — canvas pantalla completa](#4-rediseño-de-layout--canvas-pantalla-completa)
5. [Avatares personalizados — selección en registro](#5-avatares-personalizados--selección-en-registro)
6. [Mejoras pedagógicas — paper base y trabajos relacionados](#6-mejoras-pedagógicas--paper-base-y-trabajos-relacionados)
7. [Plan de implementación priorizado](#7-plan-de-implementación-priorizado)

---

## 1. Estado del sistema — resumen de fases

### Arquitectura general

```
Frontend (React + Vite, :5173)
  │  REST JSON
  ▼
Backend (FastAPI + Python 3.11, :8000)
  │                    │
  ├── NLU (Ollama)     ├── Safety Shield (regex + Jason)
  ├── BDI bridge       └── Session Manager + SQLite
  │    ├── JaCaMo (:8080) [JACAMO_ENABLED=true]
  │    └── PythonBDIFallback  [JACAMO_ENABLED=false]
  └── NLG (Ollama, llama3.1:8b)
```

### Fases completadas

| Fase | Título | Estado | Ficheros clave |
|------|--------|--------|----------------|
| 1 | Núcleo conversacional | ✅ Completa | `ollama_client.py`, `nlu.py`, `nlg.py`, `api.js` |
| 2 | Currículo y scaffolding | ✅ Completa | `curriculum.py`, `session_manager.py`, SQLite |
| 3 | Frontend React | ✅ Completa | `App.jsx`, `ChatWindow.jsx`, `ProgressReport.jsx` |
| 4 | JaCaMo BDI | ✅ Completa | `bdi_bridge.py`, `OlibotEnv.java`, `olibot.asl` |
| 5 | Voz STT/TTS | ✅ Completa | `useSpeech.js`, Web Speech API |
| 6 | Trazado + currículo mayús/minús + agente proactivo | ✅ Completa | `useLetterTracing.js`, `LetterTracing.jsx`, `letterData.js` |
| 7 | Diseño pedagógico adaptativo por edad | ✅ Diseño completo · Código parcial | `fase_07_diseño_pedagogico.md`, todos los ficheros del backend |

### Capacidades operativas actuales

| Capacidad | Detalles |
|-----------|----------|
| **BDI real** | Jason + JaCaMo con fallback Python; Safety Shield bicapa |
| **Currículo ZDP** | Trazos pregráficos → vocales mayús/minús → consonantes fase 1 → números → consonantes fase 2 → sílabas → palabras |
| **Trazado** | Canvas libre, evaluación de forma + orden, 3 niveles de guía, `hintLevel` por topic |
| **Adaptación por edad** | 3 años (solo canvas), 4 años (micrófono + placement test), 5 años (chat libre + placement test extendido) |
| **Voz** | STT + TTS con Web Speech API; auto-escucha tras TTS para 3 años |
| **Progreso** | Mastery por topic, tasa de éxito, informes para padres (ProgressReport) |

### Problemas conocidos pendientes (de Fase 7)

| Bug | Fichero | Descripción |
|-----|---------|-------------|
| Intent `tracing_complete` no completamente separado de `attempt_answer` | `nlu.py`, `bdi_bridge.py` | El trazado debería tener su propio intent y plan BDI |
| `hintLevel` calculado por sesión global | `ChatWindow.jsx` línea ~167 | Ya corregido parcialmente — verificar que usa `topicSR` y no `successRate` |
| Placement test no implementado en código | `bdi_bridge.py` | Diseñado en Fase 7 pero pendiente de implementar |
| Sílabas/palabras no tienen charData | `letterData.js` | topics `silaba_ma`, `palabra_mama` necesitan flujo multi-paso |

---

## 2. Rendimiento LLM — comunicación lenta

### Diagnóstico del problema

El cuello de botella actual está en `ollama_client.py`: cada turno hace **dos llamadas síncronas bloqueantes** a Ollama con `stream: False`:

```python
# nlu.py llama a:
await client.generate(prompt, system_prompt)   # ~1-3 s para clasificar intent

# nlg.py llama a:
await client.generate(prompt, system_prompt)   # ~2-5 s para generar texto

# Total por turno: ~3-8 segundos
```

Con `llama3.1:8b` en CPU, cada token tarda ~40-80 ms → una respuesta de 60 tokens = 3-5 s de espera.

### Mejora 2.1 — Streaming de la respuesta NLG

**Qué:** Activar `stream: True` en la llamada NLG y enviar tokens al frontend por SSE (Server-Sent Events) o WebSocket.

**Por qué:** El niño ve el texto aparecer progresivamente y el TTS puede arrancar al recibir la primera oración completa, reduciendo la latencia percibida de 5 s a ~1 s.

**Cómo:**
```python
# ollama_client.py — nuevo método
async def generate_stream(self, prompt: str, system_prompt: str = ""):
    payload = {"model": self.model, "prompt": prompt, "system": system_prompt, "stream": True}
    async with httpx.AsyncClient(timeout=self.timeout) as client:
        async with client.stream("POST", f"{self.base_url}/api/generate", json=payload) as r:
            async for line in r.aiter_lines():
                chunk = json.loads(line)
                yield chunk["response"]
                if chunk.get("done"):
                    break

# main.py — nuevo endpoint SSE
@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    async def event_generator():
        async for token in nlg_stream(req):
            yield f"data: {token}\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

**Ficheros afectados:** `ollama_client.py`, `nlg.py`, `main.py`, `api.js`, `ChatWindow.jsx`

### Mejora 2.2 — Modelo ligero para NLU

**Qué:** Reemplazar la llamada LLM en NLU por un clasificador de intents ligero.

**Por qué:** La clasificación de intents es una tarea de clasificación de texto de baja complejidad. No necesita un LLM de 8B parámetros. La latencia actual de NLU (~1-3 s) puede reducirse a <100 ms.

**Opciones:**
| Opción | Latencia | Esfuerzo | Observaciones |
|--------|----------|----------|---------------|
| `ollama pull llama3.2:1b` | ~0.4 s | Ninguno | Cambiar `OLLAMA_MODEL=llama3.2:1b` solo en NLU |
| Classifier fine-tuned (HuggingFace) | <50 ms | Alto | Requiere dataset etiquetado de intents |
| Rasa NLU | <100 ms | Medio | Referencia [21] del paper; pipeline YAML |
| Regex+reglas ampliadas | <1 ms | Bajo | Solo válido si el vocabulario es cerrado |

**Recomendación para TFM:** Usar modelo distinto por función. Crear instancia separada de `OllamaClient` para NLU con modelo ligero:

```python
# settings.py
nlu_model: str = "llama3.2:1b"   # o "phi3:mini"
nlg_model: str = "llama3.1:8b"

# nlu.py usa OllamaClient(model=settings.nlu_model)
# nlg.py usa OllamaClient(model=settings.nlg_model)
```

### Mejora 2.3 — Caché de respuestas frecuentes

**Qué:** Cachear respuestas NLG para combinaciones (intent, topic, age) frecuentes.

**Por qué:** "¡Muy bien! Sigue así 🌟" para `intent=attempt_answer_correct, topic=vocal_a, age=4` se genera de nuevo en cada sesión.

**Cómo:** Diccionario `{(intent, topic_id, age): [respuesta1, respuesta2, ...]}` con selección aleatoria. Se puede generar offline con el mismo LLM y guardar en JSON.

---

## 3. Interfaz sin texto — niños pre-lectores

### Problema actual

Un niño de 3 años ve texto en múltiples lugares donde no puede leer:

| Componente | Texto visible al niño | Prioridad |
|------------|-----------------------|-----------|
| `ChatWindow.jsx` barra de stats | "📚 vocal_a", "Tema por asignar…" | Alta |
| `ChatWindow.jsx` estado del agente | "OLIBOT está pensando…", "Te estoy escuchando…" | Alta |
| `LetterTracing.jsx` cabecera | "✏️ Traza la A", "Práctica 1 de 3" | Alta |
| `LetterTracing.jsx` instrucción | "Empieza por el punto azul 🔵" | Alta |
| `StudentSelector.jsx` | "¿Quién eres hoy? 🌟", "Nuevo niño", "Nombre", "Crear" | Alta |
| `ChatWindow.jsx` burbuja | Texto del agente (mezclado con emojis) | Media — TTS lo lee |
| `App.jsx` header | "OLIBOT", "Tu tutor inteligente…", "Alumno:", "Informes" | Baja — lo ven los padres |

### Regla de diseño para niños pre-lectores

```
Zona del niño (≤5 años):   SOLO emojis + audio + canvas
Zona de padres/tutores:    Texto normal (informes, selección de perfil)
```

### Mejora 3.1 — Barra de estado solo con emojis

```jsx
// Antes
<span>📚 vocal_a</span>
<span>✅ 3  💪 1  💡 2  87%</span>

// Después — solo iconos grandes, sin texto
<span style={{ fontSize: "24px" }}>📚</span>    {/* icono del topic */}
<span style={{ fontSize: "24px" }}>⭐⭐⭐</span>  {/* estrellas según successRate */}
```

El topic activo se comunica visualmente mediante el emoji del topic (🖊️ para trazos, 🔤 para vocales, 🔢 para números) y mediante TTS al inicio de cada actividad — nunca como texto escrito.

### Mejora 3.2 — Estado del agente como animación, no texto

```jsx
// Antes
"OLIBOT está pensando…"  // texto que el niño no entiende

// Después
// avatarState ya controla las animaciones SVG:
//   "thinking"  → puntos rebotando + antena brillando
//   "listening" → brazo levantado + ondas sonoras
//   "speaking"  → barras ecualizador + boca abierta
// → eliminar el <div> de texto de estado completamente
```

### Mejora 3.3 — LetterTracing sin texto de instrucciones

```jsx
// Cabecera: solo emoji del trazo + puntos de práctica como estrellas
// "✏️ Traza la A" → <span style={{fontSize:"64px"}}>{charData.key}</span>
// "Práctica 1 de 3" → ⭐ ○ ○  (estrella llena = completado)

// Instrucción dinámica "Empieza por el punto azul":
// → el punto de inicio ya es azul en el canvas
// → añadir animación de pulso en el punto de inicio (escala 1→1.4→1 cada 1.5s)
// → el audio dice la instrucción al cargar el topic
```

### Mejora 3.4 — StudentSelector visual

El selector de alumno es el primer punto de contacto con el niño. Actualmente es una lista de botones de texto.

**Rediseño:** cuadrícula de tarjetas grandes con el avatar del niño + su nombre en grande (para cuando el niño ya sabe leer) o leído en voz alta al pasar por encima.

```jsx
// En lugar de botón de texto:
<button onClick={() => onSelectStudent(s)} style={{ width: 120, height: 140 }}>
  <AvatarDisplay avatarId={s.avatar_id} size={80} />
  <div style={{ fontSize: "18px", fontWeight: "bold" }}>{s.name}</div>
  <div style={{ fontSize: "28px" }}>{"⭐".repeat(Math.min(starRating, 5))}</div>
</button>
```

La creación de nuevo estudiante es para los padres (pueden leer) — puede mantener texto.

---

## 4. Rediseño de layout — canvas pantalla completa

### Problema actual

El layout actual tiene tres capas visibles simultáneamente: header + StudentSelector + ChatWindow. Una vez seleccionado el alumno, el canvas de trazado aparece como overlay encima del chat.

**Problemas para un niño de 3-5 años:**
- El header con texto ocupa espacio visual sin aportarle nada
- El StudentSelector sigue visible debajo del chat
- El robot está centrado en la pantalla pero el canvas lo cubre
- La interfaz tiene demasiados elementos simultáneos

### Mejora 4.1 — Dos modos de pantalla: "padres" y "niño"

```
MODO PADRES (antes de seleccionar alumno):
┌─────────────────────────────────────────┐
│  🤖 OLIBOT          [header visible]    │
├─────────────────────────────────────────┤
│                                         │
│   [Tarjeta Lucía]  [Tarjeta Pablo]      │
│   [Tarjeta Ana]    [+ Nuevo niño]       │
│                                         │
└─────────────────────────────────────────┘

MODO NIÑO (una vez seleccionado):
┌─────────────────────────────────────────┐
│  [canvas / actividad — pantalla completa]│
│                          ┌────────────┐ │
│                          │  [Avatar]  │ │  ← esquina inferior derecha
│                          │  💬 burbuja│ │
│                          └────────────┘ │
│  [⭐ ⭐ ○]  [🔤]                        │  ← barra mínima de estado (solo emojis)
└─────────────────────────────────────────┘
```

**Cambios en `App.jsx`:**
```jsx
// Cuando selectedStudent !== null → modo niño:
// - header oculto (o mini barra con solo 📋 para padres en esquina)
// - StudentSelector oculto
// - ChatWindow ocupa el 100% del viewport
// - botón "cambiar niño" como icono pequeño discreto

return (
  <div style={{ height: "100vh", overflow: "hidden" }}>
    {!selectedStudent
      ? <ParentScreen onSelectStudent={handleSelectStudent} />
      : <ChildScreen student={selectedStudent} onBack={() => setSelectedStudent(null)} />
    }
  </div>
);
```

### Mejora 4.2 — Robot en esquina inferior, canvas como fondo

Actualmente el robot está centrado y el canvas aparece como overlay. La propuesta invierte el orden:

```
DURANTE UNA ACTIVIDAD DE TRAZADO:
┌─────────────────────────────────────────┐
│                                         │
│          [CANVAS GRANDE]                │
│          (toda la pantalla)             │
│                                         │
│                      ┌───────────────┐  │
│                      │  [Avatar 90px]│  │
│                      │  ┌──────────┐ │  │
│                      │  │ 🌟¡Bien! │ │  │  ← burbuja del robot
│                      │  └──────────┘ │  │
│                      └───────────────┘  │
└─────────────────────────────────────────┘

DURANTE CONVERSACIÓN (sin canvas):
┌─────────────────────────────────────────┐
│                                         │
│     fondo de la actividad               │
│     (imagen del topic, emoji grande)    │
│                                         │
│                      ┌───────────────┐  │
│                      │  [Avatar]     │  │
│                      │  ┌──────────┐ │  │
│                      │  │  💬 ...  │ │  │
│                      │  └──────────┘ │  │
│                      └───────────────┘  │
│  [🎙️]                                  │  ← botón de micrófono flotante
└─────────────────────────────────────────┘
```

**Cambios en `ChatWindow.jsx`:**
- Eliminar `display: flex, flexDirection: column` actual
- Layout `position: relative, height: 100vh`
- Canvas (`LetterTracing`) como elemento principal (no overlay)
- Avatar + burbuja: `position: fixed, bottom: 16px, right: 16px`
- Botón de micrófono: `position: fixed, bottom: 16px, left: 50%, transform: translateX(-50%)`

---

## 5. Avatares personalizados — selección en registro

### Concepto

Cuando los padres crean un perfil nuevo, el niño elige un personaje. Ese personaje reemplaza al robot OLIBOT genérico como interlocutor visual. OLIBOT sigue siendo la "voz" (BDI + LLM), pero la cara que el niño ve es su personaje favorito.

```
Registro → padre introduce nombre + edad → niño elige personaje:
   [🐼 Panda]  [🦊 Zorro]  [🐸 Rana]  [🚀 Robot]
   [🦁 León]   [🐬 Delfín] [🦋 Mariposa] [🌟 Estrella]

→ se guarda avatar_id en la tabla students
→ ChatWindow muestra ese avatar en lugar del SVG del robot
```

### Opciones de avatares gratuitos

| Librería | Tipo | Integración React | Licencia | Estilo |
|----------|------|-------------------|----------|--------|
| **DiceBear** | SVG generativo | `@dicebear/core` + `@dicebear/collection` | MIT | Varios: `lorelei`, `bottts`, `fun-emoji` — infantiles |
| **Multiavatar** | SVG único por nombre | `multiavatar` npm | Free (atrib.) | Máscaras coloridas — muy visual |
| **Avataaars** | Cabeza humana configurable | `avataaars` React | MIT | Cartoon — adecuado para 4-5 años |
| **Open Peeps** | Ilustración vectorial | SVG inline | Free (OFL) | Personajes tipo libro ilustrado |
| **Emoji nativo** | Emoji en grande | Sin dependencia | — | Más simple, funciona en todos los dispositivos |

**Recomendación para OLIBOT:** DiceBear con el estilo `bottts` (robots cartoon) o `fun-emoji`:
- Robots → coherente con la temática de OLIBOT
- SVG ligero (~2 KB por avatar)
- Se genera en cliente sin llamadas externas
- `seed` = `student.id` → cada niño siempre tiene el mismo robot

**Alternativa más simple (MVP):** Un catálogo de 8-12 emojis grandes como "personaje":
```jsx
const CHARACTERS = [
  { id: "panda",    emoji: "🐼", name: "Panda"    },
  { id: "fox",      emoji: "🦊", name: "Zorro"    },
  { id: "frog",     emoji: "🐸", name: "Rana"     },
  { id: "robot",    emoji: "🤖", name: "Robot"    },
  { id: "lion",     emoji: "🦁", name: "León"     },
  { id: "dolphin",  emoji: "🐬", name: "Delfín"   },
  { id: "butterfly",emoji: "🦋", name: "Mariposa" },
  { id: "star",     emoji: "🌟", name: "Estrella" },
];
```

El emoji se muestra en grande (96-128 px) con animaciones CSS equivalentes a las del SVG actual (flotar, pulsar).

### Cambios de base de datos

```python
# models.py — añadir campo
class Student(Base):
    ...
    avatar_id: str = Column(String, default="robot")

# schemas.py
class StudentCreate(BaseModel):
    name: str
    age: int
    avatar_id: str = "robot"

class StudentResponse(BaseModel):
    id: int
    name: str
    age: int
    avatar_id: str
    beliefs: dict
```

### Integración en la interfaz

```jsx
// AvatarDisplay.jsx — nuevo componente
export default function AvatarDisplay({ avatarId, state = "idle", size = 120 }) {
  const char = CHARACTERS.find(c => c.id === avatarId) ?? CHARACTERS[3]; // fallback robot

  return (
    <div style={{
      fontSize: size,
      animation: state === "idle" ? "obFloat 3s ease-in-out infinite" : "none",
      filter: state === "thinking" ? "grayscale(0.3)" : "none",
    }}>
      {char.emoji}
    </div>
  );
}

// ChatWindow.jsx — reemplazar <OlibotAvatar state={avatarState} />
<AvatarDisplay avatarId={student.avatar_id} state={avatarState} size={90} />
```

---

## 6. Mejoras pedagógicas — paper base y trabajos relacionados

### 6.1 Paper base: ChatBDI (Gatti, Mascardi, Ferrando — AAMAS 2025)

> *"Think BDI, Talk LLM"* — el agente BDI razona y el LLM habla.

**Lo que OLIBOT implementa correctamente:**
- BDI (Jason/JaCaMo) como módulo de razonamiento intencional
- LLM (Ollama/llama3.1:8b) como actuador lingüístico
- Separación clara: NLU (NL→intención) y NLG (instrucción BDI→NL)
- Safety Shield como barrera de seguridad (mencionado como riesgo en §3 del paper)

**Diferencias con ChatBDI que son oportunidades de mejora:**

| ChatBDI | OLIBOT actual | Mejora posible |
|---------|---------------|----------------|
| Usa KQML como lenguaje intermediario | JSON propietario | Explorar KQML/FIPA-ACL para documentar la arquitectura del TFM |
| CodeGemma + Nomic-embed para `nl2kqml` | LLM único para NLU | Embeddings para matching semántico de intents (ref. [18] Nomic-embed) |
| Contexto agente enviado al LLM | Contexto parcial (topic + mastery) | Enviar creencias BDI completas al prompt NLG |
| Multi-agente (varios JaCaMo agents) | Agente único OLIBOT | Agentes separados: pedagógico + evaluador + motivacional |

### 6.2 Trabajos relacionados citados en el paper

#### [14] Ichida, Meneguzzi, Cardoso — "BDI Agents in Natural Language Environments" (AAMAS 2024)

Proponen usar RL (reinforcement learning) para afinar las capacidades de razonamiento de agentes NatBDI. Diferencia clave con OLIBOT: ellos están orientados a desarrolladores, OLIBOT a usuarios finales (niños).

**Mejora sugerida:** El módulo de trazado podría aprender umbrales de evaluación (`PASS_SHAPE`, `PASS_ORDER`) por edad mediante feedback acumulado, en lugar de usar constantes fijas.

#### [9] Frering, Steinbauer-Wagner, Holzinger — "Integrating BDI-Jason with LLMs" (2025)

Integran Jason con LLM para interacción humano-robot confiable y explicable. Su enfoque pasa las instrucciones BDI a través de KQML al LLM.

**Mejora sugerida para TFM:** Documentar explícitamente el protocolo de comunicación NLU→BDI→NLG como si fuera KQML, para poder citar este trabajo en la sección de arquitectura.

#### [13] Meneguzzi et al. — "Modeling a Conversational Agent using BDI" (SAC 2023)

Marco BDI para agentes conversacionales. Valida el enfoque de OLIBOT de representar el diálogo pedagógico como creencias-deseos-intenciones.

**Mejora sugerida:** El `desire` del agente (el objetivo que quiere lograr en cada turno) podría registrarse explícitamente en la BD para el informe de padres: "En este turno, OLIBOT tenía como objetivo 'evaluar el dominio de vocal_a' y el alumno respondió correctamente".

#### [2] Dennis & Oren — "Explaining BDI Behaviour through Dialogue" (2022)

Los agentes BDI pueden explicar sus decisiones en lenguaje natural. Aplicado a OLIBOT: el agente podría explicar a los padres **por qué** eligió el siguiente topic.

**Mejora sugerida:** En ProgressReport, añadir sección "Por qué OLIBOT eligió estos temas" generada por el LLM a partir del estado de mastery y el árbol de prerequisitos.

#### [27] Yan, Burattini et al. — "Multi-Level Explainability for BDI Agents" (WOA 2023)

Framework de explicabilidad en tres niveles: intención actual, plan seleccionado, creencias relevantes.

**Mejora sugerida:** El endpoint `/api/report` ya devuelve estadísticas. Extenderlo con un nivel de "explicabilidad BDI": qué intención activa tenía el agente, qué plan seleccionó, qué creencias lo motivaron.

### 6.3 Mejoras pedagógicas independientes

#### Placement test (pendiente de Fase 7)

El diseño ya está documentado en `fase_07_diseño_pedagogico.md`. La implementación en código aún no está completa.

```python
# bdi_bridge.py — pendiente: detectar primera sesión y lanzar placement test
# Señal: student.beliefs.mastery está vacío Y age >= 4
if not beliefs.mastery and student.age >= 4:
    return BDIDecision(action="start_placement_test", ...)
```

#### Actividad de sílabas multi-paso (pendiente de Fase 7)

El topic `silaba_ma` requiere un flujo de 4 pasos (traza M → traza A → di "MA" → celebración). Esto necesita un estado de flujo en `session_manager` no implementado aún.

#### Feedback de progreso visual durante la sesión

Actualmente el niño no recibe feedback visual acumulado durante la sesión (solo audio del TTS). Propuesta: un contador de estrellas ganadas en la sesión, visible en todo momento como emojis ⭐.

---

## 8. Mejoras implementadas en Fase 8 (sesiones de desarrollo)

Este apartado recoge las mejoras concretas implementadas en código durante las sesiones de trabajo de la Fase 8, más allá del diseño teórico de secciones anteriores.

### 8.1 Evaluación de trazado — orden de puntos y penalización de longitud

**Problema:** La función `evaluateStroke` anterior permitía que el niño dibujara un círculo que pasara por todos los waypoints y se contabilizara como correcto, ignorando el orden y la longitud del trazo.

**Solución implementada** en `useLetterTracing.js`:

```js
function evaluateStroke(drawnPath, waypoints, hitRadius) {
  // Matching secuencial: los waypoints deben tocarse en orden
  let nextWpIdx = 0;
  for (const pt of drawnPath) {
    if (nextWpIdx >= waypoints.length) break;
    if (dist(pt, waypoints[nextWpIdx]) <= hitRadius) nextWpIdx++;
  }
  const coverageScore = nextWpIdx / waypoints.length;

  // Penalización de longitud: ratio > 2× la longitud esperada reduce la puntuación
  const expectedLen = waypoints.slice(1).reduce((s, wp, i) => s + dist(waypoints[i], wp), 0);
  const drawnLen    = drawnPath.slice(1).reduce((s, pt, i) => s + dist(drawnPath[i], pt), 0);
  const lenRatio    = drawnLen / (expectedLen || 0.001);
  const lenPenalty  = lenRatio <= 2.0 ? 1.0 : Math.max(0, 1 - (lenRatio - 2.0) / 1.5);
  const shapeScore  = coverageScore * lenPenalty;
  // ... comprobaciones de startOk + dirOk sin cambios ...
}
```

**Resultado:** Un círculo dibujado sobre una línea recta obtiene penalización de longitud ≈ 0.3, mientras que el trazo correcto (de arriba abajo) obtiene ≈ 1.0.

### 8.2 Animación demo — repetición 2-3 veces antes de trazar

**Problema:** La animación de demostración (cursor rojo recorriendo el trazo) se mostraba una sola vez, insuficiente para que el niño de 3-4 años la memorice.

**Solución implementada** en `useLetterTracing.js`:

```js
const DEMO_REPEATS = 2;  // la demo se repite N veces antes de pasar a trazado
// demoRepeatCountRef rastrea las repeticiones completadas
```

Cuando se completan todos los strokes de la demo y `demoRepeatCountRef.current < DEMO_REPEATS - 1`, se reinicia desde el stroke 0 con una pausa más larga entre repeticiones.

### 8.3 Voz TTS femenina — selección de voz con prioridad

**Problema:** La voz predeterminada del navegador es masculina/neutra. OLIBOT debe sonar amigable y cercano para niños pequeños.

**Solución implementada** en `useSpeech.js`:

```js
const FEMALE_NAME_RE = /female|mujer|mónica|elena|penélope|paulina|luciana|isabel|andrea|carmen|pilar|soledad|maria|laura|rosa|helena/i;

function _pickVoice() {
  const es = voices.filter(v => v.lang?.startsWith("es"));
  return (
    es.find(v => /natural/i.test(v.name) && v.lang === "es-ES") ||  // Google español 1 (Natural)
    es.find(v => /natural/i.test(v.name)) ||
    es.find(v => v.gender === "female") ||
    es.find(v => FEMALE_NAME_RE.test(v.name)) ||
    es.find(v => v.lang === "es-ES") || es[0]
  );
}
// Patrón async de Chrome: el caché se invalida en voiceschanged
window.speechSynthesis.addEventListener("voiceschanged", () => { _preferredVoice = null; });
```

**Parámetros:** `TTS_RATE = 0.85` (lento para niños), `TTS_PITCH = 1.45` (agudo/femenino).

### 8.4 Diálogo de maestría con voz y micrófono activo

**Problema:** Cuando el agente detecta maestría (`bdi_action === "mastery_achieved"`), el diálogo modal se mostraba pero el micrófono estaba cerrado, por lo que el niño no podía responder verbalmente.

**Solución implementada** en `ChatWindow.jsx`:

- El robot verbaliza las opciones (`speakQueued`) cuando abre el diálogo.
- Un `useEffect` dedicado reactiva el micrófono 1300 ms después de que el TTS termine (> `TTS_COOLDOWN_MS = 1100 ms`):

```js
useEffect(() => {
  if (!masteryDialog || speaking || loading || listening) return;
  const tid = setTimeout(() => startListeningStable(), 1300);
  return () => clearTimeout(tid);
}, [masteryDialog, speaking, loading, listening, startListeningStable]);
```

- `handleTranscript` reconoce "continuar/seguir", "siguiente" y "dibujar/pintar" y actúa en consecuencia.

### 8.5 Selector de temas (topic picker)

**Objetivo:** Permitir al niño (o a la maestra) cambiar de ejercicio sin necesidad de volver al menú principal.

**Cambios implementados:**

- **Nuevo endpoint backend** `POST /chat/session/{id}/advance`: cierra la sesión actual y abre una nueva con el topic seleccionado.
- **Nuevo endpoint backend** `GET /chat/student/{id}/topics`: devuelve todos los topics con prerrequisitos cumplidos, con datos de mastery.
- **`api.js`**: nuevas funciones `advanceSession(sessionId, topicId)` y `getAccessibleTopics(studentId)`.
- **`ChatWindow.jsx`**: overlay de selección de topic con grid de botones (emoji + nombre + estado de mastery). Se activa también cuando el BDI devuelve `bdi_action === "offer_alternatives"`.

**Botón 📚** (fijo, `position: fixed`): aparece en la misma fila que los botones de padres de `App.jsx` pero en `left: 152px` (después de 🏠 en `left:12` y 📋 en `left:82`).

### 8.6 Fix bug: botón 📚 oculto por solapamiento de z-index

**Bug:** El botón 📚 estaba en `position: absolute, top:12px, left:12px, zIndex:25`. Los botones de `App.jsx` están en `position: fixed, top:12px, left:12px, zIndex:300`. Se solapaban exactamente, y el botón del App (z:300) tapaba completamente el 📚 (z:25). El botón estaba en el DOM pero invisible.

**Fix:** Cambio a `position: fixed, top:12px, left:152px, zIndex:300` con el mismo estilo circular de 60×60 px que los botones padres.

### 8.7 Fix: `handleSilence` inestable por dependencia de estado

**Bug:** `handleSilence` tenía `topicPickerOpen` en sus dependencias (`useCallback`). Cada vez que se abría/cerraba el topic picker, `handleSilence` se recreaba → `onSilence` cambiaba en `useSpeech` → `startListening` se recreaba. Potencial de cascada de re-renderizados.

**Fix:** Uso de refs para todo el estado que `handleSilence` necesita:

```js
const topicPickerOpenRef = useRef(false);
const listenFnRef        = useRef(null);  // apunta a startListeningStable

const handleSilence = useCallback(() => {
  if (!charDataRef.current || masteryDialogRef.current || topicPickerOpenRef.current) {
    setTimeout(() => listenFnRef.current?.(), 600);
  }
}, []); // stable — sin dependencias, todo por refs
```

`handleSilence` ahora es completamente estable (referencia constante): `useSpeech` nunca recibe un `onSilence` nuevo, por lo que `startListening` no se recrea debido a este dep.

### 8.8 Avance de sesión sin pasar por el backend conversacional

**Bug:** Cuando el niño decía "siguiente actividad" en el diálogo de maestría, se enviaba el texto al backend BDI. El BDI devolvía `offer_alternatives` en lugar de avanzar directamente, abriendo el topic picker en vez de pasar al siguiente topic.

**Fix:** Los handlers del diálogo de maestría (`handleMasteryNext`, `handleTranscript`) no envían el texto al backend. Directamente:
1. Establecen `currentTopicId = nextTopicId` en el estado local (el canvas se actualiza inmediatamente).
2. Llaman `api.advanceSession(sessionId, nextTopicId)` para actualizar el backend y obtener el nuevo `session_id`.

### 8.9 Tutorial de onboarding para nuevos estudiantes

**Motivación:** Los niños de 3-5 años no pueden leer los tooltips ni inferir la función de cada botón. La primera vez que un niño inicia sesión, OLIBOT les explica verbalmente cada control.

**Implementación** en `ChatWindow.jsx`:

- Se activa una vez por `student.id`, usando `localStorage.getItem("olibot_tutorial_${id}")` como flag.
- 4 pasos secuenciales, cada uno con:
  - **Spotlight**: un div circular con `box-shadow: 0 0 0 9999px rgba(0,0,0,0.76)` que oscurece todo excepto el botón objetivo.
  - **Burbuja de instrucción**: texto corto + indicador de progreso (dots).
  - **TTS**: el robot explica verbalmente el botón.
  - **Auto-avance**: 8 segundos tras iniciar el paso (suficiente para el TTS).
  - **Avance manual**: el niño puede tocar la pantalla para pasar al siguiente paso.
- Botones explicados: 🏠 (volver a elegir jugador), 📋 (informes para padres), 📚 (elegir ejercicio), 🎤 (hablar con OLIBOT).

### 8.10 Botón 🔊 para repetir el último mensaje

**Motivación:** A veces el TTS se corta o el niño no estaba prestando atención. Con el botón 🔊 junto a la burbuja de texto, puede volver a escuchar el último mensaje de OLIBOT.

**Implementación:** Pequeño botón circular azul (36×36 px) que llama `speak(lastMessage)` al hacer clic. Siempre visible junto a la burbuja de texto.

### 8.11 Botón 🔄 para repetir la demostración

**Motivación:** El usuario indicó que "el de repetir por si no sabemos cómo hay que hacerlo" debe estar disponible como control explícito, no solo como consecuencia de fallar 2 veces.

**Implementación:** Botón 🔄 en la esquina superior derecha (`position: fixed, top:12px, right:12px`), visible durante el trazado (`charData !== null`). Al pulsar:
1. Pone `demoShownRef.current = null` (elimina el flag "ya se mostró la demo").
2. Incrementa `tracingKey` → `LetterTracing` remonta con `skipInitialDemo=false` → la demo se reproduce.
3. El robot dice "¡Mira cómo se hace!".

---

## 7. Plan de implementación priorizado

### Criterios de priorización

| Criterio | Peso |
|----------|------|
| Impacto en experiencia del niño | Alto |
| Necesario para defensa TFM | Alto |
| Esfuerzo de implementación | Medio |
| Riesgo técnico | Bajo |

### Tabla priorizada

| # | Mejora | Impacto | Esfuerzo | Prioridad |
|---|--------|---------|----------|-----------|
| 1 | **Placement test** — código BDI completo; fix: canvas suprimido durante test | TFM | Bajo | ✅ Implementado |
| 2 | **Streaming LLM** — SSE backend + sentence TTS frontend | UX + TFM | Medio | ✅ Implementado |
| 3 | **Avatar por personaje** (selección en registro, emoji o DiceBear) | UX niño | Bajo | ✅ Implementado |
| 4 | **Layout pantalla completa** (modo niño vs. modo padres) | UX niño | Medio | ✅ Implementado |
| 5 | **Robot en esquina** (canvas como fondo) | UX niño | Medio | ✅ Implementado |
| 6 | **Eliminar texto visible al niño** (barra stats, estado del agente) | UX niño | Bajo | ✅ Implementado |
| +6b | **Siempre escuchando** (sin botón micro, auto-listen, interrupción) | UX niño | Bajo | ✅ Implementado |
| 7 | **Modelo ligero para NLU** (`llama3.2:1b`) | Performance | Muy bajo | ✅ Implementado |
| 8 | **Sílabas multi-paso** (flujo 4 pasos) | Pedagógico | Alto | ✅ Implementado |
| 9 | **Explicabilidad BDI en informes** | TFM (citar [2], [27]) | Medio | ✅ Implementado |
| 10 | **Intent `tracing_complete` separado** | Robustez | Bajo | ✅ Implementado |
| 11 | **Caché de respuestas frecuentes** | Performance | Bajo | ✅ Implementado |
| 12 | **Embeddings semánticos para NLU** (citar [18]) | TFM avanzado | Alto | ✅ Implementado |

### Agrupación por fase de implementación

**Fase 8A — Sin romper nada (1-2 días)**
- Modelo ligero para NLU (`OLLAMA_NLU_MODEL=llama3.2:1b` en `.env`)
- Eliminar texto visible al niño (solo CSS/JSX)
- Intent `tracing_complete` separado de `attempt_answer`
- Estrellas de progreso como emojis en lugar de porcentaje

**Fase 8B — Avatar y layout (3-5 días)**
- Campo `avatar_id` en BD + migración
- Selección de personaje en `StudentSelector`
- `AvatarDisplay.jsx` con emojis animados (o DiceBear `bottts`)
- Layout modo niño vs. modo padres en `App.jsx`
- Robot en esquina, canvas como protagonista

**Fase 8C — Performance (2-3 días)**
- Streaming NLG con SSE
- Frontend consume SSE y arranca TTS al primer punto/signo
- Caché de respuestas frecuentes (JSON offline)

**Fase 8D — Pedagógico (3-5 días)**
- Placement test completo (código en `bdi_bridge.py`)
- Sílabas multi-paso (`session_manager` + `bdi_bridge`)
- Explicabilidad BDI en `ProgressReport`

---

## Referencias (del paper base y relacionados)

- **[p2541]** Gatti, A., Mascardi, V., Ferrando, A. *ChatBDI: Think BDI, Talk LLM*. AAMAS 2025, Detroit, EE. UU. (paper base de OLIBOT)
- **[2]** Dennis, L.A., Oren, N. *Explaining BDI Agent Behaviour through Dialogue*. Auton. Agents Multi Agent Syst. 36, 1 (2022).
- **[9]** Frering, G., Steinbauer-Wagner, G., Holzinger, A. *Integrating BDI-Jason Agents with LLMs for Reliable Human-Robot Interaction*. Eng. Appl. Artif. Intell. 141 (2025).
- **[13]** Meneguzzi, A.Y., Felipe, A.Y. *Modeling a Conversational Agent using BDI Framework*. SAC, ACM, 856-863 (2023).
- **[14]** Ichida, A.Y., Meneguzzi, F., Cardoso, R.C. *BDI Agents in Natural Language Environments*. AAMAS 2024, ACM, 880-888.
- **[27]** Yan, E., Burattini, S., Hübner, J.F., Ricci, A. *Multi-Level Explainability Framework for BDI Agents*. WOA 2023.