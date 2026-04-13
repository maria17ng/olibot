# Fase 3 — Frontend React (Interfaz de Usuario)

## Objetivo
Extender el frontend React de Fase 1 para aprovechar todos los datos que el backend ya expone desde Fase 2: tema activo, evaluación de respuestas, avance de temas y el portal de informes para padres.

---

## Archivos modificados / creados

| Archivo | Tipo | Descripción |
|---|---|---|
| `frontend/src/App.jsx` | Modificado | Botón "Informes" en cabecera, muestra `ProgressReport` como modal |
| `frontend/src/components/ChatWindow.jsx` | Modificado | Barra de tema activo, stats de sesión, pasa campos Fase 2 a `MessageBubble` |
| `frontend/src/components/MessageBubble.jsx` | Modificado | Badge correcto/incorrecto, banner de avance de tema, muestra `current_topic_id` |
| `frontend/src/components/ProgressReport.jsx` | Nuevo | Portal de informes para padres con 3 pestañas |
| `frontend/src/services/api.js` | Modificado | Añadido `getReport(studentId)` → `GET /api/v1/reports/{id}` |

---

## Cambios en detalle

### `api.js` — nuevo método `getReport`

```js
async getReport(studentId) {
  const res = await fetch(`${BASE_URL}/reports/${studentId}`);
  if (!res.ok) throw new Error("Failed to fetch report");
  return res.json();
}
```

Llama al endpoint `GET /api/v1/reports/{student_id}` que devuelve un `StudentProgressReport` completo.

---

### `MessageBubble.jsx` — feedback visual de respuestas

El componente recibe del mensaje los campos añadidos en Fase 2:

| Campo | Tipo | Uso |
|---|---|---|
| `is_correct` | `bool \| null` | Muestra "✅ Respuesta correcta" o "💪 Inténtalo de nuevo" |
| `next_topic_id` | `string \| null` | Banner "🏆 Has superado el tema anterior" encima del mensaje |
| `current_topic_id` | `string \| null` | Muestra el tema activo en el pie del burbuja (debug) |

**Borde lateral de la burbuja:**
- `is_correct=true` → borde verde (`#22c55e`)
- `is_correct=false` → borde naranja (`#f59e0b`)
- Sin evaluar → sin borde especial

---

### `ChatWindow.jsx` — barra de contexto

Encima del área de mensajes hay una barra que muestra:
- **Badge azul** con el `current_topic_id` activo (reemplaza `_` con espacio)
- **Estadísticas de sesión**: respuestas correctas, intentos incorrectos, pistas pedidas
- **Porcentaje de aciertos** calculado en frontend (coloreado: verde ≥60%, naranja ≥30%, rojo <30%)

La barra se actualiza en cada respuesta del agente:
```js
const newTopicId = response.next_topic_id || response.current_topic_id;
if (newTopicId) setCurrentTopicId(newTopicId);
```

Cuando `next_topic_id` viene en la respuesta, el badge ya muestra el nuevo tema en el siguiente mensaje.

---

### `ProgressReport.jsx` — portal de informes para padres

Componente modal que carga el informe al abrirse y lo muestra en 3 pestañas:

#### Pestaña 1: Resumen (`overview`)
- 6 tarjetas stat: sesiones totales, mensajes, tasa de aciertos, temas superados, en progreso, sin empezar
- Lista de **temas para reforzar en casa** (top 3 con menor tasa de aciertos, en progreso) — viene de `recommended_display_names`

#### Pestaña 2: Temas (`topics`)
- Grid de tarjetas, una por tema del currículo
- Cada tarjeta: emoji + nombre + categoría + intentos + barra de progreso coloreada
  - Verde = superado (≥75% con ≥3 intentos)
  - Amarillo = en camino (≥60%)
  - Naranja = dificultad moderada (≥30%)
  - Rojo = necesita apoyo (<30%)

#### Pestaña 3: Sesiones (`sessions`)
- Lista de las últimas 10 sesiones (más reciente primero)
- Cada sesión: tema, fecha, mensajes, correctas/incorrectas, pistas, veces que saltó el escudo
- Porcentaje de aciertos coloreado

---

### `App.jsx` — botón de informes

Cuando hay un alumno seleccionado, aparece el botón "📋 Informes" en la cabecera del header. Al pulsarlo abre `ProgressReport` como overlay semitransparente (z-index: 1000) sobre el chat.

```jsx
{selectedStudent && (
  <>
    <div style={{ marginLeft: "auto" }}>Alumno: {selectedStudent.name}</div>
    <button onClick={() => setShowReport(true)}>📋 Informes</button>
  </>
)}

{showReport && selectedStudent && (
  <ProgressReport student={selectedStudent} onClose={() => setShowReport(false)} />
)}
```

---

## Flujo completo en Fase 3

```
Usuario escribe mensaje
  │
  ▼
ChatWindow.handleSend()
  │   POST /api/v1/chat/message
  │   { student_id, message, session_id }
  ▼
Backend → ChatResponse:
  { session_id, agent_response, shield_triggered,
    detected_intent, current_beliefs,
    is_correct, next_topic_id, current_topic_id }   ← nuevos campos Fase 2
  │
  ▼
ChatWindow actualiza:
  - currentTopicId  (badge del tema activo)
  - sessionStats    (contadores de aciertos/intentos/pistas)
  │
  ▼
MessageBubble renderiza:
  - Burbuja del agente con borde verde/naranja si is_correct
  - Banner "🏆 Has superado el tema" si next_topic_id
  - Badge del tema en el pie (modo debug)

Botón "📋 Informes"
  │
  ▼
ProgressReport abre modal
  │   GET /api/v1/reports/{student_id}
  ▼
StudentProgressReport:
  - Pestaña Resumen: stats globales + recomendaciones para casa
  - Pestaña Temas: grid de progreso por tema con barras de mastery
  - Pestaña Sesiones: historial de últimas 10 sesiones
```

---

## Cómo arrancar el frontend

```bash
cd frontend
npm run dev       # Vite → http://localhost:5173
```

El backend debe estar corriendo en `http://localhost:5050`. La URL base está en `src/services/api.js`:
```js
const BASE_URL = "http://localhost:5050/api/v1";
```

Si el puerto del backend cambia, editar solo esa constante.

---

## Decisiones de diseño

- **Todo inline styles**: se mantiene la misma convención del Fase 1 (sin CSS externo, sin librerías de UI) para consistencia y portabilidad.
- **Stats en frontend**: el `successRate` en la barra de contexto se calcula en el cliente con los datos de la sesión activa. No es el mismo que `session.success_rate` del backend (que persiste en BD); es solo una vista inmediata para el estudiante.
- **Modal en lugar de página nueva**: no se añade enrutamiento (no hay `react-router`). El informe es un overlay simple que se cierra con "✕" o volviendo al chat.
- **Pestaña activa preservada**: si el padre abre el informe, cierra y lo vuelve a abrir, la pestaña se resetea a "overview". Comportamiento sencillo sin estado global.