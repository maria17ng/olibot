# Fase 7 — Diseño Pedagógico Adaptativo por Edad

> Decisiones de diseño acordadas antes de la implementación.  
> Base: Decreto 36/2022 (Comunidad de Madrid), método sintético-fonético, uso autónomo en casa.

---

## Principio central

```
student.age  →  MODO DE INTERACCIÓN  (cómo habla OLIBOT, si hay chat libre, duración)
mastery      →  CONTENIDO            (qué temas se presentan, avance por ZDP)
```

La edad controla **cómo** aprende el niño. La mastery controla **qué** aprende.  
Un niño de 3 años que domina todos los trazos pregráficos accede a las vocales, pero sigue en "modo 3 años" de interacción.

---

## Perfil 3 años — Modo guiado total

| Aspecto | Decisión |
|---------|----------|
| **Interacción** | OLIBOT dirige. Sin campo de texto ni botón de micrófono. Solo canvas + audio. |
| **Duración** | ~5-7 min · máx. 4 turnos por sesión |
| **Contenido** | Trazos pregráficos → Reconocimiento de vocales por sonido (sin trazado) |
| **Canvas** | Siempre visible. `hintLevel` fijo a 3 (máxima guía). |
| **Lenguaje agente** | Máx. 3 palabras + emoji. Nunca preguntas complejas. |
| **Sin placement test** | A los 3 años no tiene sentido un test escrito. Empieza siempre por trazos pregráficos. |

### Trazos pregráficos (topics min_age=3)

| Topic ID | Descripción | Prepara para |
|----------|-------------|-------------|
| `trazo_linea_h` | Línea horizontal → | Letras: E, F, H, L, T |
| `trazo_linea_v` | Línea vertical ↓ | Letras: B, D, E, F, H, I, L, P, R, T |
| `trazo_curva` | Curva suave ~ | Letras: C, G, O, Q, S, U |
| `trazo_zigzag` | Zigzag ∧∨ | Letras: M, N, W, Z |
| `trazo_circulo` | Círculo ○ | Letras: a, d, g, o, q |
| `trazo_angulo` | Ángulo ∧ | Letras: A, K, V, X, Y |

Prerequisitos: ninguno (son el punto de entrada del currículo).

---

## Perfil 4 años — Modo cuadernillo guiado

| Aspecto | Decisión |
|---------|----------|
| **Interacción** | OLIBOT propone. El niño responde por voz o texto. Campo de micrófono como canal principal. |
| **Duración** | ~10-15 min · máx. 8 turnos por sesión |
| **Contenido** | Vocales mayúsculas → Vocales minúsculas → Consonantes fase 1 (m, l, s, p) → Números 1-10 |
| **Actividades** | Trazado + pregunta de reconocimiento simple |
| **Placement test** | 3 preguntas al inicio de la 1ª sesión (si no hay historial de mastery) |
| **Lenguaje agente** | 1 frase corta + pregunta simple. Sin vocabulario complejo. |

### Placement test — 4 años (3 preguntas)

```
P1: "¿Qué letra es esta? [muestra A grande]"
    → Acierta → vocal_a marcada como dominada
    → Falla   → empieza por vocal_a normalmente

P2: "¿Cuántos dedos hay aquí? [muestra ✋]"
    → Acierta → numero_5 marcado como dominado
    → Falla   → empieza por numero_1

P3: "¿Qué letra es esta? [muestra M grande]"
    → Acierta → consonante_m marcada como dominada
    → Falla   → consonante_m sin marcar
```

---

## Perfil 5 años — Modo chat estructurado

| Aspecto | Decisión |
|---------|----------|
| **Interacción** | Chat libre. El niño puede preguntar e interrumpir. OLIBOT propone pero no obliga. |
| **Duración** | ~15-20 min · máx. 12 turnos por sesión |
| **Contenido** | Consonantes fase 2 (t, n, d, f, r) → Sílabas → Palabras bisílabas |
| **Placement test** | 4 preguntas al inicio (vocales + consonantes básicas + número) |
| **Lenguaje agente** | 1-2 frases. Puede preguntar sobre palabras. |

### Actividad de sílabas (Opción C acordada)

Flujo multi-paso para topic `silaba_ma`:
```
1. OLIBOT: "¡Vamos a juntar letras! Primero la M..." → topic cambia a consonante_m → niño traza M
2. OLIBOT: "¡Ahora la A!" → topic cambia a vocal_a → niño traza A
3. OLIBOT: "¿Qué dicen juntas? M...A...?" → niño responde por voz: "ma"
4. OLIBOT celebra → topic de sílaba marcado como dominado
```

### Actividad de palabras (Opción D acordada)

Topic `palabra_mama`:
- OLIBOT muestra emoji 👩 + la palabra "mamá" escrita
- Pregunta: "¿Qué pone aquí?"
- El niño responde por voz
- Sin canvas (charData = null)

---

## Avance entre niveles

| Condición | Resultado |
|-----------|-----------|
| `age=3` + domina todos los `trazo_*` | Accede a vocales (en modo reconocimiento sonoro) |
| `age=4` + domina vocales + consonantes fase 1 + nums | Accede a contenido de 5 años si mastery lo permite |
| `age=5` + domina consonantes fase 2 | Accede a sílabas y palabras |
| Cualquier edad | `age` controla el modo de interacción — nunca cambia automáticamente |

---

## Cambios de comunicación del agente por edad

| Edad | Regla estricta |
|------|---------------|
| 3 años | Máx. 3 palabras + emoji. Sin preguntas. Sin referencias a lectura o escritura compleja. Ej: *"¡Muy bien! 🌟"* |
| 4 años | 1 frase + 1 pregunta de sí/no. Sin vocabulario abstracto. Ej: *"¡La A dice AAA! ¿Trazamos la E? 🐘"* |
| 5 años | 1-2 frases. Puede mencionar palabras. Ej: *"¡Genial! La M de mamá. ¿Qué más empieza por M?"* |

**Prohibiciones para todas las edades:**
- No usar palabras en inglés
- No mencionar "mayúscula", "minúscula", "cursiva" a los 3-4 años
- No hacer preguntas de más de una parte
- No comparar con cómo se escribe "en el cole"

---

## Arquitectura de implementación

### Ficheros modificados

| Fichero | Cambio |
|---------|--------|
| `curriculum.py` | Campo `min_age`, nuevos topics, `get_next_topic(beliefs, age)` |
| `nlu.py` | Intent `tracing_complete` + `placement_answer` |
| `nlg.py` | Perfiles de comunicación estrictos por edad |
| `bdi_bridge.py` | Fix bug CURRICULUM, plan `tracing_complete`, placement test en greet |
| `session_manager.py` | Pasar `student.age` a curriculum y BDI |
| `letterData.js` | Datos de trazos pregráficos + TOPIC_MAP |
| `ChatWindow.jsx` | Modo por edad, sin input para 3 años, contador de turnos |

### Bugs corregidos en esta fase

| Bug | Fichero | Línea |
|-----|---------|-------|
| `CURRICULUM` no importado → `NameError` en `request_specific_topic` | `bdi_bridge.py` | ~338 |
| Trazado con 100% pasa por flujo de `attempt_answer` genérico | `bdi_bridge.py` + `nlu.py` | varios |
| NLG genera respuestas inadecuadas para la edad (inglés, "cursiva"...) | `nlg.py` | PERSONA_PROMPT |
| `hintLevel` se calcula con SR de sesión global, no por topic | `ChatWindow.jsx` | ~186 |
