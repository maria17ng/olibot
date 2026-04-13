# Fase 2 — Currículo, Scaffolding y Módulo para Padres

**Estado:** Completada  
**Fecha:** Abril 2026  
**Rama:** `main`

---

## Objetivos de la Fase

1. Dotar a OLIBOT de un **modelo curricular explícito** alineado con el currículo oficial de Educación Infantil (Real Decreto 95/2022, Área 3: Comunicación y Representación de la Realidad).
2. Implementar un **motor de scaffolding** basado en la Zona de Desarrollo Próximo (ZDP) de Vygotsky que adapte dinámicamente el nivel de ayuda al progreso de cada alumno.
3. Añadir un **módulo para padres/tutores** con un endpoint REST que devuelve un informe de progreso estructurado.
4. Integrar el currículo y el scaffolding en el **ciclo BDI completo** (tanto en el agente JaCaMo real como en el `PythonBDIFallback`).
5. Extender el **modelo de datos** con una tabla `ActivityModel` que registra cada intento del alumno para alimentar los informes.

---

## Módulos Creados / Modificados

### Nuevos módulos

| Archivo | Descripción |
|---------|-------------|
| `backend/pedagogy/curriculum.py` | Ontología curricular de 20 temas + `CurriculumEngine` |
| `backend/pedagogy/scaffolding.py` | Motor de scaffolding ZDP + `ScaffoldingEngine` |
| `backend/api/schemas/report.py` | Esquemas Pydantic para el informe de progreso |
| `backend/api/routes/reports.py` | Endpoint `GET /api/v1/reports/{student_id}` |

### Módulos extendidos

| Archivo | Cambios |
|---------|---------|
| `backend/db/models.py` | Nueva tabla `ActivityModel` |
| `backend/db/repositories/session_repo.py` | `log_activity()`, `increment_hints()`, `get_sessions_for_student()` |
| `backend/db/repositories/student_repo.py` | `increment_sessions()` |
| `backend/core/bdi_bridge.py` | `BDIDecision` ampliado; `PythonBDIFallback` usa currículo y scaffolding |
| `backend/core/session_manager.py` | Integración completa de Fase 2 (ver pipeline abajo) |
| `backend/api/schemas/chat.py` | `ChatResponse` ampliado con `is_correct`, `next_topic_id`, `current_topic_id` |
| `backend/main.py` | Registro del router `/api/v1/reports` |
| `jacamo/src/agt/olibot.asl` | Planes Fase 2: percept extendido, `express_emotion`, `select_next_topic` |

---

## Ontología Curricular (`curriculum.py`)

### Diseño

El currículo es un grafo dirigido acíclico (DAG) de 20 temas con relaciones de prerrequisito:

```
vocales (diff=1)
  vocal_a, vocal_e, vocal_i, vocal_o, vocal_u

números 1-5 (diff=1, sin prerrequisitos)
  numero_1 … numero_5

números 6-10 (diff=2, prerrequisito: numero_5)
  numero_6 … numero_10

consonantes (diff=2, prerrequisito: todas las vocales)
  consonante_m, consonante_p, consonante_t, consonante_s, consonante_l
```

### Estructura de `CurriculumTopic`

```python
@dataclass
class CurriculumTopic:
    id: str                           # e.g. "vocal_a"
    display_name: str                 # e.g. "La Vocal A"
    category: CurriculumCategory      # LECTOESCRITURA | NUMERACION | FONOLOGIA
    difficulty: int                   # 1–5
    prerequisites: list[str]          # topic_ids que deben estar dominados primero
    description_for_student: str      # Texto que lee el agente al alumno
    hints: list[str]                  # 3 pistas (nivel 1, 2, 3)
    expected_answers: list[str]       # Respuestas correctas aceptadas
    example_questions: list[str]      # Preguntas de ejemplo para el NLG
    emoji: str                        # Para la interfaz de padres
```

### `CurriculumEngine` — métodos clave

| Método | Descripción |
|--------|-------------|
| `get_next_topic(beliefs)` | Selección ZDP: ZDP > unstarted eligible > review |
| `is_mastered(beliefs, topic_id)` | Comprueba si la creencia de mastery está a True |
| `prerequisites_met(beliefs, topic_id)` | Comprueba que todos los prerrequisitos estén dominados |
| `in_zdp(beliefs, topic_id)` | True si el tema está en progreso pero no dominado |
| `get_hint(topic_id, level)` | Devuelve la pista del nivel 1/2/3 |
| `evaluate_answer(topic_id, answer)` | Compara la respuesta con `expected_answers` (case-insensitive, strip) |

---

## Motor de Scaffolding (`scaffolding.py`)

### Fundamento teórico

Basado en la ZDP de Vygotsky: el agente opera entre lo que el alumno puede hacer solo (dominado) y lo que aún no puede (no iniciado). Los temas en la ZDP reciben el mayor esfuerzo pedagógico.

### Parámetros de configuración

| Constante | Valor | Significado |
|-----------|-------|-------------|
| `MASTERY_THRESHOLD` | 0.75 | Tasa de éxito mínima para declarar un tema dominado |
| `MIN_ATTEMPTS` | 3 | Intentos mínimos antes de que pueda declararse dominado |
| `ZDP_LOWER_BOUND` | 0.20 | Tasa por debajo de la cual el tema está fuera de la ZDP (muy difícil) |

### Estructura de creencias de mastery

Las creencias del alumno se almacenan en `StudentModel.beliefs_json` bajo la clave `"mastery"`:

```json
{
  "mastery": {
    "vocal_a": {
      "attempts": 7,
      "correct": 6,
      "mastered": true
    },
    "numero_1": {
      "attempts": 3,
      "correct": 1,
      "mastered": false
    }
  }
}
```

Este formato espeja exactamente la base de creencias de JaCaMo:
```prolog
mastery(vocal_a, 7, 6, true).
mastery(numero_1, 3, 1, false).
```

### Cálculo del nivel de pista

```
success_rate >= 0.60  →  hint_level = 1  (pista sutil, alumno va bien)
success_rate >= 0.30  →  hint_level = 2  (pista moderada)
success_rate <  0.30  →  hint_level = 3  (pista casi directa, alumno lucha)
```

---

## Pipeline de Turno Completo (Fase 2)

```
StudentMessage
      │
      ▼
1. Load StudentModel (beliefs_json → beliefs dict)
      │
      ▼
2. _get_or_create_session()
   └─ CurriculumEngine.get_next_topic(beliefs) → topic_id
   └─ SessionRepository.create_session(student_id, topic_id)
      │
      ▼
3. Resolve CurriculumTopic from CURRICULUM[session.topic]
      │
      ▼
4. NLUProcessor.extract_intent(user_message) → Intent
      │
      ▼
5. BDIBridge.process_turn(intent, student, success_rate, current_topic)
   ├─ [JaCaMo enabled]  → POST /percept  → BDIDecision
   └─ [JaCaMo disabled] → PythonBDIFallback.decide()
        ├─ ask_for_answer   → give_hint (con pista del currículo)
        ├─ attempt_answer   → evaluate + record_attempt + ¿advance?
        ├─ ask_for_hint     → give_hint (con pista del currículo)
        ├─ greet            → greet_and_start
        ├─ express_emotion  → acknowledge_emotion
        └─ _               → redirect (catch-all)
      │
      ▼
6. NLGProcessor.generate_response(instruction=bdi_decision.instruction)
      │
      ▼
7. SafetyShield.evaluate() → ShieldResult
      │
      ▼
8. Persist: add_message(user), add_message(agent)
      │
      ▼
9. student_repo.update_beliefs(updated_beliefs)
      │
      ▼
10. [if attempt_answer] session_repo.log_activity(...)
      │
      ▼
11. [if give_hint / ask_for_hint] session_repo.increment_hints(...)
      │
      ▼
12. [if bdi_decision.next_topic_id]
    └─ session_repo.close_session(current)
    └─ session_repo.create_session(next_topic_id)
    └─ student_repo.increment_sessions()
      │
      ▼
ChatResponse(session_id, agent_response, shield_triggered,
             detected_intent, current_beliefs,
             is_correct, next_topic_id, current_topic_id)
```

---

## Tabla `ActivityModel`

Registra cada intento del alumno (cuando `intent = attempt_answer`) con el resultado pedagógico:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | Integer PK | |
| `session_id` | FK sessions | |
| `topic_id` | String | ID del tema del currículo |
| `student_response` | Text | Texto que escribió el alumno |
| `is_correct` | Boolean\|None | Resultado de `CurriculumEngine.evaluate_answer()` |
| `hint_level_used` | Integer | Nivel de scaffolding activo en este turno (1-3) |
| `timestamp` | DateTime | |

Esta tabla alimenta directamente el endpoint de informes de progreso.

---

## Módulo para Padres

### Endpoint

```
GET /api/v1/reports/{student_id}
→ StudentProgressReport
```

### Estructura del informe

```json
{
  "student_id": 1,
  "student_name": "María",
  "student_age": 5,
  "generated_at": "2026-04-09T10:30:00",
  "total_sessions": 12,
  "total_messages": 147,
  "overall_success_rate": 0.68,
  "topics_mastered": 6,
  "topics_in_progress": 4,
  "topics_not_started": 10,
  "mastery_by_topic": [
    {
      "topic_id": "vocal_a",
      "display_name": "La Vocal A",
      "category": "LECTOESCRITURA",
      "emoji": "🔤",
      "attempts": 8,
      "correct": 7,
      "success_rate": 0.875,
      "mastered": true,
      "hint_level_needed": 1
    }
  ],
  "recommended_focus": ["numero_3", "consonante_m"],
  "recommended_display_names": ["El Número 3", "La Consonante M"],
  "recent_sessions": [...]
}
```

### Lógica de recomendaciones

Se seleccionan los 3 temas en progreso (`attempts > 0 AND mastered = false`) con **menor tasa de éxito** — son los que más atención necesitan en casa.

---

## Agente Jason — Cambios Fase 2 (`olibot.asl`)

### Percept extendido

```prolog
// Fase 1:
+percept(StudentId, Intent, SuccessRate, Beliefs) <- ...

// Fase 2 (nuevo):
+percept(StudentId, Intent, Entities, SuccessRate, Beliefs, TopicId) <-
    -+current_student(StudentId);
    -+current_topic(TopicId);
    !respond(Intent, SuccessRate, TopicId).
```

### Nuevos planes

- **`+!respond(express_emotion, _, TopicId)`**: reconocimiento empático de emociones del alumno, luego redirige a la lección.
- **`+!select_next_topic(StudentId)`**: solicita al backend Python que seleccione el siguiente tema ZDP.
- Todos los planes ahora pasan `TopicId` en la decisión enviada al backend.

### Nuevas creencias iniciales

```prolog
mastery_threshold(0.75).
min_attempts(3).
current_topic(general).
```

---

## Decisiones de Diseño

### 1. Mastery en `beliefs_json`, no columnas separadas

**Alternativa considerada:** añadir columnas `mastered_topics` (JSON) a `StudentModel`.  
**Decisión:** almacenar la mastery dentro de `beliefs_json["mastery"]` porque:
- Espeja exactamente la base de creencias de JaCaMo (cero transformación en el bridge).
- Evita una migración de esquema.
- El formato JSON es suficientemente rico para mastery por tema.

### 2. `PythonBDIFallback` como espejo exacto de Jason

El fallback Python no es una simplificación: es una traducción 1:1 de los planes Jason a Python. Esto garantiza que el comportamiento pedagógico sea idéntico con y sin JaCaMo activo. Facilita el desarrollo y las pruebas sin necesitar Java.

### 3. Topic advancement como apertura de nueva sesión

Cuando el alumno domina un tema, en lugar de cambiar el topic de la sesión activa, se **cierra la sesión actual y se abre una nueva**. Esto preserva la integridad de los datos históricos por sesión y permite analizar el progreso tema a tema en el módulo de padres.

### 4. Evaluación de respuestas en Python, no en Jason

`CurriculumEngine.evaluate_answer()` evalúa la corrección de la respuesta en Python antes de enviar el percept a JaCaMo. El agente BDI recibe el resultado ya evaluado. Esto simplifica el agente Jason (que no necesita acceder al diccionario de respuestas esperadas) y mantiene la lógica de dominio en Python donde es más fácil de mantener.

---

## Cómo Probar

### Prerequisito
```bash
cd olibot
pip install -r requirements.txt
# Asegurarse de que Ollama está corriendo con llama3.1:8b
ollama run llama3.1:8b
```

### Ejecutar el servidor
```bash
uvicorn backend.main:app --reload --port 5050
```

### Prueba de informe de progreso
```bash
# Crear alumno
curl -X POST http://localhost:5050/api/v1/students/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "age": 5, "level": "beginner"}'

# Enviar mensajes de prueba
curl -X POST http://localhost:5050/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"student_id": 1, "message": "Hola!"}'

# Ver informe
curl http://localhost:5050/api/v1/reports/1
```

---

## Siguiente Fase (Fase 3)

- **Frontend React**: pantalla de chat para el alumno + panel de padres con `StudentProgressReport`
- **Actividades multimedia**: soporte para imágenes/audio en las actividades (e.g., "¿Cómo se llama esta letra?")
- **JaCaMo completo**: activar `JACAMO_ENABLED=true` y probar el agente Jason real
- **Persistencia de historial de sesión en el cliente**: el frontend debe guardar `session_id` entre mensajes