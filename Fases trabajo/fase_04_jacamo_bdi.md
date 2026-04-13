# Fase 4 — JaCaMo: El Agente BDI Real

> Documento de referencia para el desarrollo y la memoria del TFM.  
> Describe la integración del agente BDI Jason/JaCaMo, cómo verificar que funciona y los detalles de implementación.

---

## Índice

1. [Qué hace JaCaMo en OLIBOT](#1-qué-hace-jacamo-en-olibot)
2. [Arquitectura de la integración](#2-arquitectura-de-la-integración)
3. [Cómo verificar que JaCaMo está activo](#3-cómo-verificar-que-jacamo-está-activo)
4. [Flujo completo de un turno con JaCaMo](#4-flujo-completo-de-un-turno-con-jacamo)
5. [El agente Jason — olibot.asl](#5-el-agente-jason--olibotasl)
6. [El artefacto CArtAgO — OlibotEnv.java](#6-el-artefacto-cartago--oliботenvjava)
7. [El puente Python — BDIBridge](#7-el-puente-python--bdibridge)
8. [Decisiones de diseño importantes](#8-decisiones-de-diseño-importantes)
9. [Problemas conocidos y sus soluciones](#9-problemas-conocidos-y-sus-soluciones)
10. [Pruebas manuales con curl](#10-pruebas-manuales-con-curl)

---

## 1. Qué hace JaCaMo en OLIBOT

JaCaMo implementa el razonamiento pedagógico del agente — decide **qué hacer**, no **cómo decirlo**.

| Componente | Responsabilidad |
|-----------|----------------|
| **JaCaMo (Jason BDI)** | Selecciona la acción pedagógica: `give_hint`, `praise`, `redirect`... |
| **LLM (Ollama)** | Genera el texto en lenguaje natural a partir de la acción |
| **Python Backend** | Orquesta el turno, evalúa respuestas, actualiza la BD |

El patrón es **"Think BDI, Talk LLM"**: el BDI razona con creencias y planes; el LLM solo habla.

### Modo sin JaCaMo (`JACAMO_ENABLED=false`)

El `PythonBDIFallback` en `backend/core/bdi_bridge.py` replica exactamente los mismos planes Jason en Python. El comportamiento pedagógico es idéntico — es una traducción 1:1 de `olibot.asl`.

---

## 2. Arquitectura de la integración

```
┌──────────────┐   POST /chat   ┌─────────────────────────────────┐
│  React UI    │ ─────────────► │         FastAPI Backend          │
│  :5173       │ ◄───────────── │              :5050               │
└──────────────┘                │                                  │
                                │  NLU → SessionManager → NLG      │
                                │            │                      │
                                │       BDIBridge                  │
                                │       ┌────┴────┐                │
                                │       │         │                │
                                │  JaCaMo?    Fallback             │
                                │  enabled    (Python)             │
                                └──────│──────────────────────────┘
                                       │ POST /percept
                                       │ GET  /decision
                                       ▼
                              ┌─────────────────────┐
                              │  OlibotEnv (Java)   │  puerto 8080
                              │  CArtAgO Artifact   │
                              │  HTTP Server        │
                              └──────────┬──────────┘
                                         │ observable properties
                                         │ (creencias BDI)
                                         ▼
                              ┌─────────────────────┐
                              │  olibot (Jason)     │
                              │  BDI Agent          │
                              │  olibot.asl         │
                              └─────────────────────┘
```

### Protocolo de comunicación (2 pasos)

```
Python                     OlibotEnv (Java)           Jason Agent
  │                              │                         │
  │── POST /percept ────────────►│                         │
  │   {student_id, intent,       │                         │
  │    success_rate, topic,      │  applyPercept()         │
  │    is_correct}               │ ──updateObsProperty()──►│
  │◄── {"status":"received"} ───│                         │
  │                              │                 +percept_count(N)
  │                              │                 !respond(Intent,SR,T)
  │                              │◄── postDecision() ─────│
  │── GET /decision ────────────►│                         │
  │◄── {action, hint_level,      │                         │
  │     instruction, ...} ──────│                         │
```

**Importante:** Python hace el POST y el GET en peticiones separadas. El GET bloquea hasta 8 segundos esperando la respuesta del agente.

---

## 3. Cómo verificar que JaCaMo está activo

### 3.1 Verificación directa (curl a JaCaMo)

Con JaCaMo corriendo (`./gradlew run` en `jacamo/`), prueba directamente sin pasar por el backend:

```bash
# Saludo
curl -s -X POST http://localhost:8080/percept \
  -H "Content-Type: application/json" \
  -d '{"student_id":1,"intent":"greet","success_rate":0.5,"current_topic":"intro","is_correct":null}' \
  && sleep 1 && curl -s http://localhost:8080/decision
# Esperado: {"action":"greet_and_start","hint_level":0,...}

# Respuesta correcta
curl -s -X POST http://localhost:8080/percept \
  -H "Content-Type: application/json" \
  -d '{"student_id":1,"intent":"attempt_answer","success_rate":0.7,"current_topic":"intro","is_correct":true}' \
  && sleep 1 && curl -s http://localhost:8080/decision
# Esperado: {"action":"praise","hint_level":1,...}

# Pista con SR baja → nivel alto de scaffolding
curl -s -X POST http://localhost:8080/percept \
  -H "Content-Type: application/json" \
  -d '{"student_id":1,"intent":"ask_for_hint","success_rate":0.15,"current_topic":"intro","is_correct":null}' \
  && sleep 1 && curl -s http://localhost:8080/decision
# Esperado: {"action":"give_hint","hint_level":3,...}

# Pedir la respuesta directamente (safety shield → nunca la da)
curl -s -X POST http://localhost:8080/percept \
  -H "Content-Type: application/json" \
  -d '{"student_id":1,"intent":"ask_for_answer","success_rate":0.5,"current_topic":"intro","is_correct":null}' \
  && sleep 1 && curl -s http://localhost:8080/decision
# Esperado: {"action":"give_hint",...}  ← NUNCA da la respuesta
```

### 3.2 Verificación a través del backend

Con backend (`uvicorn`) Y JaCaMo corriendo, y `JACAMO_ENABLED=true` en `.env`:

```bash
# Verificar que el backend tiene JaCaMo activado
curl -s http://localhost:5050/health | python3 -m json.tool
# Debe mostrar: "jacamo_enabled": true

# Enviar un mensaje al backend (flujo completo)
curl -s -X POST http://localhost:5050/chat \
  -H "Content-Type: application/json" \
  -d '{"student_id": 1, "message": "hola"}' | python3 -m json.tool
```

### 3.3 Verificación por el log de JaCaMo

En la terminal de JaCaMo busca esta secuencia de mensajes para confirmar que el ciclo completo funciona:

```
[OlibotEnv] Percept received: {...}          ← Python envió el percept
[OlibotEnv] applyPercept done: count=N ...   ← CArtAgO actualizó las creencias
[OLIBOT] Processing percept #N | intent=...  ← Agente Jason procesó el evento
[OLIBOT] greet → greet_and_start, topic=...  ← Plan seleccionado
[OlibotEnv] Decision posted: action=...      ← Decisión en cola para Python
```

### 3.4 Verificación desde el frontend

1. Arranca los 4 procesos (Ollama, Backend, JaCaMo, Frontend)
2. Abre `http://localhost:5173`
3. Selecciona un alumno y escribe "hola" en el chat
4. La respuesta del bot debe aparecer normalmente
5. En el log de JaCaMo verás el ciclo de percept → decisión

**¿Cómo sé si está usando JaCaMo o el Fallback?**  
- Si JaCaMo está corriendo y `JACAMO_ENABLED=true`: el log de JaCaMo mostrará actividad
- Si algo falla (JaCaMo caído, timeout): el backend cae automáticamente al Fallback (transparente para el usuario)
- En el log del backend (uvicorn) aparecerá un WARNING si cae al fallback:
  ```
  WARNING: JaCaMo unreachable, using PythonBDIFallback
  ```

---

## 4. Flujo completo de un turno con JaCaMo

Tomando como ejemplo: el alumno escribe "¿me das una pista?"

```
1. React UI
   └─► POST /chat {"student_id":1, "message":"¿me das una pista?"}

2. FastAPI — SessionManager.process_message()
   ├─ NLU: clasifica intent → ask_for_hint, SR=0.6
   └─► BDIBridge.process_turn(intent=ask_for_hint, SR=0.6, topic=intro)

3. BDIBridge._call_jacamo()
   ├─► POST http://localhost:8080/percept
   │   {"student_id":1, "intent":"ask_for_hint",
   │    "success_rate":0.6, "current_topic":"intro", "is_correct":null}
   │
   └─► GET http://localhost:8080/decision  (bloquea ≤8s)

4. OlibotEnv (Java) — PerceptHandler
   ├─ Limpia decisiones anteriores de la cola
   ├─ Encola el JSON del percept en perceptJsonQueue
   └─ Llama execInternalOp("applyPercept")

5. OlibotEnv — applyPercept() @INTERNAL_OPERATION
   ├─ updateObsProperty("current_intent", "ask_for_hint")
   ├─ updateObsProperty("current_success_rate", 0.6)
   ├─ updateObsProperty("current_topic_id", "intro")
   └─ updateObsProperty("percept_count", N)  ← TRIGGER

6. Jason Agent — +percept_count(N) se dispara
   ├─ Lee creencias: Intent="ask_for_hint", SR=0.6, T="intro"
   └─► !respond("ask_for_hint", 0.6, "intro")

7. Jason Agent — plan +!respond("ask_for_hint", SR, T)
   ├─► !calculate_hint_level(0.6, HL)  → HL=1  (SR≥0.60 → nivel 1)
   └─► postDecision("give_hint", 1, "intro",
           "Student requested a hint. Give a Socratic clue...",
           "null", "null")

8. OlibotEnv — postDecision() @OPERATION
   └─ Encola: {"action":"give_hint","hint_level":1,"topic_id":"intro",...}

9. BDIBridge recibe la respuesta del GET /decision
   ├─ decision.action = "give_hint"
   ├─ decision.hint_level = 1
   └─ Combina con updated_beliefs del PythonBDIFallback

10. NLG — genera texto con el LLM
    └─► Prompt: "Student requested a hint. Give a Socratic clue..."
        → "¡Claro! Piensa: ¿cuántas patas tiene un animal que camina en 4?"

11. React UI recibe la respuesta y la muestra
```

---

## 5. El agente Jason — olibot.asl

Ubicación: `jacamo/src/agt/olibot.asl`

### Creencias iniciales

```prolog
zdp_threshold(0.6).    % Umbral ZDP (no usado directamente, referencia)
max_hint_level(3).     % Niveles de scaffolding: 1=sutil, 3=casi-directo
mastery_threshold(0.75).
min_attempts(3).
```

### Plan de arranque

```prolog
+!start <-
    joinWorkspace("olibot_workspace", WspId);
    lookupArtifact("olibot_env", ArtId);
    focus(ArtId);  % El agente observa el artefacto → recibe sus propiedades
    .print("[OLIBOT] BDI agent started.").
```

### Trigger principal

```prolog
+percept_count(N)
    : current_intent(Intent) & current_success_rate(SR)
      & current_topic_id(T) & current_student_id(SId)
    <-
    !respond(Intent, SR, T).
```

Se dispara **cada vez que llega un percept** de Python. En ese momento todas las creencias ya están actualizadas (el trigger es lo último que cambia en `applyPercept`).

### Planes de respuesta

| Plan | Condición | Acción BDI |
|------|-----------|-----------|
| `+!respond("ask_for_answer", SR, T)` | — | `give_hint` (Safety Shield) |
| `+!respond("attempt_answer", SR, T)` | `current_is_correct("true")` | `praise` |
| `+!respond("attempt_answer", SR, T)` | `current_is_correct("false")` | `evaluate_and_encourage` |
| `+!respond("attempt_answer", SR, T)` | fallback (null) | `evaluate_and_encourage` |
| `+!respond("ask_for_hint", SR, T)` | — | `give_hint` |
| `+!respond("greet", _, T)` | — | `greet_and_start` |
| `+!respond("express_emotion", _, T)` | — | `acknowledge_emotion` |
| `+!respond(_, _, T)` | catch-all | `redirect` |

### Cálculo del nivel de scaffolding

```prolog
+!calculate_hint_level(SR, 3) <- SR < 0.30.   % Alumno struggling → pista casi-directa
+!calculate_hint_level(SR, 2) <- SR < 0.60.   % Dificultad moderada
+!calculate_hint_level(_, 1).                  % Va bien → pista sutil
```

### Nota importante: átomos vs strings en Jason

Los planes usan **strings** (con comillas) para los valores de intent, no átomos:

```prolog
+!respond("greet", _, T)   ← correcto
+!respond(greet, _, T)     ← NO funciona con CArtAgO
```

**Por qué:** CArtAgO convierte los Java `String` en términos Jason de tipo String (`"greet"`), no en átomos (`greet`). En Jason, átomos y strings son tipos distintos y no unifican entre sí.

---

## 6. El artefacto CArtAgO — OlibotEnv.java

Ubicación: `jacamo/src/env/OlibotEnv.java`

### Propiedades observables (→ creencias Jason)

| Propiedad | Tipo Java | Creencia Jason |
|-----------|-----------|----------------|
| `percept_count` | int | `percept_count(N)` — **trigger** |
| `current_student_id` | int | `current_student_id(N)` |
| `current_intent` | String | `current_intent("greet")` |
| `current_success_rate` | double | `current_success_rate(0.5)` |
| `current_topic_id` | String | `current_topic_id("intro")` |
| `current_is_correct` | String | `current_is_correct("true"|"false"|"null")` |

### Por qué `@INTERNAL_OPERATION` para `applyPercept`

**Problema:** `updateObsProperty()` de CArtAgO solo propaga cambios a los agentes observadores si se llama desde un contexto de operación CArtAgO (`init()`, `@OPERATION`, `@INTERNAL_OPERATION`). El handler HTTP corre en un thread externo — desde ahí, `updateObsProperty` NO notifica al agente.

**Solución:**

```java
// Hilo HTTP — solo encola y agenda:
perceptJsonQueue.offer(body);
execInternalOp("applyPercept");  // agenda la operación interna
respond(ex, 200, ...);

// Operación interna — corre en contexto CArtAgO:
@INTERNAL_OPERATION
void applyPercept() {
    String body = perceptJsonQueue.poll();
    updateObsProperty("current_intent", intent);    // ✓ notifica al agente
    ...
    updateObsProperty("percept_count", ++count);    // ✓ dispara +percept_count(N)
}
```

### Gestión de la cola de decisiones

```java
// Capacidad 1: evita decisiones obsoletas
BlockingQueue<String> decisionQueue = new ArrayBlockingQueue<>(1);

// Al recibir un percept: limpiar cualquier decisión anterior
decisionQueue.clear();

// @OPERATION llamado por Jason:
void postDecision(...) {
    decisionQueue.clear();  // por si hubiera una anterior
    decisionQueue.offer(json);
}

// GET /decision: espera hasta 8 segundos
String decision = decisionQueue.poll(8000, TimeUnit.MILLISECONDS);
// Si null → HTTP 408 → Python usa PythonBDIFallback
```

---

## 7. El puente Python — BDIBridge

Ubicación: `backend/core/bdi_bridge.py`

### Selección JaCaMo vs Fallback

```python
class BDIBridge:
    async def process_turn(self, intent, student, session_success_rate, current_topic):
        if self.enabled:                         # JACAMO_ENABLED=true en .env
            return await self._call_jacamo(...)  # intenta JaCaMo
        return self._fallback.decide(...)        # siempre usa Python
```

Si JaCaMo está habilitado pero hay un error de conexión o timeout (408), el bridge cae al fallback automáticamente — el usuario nunca ve un error.

### Por qué `updated_beliefs` siempre viene de Python

```python
# Jason no tiene acceso a la BD → no puede actualizar mastery, etc.
# El Fallback calcula los beliefs actualizados aunque JaCaMo tome la decisión
fallback = self._fallback.decide(intent, student, ...)
return BDIDecision(
    action=data.get("action", fallback.action),       # de JaCaMo
    instruction=data.get("instruction", ...),          # de JaCaMo
    updated_beliefs=fallback.updated_beliefs,          # de Python
    is_correct=fallback.is_correct,                    # evaluado en Python
    next_topic_id=fallback.next_topic_id,              # calculado en Python
)
```

---

## 8. Decisiones de diseño importantes

### 1. is_correct se pre-evalúa en Python

El agente Jason sabe si la respuesta es correcta o no (`current_is_correct("true"|"false"|"null")`), pero **no la evalúa él mismo**. La evaluación la hace Python antes de enviar el percept, porque solo Python tiene acceso al currículo y a la BD.

### 2. El agente no actualiza creencias en la BD

JaCaMo opera sin estado persistente — sus creencias son solo las propiedades observables del turno actual. La persistencia (mastery, historial) siempre la gestiona Python/SQLite.

### 3. Degradación elegante (graceful degradation)

Si JaCaMo no está disponible, el sistema funciona igual. El `PythonBDIFallback` implementa exactamente los mismos planes pedagógicos. Esto permite:
- Desarrollar y probar sin JaCaMo
- Recuperarse automáticamente de caídas del proceso Java
- Comparar el comportamiento real vs. simulado

### 4. El trigger es `percept_count`, no los intents directamente

Podría parecer más natural que `+current_intent("greet")` disparara el plan. Pero si Python envía varios percepts en rápida sucesión, el agente necesita procesar uno por uno en orden. `percept_count` garantiza un trigger único y secuencial por percept.

---

## 9. Problemas conocidos y sus soluciones

### Error: agente siempre responde `redirect`

**Causa:** Los planes usaban átomos (`greet`) pero CArtAgO almacena strings (`"greet"`).  
**Solución:** Todos los planes de `!respond` usan strings con comillas en `olibot.asl`.

### Error: timeout 408 en todos los percepts

**Causa:** `updateObsProperty` llamado desde el thread HTTP no propagaba cambios al agente.  
**Solución:** Patrón `execInternalOp("applyPercept")` + `@INTERNAL_OPERATION` en `OlibotEnv.java`.

### Error: `focus:` en JCM causa NullPointerException

**Causa:** En JaCaMo 1.3.0, la directiva `focus: workspace.artifact` en el JCM rompe el ciclo de razonamiento del agente.  
**Solución:** Eliminado del JCM. El focus se hace en el plan `!start` del ASL.

### Error: primer turno devuelve `redirect` aunque JaCaMo está OK

**Causa:** El agente dispara `+percept_count(0)` al arrancar (valores iniciales), que produce un `redirect` en la cola. El primer percept real llega cuando esa decisión aún está en cola.  
**Solución:** `PerceptHandler` limpia la cola (`decisionQueue.clear()`) al recibir cada nuevo percept.

### JaCaMo no produce output en la terminal

**Causa:** El logger por defecto de JaCaMo (`MASConsoleLogHandler`) abre una ventana Swing GUI, que en terminal headless descarta silenciosamente todo el output.  
**Solución:** `logging.properties` en el directorio raíz de `jacamo/` usando `java.util.logging.ConsoleHandler`.

---

## 10. Pruebas manuales con curl

### Suite completa de intents

```bash
BASE="http://localhost:8080"

echo "=== greet ==="
curl -s -X POST $BASE/percept -H "Content-Type: application/json" \
  -d '{"student_id":1,"intent":"greet","success_rate":0.5,"current_topic":"intro","is_correct":null}' \
  && sleep 1 && curl -s $BASE/decision

echo "=== ask_for_hint (SR alta → nivel 1) ==="
curl -s -X POST $BASE/percept -H "Content-Type: application/json" \
  -d '{"student_id":1,"intent":"ask_for_hint","success_rate":0.7,"current_topic":"intro","is_correct":null}' \
  && sleep 1 && curl -s $BASE/decision

echo "=== ask_for_hint (SR baja → nivel 3) ==="
curl -s -X POST $BASE/percept -H "Content-Type: application/json" \
  -d '{"student_id":1,"intent":"ask_for_hint","success_rate":0.2,"current_topic":"intro","is_correct":null}' \
  && sleep 1 && curl -s $BASE/decision

echo "=== ask_for_answer (safety shield) ==="
curl -s -X POST $BASE/percept -H "Content-Type: application/json" \
  -d '{"student_id":1,"intent":"ask_for_answer","success_rate":0.5,"current_topic":"intro","is_correct":null}' \
  && sleep 1 && curl -s $BASE/decision

echo "=== attempt_answer CORRECTO ==="
curl -s -X POST $BASE/percept -H "Content-Type: application/json" \
  -d '{"student_id":1,"intent":"attempt_answer","success_rate":0.6,"current_topic":"intro","is_correct":true}' \
  && sleep 1 && curl -s $BASE/decision

echo "=== attempt_answer INCORRECTO ==="
curl -s -X POST $BASE/percept -H "Content-Type: application/json" \
  -d '{"student_id":1,"intent":"attempt_answer","success_rate":0.4,"current_topic":"intro","is_correct":false}' \
  && sleep 1 && curl -s $BASE/decision

echo "=== express_emotion ==="
curl -s -X POST $BASE/percept -H "Content-Type: application/json" \
  -d '{"student_id":1,"intent":"express_emotion","success_rate":0.5,"current_topic":"intro","is_correct":null}' \
  && sleep 1 && curl -s $BASE/decision

echo "=== off-topic (redirect) ==="
curl -s -X POST $BASE/percept -H "Content-Type: application/json" \
  -d '{"student_id":1,"intent":"something_random","success_rate":0.5,"current_topic":"intro","is_correct":null}' \
  && sleep 1 && curl -s $BASE/decision
```

### Resultados esperados

| Intent | SR | `action` esperada | `hint_level` esperado |
|--------|----|--------------------|----------------------|
| `greet` | cualquiera | `greet_and_start` | 0 |
| `ask_for_hint` | ≥ 0.60 | `give_hint` | 1 |
| `ask_for_hint` | 0.30–0.59 | `give_hint` | 2 |
| `ask_for_hint` | < 0.30 | `give_hint` | 3 |
| `ask_for_answer` | cualquiera | `give_hint` | 1–3 |
| `attempt_answer` | cualquiera | `praise` | 1 |
| `attempt_answer` (false) | cualquiera | `evaluate_and_encourage` | 1–3 |
| `express_emotion` | cualquiera | `acknowledge_emotion` | 0 |
| cualquier otro | cualquiera | `redirect` | 1 |