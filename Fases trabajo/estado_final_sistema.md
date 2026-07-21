# Estado final del sistema — OLIBOT (julio 2026)

> Documento de referencia para el capítulo de implementación del TFM.
> Describe el sistema **tal como quedó tras la Fase 12 y la evaluación en aula**,
> distinguiendo explícitamente qué está implementado en código, qué es trabajo futuro,
> y qué se descartó. Basado en lectura directa del código fuente.

---

## Índice

1. [Arquitectura final](#1-arquitectura-final)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Módulos implementados — backend](#3-módulos-implementados--backend)
4. [Módulos implementados — frontend](#4-módulos-implementados--frontend)
5. [Base de datos](#5-base-de-datos)
6. [API REST — endpoints disponibles](#6-api-rest--endpoints-disponibles)
7. [Currículo final](#7-currículo-final)
8. [Tabla de features: implementado vs. trabajo futuro](#8-tabla-de-features-implementado-vs-trabajo-futuro)
9. [Cómo arrancar el sistema](#9-cómo-arrancar-el-sistema)

---

## 1. Arquitectura final

```
┌─────────────────────────────────────────────────────────────────┐
│                     TABLET / NAVEGADOR                          │
│                                                                 │
│  React + Vite (puerto 5173)                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  StudentSelector → ChatWindow (motor principal)          │  │
│  │    ├── LetterTracing (canvas + evaluación de trazado)    │  │
│  │    ├── ColoringCanvas (flood-fill, modo descanso)        │  │
│  │    ├── ActivityPicker (selector de tarea)                │  │
│  │    ├── TopicNavBar (navegación tipo YouTube Kids)        │  │
│  │    ├── EmotionPicker (check-in emocional)                │  │
│  │    ├── AssessmentPanel (test de nivel inicial)           │  │
│  │    ├── CelebrationOverlay (confeti + avatar animado)     │  │
│  │    └── ProgressReport (informe padres, exportable PDF)   │  │
│  │  useSpeech hook (STT + TTS via Web Speech API)           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ REST JSON / SSE streaming
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PC (mismo red WiFi)                           │
│                                                                 │
│  FastAPI Backend (puerto 5050, --host 0.0.0.0)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  NLU  →  BDIBridge  →  NLG  →  SafetyShield             │  │
│  │   │                                                      │  │
│  │   ├── Embedding classifier (nomic-embed-text, ~50 ms)   │  │
│  │   ├── Lightweight LLM (llama3.2:1b, ~400 ms)            │  │
│  │   └── Main LLM fallback (llama3.1:8b, ~1-3 s)           │  │
│  │                                                          │  │
│  │  AssessmentEngine (determinista, sin LLM)               │  │
│  │  CurriculumEngine + ScaffoldingEngine (ZDP)             │  │
│  │  SessionManager (orquestador del turno)                  │  │
│  │  SQLite (olibot.db)                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │ REST opcional                        │
│                          ▼                                      │
│  JaCaMo / Jason (puerto 8080) — JACAMO_ENABLED=true/false       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  olibot.asl (planes Jason AgentSpeak)                   │  │
│  │  OlibotEnv.java (artefacto CArtAgO)                     │  │
│  │  [Si JACAMO_ENABLED=false → PythonBDIFallback (Python)] │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Ollama (puerto 11434)                                          │
│  ├── llama3.1:8b  (NLG + NLU fallback)                         │
│  ├── llama3.2:1b  (NLU ligero)                                  │
│  └── nomic-embed-text  (clasificación por embeddings)           │
└─────────────────────────────────────────────────────────────────┘
```

**Principio de degradación elegante:**
- Sin JaCaMo → `PythonBDIFallback` (comportamiento idéntico)
- Sin embeddings → LLM ligero para NLU
- Sin LLM ligero → LLM principal para NLU
- Sin Ollama → respuestas de caché estática (fallo silencioso)

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión | Rol |
|------|-----------|---------|-----|
| **Frontend** | React + Vite | React 18 | Interfaz de usuario |
| **Frontend — voz** | Web Speech API (nativa navegador) | — | STT + TTS, sin servicios externos |
| **Frontend — avatar** | DiceBear (MIT) | — | Avatares personalizables |
| **Backend** | FastAPI + Python 3.11 | FastAPI 0.110 | API REST + orquestación |
| **Backend — agente** | JaCaMo 1.2 / Jason 3.2 | — | Agente BDI (opcional) |
| **Backend — artefacto** | CArtAgO (Java) | — | Puente HTTP Python ↔ Jason |
| **LLM** | Ollama (local) | — | Inferencia completamente local |
| **LLM — modelos** | llama3.1:8b, llama3.2:1b, nomic-embed-text | — | NLG, NLU ligero, embeddings |
| **BD** | SQLite | — | Persistencia de sesiones y progreso |
| **ORM** | SQLAlchemy 2 | — | Modelos de datos |
| **Build JaCaMo** | Gradle 8 | — | Compilar y ejecutar agente Java |

---

## 3. Módulos implementados — backend

### `backend/llm/`

| Módulo | Implementado | Descripción |
|--------|-------------|-------------|
| `ollama_client.py` | ✅ | Cliente Ollama con soporte generate + embed + streaming SSE |
| `nlu.py` | ✅ | Pipeline 3-niveles: embeddings → LLM ligero → LLM principal. Parser determinista para `tracing_complete`. 12 intents definidos. |
| `nlg.py` | ✅ | Generación con persona OLIBOT. Caché de respuestas frecuentes por (intent, categoría, is_correct). |
| `provider.py` | ✅ | Abstracción de proveedor LLM (permite cambio futuro a OpenAI/Groq) |

### `backend/core/`

| Módulo | Implementado | Descripción |
|--------|-------------|-------------|
| `bdi_bridge.py` | ✅ | `BDIBridge` + `PythonBDIFallback`. Plans: greet, attempt_answer, tracing_complete, ask_for_hint, ask_for_answer, request_topic_change, request_specific_topic, express_emotion, off_topic, placement_answer, mastery_achieved, encourage_retry_tracing. |
| `session_manager.py` | ✅ | Pipeline completo de 13 pasos. Streaming SSE (`process_message_stream`). Saludo instantáneo sin LLM. |
| `safety_shield.py` | ✅ | Bicapa: regex + LLM. Intercepta respuestas directas. |
| `assessment_engine.py` | ✅ | Motor determinista de placement test. 8 pasos (draw/trace/choice). Niveles: amarillo/verde/azul/rojo según respuestas scoring. |

### `backend/pedagogy/`

| Módulo | Implementado | Descripción |
|--------|-------------|-------------|
| `curriculum.py` | ✅ | DAG de 50+ temas. Categorías: pregrafomotricidad, lectoescritura, numeración, fonología, sílabas, palabras, sílabas_complejas, palabras_avanzadas, frases. Filtrado por `min_age`. Evaluación de respuestas por token. |
| `scaffolding.py` | ✅ | `ScaffoldingEngine` con `TopicMastery`. Umbral de maestría por edad (3a:0.60, 4a:0.70, 5a:0.75, 6a:0.80). Mínimo de intentos por edad. Niveles de pista (1-3). |

### `backend/api/`

| Módulo | Implementado | Descripción |
|--------|-------------|-------------|
| `routes/chat.py` | ✅ | `POST /chat/message` (sync) + `POST /chat/stream` (SSE). |
| `routes/students.py` | ✅ | CRUD completo. `PATCH /beliefs` (merge seguro). `POST /request-assessment`. `POST /emotional-checkpoint`. |
| `routes/reports.py` | ✅ | `GET /reports/{student_id}`. Informe completo: historial de sesiones, mastery por topic, historial de mensajes, emotional checkpoints. |
| `routes/voice.py` | ✅ (opcional) | `POST /voice/stt` (faster-whisper). `POST /voice/tts/stream` (ElevenLabs / OpenAI TTS). Proveedores opcionales; si no están instalados, el frontend usa Web Speech API sin error. |

### `backend/config/`

| Parámetro `.env` | Descripción |
|-----------------|-------------|
| `JACAMO_ENABLED` | true/false — activa JaCaMo o PythonBDIFallback |
| `OLLAMA_MODEL` | Modelo NLG (default: llama3.1:8b) |
| `OLLAMA_NLU_MODEL` | Modelo NLU ligero (default: llama3.2:1b) |
| `OLLAMA_EMBED_MODEL` | Modelo embeddings (default: nomic-embed-text) |
| `WHISPER_MODEL_SIZE` | Tamaño modelo Whisper server-side (default: base) |
| `VOICE_STT_PROVIDER` | whisper / browser |
| `VOICE_TTS_PROVIDER` | elevenlabs / openai / browser |

---

## 4. Módulos implementados — frontend

### Componentes principales

| Componente | Implementado | Descripción |
|-----------|-------------|-------------|
| `ChatWindow.jsx` | ✅ | Pantalla principal. Gestiona todo el estado de la sesión: trazado, assessment, modo parejas, check-in emocional, celebraciones, actividad picker, streaming SSE. ~2100 líneas. |
| `StudentSelector.jsx` | ✅ | Alta de alumnos. Modo parejas (selección de 2 perfiles). Solicitud de assessment. Selector de avatar DiceBear. |
| `LetterTracing.jsx` | ✅ | Canvas de trazado con guía. 3 niveles de pista. Tutorial animado. Evaluación shape+order score. Sílabas compuestas (un solo glifo). |
| `ColoringCanvas.jsx` | ✅ | Flood-fill sobre SVG/PNG. Modo lápiz + bote de pintura. Paleta de 18 colores. Botón de limpieza. Figuras de animales y objetos. |
| `ActivityPicker.jsx` | ✅ | Selector de actividad tras cansancio/maestría. Hasta 3 temas desbloqueados + dibujo. Narración automática de opciones (accesible). Botón 💪 "seguir con lo de ahora". |
| `TopicNavBar.jsx` | ✅ | Barra inferior fija. Hasta 4 tarjetas (activa + 3 desbloqueadas). Sin candados. |
| `EmotionPicker.jsx` | ✅ | Check-in emocional con caras (3-5 opciones). Ciclo de resaltado/narración para no-lectores. |
| `AssessmentPanel.jsx` | ✅ | Panel visual para el placement test. Tipos: draw, trace, choice. Controlado por `assessment_engine.py`. |
| `CelebrationOverlay.jsx` | ✅ | Confeti + avatar animado en acierto y subida de nivel. |
| `ProgressReport.jsx` | ✅ | Informe de progreso para padres. 3 pestañas: resumen, sesiones, mensajes. Exportable a PDF (`window.print()`). |
| `OlibotAvatar.jsx` / `DiceBearAvatar.jsx` | ✅ | Avatar del agente (fijo) y avatar del alumno (personalizable, MIT). |
| `MessageBubble.jsx` | ✅ | Burbuja de mensaje con borde de color por resultado. Badge de avance de tema. |
| `RestBreakPicker.jsx` | ✅ | Pantalla de descanso adaptativo según estado emocional. |

### Hooks

| Hook | Implementado | Descripción |
|------|-------------|-------------|
| `useSpeech.js` | ✅ | STT (Web Speech API, es-ES). TTS con velocidad por edad (3a: 0.72, 4a: 0.80, 5a: 0.88). Bloqueo del canvas durante TTS. Filtro de confianza STT. |
| `useLetterTracing.js` | ✅ | Lógica de evaluación del trazo: shape score + order score. Demo automática. 3 intentos por nivel. |

### Datos

| Archivo | Descripción |
|---------|-------------|
| `letterData.js` | Stroke data para todos los trazos pregráficos, letras (mayúsculas + minúsculas), números, sílabas simples (edad 5), sílabas inversas y complejas (edad 6). Función `_composeStrokes` para sílabas unidas. |
| `coloringData.js` | 20+ subjects (animales, objetos). Función `loadColoringManifest` para imágenes PNG externas. |

### Características de accesibilidad/adaptación implementadas

| Feature | Cómo |
|---------|------|
| Modo simplificado (edad ≤ 4) | Oculta informe, topic picker manual, estadísticas. `const simplified = ageProfile <= 4` |
| TTS adaptado por edad | `ttsRate`: 0.72 (3a), 0.80 (4a), 0.88 (5a) |
| Límite de sesión por edad | 15 min (3a), 20 min (4a), 25 min (5a). Aviso al 75 % del tiempo |
| Audio sin texto (modo oral) | Los botones se narran; el picker de actividades se cicla con locución |
| Modo parejas (2 jugadores) | Turnos alternos. Sin diálogo de maestría (avance automático). Indicador de turno activo |

---

## 5. Base de datos

SQLite (`olibot.db`). Tablas gestionadas por SQLAlchemy:

| Tabla | Descripción |
|-------|-------------|
| `students` | Perfil del alumno: nombre, edad, nivel, beliefs (JSON), avatar_id, métricas agregadas |
| `sessions` | Sesión de tutoría: topic, timestamps, métricas (hints_given, correct/incorrect) |
| `messages` | Mensajes del turno: rol, contenido, intent detectado, shield_triggered |
| `activities` | Registro de intentos: topic_id, respuesta, is_correct, hint_level (alimenta informe) |
| `emotional_checkpoints` | Registros de check-in emocional: emotion, context, timestamp |

### Beliefs (JSON en `students.beliefs_json`)

```json
{
  "mastery": { "vocal_a": 0.85, "trazo_linea_h": 1.0, ... },
  "topics_progress": {
    "vocal_a": { "tracing_level": 2, "level_attempts": [[true,true,true],[true,true,null]], "mastered": false }
  },
  "needs_assessment": false,
  "assessment_state": { ... },
  "current_topic": "vocal_e"
}
```

---

## 6. API REST — endpoints disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Estado del sistema (versión, jacamo_enabled) |
| POST | `/api/v1/chat/message` | Turno conversacional (síncrono) |
| POST | `/api/v1/chat/stream` | Turno conversacional (SSE streaming) |
| GET | `/api/v1/students/` | Listar alumnos |
| POST | `/api/v1/students/` | Crear alumno |
| GET | `/api/v1/students/{id}` | Obtener alumno |
| PATCH | `/api/v1/students/{id}` | Actualizar alumno |
| PATCH | `/api/v1/students/{id}/beliefs` | Merge de beliefs (preserva server-side keys) |
| DELETE | `/api/v1/students/{id}` | Eliminar alumno |
| POST | `/api/v1/students/{id}/request-assessment` | Solicitar placement test |
| POST | `/api/v1/students/{id}/emotional-checkpoint` | Guardar check-in emocional |
| GET | `/api/v1/reports/{id}` | Informe de progreso completo |
| POST | `/api/v1/voice/stt` | Transcripción audio (faster-whisper, opcional) |
| POST | `/api/v1/voice/tts/stream` | Síntesis de voz streaming (ElevenLabs/OpenAI, opcional) |

---

## 7. Currículo final

50+ temas en el grafo DAG. Secuencia pedagógica por edad:

```
[Amarillo / 3 años]
  trazo_linea_h → trazo_linea_v → trazo_curva → trazo_zigzag → trazo_circulo → trazo_angulo

[Verde / 4 años]
  vocal_a → vocal_a_min → vocal_e → vocal_e_min → vocal_i → vocal_i_min
  → vocal_o → vocal_o_min → vocal_u → vocal_u_min
  numero_1 … numero_9

[Azul / 5 años]
  consonante_m → consonante_p → consonante_t → consonante_s → consonante_l
  → consonante_n → consonante_d → consonante_f → consonante_r
  silaba_ma → silaba_mi → silaba_sa → silaba_la → silaba_pa
  palabra_mama → palabra_mesa → palabra_pato → palabra_luna

[Rojo / 6 años]
  silaba_inv_as → silaba_inv_es → silaba_inv_al → silaba_inv_ar → silaba_inv_an
  silaba_bra → silaba_tra → silaba_pla → silaba_cla
  (palabras avanzadas y frases simples — definidas en curriculum.py)
```

---

## 8. Tabla de features: implementado vs. trabajo futuro

Basada en la comparación entre los planes de las Fases 7-12 y el código real.

### ✅ IMPLEMENTADO en código (verificado)

| Feature | Dónde |
|---------|-------|
| Pipeline NLU 3-niveles (embeddings + LLM ligero + LLM principal) | `nlu.py` |
| Parser determinista `tracing_complete` (regex, sin LLM) | `nlu.py` |
| Agente BDI Jason (JaCaMo) + PythonBDIFallback | `bdi_bridge.py`, `olibot.asl` |
| Safety Shield bicapa (regex + LLM) | `safety_shield.py` |
| Currículo DAG (50+ temas, 4 edades) | `curriculum.py` |
| Motor de scaffolding ZDP (umbral por edad, hint level) | `scaffolding.py` |
| Motor de assessment determinista (8 pasos staircase) | `assessment_engine.py` |
| Placement test visual touch/choice (sin necesidad de micrófono) | `AssessmentPanel.jsx` |
| Trazado de letras/sílabas en canvas (3 niveles guía, composición de sílabas) | `LetterTracing.jsx`, `letterData.js` |
| TTS + STT con Web Speech API (es-ES, velocidad por edad) | `useSpeech.js` |
| Velocidad TTS adaptada por edad (0.72 / 0.80 / 0.88) | `ChatWindow.jsx` |
| Modo simplificado (ocultar elementos adultos para edad ≤ 4) | `ChatWindow.jsx` |
| Límite de sesión por edad con aviso al 75 % | `ChatWindow.jsx` |
| Saludo instantáneo sin LLM (latencia 0) | `session_manager.py` |
| Caché de respuestas NLG por (intent, categoría, is_correct) | `nlg.py` |
| Streaming SSE de respuestas NLG | `session_manager.py`, `chat.py` |
| Celebración con confeti + avatar animado | `CelebrationOverlay.jsx` |
| Check-in emocional (EmotionPicker) con narración automática | `EmotionPicker.jsx` |
| Registro de emotional checkpoints en DB | `checkpoint_repo.py`, `students.py` |
| Informe de progreso para padres (PDF via window.print) | `ProgressReport.jsx` |
| Modo parejas (2 perfiles, turnos alternos) | `ChatWindow.jsx`, `StudentSelector.jsx` |
| Navegación tipo YouTube Kids (TopicNavBar) | `TopicNavBar.jsx` |
| ActivityPicker con narración de opciones (accesible para no-lectores) | `ActivityPicker.jsx` |
| ColoringCanvas con flood-fill (modo descanso) | `ColoringCanvas.jsx` |
| Figuras para colorear (SVG/PNG, ~20 subjects) | `coloringData.js` |
| Persistencia de subnivel de trazado en `beliefs.topics_progress` | `students.py` (PATCH merge) |
| Acceso desde red local (tablet) con `--host 0.0.0.0` | `main.py`, `fase_12` |
| Sílabas en minúscula unidas (un solo glifo) | `letterData.js` |
| Dashboard informe: historial mensajes expuesto | `reports.py`, `ProgressReport.jsx` |
| Avatares personalizables (DiceBear, MIT) | `DiceBearAvatar.jsx`, `StudentSelector.jsx` |
| Sonidos de acierto/fallo (Web Audio API) | `ChatWindow.jsx` |

### 🔧 TRABAJO FUTURO (no implementado en código)

| Feature | Referencia | Motivo |
|---------|-----------|--------|
| Dashboard para docentes / orientadora | Fase 10 #11 | Requiere vista separada + autenticación |
| Modo sin conexión (Service Worker + IndexedDB) | Fase 10 #16 | Complejidad de sincronización |
| Modo lectura de palabras completo (5 años avanzados) | Fase 10 #14 | Pendiente de datos curriculares extendidos |
| Evaluación automática de nivel sin test explícito | Fase 10 #8B parcial | Assessment engine implementado; falta integración automática completa en flujo |
| Seguimiento emocional entre sesiones (patrón temporal) | Fase 10 #20 | DB preparada; falta análisis y visualización |
| Detección de entorno ruidoso (sugerir auriculares) | Fase 10 #18 | Señal de Web Audio API; no implementado |
| Modo alto contraste accesibilidad visual | Fase 10 #19 | CSS vars preparadas; no activado |
| Figuras de trazado más pequeñas + más puntos guía | Fase 9 #12 | Ajuste de parámetros pendiente |
| Reducción de frecuencia check-in emocional para edad ≥ 5 | Evaluación en aula | Bug UX identificado en sesión 24/06/2026 |
| Gestión de transición escritura→pintura | Evaluación en aula | Bug UX identificado en sesión 24/06/2026 |
| Contenidos de matemáticas | Petición de Ángela (4a) | Fuera del alcance del currículo definido |
| Exportación de logs de sesión (CSV/JSON) | — | Útil para investigación; no solicitado |

---

## 9. Cómo arrancar el sistema

### Opción A — Sin JaCaMo (desarrollo, demos)

```bash
# Terminal 1: Ollama
ollama serve

# Terminal 2: Backend
cd /path/to/olibot
.venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 5050 --reload

# Terminal 3: Frontend
cd frontend
npm run dev
```

### Opción B — Con JaCaMo (evaluación BDI real)

```bash
# Terminal 1: Ollama
ollama serve

# Terminal 2: JaCaMo
cd jacamo
./gradlew run

# Terminal 3: Backend (con JACAMO_ENABLED=true en .env)
.venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 5050 --reload

# Terminal 4: Frontend
cd frontend && npm run dev
```

### Verificación desde tablet (misma red)

```
http://IP_PC:5050/health  → JSON {"status": "ok", ...}
http://IP_PC:5173         → Aplicación OLIBOT
```

> Si crear niño falla desde la tablet: (1) verificar `--host 0.0.0.0` en uvicorn,
> (2) comprobar firewall del PC (puerto 5050 abierto), (3) misma red WiFi.
