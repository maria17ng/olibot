# Resultados de las 6 métricas — Sesión 24/06/2026

> Análisis de los datos de la evaluación en el Colegio Gregorio Canella.
> N=4 niños (3, 4, 5 y 6 años). Primera sesión individual con OLIBOT.
> Este documento sintetiza los datos cuantitativos y cualitativos recogidos
> para redactar el capítulo de resultados del TFM.

---

## Resumen ejecutivo

| Métrica | Resultado global |
|---------|-----------------|
| 1. Atención sostenida | Media 20,5 min (rango 17–29). Sorprendente: el niño más pequeño aguantó más tiempo. |
| 2. Rendimiento | Media ~68 % de actividades superadas. Correlación inversa con edad para esta muestra. |
| 3. Intervención del adulto | Media 2,25 intervenciones/sesión; la mayoría técnicas, no pedagógicas. |
| 4. Satisfacción | 😊 en los 4 niños. 100 % querría repetir. |
| 5. Velocidad de progresión | Sin línea base de tutora disponible — análisis cualitativo únicamente. |
| 6. Engagement voluntario | 2 de 4 niños mostraron reintentos espontáneos. |

---

## Métrica 1 — Atención sostenida

### Datos

| Apodo | Edad | Hora inicio | Hora fin | Total min | Min escritura | Min pintura | Distracciones |
|-------|------|-------------|----------|-----------|---------------|-------------|---------------|
| Héctor | 6 | 9:31 | 9:49 | 18 | ~18 | 0 (incluido en sesión activa) | ~3 |
| Cayetana | 5 | 10:02 | 10:19 | 17 | ~14 | ~3 | ~1 |
| Ángela | 4 | 10:35 | 10:53 | 18 | ~5 | ~13 | ~1 |
| Oliver | 3 | 11:39 | 12:08 | 29 | ~27 | ~2 | ~0 |

**Media:** 20,5 min · **Mediana:** 18 min · **Desviación:** ±5,1 min

### Análisis

El dato más llamativo es la relación **inversa** entre edad y duración de la sesión:
Oliver (3 años) dobló el tiempo de Cayetana (5 años, la más breve). Esto no significa
que los niños más pequeños mantengan mayor atención en general, sino que apunta a
factores contextuales específicos:

- **Nivel de dificultad ajustado:** Oliver trabajó trazos pregráficos (nivel Verde),
  que son exactamente su ZDP. Cayetana y Héctor trabajaron letras nivel Rojo, con mayor
  componente de frustración.

- **Impacto de las animaciones a edades tempranas:** las animaciones del canvas
  y los círculos verdes guía provocaron una reacción emocional intensa en Oliver
  ("le flipan"). Este efecto es conocido en diseño de juegos para niños pequeños y
  está alineado con el marco pedagógico de OLIBOT.

- **La pintura no interrumpe la sesión pero sí la escritura:** Ángela pasó a pintar
  a los 5 minutos. Sus 18 min totales incluyen 13 min de pintura. Si se mide
  "atención sostenida a la escritura", Ángela tiene el valor más bajo (~5 min).

### Interpretación para el TFM

Atención sostenida media de ~20 min en una primera sesión con una aplicación nueva
es un resultado positivo para la franja 3-6 años, donde los periodos de atención
esperados son de 5-15 minutos según la literatura (Ruff & Capozzoli, 2003).

---

## Métrica 2 — Rendimiento (actividades superadas)

### Datos

| Apodo | Edad | Nivel | Actividades propuestas | Superadas | % | Contenidos nuevos |
|-------|------|-------|------------------------|-----------|---|-------------------|
| Oliver | 3 | Verde | ~5 | ~5 | 100 % | Línea recta, curva, l, 2, 3 |
| Héctor | 6 | Rojo | ~5 | ~4 | 80 % | Letras básicas nivel rojo; 4 ejercicios pintura |
| Cayetana | 5 | Rojo | ~5 | ~3 | 60 % | a, as, l |
| Ángela | 4 | Rojo | ~3 | ~1 | 33 % | A (nivel rojo) |

**Media:** ~68 % · Sin grupo control en esta sesión.

### Análisis

La variabilidad es alta y hay dos factores de confusión:

1. **Ángela pasó principalmente a pintar**, lo que reduce artificialmente sus
   actividades curriculares contabilizadas. Sus capacidades reales están
   por encima del grupo de edad esperado (estaba en nivel Rojo con 4 años).

2. **Oliver en su nivel óptimo:** el 100 % de éxito de Oliver es consistente con
   estar en el nivel correcto de dificultad (Verde, pre-grafomotricidad),
   no con que sea "más listo". Si se le hubiera puesto en nivel Rojo, el porcentaje
   habría sido mucho menor.

3. **Sin grupo control:** no se puede comparar con fichas de papel en esta sesión.
   Héctor verbalizó espontáneamente que prefería OLIBOT a las fichas (comparación
   informal de satisfacción, no de rendimiento).

### Para el TFM

Se presentarán los datos como **resultados descriptivos de primera sesión**,
con la caveat de que N=4 y sin grupo control no permite inferencia estadística.
La comparación OLIBOT vs. papel se reserva para sesiones posteriores con grupo control.

---

## Métrica 3 — Intervención del adulto

### Datos

| Apodo | Edad | Nº intervenciones | Motivo principal | Autonomía observada |
|-------|------|------------------|------------------|---------------------|
| Héctor | 6 | ~3 | Técnico + pedagógico | Media |
| Cayetana | 5 | ~2 | Pedagógico (cambio de actividad) | Alta |
| Ángela | 4 | ~2 | Técnico (nivel) + pedagógico (demo botones) | Alta |
| Oliver | 3 | ~2 | Técnico (configuración nivel) | Alta |

**Media:** 2,25 intervenciones/sesión

### Análisis

El número de intervenciones es llamativamente bajo, especialmente para niños de 3-4 años.
La mayoría fueron **intervenciones técnicas** (configurar el nivel de inicio correcto
en la primera sesión) — no intervenciones por confusión con la interfaz o el agente.

Esto es un indicador positivo: una vez configurado el nivel inicial, los cuatro niños
interactuaron con OLIBOT de forma autónoma. El agente gestionó la interacción pedagógica
sin necesitar apoyo adulto.

La única intervención pedagógica relevante fue con Cayetana: la investigadora cambió
la actividad cuando Cayetana se saturó de la letra 'l'. Esto indica que el mecanismo
de cambio de actividad del propio OLIBOT (ActivityPicker) no se activó a tiempo,
o que el adulto intervino preventivamente antes de que OLIBOT detectara el cansancio.

### Interpretación

Para el TFM, la intervención del adulto como métrica sirve como **indicador inverso
de autonomía**. Un sistema ITS/agente pedagógico bien calibrado debería reducir la
necesidad de mediación adulta. Con 2,25 intervenciones/sesión de media, el resultado
es favorable, aunque la muestra es muy pequeña para generalizar.

---

## Métrica 4 — Satisfacción del usuario

### Datos cuantitativos

| Apodo | Cara post-sesión | ¿Querría repetir? |
|-------|-----------------|-------------------|
| Héctor | 😊 | Sí ("le gusta para después") |
| Cayetana | 😊 | Sí |
| Ángela | 😊 | Sí |
| Oliver | 😊 | Sí |

**Satisfacción positiva: 4/4 (100 %)**

### Datos cualitativos

| Apodo | Evidencia verbal/conductual de satisfacción |
|-------|---------------------------------------------|
| Héctor | Verbalizó preferencia por OLIBOT sobre papel ("más divertido"). Elogió explícitamente el TTS. |
| Cayetana | Rió durante las preguntas del agente. Actitud tranquila y positiva durante toda la sesión. |
| Ángela | Preguntó si podría tener matemáticas (engagement en el contenido). Aprendió botones en 1 demo. |
| Oliver | "Dice que le gusta." Volvió a actividades después de 2 min de pintura. Verbalizó disfrute. |

### Análisis

El 100 % de satisfacción positiva con una cara no es sorprendente para una primera sesión
con una aplicación novedosa (efecto novedad). Sin embargo, la evidencia cualitativa es
más robusta: tres de los cuatro niños verbalizaron satisfacción o mostraron conductas
de engagement espontáneo (Cayetana siendo la excepción con actitud positiva no verbal).

La escala de 3 caras (😊/😐/🙁) puede ser demasiado simple para captar matices:
Héctor mostró frustración con el tutorial pero satisfacción global. Una escala de 5 puntos
o una entrevista post-sesión adaptada a la edad podría capturar más granularidad.

---

## Métrica 5 — Velocidad de progresión

### Estado de la métrica

**Esta métrica no se puede calcular completamente en esta sesión** por ausencia de
línea base de la tutora (progresión esperada por el método de aula sin OLIBOT).

Lo que sí se puede registrar: contenidos nuevos superados por sesión.

| Apodo | Edad | Contenidos nuevos en 1 sesión |
|-------|------|-------------------------------|
| Oliver | 3 | 5 contenidos (línea recta, curva, l, 2, 3) |
| Héctor | 6 | 4+ contenidos (letras nivel rojo) |
| Cayetana | 5 | 3 contenidos (a, as, l) |
| Ángela | 4 | 1 contenido curricular + exploración del sistema |

### Nota metodológica

Para futuras sesiones, la metodología correcta es:

1. Solicitar a la tutora la línea base de progresión media del grupo (contenidos
   nuevos por semana con el método de aula estándar).
2. Calcular el ratio: (contenidos nuevos con OLIBOT) / (contenidos nuevos esperados
   en el mismo tiempo sin OLIBOT).
3. Comparar con el grupo control (fichas de papel).

Un ratio > 1 indica aceleración de la progresión.

---

## Métrica 6 — Engagement voluntario

### Datos

| Apodo | "Otra vez" / reintentos espontáneos | Señales de disfrute |
|-------|-------------------------------------|---------------------|
| Héctor | ✅ Usó el botón de repetir de forma autónoma | Elogió el TTS; completó 4 ejercicios de pintura |
| Oliver | ✅ Volvió a los números 2 y 3 por iniciativa propia | "Le flipan" animaciones y círculos; entiende el sistema de estrellas |
| Cayetana | ❌ 0 reintentos observados | Actitud positiva; sin engagement activo espontáneo |
| Ángela | ❌ 0 reintentos en escritura (prefirió pintar) | Pidió matemáticas (curiosidad por expandir contenido) |

**Engagement voluntario: 2/4 niños (50 %)**

### Análisis

El engagement voluntario es la métrica más directamente vinculada a la motivación
intrínseca. Los dos casos positivos son llamativos:

- **Héctor** descubrió el botón de repetir por su cuenta y lo usó, lo que indica
  comprensión del sistema de interacción y deseo de mejorar.
- **Oliver** volvió a los números 2 y 3 sin que nadie se lo indicara, lo que
  en un niño de 3 años es un indicador muy fuerte de motivación.

Los dos casos neutros (Cayetana y Ángela) no deben interpretarse como falta de
satisfacción: Cayetana mostró satisfacción pasiva y Ángela canalizó su curiosidad
hacia el contenido (petición de matemáticas), que es otra forma de engagement.

---

## Síntesis de resultados y patrones identificados

### Patrón 1 — El nivel correcto determina el engagement

Oliver (100 % rendimiento, 29 min de atención, engagement voluntario) es el
ejemplo más claro: cuando el nivel es exactamente el de la ZDP del niño, todos
los indicadores mejoran. El motor de scaffolding y el assessment engine tienen
su justificación empírica aquí.

### Patrón 2 — La pintura compite con la escritura en edades tempranas

Ángela pasó de escritura a pintura en 5 minutos. Esto no es un fallo del sistema:
el ColoringCanvas es parte del diseño pedagógico (descanso adaptativo, Fase 10).
Sin embargo, el equilibrio escritura/pintura necesita gestión: actualmente la opción
de pintar está siempre disponible cuando el niño indica cansancio, y los niños de
3-4 años la prefieren sobre la escritura sistemáticamente.

### Patrón 3 — El TTS es el componente más valorado, el check-in emocional el menos

Dos extremos opuestos del diseño de interacción. El TTS recibió el único feedback
explícitamente positivo (Héctor). El check-in emocional recibió el único feedback
explícitamente negativo (Héctor). Hay una tensión entre el valor pedagógico de
registrar el estado emocional y la experiencia del niño al que se interrumpe
para preguntarle cómo se siente.

### Patrón 4 — El tutorial se aprende en la primera exposición

Ángela atendió al tutorial la 1ª vez y lo ignoró en la 2ª; Héctor lo saltaba
porque "ya se lo sabe". El mecanismo de skipear el tutorial existe (overlay
semitransparente desde Fase 9 #19) pero Héctor no lo descubrió intuitivamente.
Esto sugiere que el skip necesita ser más visible o activarse por defecto en la
2ª exposición.

### Patrón 5 — Los niños eligen actividad por preferencia, no por recomendación

En el selector de dibujo (ColoringCanvas), los niños eligieron el dibujo que más
les gustaba visualmente, ignorando la recomendación curricular del agente. Esto
es esperable para la edad (pensamiento concreto preoperacional, Piaget) y sugiere
que la selección curricular de dibujos debería ser invisible para el niño,
asignándose automáticamente en segundo plano.

---

## Consideraciones para el TFM

### Lo que estos datos permiten afirmar

1. OLIBOT es **técnicamente usable** en un entorno de aula real con tablets
   en red local (todos los niños interactuaron sin fallos técnicos tras la
   configuración inicial).
2. La **satisfacción subjetiva fue alta** en la primera sesión (4/4 positiva).
3. El **tiempo de atención media (~20 min) supera el límite inferior** para esta
   franja de edad según la literatura.
4. La **autonomía fue alta** (2,25 intervenciones del adulto/sesión, mayoría técnicas).

### Lo que estos datos NO permiten afirmar

1. **Eficacia de aprendizaje:** sin grupo control ni pre/post-test no se puede
   demostrar que OLIBOT acelera el aprendizaje de la lectoescritura.
2. **Generalización:** N=4 en una sesión única no es representativa de la población
   de Educación Infantil.
3. **Sostenibilidad del engagement:** el efecto novedad inflará los resultados
   en la primera sesión; necesario medir en sesiones posteriores.

### Recomendaciones para futuras sesiones

- Exportar logs de `ActivityModel` de SQLite tras cada sesión para tener datos
  cuantitativos precisos (actividades, intentos, tiempos de respuesta).
- Recoger la línea base de la tutora antes de cada sesión.
- Incluir grupo control (fichas de papel) para la métrica de rendimiento.
- Diseñar un pre-test y post-test de contenidos para medir aprendizaje real.
- Aplicar al menos 3 sesiones por niño para medir evolución temporal.
