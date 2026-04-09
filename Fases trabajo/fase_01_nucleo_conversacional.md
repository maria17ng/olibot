# Fase 1 — Núcleo Conversacional Base

**Fecha:** Abril 2026
**Estado:** Implementado (base funcional)
**Rama/Versión:** v0.1.0

---

## Objetivo de esta fase

Construir el esqueleto completo de OLIBOT con el **pipeline conversacional mínimo funcional**:
estudiante envía un mensaje → el sistema razona → el sistema responde de forma pedagógicamente segura.

Esta fase no implementa todas las funcionalidades del TFM, sino que establece la **arquitectura base** sobre la que se irán añadiendo capacidades en fases posteriores.

---

## Arquitectura implementada

```
React Frontend (puerto 5173)
        │
        │  HTTP POST /api/v1/chat/message
        ▼
FastAPI Backend (puerto 8000)
        │
        ├──► NLU (Ollama) → Extrae Intent del mensaje del niño
        │
        ├──► BDI Bridge → Decide acción pedagógica
        │        │
        │        ├── [JaCaMo OFF] Python BDI Fallback (reglas inline)
        │        └── [JaCaMo ON]  REST → JaCaMo (puerto 8080) → Jason Agent
        │
        ├──► NLG (Ollama) → Genera respuesta con la persona OLIBOT
        │
        ├──► Safety Shield → Valida que NO se dan respuestas directas
        │
        └──► SQLite (olibot.db) → Persiste mensajes, sesiones, creencias
```

### Diagrama del flujo completo de un turno

```
1. Niño escribe:  "¿Cuánto es 2+2?"
        │
2. NLU clasifica: Intent = ask_for_answer  (confianza: 0.9)
        │
3. BDI decide:    Action = give_hint, Level = 1
                  Instrucción: "No des la respuesta. Da pista socrática."
        │
4. NLG genera:    "¡Hmm! ¿Puedes contar con los dedos? 🖐️ ¿Cuántos dedos levantas?"
        │
5. Safety Shield: ask_for_answer detectado → ESCUDO ACTIVADO
                  Reemplaza por:  "¿Tú qué crees? Piénsalo... 🤔"
        │
6. Respuesta final al niño: "¿Tú qué crees? Piénsalo... 🤔"
        │
7. BD guarda: mensaje, intent, shield_triggered=True, respuesta_original_llm
```

---

## Módulos creados

### Backend Python (`/backend`)

| Archivo | Clase / Función | Propósito |
|---|---|---|
| `main.py` | `app` (FastAPI) | Entry point, registro de rutas, CORS, startup |
| `config/settings.py` | `Settings` | Configuración centralizada vía Pydantic + .env |
| `db/database.py` | `get_db()`, `init_db()` | Conexión SQLite con SQLAlchemy |
| `db/models.py` | `StudentModel`, `SessionModel`, `MessageModel` | Tablas ORM de la base de datos |
| `db/repositories/student_repo.py` | `StudentRepository` | CRUD de estudiantes |
| `db/repositories/session_repo.py` | `SessionRepository` | CRUD de sesiones y mensajes |
| `api/schemas/student.py` | `StudentCreate`, `StudentResponse` | Validación de datos de entrada/salida |
| `api/schemas/chat.py` | `ChatRequest`, `ChatResponse` | Validación del endpoint de chat |
| `api/routes/students.py` | Router REST | Endpoints GET/POST/PATCH/DELETE de alumnos |
| `api/routes/chat.py` | Router REST | Endpoint principal de conversación |
| `llm/ollama_client.py` | `OllamaClient` | Wrapper del API REST de Ollama |
| `llm/nlu.py` | `NLUProcessor`, `Intent` | Clasificación de intenciones del alumno |
| `llm/nlg.py` | `NLGProcessor` | Generación de respuestas con persona OLIBOT |
| `core/safety_shield.py` | `SafetyShield`, `ShieldResult` | Escudo de seguridad pedagógica |
| `core/bdi_bridge.py` | `BDIBridge`, `PythonBDIFallback`, `BDIDecision` | Puente JaCaMo / simulador BDI Python |
| `core/session_manager.py` | `SessionManager` | Orquestador del pipeline completo |

### JaCaMo (`/jacamo`)

| Archivo | Propósito |
|---|---|
| `olibot.jcm` | Definición del proyecto MAS (agente + workspace + artefacto) |
| `src/agt/olibot.asl` | Agente Jason BDI: planes de respuesta pedagógica |
| `src/env/OlibotEnv.java` | Artefacto CArtAgO: servidor HTTP embebido para comunicar con Python |

### Frontend React (`/frontend`)

| Archivo | Propósito |
|---|---|
| `src/App.jsx` | Componente raíz, gestión del alumno seleccionado |
| `src/components/StudentSelector.jsx` | Selección y creación de perfiles de alumno |
| `src/components/ChatWindow.jsx` | Ventana de chat, gestión de mensajes y sesión |
| `src/components/MessageBubble.jsx` | Renderizado de mensajes individuales |
| `src/services/api.js` | Cliente HTTP para el backend FastAPI |

---

## Decisiones de diseño y justificación

### 1. Por qué SQLite
- Cero configuración — el `.db` se crea automáticamente al arrancar
- Portabilidad total (un solo fichero)
- Suficiente para el volumen del TFM
- Migración a PostgreSQL trivial con SQLAlchemy si fuera necesario

### 2. Por qué el Python BDI Fallback
JaCaMo es un framework Java que requiere su propio proceso. Para que el proyecto
sea ejecutable desde el día 1 (sin Java instalado), se implementó un `PythonBDIFallback`
que replica exactamente la lógica de los planes Jason en Python.
Cuando JaCaMo esté configurado, se activa con `JACAMO_ENABLED=true` en el `.env`.

### 3. Por qué el Safety Shield está en dos capas
- **Python** (`SafetyShield`): primera línea de defensa, rápida, basada en regex + intent
- **Jason** (`olibot.asl`): segunda línea, razonamiento BDI formal con lógica temporal
Esto garantiza que aunque falle JaCaMo, el escudo nunca se desactiva.

### 4. El Intent `ask_for_answer` es el más crítico
Según el modelo BDI, el "Deseo" principal del agente es que el niño aprenda por descubrimiento.
Cualquier intención del alumno de obtener la respuesta directa activa el plan de scaffolding,
independientemente del nivel o el tema.

---

## Cómo arrancar el proyecto

### Requisitos
- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.com/download) instalado y corriendo

### Pasos

```bash
# 1. Instalar Ollama y descargar el modelo
ollama pull llama3.1:8b

# 2. Backend Python
cd olibot/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn backend.main:app --reload

# 3. Frontend React (nueva terminal)
cd olibot/frontend
npm install
npm run dev
```

Acceder a: `http://localhost:5173`
API docs: `http://localhost:8000/docs`

---

## Pendiente para Fase 2

- [ ] Completar integración real con JaCaMo (levantar el proceso Java, probar el puente REST)
- [ ] Módulo de Currículo (`pedagogy/curriculum.py`) — alinear actividades al currículo oficial de Infantil
- [ ] Módulo de Scaffolding adaptativo (`pedagogy/scaffolding.py`) — ZDP real basado en historial de creencias
- [ ] Actividades estructuradas (trazos de letras, conteo, sonidos)
- [ ] Módulo de Padres — generación de informes de progreso
- [ ] Tests unitarios para Safety Shield y BDI Fallback

---

## Referencias académicas relevantes

- Rao, A. & Georgeff, M. (1995). *BDI Agents: From Theory to Practice*
- Bordini, R. et al. (2007). *Programming Multi-Agent Systems in AgentSpeak using Jason*
- Specif. técnica OLIBOT: `especificacion_tecnica.md`
- Concepto "Think BDI, Talk LLM": ChatBDI framework (2024)
