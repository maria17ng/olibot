# Referencia Técnica — OLIBOT Fases 1 y 2

> Documento de referencia interna para el desarrollo y la redacción de la memoria del TFM.  
> Describe en detalle todos los módulos, funciones, flujos y decisiones de diseño implementados en las Fases 1 y 2.

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [Cómo arrancar el sistema](#2-cómo-arrancar-el-sistema)
3. [Stack tecnológico y configuración](#3-stack-tecnológico-y-configuración)
4. [Base de datos y modelos ORM](#4-base-de-datos-y-modelos-orm)
5. [Capa de acceso a datos (Repositories)](#5-capa-de-acceso-a-datos-repositories)
6. [Módulo LLM — OllamaClient](#6-módulo-llm--ollamaclient)
7. [Módulo NLU — Clasificación de intents](#7-módulo-nlu--clasificación-de-intents)
8. [Módulo NLG — Generación de respuestas](#8-módulo-nlg--generación-de-respuestas)
9. [Safety Shield — Escudo pedagógico](#9-safety-shield--escudo-pedagógico)
10. [BDI Bridge — Puente con JaCaMo](#10-bdi-bridge--puente-con-jacamo)
11. [JaCaMo — El agente BDI real](#11-jacamo--el-agente-bdi-real)
12. [Currículo y ontología pedagógica](#12-currículo-y-ontología-pedagógica)
13. [Motor de Scaffolding (ZDP)](#13-motor-de-scaffolding-zdp)
14. [Session Manager — Orquestador del turno](#14-session-manager--orquestador-del-turno)
15. [API REST — Endpoints](#15-api-rest--endpoints)
16. [Flujo completo de un turno](#16-flujo-completo-de-un-turno)
17. [Cómo añadir cosas a mano](#17-cómo-añadir-cosas-a-mano)

---

## 1. Arquitectura general

OLIBOT implementa el patrón **"Think BDI, Talk LLM"**:

- El **agente BDI** (JaCaMo/Jason) razona y decide QUÉ hacer pedagógicamente.
- El **LLM** (Ollama/llama3.1:8b) genera CÓMO decirlo en lenguaje natural.

```
┌─────────────┐    HTTP/JSON    ┌──────────────────────────────────────────┐
│   Frontend  │ ◄─────────────► │            FastAPI Backend               │
│  (React)    │                 │                                          │
└─────────────┘                 │  ┌─────────┐   ┌─────┐   ┌──────────┐  │
                                │  │   NLU   │──►│ BDI │──►│   NLG    │  │
                                │  └─────────┘   └─────┘   └──────────┘  │
                                │        │           │           │         │
                                │        ▼           ▼           ▼         │
                                │  ┌─────────────────────────────────┐    │
                                │  │         Safety Shield           │    │
                                │  └─────────────────────────────────┘    │
                                │                   │                      │
                                │                   ▼                      │
                                │           ┌──────────┐                  │
                                │           │  SQLite   │                  │
                                │           └──────────┘                  │
                                └──────────────────────────────────────────┘
                                          │ REST (opcional)
                                          ▼
                                 ┌────────────────┐
                                 │  JaCaMo/Jason  │  (JACAMO_ENABLED=false
                                 │  (puerto 8080) │   usa PythonBDIFallback)
                                 └────────────────┘
```

### Principio de degradación elegante

Si JaCaMo no está corriendo (`JACAMO_ENABLED=false` en `.env`), el `BDIBridge` activa automáticamente el `PythonBDIFallback`, que es una traducción 1:1 de los planes Jason a Python. El comportamiento pedagógico es idéntico.

---

## 2. Cómo arrancar el sistema

OLIBOT tiene **cuatro procesos** independientes. JaCaMo es **opcional** — sin él el sistema funciona igual usando el `PythonBDIFallback`.

### Resumen de terminales

| Terminal | Proceso | Puerto | Obligatorio |
|----------|---------|--------|-------------|
| 1 | Ollama (LLM) | 11434 | Sí |
| 2 | FastAPI Backend | 5050 | Sí |
| 3 | JaCaMo (agente BDI) | 8080 | No (tiene fallback) |
| 4 | Frontend React | 5173 | Solo para UI |

---

### Terminal 1 — Ollama (LLM local)

Ollama es el servidor del modelo de lenguaje. Debe estar corriendo antes que el backend.

```bash
# Instalar Ollama (solo la primera vez)
curl -fsSL https://ollama.com/install.sh | sh

# Descargar el modelo (solo la primera vez, ~4.7 GB)
ollama pull llama3.1:8b

# Arrancarlo (queda en segundo plano automáticamente)
ollama serve
```

Verificar que está activo:
```bash
curl http://localhost:11434/api/tags
# Debe devolver JSON con "llama3.1:8b" en la lista de modelos
```

---

### Terminal 2 — FastAPI Backend

**Antes de arrancar**, configura el archivo `.env` en `/home/menunezg/PyCharmMiscProject/TFM/olibot/.env`:

```bash
# Sin JaCaMo (modo desarrollo, recomendado por defecto):
JACAMO_ENABLED=false

# Con JaCaMo (solo si el proceso JaCaMo está corriendo en Terminal 3):
JACAMO_ENABLED=true

OLLAMA_MODEL=llama3.1:8b
DATABASE_URL=sqlite:///./olibot.db
```

> **Importante:** cada vez que cambies `.env`, debes **reiniciar uvicorn** para que lo lea.

```bash
cd /home/menunezg/PyCharmMiscProject/TFM/olibot

# Instalar dependencias Python (solo la primera vez)
pip install -r requirements.txt

# Arrancar el backend
uvicorn backend.main:app --reload --port 5050
```

El backend queda disponible en `http://localhost:5050`.  
La documentación interactiva (Swagger) en `http://localhost:5050/docs`.

Verificar que arrancó correctamente y con la configuración esperada:
```bash
curl -s http://localhost:5050/health | python3 -m json.tool
# Muestra: "jacamo_enabled": true/false según .env
```

---

### Terminal 3 — JaCaMo (agente BDI real) — OPCIONAL

Solo necesario si `JACAMO_ENABLED=true` en `.env`. Requiere Java (se descarga automáticamente).

```bash
cd /home/menunezg/PyCharmMiscProject/TFM/olibot/jacamo
./gradlew run
```

El Gradle wrapper hace automáticamente en la **primera ejecución**:
1. Descarga Gradle 8.10.2 (~180 MB, queda en caché en `~/.gradle`)
2. Descarga JaCaMo 1.3.0 + JDK 21 (~260 MB en total, queda en caché)
3. Compila `src/env/OlibotEnv.java` y lanza el agente BDI

Las siguientes ejecuciones son inmediatas (todo en caché).

El agente está listo cuando aparece en el log:
```
[OlibotEnv] HTTP server started on port 8080
[OLIBOT] BDI agent started. Waiting for percepts from Python backend on port 8080...
```

> **Para parar JaCaMo:** `Ctrl+C` en esta terminal.  
> **Para reiniciarlo** (p.ej. tras cambiar `olibot.asl`): `Ctrl+C` y `./gradlew run` de nuevo.

Verificar que JaCaMo responde:
```bash
curl -s -X POST http://localhost:8080/percept -H "Content-Type: application/json" -d '{"student_id":1,"intent":"greet","success_rate":0.5,"current_topic":"intro","is_correct":null}' && sleep 1 && curl -s http://localhost:8080/decision
# Debe devolver: {"action":"greet_and_start","hint_level":0,...}
```

---

### Terminal 4 — Frontend React (para la UI)

```bash
cd /home/menunezg/PyCharmMiscProject/TFM/olibot/frontend

# Instalar dependencias (solo la primera vez)
npm install

# Arrancar el servidor de desarrollo
npm run dev
```

Disponible en `http://localhost:5173`.

---

### Orden de arranque recomendado

```
1. ollama serve                   ← LLM (puede estar ya corriendo en background)
2. editar .env si es necesario
3. uvicorn backend.main:app ...   ← Backend (Terminal 2)
4. ./gradlew run                  ← JaCaMo (Terminal 3, solo si JACAMO_ENABLED=true)
5. npm run dev                    ← Frontend (Terminal 4, solo para UI)
```

> **Modo desarrollo sin UI ni JaCaMo:** solo necesitas Ollama + Backend.  
> Usa `curl` o el Swagger en `http://localhost:5050/docs`.

### Secuencia de verificación del sistema completo

```bash
# 1. Ollama
curl -s http://localhost:11434/api/tags | python3 -m json.tool

# 2. Backend (y confirmar si JaCaMo está activado)
curl -s http://localhost:5050/health | python3 -m json.tool

# 3. JaCaMo (solo si JACAMO_ENABLED=true)
curl -s -X POST http://localhost:8080/percept -H "Content-Type: application/json" \
  -d '{"student_id":1,"intent":"greet","success_rate":0.5,"current_topic":"intro","is_correct":null}' \
  && sleep 1 && curl -s http://localhost:8080/decision

# 4. Flujo completo (NLU → BDI → LLM → respuesta)
curl -s -X POST http://localhost:5050/chat -H "Content-Type: application/json" \
  -d '{"student_id":1,"message":"hola"}' | python3 -m json.tool
```

---

## 3. Stack tecnológico y configuración

### Archivo: `backend/config/settings.py`

Centraliza toda la configuración. Usa `pydantic_settings.BaseSettings`, que lee variables de entorno o del archivo `.env`.

```python
class Settings(BaseSettings):
    app_name: str = "OLIBOT API"
    app_version: str = "0.1.0"
    debug: bool = True

    database_url: str = "sqlite:///./olibot.db"

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"
    ollama_timeout: int = 60          # segundos; aumentar si el modelo es lento

    jacamo_base_url: str = "http://localhost:8080"
    jacamo_enabled: bool = False       # True cuando JaCaMo está en marcha

    safety_shield_strict: bool = True  # False = solo loguea, no bloquea
    default_student_age: int = 5
    zdp_hint_threshold: float = 0.6   # Umbral de pista (heredado de Fase 1)
```

`get_settings()` usa `@lru_cache()` — la instancia se crea una sola vez por proceso.

**Para modificar en runtime:** edita `.env` y reinicia el servidor.  
**Para añadir una variable nueva:** añade el campo a `Settings` con su valor por defecto.

### Archivo: `backend/db/database.py`

Configura SQLAlchemy con SQLite:

```python
engine = create_engine(database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """Dependency de FastAPI. Inyecta una sesión de DB por request."""

def init_db():
    """Crea todas las tablas al arrancar. Se llama en @app.on_event("startup")."""
```

`get_db()` se usa como `Depends(get_db)` en todas las rutas que necesitan DB.

---

## 4. Base de datos y modelos ORM

### Archivo: `backend/db/models.py`

Hay 4 tablas:

---

#### `StudentModel` — tabla `students`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | Integer PK | |
| `name` | String(100) | Nombre del alumno |
| `age` | Integer | Edad (3-6) |
| `level` | String(50) | `"beginner"` / `"intermediate"` / `"advanced"` |
| `beliefs_json` | Text | JSON con toda la base de creencias BDI |
| `total_sessions` | Integer | Contador de sesiones (incrementado por `student_repo.increment_sessions`) |
| `overall_success_rate` | Float | Tasa global (actualmente no se actualiza automáticamente; usar `ScaffoldingEngine.get_overall_success_rate`) |
| `created_at` | DateTime | |
| `updated_at` | DateTime | Se actualiza en `onupdate` |

**Propiedad `beliefs`:**
```python
@property
def beliefs(self) -> dict:
    return json.loads(self.beliefs_json or "{}")

@beliefs.setter
def beliefs(self, value: dict):
    self.beliefs_json = json.dumps(value)
```
Permite usar `student.beliefs` como dict directamente. El setter serializa a JSON.

**Estructura interna de `beliefs_json`** (después de Fase 2):
```json
{
  "mastery": {
    "vocal_a": {"attempts": 7, "correct": 6, "mastered": true},
    "numero_1": {"attempts": 3, "correct": 1, "mastered": false}
  }
}
```
La clave `"mastery"` es la única que gestiona OLIBOT. Se puede añadir cualquier otra clave para creencias adicionales.

---

#### `SessionModel` — tabla `sessions`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | Integer PK | |
| `student_id` | FK → students | |
| `topic` | String(100) | ID del tema del currículo (`"vocal_a"`, `"numero_3"`, etc.) |
| `started_at` | DateTime | |
| `ended_at` | DateTime nullable | Se rellena al cerrar la sesión |
| `is_active` | Boolean | `True` mientras la sesión está abierta |
| `messages_count` | Integer | Se incrementa con cada `add_message()` |
| `hints_given` | Integer | Se incrementa con `increment_hints()` |
| `correct_answers` | Integer | Se incrementa en `log_activity()` si `is_correct=True` |
| `incorrect_answers` | Integer | Se incrementa en `log_activity()` si `is_correct=False` |

**Propiedad `success_rate`:**
```python
@property
def success_rate(self) -> float:
    total = self.correct_answers + self.incorrect_answers
    return self.correct_answers / total if total > 0 else 0.0
```

---

#### `MessageModel` — tabla `messages`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | Integer PK | |
| `session_id` | FK → sessions | |
| `role` | String(20) | `"user"` o `"agent"` |
| `content` | Text | Texto del mensaje |
| `shield_triggered` | Boolean | `True` si el Safety Shield modificó la respuesta |
| `original_llm_response` | Text nullable | Respuesta original del LLM antes del shielding |
| `detected_intent` | String(100) | Intent clasificado por el NLU |
| `timestamp` | DateTime | |

---

#### `ActivityModel` — tabla `activities` (Fase 2)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | Integer PK | |
| `session_id` | FK → sessions | |
| `topic_id` | String(100) | ID del tema practicado |
| `student_response` | Text nullable | Texto que escribió el alumno |
| `is_correct` | Boolean nullable | `True`/`False`/`None` (None = no evaluado, p.ej. pistas) |
| `hint_level_used` | Integer | Nivel de scaffolding activo (1-3) |
| `timestamp` | DateTime | |

Solo se crea cuando `intent == "attempt_answer"`. Alimenta el módulo de informes.

---

## 5. Capa de acceso a datos (Repositories)

### `StudentRepository` — `backend/db/repositories/student_repo.py`

| Método | Descripción |
|--------|-------------|
| `get_all() → list[StudentModel]` | Todos los alumnos |
| `get_by_id(id) → StudentModel\|None` | Alumno por ID |
| `create(data: StudentCreate) → StudentModel` | Crea alumno |
| `update(id, data: StudentUpdate) → StudentModel\|None` | Actualiza campos |
| `update_beliefs(id, beliefs: dict) → StudentModel\|None` | Guarda la base de creencias serializada |
| `increment_sessions(id)` | Incrementa `total_sessions` en 1 |
| `delete(id) → bool` | Borra alumno (cascade a sesiones, mensajes, actividades) |

**`update_beliefs`** es el método más importante: se llama al final de cada turno para persistir las creencias BDI actualizadas (incluyendo la mastery).

---

### `SessionRepository` — `backend/db/repositories/session_repo.py`

| Método | Descripción |
|--------|-------------|
| `create_session(student_id, topic) → SessionModel` | Crea sesión para un tema |
| `get_active_session(student_id) → SessionModel\|None` | Sesión activa más reciente |
| `get_by_id(session_id) → SessionModel\|None` | Sesión por ID |
| `close_session(session_id) → SessionModel\|None` | Cierra sesión (`is_active=False`, rellena `ended_at`) |
| `add_message(session_id, role, content, ...) → MessageModel` | Guarda mensaje + incrementa `messages_count` |
| `get_session_messages(session_id) → list[MessageModel]` | Historial ordenado por timestamp |
| `get_sessions_for_student(student_id) → list[SessionModel]` | Todas las sesiones de un alumno |
| `log_activity(session_id, topic_id, student_response, is_correct, hint_level_used) → ActivityModel` | Registra intento + actualiza `correct_answers`/`incorrect_answers` |
| `increment_hints(session_id)` | Incrementa `hints_given` |
| `increment_correct(session_id)` | Incrementa `correct_answers` (sin crear ActivityModel) |
| `increment_incorrect(session_id)` | Incrementa `incorrect_answers` (sin crear ActivityModel) |

**Nota:** `log_activity` llama internamente a `increment_correct` o `increment_incorrect`, así que no hay que llamarlos por separado cuando se usa `log_activity`.

---

## 6. Módulo LLM — OllamaClient

### Archivo: `backend/llm/ollama_client.py`

Clase `OllamaClient` — cliente HTTP para Ollama.

| Método | Endpoint Ollama | Uso |
|--------|-----------------|-----|
| `generate(prompt, system_prompt) → str` | `POST /api/generate` | Sin historial. Usado por NLU. |
| `chat(messages, system_prompt) → str` | `POST /api/chat` | Con historial de conversación. Usado por NLG. |
| `is_available() → bool` | `GET /api/tags` | Comprueba si Ollama corre y el modelo está cargado. |

**`generate`** — envía un prompt simple y recibe una respuesta. No mantiene contexto.  
**`chat`** — envía una lista de mensajes `[{"role": "user"|"assistant", "content": "..."}]` más un system prompt. Mantiene el contexto conversacional.

El `system_prompt` en `chat` se prepende como mensaje `{"role": "system", ...}` antes del historial.

---

## 7. Módulo NLU — Clasificación de intents

### Archivo: `backend/llm/nlu.py`

#### `Intent` (dataclass)

```python
@dataclass
class Intent:
    name: str           # Uno de KNOWN_INTENTS
    confidence: float   # 0.0 – 1.0
    entities: dict      # {"answer": "a", "letter": "A"} etc.
    raw_text: str       # Texto original del alumno
```

#### `KNOWN_INTENTS` — los 7 intents reconocidos

| Intent | Cuándo se activa | Qué hace el BDI |
|--------|-----------------|-----------------|
| `ask_for_answer` | "dime la respuesta", "¿cuál es?" | Safety Shield intercepta, da pista |
| `ask_for_hint` | "dame una pista", "no sé" | Da pista del nivel actual |
| `attempt_answer` | "creo que es la A", "es el 3" | Evalúa corrección, actualiza mastery |
| `greet` | "hola", "buenos días" | Saluda e introduce el tema |
| `express_emotion` | "estoy triste", "esto es difícil" | Reconoce emoción, redirige |
| `off_topic` | "¿qué es minecraft?" | Redirige al tema |
| `unknown` | Nada encaja | Redirige al tema |

#### `NLUProcessor.extract_intent(student_message) → Intent`

1. Construye un prompt: `Child's message: "..."`.
2. Lo envía a `ollama_client.generate()` con `NLU_SYSTEM_PROMPT`.
3. El LLM devuelve un JSON: `{"intent": "...", "confidence": 0.9, "entities": {...}}`.
4. Parsea el JSON → devuelve `Intent`.
5. Si el JSON está malformado → `Intent(name="unknown", confidence=0.0)`.

**Para añadir un intent nuevo:**
1. Añadir el string a `KNOWN_INTENTS`.
2. Actualizar `NLU_SYSTEM_PROMPT` si hace falta descripción adicional.
3. Añadir el plan correspondiente en `PythonBDIFallback.decide()` (y en `olibot.asl`).

---

## 8. Módulo NLG — Generación de respuestas

### Archivo: `backend/llm/nlg.py`

#### `NLGProcessor.generate_response(student, topic, conversation_history, agent_instruction) → str`

1. Construye `OLIBOT_PERSONA_PROMPT` con: nombre, edad, nivel del alumno, tema actual, resumen de creencias.
2. Añade al final del system prompt: `[INSTRUCTION FROM BDI AGENT]: {agent_instruction}`.
3. Llama a `ollama_client.chat(messages=conversation_history, system_prompt=augmented_system)`.
4. Devuelve el texto generado.

**`agent_instruction`** es la clave: viene de `BDIDecision.instruction` y es la directiva pedagógica del agente BDI al LLM. Ejemplos:
- `"The student asked for the answer directly. NEVER give it. Use this Socratic level-2 hint: '¿Qué animal empieza con A?'"`
- `"The student answered CORRECTLY! Celebrate enthusiastically. They have mastered 'La vocal A'!"`

#### `NLGProcessor.generate_hint(student, topic, hint_level) → str`

Método auxiliar (no usado por el pipeline principal actualmente). Genera directamente una pista sin historial de conversación.

#### `_format_beliefs(beliefs: dict) → str`

Convierte el dict de creencias a texto legible para el system prompt. Si está vacío, devuelve `"No prior knowledge recorded yet."`.

---

## 9. Safety Shield — Escudo pedagógico

### Archivo: `backend/core/safety_shield.py`

El Safety Shield es la última línea de defensa antes de que la respuesta llegue al alumno. Garantiza que el LLM nunca revele respuestas directas.

#### `ShieldResult` (dataclass)

```python
@dataclass
class ShieldResult:
    approved: bool
    modified_response: str | None   # None si no hay modificación
    reason: str                     # Por qué se tomó la decisión
    triggered: bool                 # True si el shield intervino
```

#### `SafetyShield.evaluate(llm_response, intent, student) → ShieldResult`

Aplica 3 reglas en orden:

| Regla | Condición | Acción |
|-------|-----------|--------|
| 1 | `intent.name == "ask_for_answer"` | Siempre bloquea, nunca da la respuesta |
| 2 | La respuesta contiene patrones de respuesta directa | Bloquea |
| 3 | La respuesta tiene menos de 5 caracteres | Bloquea |

Si ninguna regla se activa → `ShieldResult(approved=True, triggered=False)`.

#### `DIRECT_ANSWER_PATTERNS` — patrones de respuesta directa

```python
DIRECT_ANSWER_PATTERNS = [
    r"la respuesta es",
    r"la solución es",
    r"se escribe",
    r"el resultado es",
    r"son \d+",
    r"es la letra",
    r"^la [a-záéíóú]+ es",
]
```

**Para añadir un patrón nuevo:** añadir un string de regex a esta lista.

#### `SCAFFOLDING_REDIRECTS` — respuestas de sustitución

```python
SCAFFOLDING_REDIRECTS = [
    "¡Hmm, qué buena pregunta! ¿Tú qué crees? 🤔",
    "¡Casi! Piénsalo un poquito más... ¿qué sonido hace esta letra?",
    "¡Muy bien que lo intentas! ¿Puedes contarlos con los dedos? 🖐️",
    "¡Eso es pensar como un campeón! ¿Qué pista te da el dibujo?",
]
```

Cuando el shield se activa, sustituye la respuesta por uno de estos mensajes en round-robin (usando `_redirect_index`).

#### `SafetyShield.get_final_response(shield_result, original) → str`

```python
if shield_result.triggered and shield_result.modified_response:
    return shield_result.modified_response
return original
```

Simple: si el shield intervino, devuelve el redirect; si no, devuelve la respuesta original del LLM.

---

## 10. BDI Bridge — Puente con JaCaMo

### Archivo: `backend/core/bdi_bridge.py`

Fachada que abstrae si el agente es JaCaMo real o el fallback Python.

#### `BDIDecision` (dataclass)

```python
@dataclass
class BDIDecision:
    action: str           # "give_hint", "praise", "redirect", "evaluate_and_encourage", ...
    instruction: str      # Instrucción para el NLG (texto libre)
    updated_beliefs: dict # Creencias del alumno actualizadas tras el turno
    hint_level: int = 1   # Nivel de scaffolding (1-3)
    is_correct: bool | None = None       # Para attempt_answer: ¿correcto? None si no aplica
    next_topic_id: str | None = None     # Si el alumno dominó el tema, el siguiente
```

#### `BDIBridge.process_turn(intent, student, session_success_rate, current_topic) → BDIDecision`

Punto de entrada único del BDI:
- Si `self.enabled=True` → llama a `_call_jacamo()`.
- Si `self.enabled=False` o JaCaMo falla → llama a `self._fallback.decide()`.

#### `BDIBridge._call_jacamo(...)` — comunicación en dos pasos con JaCaMo

Cuando JaCaMo está activo, la comunicación es asíncrona en dos pasos:

```
Paso 1: Python  →  POST /percept  →  OlibotEnv
        OlibotEnv actualiza observable properties → Jason agent ve +percept_count(N)
        Jason ejecuta el plan +!respond(...) → llama postDecision(...) en OlibotEnv
        Python recibe: {"status":"received"}   (ACK inmediato)

Paso 2: Python  →  GET /decision   →  OlibotEnv
        OlibotEnv bloquea hasta que el agente hace postDecision (máx 8 segundos)
        Devuelve: {"action":"...", "hint_level":2, "instruction":"...", ...}
```

**Payload que Python envía en el POST `/percept`:**

```python
percept_payload = {
    "student_id": student.id,
    "intent": intent.name,
    "entities": intent.entities,
    "success_rate": session_success_rate,
    "current_beliefs": student.beliefs,
    "current_topic": current_topic.id if current_topic else "general",
    "is_correct": is_correct_pre_evaluated,  # Python evalúa la respuesta ANTES de enviarlo
}
```

`is_correct` se evalúa en Python (usando `CurriculumEngine.evaluate_answer`) antes de enviar el percept, para que el agente Jason pueda usarlo directamente en sus planes sin necesitar acceso a la BD.

**División de responsabilidades entre JaCaMo y Python:**

| Responsabilidad | Quién lo hace |
|----------------|---------------|
| Decisión pedagógica (qué acción tomar) | Jason agent (JaCaMo) |
| Evaluación de respuesta del alumno | Python (`CurriculumEngine.evaluate_answer`) |
| Actualización de creencias (mastery) | Python (`ScaffoldingEngine.record_attempt`) |
| Detección de avance de tema | Python (`ScaffoldingEngine.should_advance_topic`) |
| Generación del texto de respuesta | Ollama/LLM |

Cuando JaCaMo está activo, Python siempre ejecuta también el `PythonBDIFallback` para obtener `updated_beliefs`, `is_correct` y `next_topic_id`, que JaCaMo no puede calcular (no tiene acceso a la BD). La `action` e `instruction` vienen de JaCaMo; el resto viene de Python.

**Fallback automático:** si JaCaMo no responde en 8 s, o hay `ConnectError`, `_call_jacamo` cae directamente al `PythonBDIFallback` sin lanzar excepción.

---

#### `PythonBDIFallback.decide(...)` — los planes BDI en Python

Traduce los planes Jason a lógica Python. Cada `if intent.name == "..."` corresponde a un plan `+!respond(intent, ...)` en Jason.

| Intent | Plan Jason | Acción BDI | ¿Qué hace? |
|--------|-----------|------------|------------|
| `ask_for_answer` | `+!respond(ask_for_answer,...)` | `give_hint` | Calcula hint_level, obtiene pista del currículo, construye instrucción con la pista |
| `attempt_answer` | `+!respond(attempt_answer,...)` | `evaluate_and_encourage` / `praise` / `praise_and_advance` | Evalúa respuesta, actualiza mastery, detecta avance |
| `ask_for_hint` | `+!respond(ask_for_hint,...)` | `give_hint` | Igual que `ask_for_answer` pero sin connotación negativa |
| `greet` | `+!respond(greet,...)` | `greet_and_start` | Introduce el tema al alumno |
| `express_emotion` | `+!respond(express_emotion,...)` | `acknowledge_emotion` | Reconoce la emoción empáticamente |
| `*` (catch-all) | `+!respond(_,...)` | `redirect` | Redirige al tema actual |

**Flujo detallado de `attempt_answer`:**

```
1. Extrae intent.entities.get("answer", "")
2. Evalúa con curriculum.evaluate_answer(topic_id, answer)
   → Si no hay topic o answer vacío: is_correct = None

3. Si is_correct == True:
   a. scaffolding.record_attempt(beliefs, topic_id, True) → updated_beliefs
   b. scaffolding.should_advance_topic(updated_beliefs, topic_id) ?
      → Si sí: curriculum.get_next_topic(updated_beliefs) → next_topic
         next_topic_id = next_topic.id if next_topic.id != topic_id else None
   c. action = "praise_and_advance" si hay next_topic_id, else "praise"
   d. instruction incluye celebración y, si avanza, intro del siguiente tema

4. Si is_correct == False:
   a. scaffolding.record_attempt(beliefs, topic_id, False) → updated_beliefs
   b. Recalcula hint_level con nuevas creencias (puede subir)
   c. action = "evaluate_and_encourage"
   d. instruction indica respuesta incorrecta + pista del nivel escalado

5. Si is_correct == None (no evaluable):
   c. action = "evaluate_and_encourage"
   d. instruction pide al LLM que evalúe y reaccione
```

---

## 11. JaCaMo — El agente BDI real

### Qué es JaCaMo

**JaCaMo** es un framework Java para Sistemas Multi-Agente (MAS) que integra tres tecnologías:

| Componente | Tecnología | Rol en OLIBOT |
|------------|-----------|---------------|
| **Agente** | Jason (BDI) | Razonamiento pedagógico |
| **Entorno** | CArtAgO | Artefacto HTTP que habla con Python |
| **Organización** | Moise | No usado aún (Fase futura) |

**Jason** es un lenguaje de programación BDI basado en AgentSpeak. Los agentes Jason tienen:
- **Creencias** (beliefs): lo que el agente sabe (`current_topic("vocal_a").`)
- **Deseos** (desires): objetivos a alcanzar (`!respond(Intent, SR, T).`)
- **Intenciones** (intentions): planes actualmente en ejecución

**CArtAgO** define *artefactos* — objetos compartidos en el entorno que los agentes pueden usar mediante *operaciones*. `OlibotEnv` es el artefacto que expone el servidor HTTP.

---

### Ficheros del proyecto JaCaMo

```
jacamo/
├── olibot.jcm              ← Fichero de proyecto JaCaMo (define agentes y entorno)
├── build.gradle            ← Build con Gradle (alternativa a run.sh)
├── settings.gradle         ← Nombre del proyecto Gradle
├── run.sh                  ← Script de arranque SIN Gradle (recomendado)
├── src/
│   ├── agt/
│   │   └── olibot.asl      ← Código del agente Jason (planes BDI)
│   └── env/
│       └── OlibotEnv.java  ← Artefacto CArtAgO (servidor HTTP embebido)
└── lib/                    ← Creado por run.sh; contiene jacamo-full-1.2.jar
```

---

### `olibot.jcm` — Fichero de proyecto

Define la estructura del MAS:

```prolog
mas olibot {
    agent olibot : olibot.asl {
        focus: olibot_workspace.olibot_env   // el agente observa este artefacto
        beliefs:
            zdp_threshold(0.6)
            max_hint_level(3)
    }
    workspace olibot_workspace {
        artifact olibot_env : env.OlibotEnv(8080) {
            // Puerto 8080: el backend Python llama aquí
        }
    }
}
```

`focus: olibot_workspace.olibot_env` significa que el agente observa todas las *observable properties* del artefacto `olibot_env`. Cuando una propiedad cambia, el agente recibe un evento de actualización de creencia.

---

### `OlibotEnv.java` — El artefacto CArtAgO

Es un servidor HTTP Java embebido (usando `com.sun.net.httpserver`, incluido en el JDK — sin dependencias externas).

#### Observable properties (→ creencias del agente Jason)

Se crean en `init()` y se actualizan con cada percept:

| Propiedad | Tipo | Cuándo cambia |
|-----------|------|---------------|
| `percept_count(N)` | int | Con cada nuevo percept. Es el **trigger** principal |
| `current_student_id(N)` | int | Con cada percept |
| `current_intent("...")` | String | Con cada percept |
| `current_success_rate(F)` | double | Con cada percept |
| `current_topic_id("...")` | String | Con cada percept |
| `current_is_correct("...")` | String | `"true"`, `"false"`, o `"null"` |

**Por qué `percept_count` es el trigger:** las otras propiedades se actualizan primero. Cuando se actualiza `percept_count` al final, el agente Jason recibe el evento `+percept_count(N)`. En ese momento, todos los demás valores ya están actualizados en su base de creencias, por lo que el plan puede leerlos directamente.

#### Endpoints HTTP

**`POST /percept`** — Python envía un percept

```
Cuerpo JSON: {
  "student_id": 1,
  "intent": "attempt_answer",
  "entities": {"answer": "a"},
  "success_rate": 0.6,
  "current_beliefs": {...},
  "current_topic": "vocal_a",
  "is_correct": true        ← pre-evaluado por Python
}
Respuesta: {"status":"received","percept_id":1}
```

Internamente:
1. Parsea el JSON con regex (sin librería externa).
2. Llama a `updateObsProperty(...)` para cada campo.
3. Actualiza `percept_count` al final (dispara el agente).

**`GET /decision`** — Python espera la decisión del agente

```
Respuesta cuando el agente decide: {
  "action": "give_hint",
  "hint_level": 2,
  "topic_id": "vocal_a",
  "instruction": "Student asked for answer directly. NEVER give it...",
  "is_correct": null,
  "next_topic_id": null
}
Respuesta si el agente no decide en 8 s: HTTP 408
```

Internamente: bloquea en `decisionQueue.poll(8000ms)` hasta que el agente llame a `postDecision`.

#### Operación CArtAgO `postDecision`

El agente Jason llama esta operación desde sus planes:

```java
@OPERATION
void postDecision(String action, int hintLevel, String topicId,
                  String instruction, String isCorrect, String nextTopicId)
```

Construye el JSON de la decisión y lo mete en la `decisionQueue`, lo que desbloquea el `GET /decision` que Python está esperando.

---

### `olibot.asl` — Los planes del agente Jason

#### Creencias iniciales

```prolog
zdp_threshold(0.6).       // Umbral ZDP
max_hint_level(3).         // Nivel máximo de pista
mastery_threshold(0.75).   // Tasa para declarar dominio
min_attempts(3).           // Intentos mínimos
```

Las creencias `current_intent`, `current_success_rate`, etc. las gestiona automáticamente CArtAgO desde las observable properties de `OlibotEnv`.

#### Plan trigger — reacciona a nuevos percepts

```prolog
+percept_count(N)
    :  current_intent(Intent)
     & current_success_rate(SR)
     & current_topic_id(T)
     & current_student_id(SId)
    <-
    -+current_student(SId);
    -+current_topic(T);
    !respond(Intent, SR, T).
```

Lee las creencias actualizadas del entorno y dispara el plan `!respond`.

#### Planes de respuesta

Cada plan llama a la operación `postDecision` en el artefacto:

```prolog
+!respond(ask_for_answer, SR, T) <-
    !calculate_hint_level(SR, HL);
    postDecision("give_hint", HL, T,
        "Student asked for answer. NEVER give it. Provide only a Socratic hint.",
        "null", "null")[artifact_name("olibot_env")].
```

La anotación `[artifact_name("olibot_env")]` indica en qué artefacto está la operación.

| Plan | Condición adicional | Acción enviada |
|------|---------------------|----------------|
| `+!respond(ask_for_answer, SR, T)` | — | `give_hint` |
| `+!respond(attempt_answer, SR, T)` | `current_is_correct("true")` | `praise` |
| `+!respond(attempt_answer, SR, T)` | `current_is_correct("false")` | `evaluate_and_encourage` |
| `+!respond(attempt_answer, SR, T)` | (fallback, is_correct=null) | `evaluate_and_encourage` |
| `+!respond(ask_for_hint, SR, T)` | — | `give_hint` |
| `+!respond(greet, _, T)` | — | `greet_and_start` |
| `+!respond(express_emotion, _, T)` | — | `acknowledge_emotion` |
| `+!respond(_, _, T)` | (catch-all) | `redirect` |

**Cómo funciona la selección de plan en Jason:**  
Jason evalúa los planes de arriba a abajo. Para `attempt_answer`, hay tres planes con la misma cabecera pero diferentes *condiciones de contexto* (la parte `: ...`). Jason selecciona el primero cuya condición se cumple:
1. Si `current_is_correct("true")` está en la base de creencias → `praise`
2. Si `current_is_correct("false")` → `evaluate_and_encourage`
3. El último plan (sin condición) → siempre aplica como fallback

#### Cálculo del hint_level (meta-plan)

```prolog
+!calculate_hint_level(SR, 3) <- SR < 0.30.
+!calculate_hint_level(SR, 2) <- SR < 0.60.
+!calculate_hint_level(_, 1).
```

Jason evalúa de arriba a abajo. La primera regla que se cumple gana:
- SR < 0.30 → nivel 3 (aunque también cumple SR < 0.60, Jason ya no mira más)
- SR < 0.60 (y ≥ 0.30) → nivel 2
- Cualquier otro caso → nivel 1

---

### División de trabajo: JaCaMo vs Python

Cuando JaCaMo está activo, el trabajo se reparte así:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Python Backend                          │
│                                                                 │
│  NLU: classify intent ──────────────────────────────────────►  │
│  CurriculumEngine: evaluate_answer(topic, student_text) ─────►  │
│                                                                 │
│  BDIBridge._call_jacamo():                                      │
│    POST /percept {intent, SR, topic, is_correct} ────────────► │
│                                                   ┌─────────┐  │
│                                                   │  JaCaMo │  │
│                                                   │  Jason  │  │
│                                                   │ +percept│  │
│                                                   │  _count │  │
│                                                   │  (N)    │  │
│                                                   │   ↓     │  │
│                                                   │ !respond│  │
│                                                   │   ↓     │  │
│                                                   │ postDe- │  │
│    GET /decision ◄────────────────────────────────│ cision  │  │
│                                                   └─────────┘  │
│  PythonBDIFallback: updated_beliefs, is_correct, next_topic    │
│  Merge: action+instruction from JaCaMo, beliefs from Python    │
│                                                                 │
│  NLG: generate response (using BDI instruction) ────────────►  │
│  SafetyShield: validate ────────────────────────────────────►  │
└─────────────────────────────────────────────────────────────────┘
```

**Resumen:**
- JaCaMo decide la **acción** (`give_hint`, `praise`, `redirect`…) y la **instrucción** para el NLG.
- Python mantiene las **creencias** (mastery), evalúa las **respuestas**, y detecta el **avance de tema**.
- Esta separación es intencional: JaCaMo no tiene acceso a la BD ni al currículo Python.

---

## 12. Currículo y ontología pedagógica

### Archivo: `backend/pedagogy/curriculum.py`

#### `CurriculumCategory` (enum)

```python
class CurriculumCategory(str, Enum):
    LECTOESCRITURA = "lectoescritura"   # Vocales + consonantes
    NUMERACION     = "numeracion"        # Números 1-10
    FONOLOGIA      = "fonologia"         # (reservado para Fase 3)
```

#### `CurriculumTopic` (dataclass)

```python
@dataclass
class CurriculumTopic:
    id: str                       # "vocal_a", "numero_3", "consonante_m"
    display_name: str             # "La vocal A", "El número 3"
    category: CurriculumCategory
    difficulty: int               # 1 (más fácil) – 5 (más difícil)
    prerequisites: list[str]      # IDs de temas que deben estar dominados antes
    description_for_student: str  # Texto introductorio que dice OLIBOT
    hints: list[str]              # [pista_nivel_1, pista_nivel_2, pista_nivel_3]
    expected_answers: list[str]   # Respuestas correctas aceptadas (lowercase)
    example_questions: list[str]  # Preguntas que OLIBOT puede hacer
    emoji: str = "📚"
```

#### `CURRICULUM: dict[str, CurriculumTopic]` — los 20 temas

| Grupo | Temas | Dificultad | Prerrequisitos |
|-------|-------|-----------|----------------|
| Vocales | vocal_a, e, i, o, u | 1 | Ninguno |
| Números 1-5 | numero_1, 2, 3, 4, 5 | 1 | número anterior (ej: numero_2 requiere numero_1) |
| Números 6-10 | numero_6, 7, 8, 9, 10 | 2 | numero_5 |
| Consonantes | consonante_m, p, t, s, l | 2 | Todas las vocales (vocal_a,e,i,o,u) |

#### `CurriculumEngine` — métodos

| Método | Descripción |
|--------|-------------|
| `get_topic(topic_id)` | Devuelve `CurriculumTopic` o `None` |
| `get_all_topics()` | Lista todos los temas |
| `get_topics_by_category(category)` | Filtra por categoría |
| `is_mastered(beliefs, topic_id) → bool` | ≥75% correcto con ≥3 intentos |
| `get_success_rate(beliefs, topic_id) → float` | Tasa de éxito del tema |
| `prerequisites_met(beliefs, topic) → bool` | Todos los prerrequisitos dominados |
| `in_zdp(beliefs, topic_id) → bool` | Iniciado + no dominado |
| `get_next_topic(beliefs) → CurriculumTopic` | Selección ZDP (ver abajo) |
| `get_hint(topic_id, hint_level) → str` | Pista del nivel 1/2/3 |
| `evaluate_answer(topic_id, answer) → bool` | Compara con `expected_answers` (strip+lower) |

**Algoritmo `get_next_topic(beliefs)`:**

```
1. Elegibles = temas cuyos prerrequisitos están dominados
2. ZDP_topics = elegibles que están en ZDP (iniciados, no dominados)
   → Si hay ZDP_topics: devolver el de más intentos (el más comprometido)
3. Unstarted = elegibles con 0 intentos
   → Si hay Unstarted: devolver el de menor difficulty
4. All mastered: devolver el de menor success_rate (repaso del más débil)
5. Fallback: vocal_a (siempre hay al menos uno)
```

---

## 13. Motor de Scaffolding (ZDP)

### Archivo: `backend/pedagogy/scaffolding.py`

#### `TopicMastery` (dataclass)

```python
@dataclass
class TopicMastery:
    topic_id: str
    attempts: int = 0
    correct: int = 0
    mastered: bool = False

    @property
    def success_rate(self) -> float: ...  # correct / attempts, 0.0 si sin intentos
    @property
    def incorrect(self) -> int: ...       # attempts - correct

    def to_dict(self) -> dict: ...        # Para serializar a beliefs_json
    @classmethod
    def from_dict(cls, topic_id, data) -> TopicMastery: ...  # Para deserializar
```

#### `ScaffoldingEngine` — constantes

| Constante | Valor | Significado |
|-----------|-------|-------------|
| `MASTERY_THRESHOLD` | 0.75 | Tasa mínima para declarar dominio |
| `ZDP_LOWER_BOUND` | 0.20 | Por debajo → demasiado difícil |
| `MIN_ATTEMPTS` | 3 | Intentos mínimos antes de evaluar dominio |
| `ESCALATE_THRESHOLD` | 2 | Fallos consecutivos para escalar pista |

#### `ScaffoldingEngine` — métodos

| Método | Descripción |
|--------|-------------|
| `extract_mastery(beliefs) → dict[str, TopicMastery]` | Deserializa `beliefs["mastery"]` |
| `merge_mastery_to_beliefs(mastery_map, beliefs) → dict` | Serializa de vuelta al beliefs dict |
| `record_attempt(beliefs, topic_id, is_correct) → dict` | Incrementa intentos/correctos, recalcula `mastered`, devuelve nuevo beliefs |
| `get_hint_level(beliefs, topic_id) → int` | Calcula nivel 1/2/3 según tasa |
| `should_advance_topic(beliefs, topic_id) → bool` | True si `tm.mastered == True` |
| `get_scaffolding_state(beliefs, topic_id) → ScaffoldingState` | Snapshot completo |
| `get_overall_success_rate(beliefs) → float` | Tasa global de todos los temas intentados |
| `get_mastered_topic_ids(beliefs) → list[str]` | Temas dominados |
| `get_topics_in_progress(beliefs) → list[str]` | Iniciados pero no dominados |

**Cálculo del hint_level (`get_hint_level`):**

```
success_rate >= 0.60  →  1  (alumno va bien, pista sutil)
success_rate >= 0.30  →  2  (dificultad moderada, pista concreta)
success_rate <  0.30  →  3  (alumno lucha, orientación casi directa)
Nunca intentado       →  1  (empezar con suavidad)
```

**`record_attempt` — cómo actualiza mastery:**

```
new_attempts = current.attempts + 1
new_correct  = current.correct + (1 si is_correct else 0)
new_rate     = new_correct / new_attempts
new_mastered = (new_rate >= 0.75) AND (new_attempts >= 3)
```
Devuelve un nuevo dict `beliefs` sin mutar el original.

---

## 14. Session Manager — Orquestador del turno

### Archivo: `backend/core/session_manager.py`

La clase `SessionManager` coordina todos los módulos para procesar un turno completo.

#### Constructor

```python
def __init__(self, db: Session):
    ollama = OllamaClient()
    self.nlu = NLUProcessor(ollama)
    self.nlg = NLGProcessor(ollama)
    self.bdi = BDIBridge()
    self.shield = SafetyShield()
    self.student_repo = StudentRepository(db)
    self.session_repo = SessionRepository(db)
```

Se instancia en cada request HTTP (en `chat.py`, dentro del handler de la ruta).

#### `process_message(student_id, user_message, session_id) → ChatResponse`

Pipeline de 15 pasos:

```
1.  student_repo.get_by_id(student_id)
       → Carga StudentModel (con beliefs_json)
       → ValueError si no existe (→ HTTP 404)

2.  _get_or_create_session(student_id, session_id, student.beliefs)
       → Si session_id existe y está activa: la reutiliza
       → Si no: CurriculumEngine.get_next_topic(beliefs) → topic_id
                session_repo.create_session(student_id, topic_id)
                student_repo.increment_sessions(student_id)

3.  CURRICULUM.get(session.topic)
       → Resuelve el CurriculumTopic activo (o None si "general")

4.  nlu.extract_intent(user_message)
       → Llama a Ollama con NLU_SYSTEM_PROMPT
       → Devuelve Intent(name, confidence, entities, raw_text)

5.  bdi.process_turn(intent, student, session.success_rate, current_topic)
       → JaCaMo (si JACAMO_ENABLED=true) o PythonBDIFallback
       → Devuelve BDIDecision(action, instruction, updated_beliefs, hint_level,
                              is_correct, next_topic_id)

6.  _build_history(session.id)
       → session_repo.get_session_messages(session.id)
       → Lista de {"role": "user"|"assistant", "content": "..."}
    conversation_history.append({"role": "user", "content": user_message})

7.  nlg.generate_response(student, session.topic, conversation_history,
                           bdi_decision.instruction)
       → Construye OLIBOT_PERSONA_PROMPT + [INSTRUCTION FROM BDI AGENT]
       → Llama a ollama.chat(messages, system_prompt)
       → Devuelve raw_llm_response (str)

8.  shield.evaluate(raw_llm_response, intent, student)
       → Aplica 3 reglas de seguridad
       → Devuelve ShieldResult
    shield.get_final_response(shield_result, raw_llm_response)
       → final_response (str)

9.  session_repo.add_message(session.id, "user", user_message,
                              detected_intent=intent.name)
       → Persiste el mensaje del alumno + incrementa messages_count

10. session_repo.add_message(session.id, "agent", final_response,
                              shield_triggered=..., original_llm_response=...,
                              detected_intent=intent.name)
       → Persiste la respuesta del agente + incrementa messages_count

11. student_repo.update_beliefs(student_id, bdi_decision.updated_beliefs)
       → Persiste las creencias actualizadas (mastery, etc.)

12. [si intent == "attempt_answer" AND current_topic]:
        session_repo.log_activity(session.id, topic_id, answer,
                                   is_correct, hint_level)
        → Crea ActivityModel + incrementa correct_answers/incorrect_answers

13. [si bdi_decision.action == "give_hint" OR
        intent in ("ask_for_hint", "ask_for_answer")]:
        session_repo.increment_hints(session.id)

14. [si bdi_decision.next_topic_id AND distinto del topic actual]:
        session_repo.close_session(session.id)
        new_session = session_repo.create_session(student_id, next_topic_id)
        student_repo.increment_sessions(student_id)
        response_session_id = new_session.id
    [si no]:
        response_session_id = session.id

15. return ChatResponse(session_id=response_session_id,
                         agent_response=final_response,
                         shield_triggered=shield_result.triggered,
                         detected_intent=intent.name,
                         current_beliefs=updated_beliefs,
                         is_correct=bdi_decision.is_correct,
                         next_topic_id=bdi_decision.next_topic_id,
                         current_topic_id=current_topic.id or None)
```

#### `_get_or_create_session(student_id, session_id, student_beliefs) → SessionModel`

```
Si session_id dado Y sesión activa existe → devolver esa sesión
Si no:
   CurriculumEngine.get_next_topic(student_beliefs) → next_topic
   topic_id = next_topic.id  (o "general" si no hay)
   session_repo.create_session(student_id, topic_id)
   student_repo.increment_sessions(student_id)
   devolver nueva sesión
```

#### `_build_history(session_id) → list[dict]`

Convierte `MessageModel.role` de `"agent"` a `"assistant"` para cumplir con el formato de la API de Ollama.

---

## 15. API REST — Endpoints

### `backend/main.py` — Registro de routers

```
GET  /health                        → {"status": "ok", "version": ..., "jacamo_enabled": ...}
POST /api/v1/chat/message           → ChatRequest → ChatResponse
POST /api/v1/chat/session/{id}/end  → Cierra sesión
GET  /api/v1/chat/session/{id}/history → list[MessageDict]
GET  /api/v1/students/              → list[StudentResponse]
GET  /api/v1/students/{id}          → StudentResponse
POST /api/v1/students/              → StudentCreate → StudentResponse (201)
PATCH /api/v1/students/{id}         → StudentUpdate → StudentResponse
DELETE /api/v1/students/{id}        → 204
GET  /api/v1/reports/{id}           → StudentProgressReport
```

### Schemas (Pydantic)

#### `ChatRequest` (`backend/api/schemas/chat.py`)
```python
student_id: int
message: str          # min_length=1, max_length=1000
session_id: int | None = None
```

#### `ChatResponse`
```python
session_id: int
agent_response: str
shield_triggered: bool
detected_intent: str | None
current_beliefs: dict
is_correct: bool | None = None       # Fase 2: ¿respuesta correcta?
next_topic_id: str | None = None     # Fase 2: si el tema avanzó
current_topic_id: str | None = None  # Fase 2: tema activo
```

#### `StudentProgressReport` (`backend/api/schemas/report.py`)
```python
student_id, student_name, student_age, generated_at
total_sessions, total_messages, overall_success_rate
topics_mastered, topics_in_progress, topics_not_started
mastery_by_topic: list[TopicMasteryReport]
recommended_focus: list[str]          # topic_ids a reforzar (≤3)
recommended_display_names: list[str]  # nombres legibles de los anteriores
recent_sessions: list[SessionSummary] # últimas 10 sesiones
```

---

## 16. Flujo completo de un turno

### Ejemplo: alumno escribe "a" (intent: attempt_answer, tema: vocal_a)

```
Cliente → POST /api/v1/chat/message
  {student_id: 1, message: "a", session_id: 5}

FastAPI → chat.py → SessionManager.process_message(1, "a", 5)

1. student_repo.get_by_id(1)
   → StudentModel(name="María", beliefs={"mastery": {"vocal_a": {"attempts":2,"correct":1}}})

2. _get_or_create_session(1, 5, beliefs)
   → session_id=5 existe y está activo → devuelve SessionModel(topic="vocal_a")

3. CURRICULUM.get("vocal_a")
   → CurriculumTopic(id="vocal_a", hints=[...], expected_answers=["a","la a",...])

4. nlu.extract_intent("a")
   → LLM clasifica → Intent(name="attempt_answer", entities={"answer":"a"})

5. bdi.process_turn(intent, student, success_rate=0.5, current_topic=vocal_a_topic)
   → PythonBDIFallback.decide(...)
      → curriculum.evaluate_answer("vocal_a", "a") → True
      → scaffolding.record_attempt(beliefs, "vocal_a", True)
         → new beliefs: {"mastery": {"vocal_a": {"attempts":3,"correct":2,"mastered":False}}}
         (mastered=False porque 2/3 = 0.67 < 0.75)
      → scaffolding.should_advance_topic(...) → False (mastered=False)
      → BDIDecision(
           action="praise",
           instruction="The student answered CORRECTLY! Celebrate enthusiastically.",
           updated_beliefs={"mastery": {"vocal_a": {"attempts":3,"correct":2,"mastered":false}}},
           hint_level=1, is_correct=True, next_topic_id=None
         )

6. _build_history(5) → [previos mensajes]
   + {"role":"user", "content":"a"}

7. nlg.generate_response(student, "vocal_a", history,
       "The student answered CORRECTLY! Celebrate...")
   → Ollama genera: "¡Muy bien María! 🎉 ¡La A! ¡Eres genial! ¿Quieres intentar otra?"

8. shield.evaluate("¡Muy bien María!...", intent, student)
   → intent ≠ ask_for_answer
   → no contiene patrones directos
   → len > 5
   → ShieldResult(approved=True, triggered=False)
   → final_response = "¡Muy bien María! 🎉 ¡La A! ¡Eres genial! ¿Quieres intentar otra?"

9.  add_message(5, "user", "a", detected_intent="attempt_answer")
10. add_message(5, "agent", "¡Muy bien María!...", shield_triggered=False)
11. update_beliefs(1, {"mastery": {"vocal_a": {"attempts":3,"correct":2,"mastered":false}}})

12. intent=="attempt_answer" AND current_topic:
    log_activity(5, "vocal_a", "a", True, 1)
    → ActivityModel creado
    → session.correct_answers += 1

13. action="praise" (no es give_hint) AND intent="attempt_answer" (no hint)
    → NO se incrementa hints_given

14. next_topic_id=None → response_session_id = 5

Respuesta al cliente:
{
  "session_id": 5,
  "agent_response": "¡Muy bien María! 🎉 ¡La A! ¡Eres genial! ¿Quieres intentar otra?",
  "shield_triggered": false,
  "detected_intent": "attempt_answer",
  "current_beliefs": {"mastery": {"vocal_a": {"attempts":3,"correct":2,"mastered":false}}},
  "is_correct": true,
  "next_topic_id": null,
  "current_topic_id": "vocal_a"
}
```

---

## 17. Cómo añadir cosas a mano

### Añadir un nuevo intent al NLU

1. **`backend/llm/nlu.py`**: añade el string a `KNOWN_INTENTS`.
2. **`backend/core/bdi_bridge.py`**: añade el plan en `PythonBDIFallback.decide()` con un nuevo `if intent.name == "nuevo_intent":`.
3. **`jacamo/src/agt/olibot.asl`**: añade el plan `+!respond(nuevo_intent, SR, T) <- postDecision(...)[artifact_name("olibot_env")].`
4. Opcional: actualizar `NLU_SYSTEM_PROMPT` con descripción del nuevo intent.

### Añadir un nuevo tema al currículo

En `backend/pedagogy/curriculum.py`, añade una entrada al diccionario `CURRICULUM`:

```python
"nuevo_tema": CurriculumTopic(
    id="nuevo_tema",
    display_name="Nombre legible",
    emoji="🔤",
    category=CurriculumCategory.LECTOESCRITURA,
    difficulty=2,
    prerequisites=["tema_previo"],          # IDs que deben dominarse antes
    description_for_student="Texto intro.", # OLIBOT lo dice al empezar
    hints=[
        "Pista sutil (nivel 1)",
        "Pista moderada (nivel 2)",
        "Pista casi directa (nivel 3)",
    ],
    expected_answers=["respuesta", "la respuesta"],  # todo lowercase
    example_questions=["¿Pregunta de ejemplo?"],
),
```

No hay que tocar la base de datos: los temas no son filas, están hardcodeados en Python.

### Añadir una regla al Safety Shield

En `backend/core/safety_shield.py`:
- Para bloquear un patrón: añadir regex a `DIRECT_ANSWER_PATTERNS`.
- Para añadir un mensaje de redireccionamiento: añadir texto a `SCAFFOLDING_REDIRECTS`.
- Para una regla más compleja: añadir un bloque `if` dentro de `SafetyShield.evaluate()`.

### Añadir un campo nuevo a las creencias del alumno

Las creencias son un dict libre en `beliefs_json`. Para añadir datos nuevos:
1. En el código que los genera, hacer `beliefs["nueva_clave"] = valor`.
2. Llamar a `student_repo.update_beliefs(student_id, beliefs)`.
3. No se necesita migración de BD.

**Ejemplo:** guardar el tema favorito del alumno:
```python
beliefs = student.beliefs
beliefs["favorite_topic"] = "vocal_a"
student_repo.update_beliefs(student.id, beliefs)
```

### Añadir un endpoint nuevo

1. Crear o editar un archivo en `backend/api/routes/`.
2. Definir `router = APIRouter(prefix="/mi_ruta", tags=["mi_tag"])`.
3. Registrarlo en `backend/main.py`: `app.include_router(mi_router.router, prefix="/api/v1")`.

### Cambiar el modelo de LLM

En `.env`:
```
OLLAMA_MODEL=llama3.2:3b
```
El modelo debe estar descargado localmente: `ollama pull llama3.2:3b`.

### Activar / desactivar JaCaMo

**Activar** (requiere que `./run.sh` esté corriendo en otra terminal):
```bash
# En .env:
JACAMO_ENABLED=true
# Reiniciar uvicorn
```

**Desactivar** (vuelve al PythonBDIFallback automáticamente):
```bash
# En .env:
JACAMO_ENABLED=false
# Reiniciar uvicorn
```

El comportamiento pedagógico es el mismo con o sin JaCaMo. La diferencia es que con JaCaMo el razonamiento BDI ocurre en el agente Jason real (Java), lo cual es el objeto de estudio del TFM.

Para verificar qué modo está activo:
```bash
curl http://localhost:5050/health
# {"status":"ok","version":"0.1.0","jacamo_enabled":true}
```

---

*Documento generado durante el desarrollo del TFM "OLIBOT: Agente Pedagógico Híbrido BDI-LLM para Educación Infantil" — UC3M, Máster en Ciencias y Tecnologías de la Computación, 2025-2026.*