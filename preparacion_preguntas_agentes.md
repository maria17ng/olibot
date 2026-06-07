# Preparación — Preguntas del Tribunal (Especialista en Agentes)
> El director es experto en agentes. Estas son las preguntas más probables, ordenadas de más básica a más técnica.
> Para cada pregunta: la respuesta esperada + qué fichero abrir si quiere ver el código.

---

## MAPA RÁPIDO DEL CÓDIGO DE AGENTES

```
jacamo/
  olibot.jcm                  ← configuración JaCaMo (workspace, agente, artefacto)
  src/
    agt/olibot.asl             ← PLANES Jason en AgentSpeak  ← el más importante
    env/OlibotEnv.java         ← artefacto CArtAgO (puente HTTP Python↔Jason)

backend/
  core/
    bdi_bridge.py              ← fachada Python: BDIBridge + PythonBDIFallback
    session_manager.py         ← pipeline completo del turno conversacional
    safety_shield.py           ← capa de seguridad post-LLM
  pedagogy/
    curriculum.py              ← CurriculumEngine + grafo de prerequisitos
    scaffolding.py             ← ScaffoldingEngine + TopicMastery (modelo del alumno)
```

---

## A. FUNDAMENTOS BDI — "¿Cómo mapeas BDI a tu sistema?"

### Pregunta 1: ¿Dónde están las Creencias, Deseos e Intenciones en OLIBOT?

**Respuesta:**

| Componente BDI | Dónde en OLIBOT |
|---|---|
| **Beliefs** | `student.beliefs` (JSON en SQLite) + observable properties del artefacto CArtAgO. Contienen: tema actual, historial de dominio (`mastery`), nivel de edad, placement test en progreso. |
| **Desires** | Implícito y permanente: que el alumno domine el currículum (objetivo top-level `!start`). No cambia durante la sesión. |
| **Intentions** | El plan `!respond(Intent, SR, T)` que el agente selecciona y ejecuta en cada turno. Es la intención activa en ese momento. |

Las creencias viven en dos sitios simultáneamente:
1. **Jason belief base** (en memoria JVM): `mastery_threshold(0.75)`, `current_intent("attempt_answer")`, etc.
2. **SQLite** (persistente): `student.beliefs["mastery"]` — sincronizado después de cada turno.

**Fichero:** `jacamo/src/agt/olibot.asl` líneas 48–52 (initial beliefs) + `backend/pedagogy/scaffolding.py` (TopicMastery)

---

### Pregunta 2: ¿Cómo funciona exactamente el ciclo de razonamiento del agente?

**Respuesta — el ciclo completo de un turno:**

```
Niño habla
    │
    ▼
[Python NLU] → intención clasificada
    │
    ▼
[Python BDIBridge] POST /percept → OlibotEnv.java
    │                              ├── actualiza observable properties
    │                              │   (current_intent, current_success_rate…)
    │                              └── incrementa percept_count(N)  ← TRIGGER
    │
    ▼
[Jason BDI cycle]
    +percept_count(N)              ← belief update event dispara el plan
        : current_intent(Intent)   ← context guard lee la belief base
        & current_success_rate(SR)
        & current_topic_id(T)
    <- !respond(Intent, SR, T)     ← objetivo creado → selección de plan
    │
    ├── +!respond("attempt_answer", SR, T) : current_is_correct("true")
    │       <- postDecision("praise", ...)          ← operación CArtAgO
    ├── +!respond("attempt_answer", SR, T) : current_is_correct("false")
    │       <- !calculate_hint_level(SR, HL); postDecision("evaluate_and_encourage", HL, ...)
    └── +!respond(_, _, T)                 ← catch-all
            <- postDecision("redirect", ...)
    │
    ▼
[OlibotEnv.java] encola JSON decision → GET /decision devuelve a Python
    │
    ▼
[Python NLG] genera texto con LLM usando BDIDecision.instruction
    │
    ▼
[Safety Shield] filtra respuesta
    │
    ▼
Frontend → niño escucha la respuesta
```

**Fichero clave:** `jacamo/src/agt/olibot.asl` líneas 88–110 (el plan `+percept_count`)

---

### Pregunta 3: ¿Por qué usas un artefacto CArtAgO para la comunicación y no mensajes Jason directos?

**Respuesta:**
Los mensajes Jason (`.send`, `.receive`) son para comunicación **entre agentes** dentro del mismo workspace JaCaMo. OLIBOT tiene un agente único y necesita comunicación con un proceso externo (Python/FastAPI).

CArtAgO es el mecanismo correcto para esto: el artefacto `OlibotEnv` es el **entorno observable** del agente. Python modifica ese entorno (POST /percept actualiza observable properties), y el agente reacciona a cambios de entorno con belief update events (`+percept_count(N)`). Es la arquitectura A&A (Agents & Artifacts) para la que está diseñado JaCaMo.

Usar mensajes Jason para esto violaría la separación de concerns: el agente no debería saber que hay un proceso Python al otro lado, solo percibe su entorno a través del artefacto.

**Fichero:** `jacamo/src/env/OlibotEnv.java` — especialmente el Javadoc del método `applyPercept()` y `postDecision()`

---

## B. JASON / AGENTSPEAK — "¿Cómo está escrito el agente?"

### Pregunta 4: Explícame la sintaxis de un plan Jason. ¿Qué es el context guard?

**Respuesta:**

```prolog
+!respond("attempt_answer", SR, T)     ← triggering event (belief update o goal)
    :  current_is_correct("true")      ← context guard (condición sobre beliefs)
    <-                                 ← separador
    .print("[OLIBOT] attempt_answer CORRECT → praise");
    postDecision("praise", 1, T,       ← body: acciones internas + operaciones CArtAgO
        "Celebrate enthusiastically!",
        "true", "null")
        [artifact_name("olibot_env"), wsp("olibot_workspace")].
```

- **Triggering event** `+!respond(...)`: se añade un objetivo nuevo al agente
- **Context guard** `: current_is_correct("true")`: el plan solo es *aplicable* si esta condición es verdad en la belief base en este momento
- **Body**: secuencia de acciones — internas (`.print`, `.send`) u operaciones de artefacto CArtAgO

Jason evalúa todos los planes con el mismo triggering event, selecciona el primero cuyo context guard se cumple, y lo ejecuta. Si falla, busca el siguiente plan aplicable.

**Fichero:** `jacamo/src/agt/olibot.asl` líneas 122–145

---

### Pregunta 5: ¿Cómo calculas el nivel de scaffolding en Jason?

**Respuesta:**

```prolog
+!calculate_hint_level(SR, 3) <- SR < 0.30.   ← plan 1: si SR < 0.30 → HL=3
+!calculate_hint_level(SR, 2) <- SR < 0.60.   ← plan 2: si SR < 0.60 → HL=2
+!calculate_hint_level(_, 1).                  ← plan 3: catch-all → HL=1
```

Esto aprovecha el mecanismo de selección de planes de Jason: el primero aplicable gana. El tercer plan no tiene context guard (siempre es aplicable) y funciona como `else` garantizado — este goal **nunca puede fallar**.

La misma lógica está espejada en Python en `ScaffoldingEngine.get_hint_level()` para que el fallback sea idéntico.

**Fichero:** `jacamo/src/agt/olibot.asl` líneas 325–330

---

### Pregunta 6: ¿Qué pasa si un plan falla? ¿Cómo manejas los fallos del agente?

**Respuesta:**

Cada objetivo `+!respond(...)` tiene un **plan de fallo** correspondiente `-!respond(...)`:

```prolog
-!respond(Intent, SR, T) <-
    .print("[OLIBOT][ERROR] !respond FAILED — intent=", Intent, ...);
    !recover_with_redirect(T).   ← intenta postear un "redirect" mínimo

-!recover_with_redirect(T) <-
    postDecision("redirect", 1, T, "Internal error. Redirect student.", "null", "null")
    [...];
    .print("[OLIBOT] Recovery redirect posted.").

-!recover_with_redirect(T) <-   ← fallo del propio recovery
    .print("[OLIBOT][CRITICAL] Recovery redirect ALSO failed.").
    .print("[OLIBOT][CRITICAL] Python will use its own fallback.").
```

Sin estos planes de fallo, si `postDecision()` lanza una excepción CArtAgO (artefacto no disponible, workspace desconectado), el agente quedaría congelado y Python esperaría hasta el timeout completo antes de hacer fallback. Con los planes de fallo:
- Si el plan normal falla → se posta un `redirect` mínimo → Python continúa
- Si el recovery también falla → Python hace timeout (5s) → PythonBDIFallback

**Fichero:** `jacamo/src/agt/olibot.asl` líneas 278–315

---

## C. ARQUITECTURA HÍBRIDA — "¿Cómo integras Python y Java?"

### Pregunta 7: ¿Por qué dos procesos separados (Python + JaCaMo)? ¿No es más complejo?

**Respuesta:**
Sí es más complejo, pero la separación tiene justificación técnica y académica:

1. **JaCaMo/Jason está en Java** y no hay bindings Python maduros para AgentSpeak. Forzar todo en Python significaría reimplementar el motor BDI (lo cual equivale a renunciar al estándar académico).
2. **Separación de responsabilidades**: el agente razona sobre pedagogía; el backend maneja HTTP, base de datos, LLMs. Mezclarlos en el mismo proceso crea acoplamiento.
3. **Reemplazabilidad**: se puede cambiar el agente Jason por cualquier otro agente BDI que cumpla el protocolo REST sin tocar nada del backend Python.

El coste es latencia (~10-50ms de HTTP local) y la necesidad del artefacto Java. Ambos son aceptables para el caso de uso (un turno conversacional tarda 1-3 segundos en total por el LLM, el overhead del BDI es despreciable).

---

### Pregunta 8: Explica el protocolo de comunicación Python ↔ JaCaMo

**Respuesta — protocolo de dos fases:**

```
Python                          OlibotEnv.java          Jason
  │                                  │                    │
  │  POST /percept {intent,...}       │                    │
  │──────────────────────────────────►                    │
  │                                  │ defineObsProperty  │
  │                                  │ ("current_intent") │
  │                                  │──────────────────►│
  │                                  │ defineObsProperty  │
  │                                  │ ("percept_count")  │  +percept_count(N) fires
  │                                  │──────────────────►│  !respond(Intent,...) fires
  │  GET /decision                   │                    │  postDecision(...)
  │  [blocks up to 5s]               │◄──────────────────│
  │◄─────────────────────────────────│                    │
  │  {action, hint_level, ...}       │                    │
```

El `GET /decision` es **bloqueante** (long-poll): `OlibotEnv.java` tiene una `LinkedBlockingQueue<String>` y usa `queue.poll(DECISION_TIMEOUT_MS, TimeUnit.MILLISECONDS)`. Si el agente no responde en 5s, devuelve HTTP 408. Python detecta el 408 y llama a `PythonBDIFallback.decide()`.

**Nota sobre timeouts:** El Java tiene `DECISION_TIMEOUT_MS = 5_000` ms (5s). El cliente Python usa `timeout=12` para el GET. En la práctica, el Java devuelve 408 a los 5s y Python recibe la respuesta (408), no hay espera de 12s salvo error de red.

**Fichero:** `jacamo/src/env/OlibotEnv.java` líneas 70–100 + `backend/core/bdi_bridge.py` método `_call_jacamo()`

---

### Pregunta 9: ¿Qué es el PythonBDIFallback? ¿Es un "truco" para saltarte el BDI?

**Respuesta:**
Es una réplica intencional de los planes Jason en Python puro. Sirve para tres propósitos:

1. **Desarrollo sin Gradle**: permite correr y demostrar OLIBOT sin tener JaCaMo instalado.
2. **Degradación elegante**: si JaCaMo cae en producción, el sistema sigue funcionando sin que el niño note nada.
3. **Validación cruzada**: si el Python fallback y el Jason producen decisions diferentes para el mismo input, hay un bug en uno de los dos.

No es un "truco para saltarse el BDI": implementa la misma lógica BDI, solo que sin la maquinaria formal de Jason. La lógica pedagógica es la misma en ambos.

**Lo que pierde el fallback Python vs JaCaMo real:**
- No hay trazabilidad formal de intenciones (qué planes están activos, en qué orden)
- No hay soporte para múltiples agentes concurrentes (aunque OLIBOT solo tiene uno)
- No hay `focusWhenAvailable` ni gestión de workspaces CArtAgO

**Fichero:** `backend/core/bdi_bridge.py` — clase `PythonBDIFallback` y método `_decide_inner()`

---

## D. MODELO DEL ESTUDIANTE — "¿Cómo modelas al alumno?"

### Pregunta 10: ¿Cómo representa el agente las creencias sobre el alumno?

**Respuesta:**

Las creencias se almacenan en dos niveles:

**En SQLite** (persistente entre sesiones):
```json
student.beliefs = {
  "mastery": {
    "trazo_linea_h": {"attempts": 6, "correct": 5, "mastered": true},
    "vocal_a":       {"attempts": 3, "correct": 2, "mastered": false}
  },
  "placement_done": true,
  "placement_in_progress": false
}
```

**En la belief base Jason** (por turno, efímera):
```prolog
mastery_threshold(0.75).
zdp_threshold(0.6).
current_intent("attempt_answer").
current_success_rate(0.67).
current_topic_id("vocal_a").
current_is_correct("true").
```

El puente entre ambos es `OlibotEnv.java`: cuando Python hace POST /percept, incluye `current_beliefs` en el payload, y OlibotEnv los convierte en observable properties para Jason.

**Fichero:** `backend/pedagogy/scaffolding.py` (TopicMastery dataclass) + `jacamo/src/agt/olibot.asl` líneas 48-52

---

### Pregunta 11: ¿Cuándo considera el agente que un tema está "dominado"?

**Respuesta:**

El criterio está en `ScaffoldingEngine.should_advance_topic()`:

```python
MASTERY_THRESHOLD = 0.70       # 70% tasa de éxito
MIN_ATTEMPTS = {3: 3, 4: 2, 5: 1}   # intentos mínimos por edad
```

En Jason está definido como belief:
```prolog
mastery_threshold(0.75).   ← 75% en Jason
min_attempts(3).
```

**Hay una discrepancia deliberada**: Python usa 70% con mínimos por edad; Jason usa 75% con mínimo fijo de 3. Esto ocurre porque el PythonBDIFallback avanza el tema (actualiza `next_topic_id` en `BDIDecision`), no Jason. Jason solo decide la *acción* del turno; la actualización de creencias de mastery la gestiona siempre Python (ScaffoldingEngine). El agente Jason no necesita un criterio exacto de mastery porque no ejecuta `should_advance_topic()` — eso lo hace Python después de recibir la BDIDecision.

**Fichero:** `backend/pedagogy/scaffolding.py` método `should_advance_topic()` + `jacamo/src/agt/olibot.asl` líneas 48-50

---

## E. PREGUNTAS MÁS DIFÍCILES

### Pregunta 12: El agente solo tiene un plan por intent. ¿No es esto demasiado reactivo? ¿Dónde está la deliberación?

**Respuesta:**
Es una crítica legítima. OLIBOT es principalmente un agente **reactivo** (event-driven, responde percepción a percepción). La deliberación ocurre en tres momentos concretos:

1. **Selección de topic inicial** (`CurriculumEngine.get_next_topic()`): el agente no propone el siguiente tema de forma aleatoria sino eligiendo el que mejor encaja en la ZDP del alumno (el más difícil accesible dado sus prerequisitos).
2. **Placement test** (`_handle_placement_answer`): al inicio de la primera sesión, si el alumno tiene ≥4 años, el agente hace 3-4 preguntas de diagnóstico para ubicarlo en el grafo curricular. Esto es un mini-plan deliberativo.
3. **El grafo de prerequisitos** es en sí una forma de deliberación: el agente no puede avanzar libremente, el currículum impone un orden.

La limitación real es que el agente no genera objetivos a largo plazo del tipo "este alumno necesita reforzar las vocales antes del martes". Eso sería trabajo futuro: un módulo de planificación curricular.

---

### Pregunta 13: ¿Cómo garantizas que el agente Jason y el fallback Python se comportan igual?

**Respuesta:**
Hay tres mecanismos:

1. **Documentación explícita**: cada plan Jason tiene un comentario `Python mirror: PythonBDIFallback — <branch>`. Y viceversa, en `PythonBDIFallback._decide_inner()` cada bloque tiene el equivalente Jason en comentario.

2. **Mecanismo de override en `_call_jacamo()`**: si Jason devuelve `"redirect"` pero el Python fallback devuelve algo más específico, el código Python **descarta el redirect de JaCaMo** y usa el resultado Python. Esto es un safety net para cuando JaCaMo no tiene un plan para un intent nuevo que sí maneja el fallback.

3. **Limitación reconocida**: no hay tests unitarios automatizados que comparen las dos implementaciones. Es trabajo futuro (integration tests que corran los dos en paralelo y comparen outputs).

**Fichero:** `backend/core/bdi_bridge.py` líneas ~215-225 (el bloque `if jacamo_action == "redirect" and fallback.action != "redirect"`)

---

### Pregunta 14: ¿Qué pasa con la concurrencia? ¿Dos niños simultáneos?

**Respuesta:**
Es la limitación más importante de la arquitectura actual.

**El problema**: JaCaMo corre como un único proceso Java con un único agente `olibot`. Si dos peticiones HTTP llegan en paralelo, `percept_count(N)` se incrementa dos veces antes de que el agente procese el primero — las beliefs `current_intent`, `current_student_id` etc. se sobreescriben con el segundo percept.

**Cómo se mitiga en el diseño actual**:
- El `GET /decision` es bloqueante con un mutex implícito (la `LinkedBlockingQueue` garantiza que solo una decision se lee a la vez).
- El backend Python es async, pero las llamadas a JaCaMo son secuenciales dentro de la misma sesión.
- En la práctica, para el caso de uso (1-2 alumnos en demo), no hay problema.

**Solución correcta para producción**: tener una instancia JaCaMo por alumno (JaCaMo soporta múltiples agentes, se podría hacer spawn dinámico), o usar directamente el PythonBDIFallback (que es stateless por naturaleza, la concurrencia la maneja el framework async de FastAPI).

---

### Pregunta 15: ¿Cuál es la diferencia entre Safety Shield y los planes BDI? ¿No hacen lo mismo?

**Respuesta:**
Son dos capas con responsabilidades distintas:

| | Safety Shield | Planes BDI |
|---|---|---|
| **Cuándo actúa** | Después del LLM, antes de enviar al niño | Antes del LLM, para elegir qué hacer |
| **Qué comprueba** | *Cómo* está formulada la respuesta (¿da la respuesta directa?) | *Qué acción* tomar (¿pista? ¿felicitar? ¿redirigir?) |
| **Mecanismo** | Regex + patrones (DIRECT_ANSWER_PATTERNS) | Lógica BDI formal (context guards, plan selection) |
| **Input** | Texto generado por el LLM | Intent del alumno + beliefs |
| **Output** | Respuesta aprobada, modificada o sustituida | BDIDecision (action + instruction) |

Son complementarios: el BDI dice "da una pista de nivel 2", el NLG genera el texto de la pista, y el Shield verifica que ese texto no se haya convertido accidentalmente en una respuesta directa.

**Fichero:** `backend/core/safety_shield.py` líneas 25-50 (DIRECT_ANSWER_PATTERNS)

---

## RESUMEN: CÓDIGO A TENER ABIERTO

| Fichero | Líneas | Por qué |
|---|---|---|
| `jacamo/src/agt/olibot.asl` | 1–50 | Initial beliefs + estructura |
| `jacamo/src/agt/olibot.asl` | 88–115 | `+percept_count(N)` — el ciclo BDI |
| `jacamo/src/agt/olibot.asl` | 122–155 | Planes `attempt_answer` con context guards |
| `jacamo/src/agt/olibot.asl` | 278–315 | Planes de fallo `-!respond` |
| `jacamo/src/agt/olibot.asl` | 325–330 | `!calculate_hint_level` — ejemplo bello de Prolog |
| `jacamo/src/env/OlibotEnv.java` | 1–75 | Javadoc del protocolo percept/decision |
| `backend/core/bdi_bridge.py` | 108–145 | `BDIBridge.process_turn()` — entrada principal |
| `backend/core/bdi_bridge.py` | 215–230 | Override de redirect (la costura Java-Python) |
| `backend/core/bdi_bridge.py` | 235–265 | `PythonBDIFallback.decide()` |
| `backend/pedagogy/scaffolding.py` | 1–65 | TopicMastery + belief base Python |

---

## FRASE PARA ABRIR CADA TEMA TÉCNICO

- Al hablar del BDI: *"El principio rector es 'Think BDI, Talk LLM': el agente decide qué hacer, el LLM decide cómo decirlo."*
- Al hablar del agente Jason: *"El fichero olibot.asl tiene exactamente los planes que esperarías en un ITS: responder a una respuesta correcta, dar pistas graduadas, redirigir si se sale del tema."*
- Al hablar del fallback: *"No es un atajo; es la misma lógica BDI en Python, que garantiza disponibilidad si JaCaMo no está corriendo."*
- Al hablar de concurrencia: *"Para el caso de uso de demo esto no es un problema, y lo reconozco como la limitación más importante para escalar a producción."*
