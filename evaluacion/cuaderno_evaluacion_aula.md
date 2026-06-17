# OLIBOT — Cuaderno de evaluación en el aula

> Documento de registro para las sesiones de evaluación de OLIBOT en el centro.
> Rellenar **una copia por sesión**. Diseñado para anotar a mano o en digital durante
> la observación. Los datos se recogen de forma **anónima** (apodos o iniciales).

**TFM — María Emilia Núñez Guerrero · Universidad Carlos III de Madrid**
Supervisado por Dr. Javier Ignacio Carbó Rubiera.

---

## 0. Datos generales de la sesión

| Campo | Valor |
|-------|-------|
| Fecha | ____ / ____ / 2026 |
| Hora inicio – fin | ______ – ______ |
| Centro educativo | __________________________ |
| Aula / grupo | __________________________ |
| Tutora presente | __________________________ |
| Investigadora | María Emilia Núñez Guerrero |
| **Modalidad** | ☐ Individual (1 niño)  ☐ Pareja (2 niños) |
| Nº de niños en la sesión | ______ |
| Nº grupo OLIBOT | ______ |
| Nº grupo control (papel) | ______ |
| Nº de sesión (de la serie) | ______ de ______ |

---

## 1. Checklist técnico previo (uso interno de la investigadora)

La tablet y el montaje los aporta y configura la investigadora; **no es objeto de
evaluación**. Esta lista es solo para asegurar que todo funciona antes de empezar.

| Comprobación | OK |
|--------------|----|
| Backend arrancado con `--host 0.0.0.0 --port 5050` | ☐ |
| Tablet conectada a la misma red y `…:5173` carga | ☐ |
| `…:5050/health` responde desde la tablet | ☐ |
| Audio de OLIBOT audible (volumen) | ☐ |
| Permiso de micrófono concedido en el navegador | ☐ |
| Espacio tranquilo preparado | ☐ |

> Si "crear niño" falla pero el frontend carga: revisar (1) backend en `0.0.0.0`,
> (2) firewall del PC permitiendo el puerto 5050, (3) misma red WiFi.

---

## 2. Evaluación general del grupo (resumen de la sesión)

Visión de conjunto. Rellenar al terminar la sesión.

| Indicador global | Valor / observación |
|------------------|---------------------|
| Clima general del grupo | ☐ Muy positivo ☐ Positivo ☐ Neutro ☐ Difícil |
| ¿La mecánica se entendió sin explicación previa? | ☐ Sí ☐ Parcial ☐ No |
| ¿La voz (TTS) se entendió bien? | ☐ Sí ☐ Regular ☐ No |
| ¿El reconocimiento de voz (hablar) funcionó? | ☐ Bien ☐ Regular ☐ Mal |
| Nº total de intervenciones del adulto (toda la sesión) | ______ |
| Nivel de autonomía general | ☐ Alta ☐ Media ☐ Baja |
| Tiempo medio de atención por niño | ______ min |
| ¿Pidieron repetir/seguir voluntariamente? | ☐ Mucho ☐ Algo ☐ Nada |
| Saturación / cansancio al final | ☐ No ☐ Algunos ☐ Generalizado |

### 2.1 Solo si es sesión por **pareja**

OLIBOT tiene modo parejas (turnos alternos entre dos niños). Observar la dinámica.

| Indicador de pareja | Valor / observación |
|---------------------|---------------------|
| Apodos de la pareja | __________ y __________ |
| ¿Respetaron los turnos? | ☐ Sí ☐ Con ayuda ☐ No |
| ¿Se ayudaron / animaron entre ellos? | ☐ Mucho ☐ Algo ☐ Nada |
| ¿Hubo competencia o conflicto? | ☐ No ☐ Leve ☐ Sí |
| ¿Uno dominó sobre el otro? | ☐ No ☐ Algo ☐ Mucho (¿quién? ____) |
| Aprendizaje observado entre iguales | __________________________ |
| ¿Funcionó mejor que en individual? | ☐ Sí ☐ Igual ☐ No |

---

## 3. Métricas a medir (definición y registro grupal)

Las 6 métricas comprometidas en la presentación al centro. Para el detalle por niño,
ver la **Sección 5 (fichas individuales)**.

### 3.1 Atención sostenida
*Tiempo de interacción activa con OLIBOT, por sesión y por alumno.*

| Apodo/Inicial | Min. activos | ¿Se distrajo? (nº veces) | Notas |
|---------------|--------------|--------------------------|-------|
| | | | |
| | | | |
| | | | |
| | | | |

### 3.2 Rendimiento comparado (OLIBOT vs. papel)
*Actividades superadas con OLIBOT frente a fichas en papel equivalentes (grupo control).*

| Apodo/Inicial | Grupo (OLIBOT/Papel) | Actividades propuestas | Superadas | % |
|---------------|----------------------|------------------------|-----------|---|
| | | | | |
| | | | | |
| | | | | |
| | | | | |

### 3.3 Intervención del adulto
*Nº de veces que el docente o la investigadora intervienen para ayudar al niño.*

| Apodo/Inicial | Nº intervenciones | Motivo (técnico / pedagógico / emocional) |
|---------------|-------------------|-------------------------------------------|
| | | |
| | | |
| | | |
| | | |

### 3.4 Satisfacción del usuario
*Encuesta post-sesión con caras (😊 / 😐 / 🙁) y observación de actitud.*

| Apodo/Inicial | Cara elegida | Actitud observada | ¿Querría repetir? |
|---------------|--------------|-------------------|-------------------|
| | 😊 😐 🙁 | | ☐Sí ☐No |
| | 😊 😐 🙁 | | ☐Sí ☐No |
| | 😊 😐 🙁 | | ☐Sí ☐No |
| | 😊 😐 🙁 | | ☐Sí ☐No |

### 3.5 Velocidad de progresión
*Letras/sílabas nuevas superadas por sesión vs. línea base estimada por la tutora.*

| Apodo/Inicial | Nivel (color) | Contenidos nuevos superados | Línea base tutora | Δ |
|---------------|---------------|-----------------------------|-------------------|---|
| | | | | |
| | | | | |
| | | | | |
| | | | | |

### 3.6 Engagement voluntario
*Nº de veces que el niño pide «otra vez» o reintenta un trazo sin que se lo pidan.*

| Apodo/Inicial | "Otra vez" (nº) | Reintentos espontáneos | Señales de disfrute (sonrisa, ¡bien!, etc.) |
|---------------|-----------------|------------------------|---------------------------------------------|
| | | | |
| | | | |
| | | | |
| | | | |

---

## 4. Registro de popups / momentos clave de la app

Marcar cómo reaccionó el grupo a cada elemento de la interfaz. Útil para mejorar la UX.

| Elemento de OLIBOT | ¿Apareció? | Reacción de los niños | Notas |
|--------------------|-----------|------------------------|-------|
| Demostración automática del trazo | ☐ | ☐Atendió ☐Ignoró | |
| Trazado con puntos guía (nivel fácil) | ☐ | ☐Fácil ☐Difícil | |
| Subida de nivel (fácil→medio→difícil) | ☐ | | |
| Celebración / confeti (logro) | ☐ | ☐Le gustó ☐Indiferente | |
| Diálogo de maestría (🔄 / ⏭️ / 🎨) | ☐ | ¿Eligió bien? | |
| Selector de actividad (máx. 3 opciones) | ☐ | ¿Eligió solo? | |
| Botón 💪 "seguir con lo de ahora" | ☐ | | |
| Check-in emocional (caras) | ☐ | | |
| Indicador de evaluación (círculo naranja) | ☐ | | |
| Colorear / dibujo libre (descanso) | ☐ | ☐Lo pidió ☐No | |
| Saludo inicial por voz | ☐ | ¿Esperó al saludo? | |

---

## 5. Fichas individuales por niño

> Copiar este bloque tantas veces como niños haya. **Sin nombres reales**: usar apodo o
> iniciales elegidos por la tutora. En sesiones por pareja, rellenar una ficha por cada
> niño e indicar con quién formó pareja.

### 👦/👧 Niño — Apodo/Iniciales: __________  · Edad: ____  · Nivel (color): __________

| Campo | Registro |
|-------|----------|
| Modalidad | ☐ Individual ☐ Pareja (con: __________) |
| Grupo | ☐ OLIBOT ☐ Control (papel) |
| ¿Primera vez con OLIBOT? | ☐ Sí ☐ No (sesión nº ____) |
| Min. de atención activa | ______ |
| Actividades propuestas / superadas | ______ / ______ |
| Contenidos nuevos aprendidos | __________________________ |
| Nivel de pistas usado (más frecuente) | ☐ Guía completa ☐ Puntos clave ☐ Libre |
| Intervenciones del adulto | ______ (motivo: ____________) |
| "Otra vez" / reintentos espontáneos | ______ |
| Cara de satisfacción | 😊 😐 🙁 |
| Estado emocional observado | __________________________ |

**¿Qué se le dio bien?**
```
_______________________________________________________________________
```

**¿Qué le costó / dónde se atascó?**
```
_______________________________________________________________________
```

**¿Usó la voz para hablar con OLIBOT? ¿Cómo fue?**
```
_______________________________________________________________________
```

**Comentarios libres (anécdotas, frases del niño, actitud):**
```
_______________________________________________________________________
_______________________________________________________________________
```

---

### 👦/👧 Niño — Apodo/Iniciales: __________  · Edad: ____  · Nivel (color): __________

| Campo | Registro |
|-------|----------|
| Modalidad | ☐ Individual ☐ Pareja (con: __________) |
| Grupo | ☐ OLIBOT ☐ Control (papel) |
| ¿Primera vez con OLIBOT? | ☐ Sí ☐ No (sesión nº ____) |
| Min. de atención activa | ______ |
| Actividades propuestas / superadas | ______ / ______ |
| Contenidos nuevos aprendidos | __________________________ |
| Nivel de pistas usado (más frecuente) | ☐ Guía completa ☐ Puntos clave ☐ Libre |
| Intervenciones del adulto | ______ (motivo: ____________) |
| "Otra vez" / reintentos espontáneos | ______ |
| Cara de satisfacción | 😊 😐 🙁 |
| Estado emocional observado | __________________________ |

**¿Qué se le dio bien?**
```
_______________________________________________________________________
```

**¿Qué le costó / dónde se atascó?**
```
_______________________________________________________________________
```

**¿Usó la voz para hablar con OLIBOT? ¿Cómo fue?**
```
_______________________________________________________________________
```

**Comentarios libres (anécdotas, frases del niño, actitud):**
```
_______________________________________________________________________
_______________________________________________________________________
```

---

### 👦/👧 Niño — Apodo/Iniciales: __________  · Edad: ____  · Nivel (color): __________

| Campo | Registro |
|-------|----------|
| Modalidad | ☐ Individual ☐ Pareja (con: __________) |
| Grupo | ☐ OLIBOT ☐ Control (papel) |
| ¿Primera vez con OLIBOT? | ☐ Sí ☐ No (sesión nº ____) |
| Min. de atención activa | ______ |
| Actividades propuestas / superadas | ______ / ______ |
| Contenidos nuevos aprendidos | __________________________ |
| Nivel de pistas usado (más frecuente) | ☐ Guía completa ☐ Puntos clave ☐ Libre |
| Intervenciones del adulto | ______ (motivo: ____________) |
| "Otra vez" / reintentos espontáneos | ______ |
| Cara de satisfacción | 😊 😐 🙁 |
| Estado emocional observado | __________________________ |

**¿Qué se le dio bien?**
```
_______________________________________________________________________
```

**¿Qué le costó / dónde se atascó?**
```
_______________________________________________________________________
```

**¿Usó la voz para hablar con OLIBOT? ¿Cómo fue?**
```
_______________________________________________________________________
```

**Comentarios libres (anécdotas, frases del niño, actitud):**
```
_______________________________________________________________________
_______________________________________________________________________
```

---

### 👦/👧 Niño — Apodo/Iniciales: __________  · Edad: ____  · Nivel (color): __________

| Campo | Registro |
|-------|----------|
| Modalidad | ☐ Individual ☐ Pareja (con: __________) |
| Grupo | ☐ OLIBOT ☐ Control (papel) |
| ¿Primera vez con OLIBOT? | ☐ Sí ☐ No (sesión nº ____) |
| Min. de atención activa | ______ |
| Actividades propuestas / superadas | ______ / ______ |
| Contenidos nuevos aprendidos | __________________________ |
| Nivel de pistas usado (más frecuente) | ☐ Guía completa ☐ Puntos clave ☐ Libre |
| Intervenciones del adulto | ______ (motivo: ____________) |
| "Otra vez" / reintentos espontáneos | ______ |
| Cara de satisfacción | 😊 😐 🙁 |
| Estado emocional observado | __________________________ |

**¿Qué se le dio bien?**
```
_______________________________________________________________________
```

**¿Qué le costó / dónde se atascó?**
```
_______________________________________________________________________
```

**¿Usó la voz para hablar con OLIBOT? ¿Cómo fue?**
```
_______________________________________________________________________
```

**Comentarios libres (anécdotas, frases del niño, actitud):**
```
_______________________________________________________________________
_______________________________________________________________________
```

---

### 👦/👧 Niño — Apodo/Iniciales: __________  · Edad: ____  · Nivel (color): __________

| Campo | Registro |
|-------|----------|
| Grupo | ☐ OLIBOT ☐ Control (papel) |
| ¿Primera vez con OLIBOT? | ☐ Sí ☐ No (sesión nº ____) |
| Min. de atención activa | ______ |
| Actividades propuestas / superadas | ______ / ______ |
| Contenidos nuevos aprendidos | __________________________ |
| Nivel de pistas usado (más frecuente) | ☐ Guía completa ☐ Puntos clave ☐ Libre |
| Intervenciones del adulto | ______ (motivo: ____________) |
| "Otra vez" / reintentos espontáneos | ______ |
| Cara de satisfacción | 😊 😐 🙁 |
| Estado emocional observado | __________________________ |

**¿Qué se le dio bien?**
```
_______________________________________________________________________
```

**¿Qué le costó / dónde se atascó?**
```
_______________________________________________________________________
```

**¿Usó la voz para hablar con OLIBOT? ¿Cómo fue?**
```
_______________________________________________________________________
```

**Comentarios libres (anécdotas, frases del niño, actitud):**
```
_______________________________________________________________________
_______________________________________________________________________
```

---

## 6. Grupo control (papel) — registro paralelo

Para la comparación de rendimiento (métrica 3.2). Mismas actividades en ficha de papel.

| Apodo/Inicial | Edad | Actividad en papel | Superada | Min. atención | Ayuda del adulto |
|---------------|------|--------------------|----------|---------------|------------------|
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |

**Observaciones del grupo control:**
```
_______________________________________________________________________
_______________________________________________________________________
```

---

## 7. Incidencias técnicas de la sesión

| Hora | Incidencia | Dispositivo | ¿Resuelta? | Cómo |
|------|-----------|-------------|------------|------|
| | | | ☐Sí ☐No | |
| | | | ☐Sí ☐No | |
| | | | ☐Sí ☐No | |

---

## 8. Feedback de la tutora (cuestionario breve)

| Pregunta | Respuesta |
|----------|-----------|
| ¿La actividad encaja con lo que trabajáis en clase? | ☐Mucho ☐Algo ☐Poco |
| ¿Los niños estuvieron motivados? | ☐Mucho ☐Algo ☐Poco |
| ¿OLIBOT te liberó tiempo para atender a otros? | ☐Sí ☐Algo ☐No |
| ¿Repetirías la experiencia? | ☐Sí ☐Quizá ☐No |
| ¿Qué mejorarías? | ____________________________ |
| Comentario libre | ____________________________ |

---

## 9. Síntesis cualitativa de la sesión (investigadora)

**Lo que mejor funcionó:**
```
_______________________________________________________________________
_______________________________________________________________________
```

**Lo que peor funcionó / a mejorar:**
```
_______________________________________________________________________
_______________________________________________________________________
```

**Frases o reacciones destacadas de los niños:**
```
_______________________________________________________________________
_______________________________________________________________________
```

**Decisiones / cambios para la próxima sesión:**
```
_______________________________________________________________________
_______________________________________________________________________
```

---

## Anexo A — Referencia rápida de niveles (colores)

| Color | Edad | Contenidos | Línea base curricular (Decreto 36/2022) |
|-------|------|------------|------------------------------------------|
| 🟡 Amarillo | 3 años | Trazos pregráficos (líneas, curvas, zigzag, círculo) + vocales A, E | Pre-grafomotricidad |
| 🟢 Verde | 4 años | Todas las vocales, consonantes m·l·s·p·t, números 1–5 | Vocales y primeras consonantes |
| 🔵 Azul | 5 años | Consonantes n·d·r·f, sílabas directas (ma, me…), palabras | Sílabas y palabras |
| 🔴 Rojo | 6 años | Sílabas inversas (as, es…) y complejas (bra, tra…), palabras, frases | Consolidación lectoescritura |

> A los niños **no se les muestra la edad**, solo el color. La dificultad del trazo
> (guía completa → puntos clave → libre) se ajusta automáticamente con el acierto.

## Anexo B — Escala de pistas (scaffolding)

1. **Guía completa** — todos los puntos del trazo visibles (nivel fácil).
2. **Puntos clave** — solo inicio y fin de cada trazo (nivel medio/difícil).
3. **Demostración** — OLIBOT muestra el trazo completo antes de que el niño lo intente.

OLIBOT **nunca da la respuesta** sin que el niño lo intente primero.

## Anexo C — Datos que registra automáticamente la app

- Número de intentos por actividad.
- Nivel de pistas solicitadas.
- Tiempo de sesión.

Ningún dato permite identificar individualmente al alumno (apodos/iniciales). Sin
grabación de audio: el reconocimiento de voz se procesa en el navegador.
