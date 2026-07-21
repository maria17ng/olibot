# Fase 13 — Evaluación en el aula (junio 2026)

> Documento de metodología y resultados de la primera sesión de evaluación
> de OLIBOT con niños reales en el Colegio Gregorio Canella (Madrid).
> Cubre el diseño del protocolo, la ejecución y los hallazgos cualitativos.
> Para los datos brutos por niño ver `evaluacion/sesion_2026-06-24_Gregorio_Canella.md`.

---

## Índice

1. [Contexto y objetivos de la evaluación](#1-contexto-y-objetivos-de-la-evaluación)
2. [Diseño metodológico](#2-diseño-metodológico)
3. [Participantes](#3-participantes)
4. [Protocolo de sesión](#4-protocolo-de-sesión)
5. [Las 6 métricas de observación](#5-las-6-métricas-de-observación)
6. [Resultados por métrica](#6-resultados-por-métrica)
7. [Hallazgos cualitativos transversales](#7-hallazgos-cualitativos-transversales)
8. [Mejoras identificadas en esta fase](#8-mejoras-identificadas-en-esta-fase)
9. [Limitaciones del estudio](#9-limitaciones-del-estudio)
10. [Próximos pasos](#10-próximos-pasos)

---

## 1. Contexto y objetivos de la evaluación

### Pregunta de investigación

¿Puede un agente pedagógico híbrido BDI-LLM como OLIBOT generar engagement sostenido
y aprendizaje observable en niños de Educación Infantil (3-6 años) en un entorno de aula real?

### Objetivos específicos de esta fase

1. Verificar que el sistema es técnicamente operable en un contexto escolar real
   (tablet en misma red, sin técnico presente).
2. Medir la atención sostenida, el rendimiento, la autonomía y la satisfacción
   sobre la muestra disponible.
3. Identificar fallos de UX e interacción no detectables en laboratorio.
4. Obtener feedback cualitativo del entorno escolar (observación directa).

---

## 2. Diseño metodológico

### Tipo de estudio

Estudio exploratorio de caso múltiple. Observación participante con registro sistemático
en cuaderno de campo estructurado.

Dado el carácter de TFM y el acceso limitado a participantes en contexto escolar,
la muestra es intencionada y pequeña (N=4). Los resultados son de naturaleza
**cualitativa y descriptiva**: no se busca significación estadística sino identificar
patrones de comportamiento, problemas de usabilidad y señales de aprendizaje.

### Diseño de la sesión

- **Modalidad:** individual (1 niño por sesión), sin grupo control en esta sesión.
- **Duración:** sesiones de 15-30 minutos (variable según la edad y la atención del niño).
- **Espacio:** aula o sala tranquila del centro, aportada por el colegio.
- **Hardware:** tablet aportada por la investigadora + PC con backend en la misma red WiFi.
- **Observadora:** la investigadora tomó notas de campo en tiempo real en cuaderno manuscrito.

### Variables observadas

| Variable | Tipo | Instrumento |
|----------|------|-------------|
| Atención sostenida | Cuantitativa (min.) | Cronómetro + observación directa |
| Actividades superadas | Cuantitativa | Log de sesión OLIBOT |
| Intervenciones del adulto | Cuantitativa | Recuento directo |
| Satisfacción | Ordinal (3 caras) | Autovaloración del niño |
| Engagement voluntario | Cuantitativa | Recuento de "otra vez" + reintentos |
| Respuesta a elementos UI | Cualitativa | Observación y notas de campo |

---

## 3. Participantes

Cuatro niños del Colegio Gregorio Canella (Madrid), aula de Educación Infantil.
Seleccionados por la orientadora del centro (Lola) con criterio de variedad de edad.
Todos participaron voluntariamente. Los nombres son los reales usados durante la sesión
(entorno informal); en el TFM se usarán iniciales o pseudónimos.

| Apodo | Edad | Nivel asignado | Hora sesión | Duración |
|-------|------|----------------|-------------|----------|
| Héctor | 6 a. | Rojo (automático → azul → rojo) | 9:31–9:49 | 18 min |
| Cayetana | 5 a. | Rojo (nivel automático) | 10:02–10:19 | 17 min |
| Ángela | 4 a. | Rojo (asignado por investigadora) | 10:35–10:53 | 18 min |
| Oliver | 3 a. | Verde (nivel verde-verde) | 11:39–12:08 | 29 min |

> **Nota sobre los niveles:** el sistema de niveles de OLIBOT usa colores sin
> referencia explícita a la edad (diseño acordado en Fase 10, mejora #8A).
> Amarillo = 3 años, Verde = 4 años, Azul = 5 años, Rojo = 6 años.
> Ángela (4 años) se situó en nivel Rojo porque reconocía la letra A y demostró
> capacidades por encima de su grupo de edad. Héctor (6 años) empezó en nivel
> automático y el sistema lo escaló a azul y finalmente a rojo.

---

## 4. Protocolo de sesión

### Preparación técnica (checklist pre-sesión)

1. Backend arrancado con `--host 0.0.0.0 --port 5050` (acceso desde tablet en red local).
2. Tablet conectada a la misma red WiFi que el PC.
3. Verificación de `http://IP_PC:5050/health` desde la tablet (ver Fase 12 #5).
4. Permiso de micrófono concedido en el navegador de la tablet.
5. Volumen del TTS ajustado al aula.

### Secuencia de la sesión

1. **Presentación de OLIBOT** (1-2 min): la investigadora presenta la tablet al niño
   sin explicar el funcionamiento — se observa qué entiende de forma autónoma.
2. **Interacción libre con guía mínima** (15-25 min): la investigadora solo interviene
   si el niño está completamente bloqueado o lo solicita. Se registra cada intervención.
3. **Valoración post-sesión** (1-2 min): el niño elige una cara (😊 😐 🙁) para expresar
   su satisfacción, y la investigadora anota su actitud general.

---

## 5. Las 6 métricas de observación

Acordadas con el centro escolar en la reunión con la directora y la orientadora (Fase 10).

| # | Métrica | Qué mide |
|---|---------|---------|
| 1 | **Atención sostenida** | Minutos de interacción activa (excluye esperas y pintura libre) |
| 2 | **Rendimiento** | Actividades curriculares superadas por sesión |
| 3 | **Intervención del adulto** | Nº de ayudas del adulto — indicador inverso de autonomía |
| 4 | **Satisfacción** | Autovaloración con escala de caras |
| 5 | **Velocidad de progresión** | Contenidos nuevos superados por sesión |
| 6 | **Engagement voluntario** | Nº de veces que el niño pide "otra vez" o reintenta espontáneamente |

---

## 6. Resultados por métrica

### 6.1 Atención sostenida

| Apodo | Edad | Min. activos | Distracciones (est.) |
|-------|------|--------------|----------------------|
| Oliver | 3 a. | 29 | ~0 |
| Héctor | 6 a. | 18 | ~3 |
| Ángela | 4 a. | 18 (~5 escritura + ~13 pintura) | ~1 |
| Cayetana | 5 a. | 17 | ~1 |

**Media:** 20,5 min · **Rango:** 17–29 min

El resultado más llamativo es Oliver (3 años): el niño más pequeño sostuvo la mayor
atención. Esto puede explicarse por la novedad del sistema para él y por el alto impacto
de las animaciones en edades tempranas. Héctor (6 años) mostró más impaciencia con el
tutorial pero mantuvo el engagement en las actividades.

### 6.2 Rendimiento (actividades superadas)

| Apodo | Propuestas | Superadas | % | Contenidos nuevos |
|-------|-----------|-----------|---|-------------------|
| Oliver | ~5 | ~5 | 100 % | Línea recta, curva, l, 2, 3 |
| Héctor | ~5 | ~4 | 80 % | Letras básicas nivel rojo; 4 ejercicios pintura |
| Cayetana | ~5 | ~3 | 60 % | a, as, l |
| Ángela | ~3 | ~1 | 33 % | A (nivel rojo) |

> **Nota:** "Actividades superadas" cuenta ejercicios curriculares completados con
> la puntuación mínima de maestría. Ángela pasó la mayor parte del tiempo pintando,
> lo que explica el número bajo en escritura. Sus capacidades reales están por encima
> del nivel esperado para 4 años.

### 6.3 Intervención del adulto

| Apodo | Nº intervenciones | Motivo principal |
|-------|------------------|------------------|
| Héctor | ~3 | Técnico (ajuste de nivel) + pedagógico |
| Cayetana | ~2 | Pedagógico (cambio de actividad al cansarse) |
| Ángela | ~2 | Técnico (configuración de nivel) + pedagógico (demo de botones) |
| Oliver | ~2 | Técnico (configuración nivel verde) |

**Media:** 2,25 intervenciones/sesión. La mayoría fueron técnicas (configuración de nivel),
no pedagógicas, lo que indica que el agente gestionó bien la interacción curricular.

### 6.4 Satisfacción

Todos los niños eligieron 😊. Héctor verbalizó explícitamente preferencia por OLIBOT sobre
las fichas de papel ("más divertido"). Oliver dijo que le gustaba ("es el que aguanta").
Ángela preguntó si podría tener matemáticas. Cayetana rio durante las preguntas del agente.

### 6.5 Velocidad de progresión

No se dispone de línea base de la tutora para los 4 niños (pendiente de recoger en
sesiones posteriores), por lo que el Δ respecto a la progresión esperada no se puede
calcular en esta fase. Se registran los contenidos superados en la Sección 6.2.

### 6.6 Engagement voluntario

| Apodo | "Otra vez" / reintentos | Señales de disfrute |
|-------|------------------------|---------------------|
| Héctor | Sí — usó botón de repetir de forma autónoma | Valora el TTS; prefiere OLIBOT al papel |
| Oliver | Sí — volvió a los números 2 y 3 por iniciativa propia | "Le flipan" las animaciones; entiende las estrellas |
| Cayetana | 0 | Ríe; actitud paciente y positiva durante toda la sesión |
| Ángela | 0 (prefirió pintar) | Aprendió los botones con 1 demostración |

---

## 7. Hallazgos cualitativos transversales

### 7.1 El TTS es el componente más valorado

Héctor (6 años, el perfil más exigente) mencionó explícitamente que le gustaba que OLIBOT
hablara, a pesar de haber desactivado el micrófono. El TTS con Web Speech API, implementado
en Fase 5 como canal principal para pre-lectores, se confirma como el eje de la experiencia.

### 7.2 Los niños pequeños van directamente a pintar

Tanto Ángela (4a) como Oliver (3a) pasaron a la actividad de colorear en cuanto tuvieron
acceso a ella. Este comportamiento fue aún más marcado en Ángela, que a los 5 minutos
dejó la escritura. Oliver, en cambio, volvió espontáneamente a los ejercicios después
de 2 minutos de pintura.

**Implicación de diseño:** la transición escritura → pintura necesita ser gestionada
pedagógicamente (ofrecer la pintura como recompensa, no como opción permanente al inicio).

### 7.3 El tutorial se ignora a partir de la 2ª vez

Héctor (que saltaba el tutorial) y Ángela (que lo siguió con atención la 1ª vez y lo ignoró
después) confirman un patrón: los niños aprenden la mecánica en la primera exposición y
consideran el tutorial un obstáculo a partir de entonces. El sistema ya implementa la
posibilidad de saltarse el tutorial (overlay semitransparente, Fase 9 mejora #19), pero
Héctor no encontró este mecanismo intuitivamente.

### 7.4 Selección de dibujo: preferencia personal, no categoría curricular

Tanto Cayetana como Ángela eligieron el dibujo para colorear por preferencia estética,
no por la categoría curricular sugerida por el agente. Esto es consistente con la autonomía
propia de la edad y sugiere que la recomendación curricular del agente sobre la elección
de dibujo tiene poco peso en la práctica.

### 7.5 El niño de 3 años superó en engagement a los mayores

Oliver (3 años) fue el participante con mayor tiempo de atención activa (29 min), mayor
número de actividades superadas (5/5) y mayor engagement voluntario (volvió a 2 y 3
por iniciativa propia). Este resultado contraintuitivo puede deberse a:
- Mayor impacto visual de las animaciones a edades más tempranas.
- Nivel de dificultad adecuado a sus capacidades (Verde = pre-grafomotricidad).
- El sistema de estrellas resultó motivador para él ("entiende el concepto de las
  estrellas para ganar").

### 7.6 El check-in emocional molestó a Héctor

Héctor expresó incomodidad con la frecuencia de las preguntas de estado emocional.
Este es el participante mayor (6 años) y probablemente el más consciente del "meta-nivel"
de la aplicación. La investigadora anotó "no preguntar tanto por el estado emocional"
como mejora directa. La frecuencia del check-in emocional debería reducirse para
los perfiles de mayor edad o calibrarse tras varios fallos.

---

## 8. Mejoras identificadas en esta fase

| Prioridad | Mejora | Estado actual | Niño que lo generó |
|-----------|--------|---------------|-------------------|
| 🔴 Alta | Reducir frecuencia del check-in emocional para edad ≥ 5 | Pendiente | Héctor |
| 🔴 Alta | No repetir "¡Muy bien! Otra vez" sin variación | Implementado en Fase 9 (mejora #17) — verificar en práctica | Héctor |
| 🔴 Alta | Gestionar la transición escritura→pintura (recompensa, no opción libre) | Pendiente | Ángela, Oliver |
| 🟡 Media | Los niños eligen dibujo por preferencia, no categoría — revisar el peso del selector | Pendiente (diseño) | Cayetana, Ángela |
| 🟡 Media | Claridad del mecanismo para saltarse el tutorial | Parcial (overlay existe, pero Héctor no lo descubrió) | Héctor |
| 🟢 Baja | Añadir contenido de matemáticas (feedback espontáneo de Ángela) | Pendiente (trabajo futuro) | Ángela |
| 🟢 Baja | Problema de selección accidental con lápiz táctil en tablet | Pendiente | Ángela |
| 🟢 Baja | Localizar la goma en el módulo de dibujo — icono más intuitivo | Pendiente | Héctor |

---

## 9. Limitaciones del estudio

1. **N=4, sin grupo control en esta sesión.** Los resultados son ilustrativos, no
   generalizables estadísticamente.

2. **Primera sesión para todos.** La novedad del sistema puede inflar el engagement.
   Necesario replicar en al menos 2-3 sesiones por participante.

3. **Sesiones individuales.** El modo parejas (Fase 10 mejora #7, implementado) no
   se evaluó en esta sesión.

4. **Sin línea base de la tutora.** La métrica de velocidad de progresión (nº 5) no
   puede calcularse sin el referente de la progresión esperada por la docente.

5. **Ausencia de datos cuantitativos del log.** Los logs de sesión del backend no
   se exportaron sistemáticamente. En sesiones futuras se recomienda exportar los
   datos de `ActivityModel` para completar las métricas de rendimiento.

6. **Sesión de tarde.** Los niños más pequeños pueden mostrar mayor o menor fatiga
   dependiendo de la hora, lo que puede afectar los resultados.

---

## 10. Próximos pasos

- [ ] Planificar sesiones de seguimiento (al menos 2-3 por participante)
        para medir evolución de las 6 métricas a lo largo del tiempo.
- [ ] Recoger línea base de la tutora para la métrica de progresión.
- [ ] Exportar logs de sesión SQLite tras cada sesión para análisis cuantitativo.
- [ ] Evaluar el modo parejas (2 niños) en la siguiente sesión.
- [ ] Implementar las mejoras de alta prioridad antes de la próxima sesión
        (frecuencia del check-in emocional, transición escritura→pintura).
- [ ] Incorporar el grupo control (fichas de papel) para la métrica de rendimiento comparado.
