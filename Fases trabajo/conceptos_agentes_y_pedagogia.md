# Conceptos Clave — OLIBOT: Agentes, Pedagogía y Arquitectura

> Documento conceptual para la memoria del TFM.  
> Explica los **por qués** y los **qués** del proyecto, sin entrar en código.  
> Lectura recomendada antes de empezar con los documentos técnicos de cada fase.

---

## Índice

1. [Qué es OLIBOT y cuál es su objetivo](#1-qué-es-olibot-y-cuál-es-su-objetivo)
2. [Agentes inteligentes — conceptos fundamentales](#2-agentes-inteligentes--conceptos-fundamentales)
3. [El modelo BDI — Creencias, Deseos e Intenciones](#3-el-modelo-bdi--creencias-deseos-e-intenciones)
4. [JaCaMo — el framework de agentes](#4-jacamo--el-framework-de-agentes)
5. [La arquitectura "Think BDI, Talk LLM"](#5-la-arquitectura-think-bdi-talk-llm)
6. [NLU — Entender al alumno](#6-nlu--entender-al-alumno)
7. [NLG — Hablar con el alumno](#7-nlg--hablar-con-el-alumno)
8. [Zona de Desarrollo Próximo y Scaffolding](#8-zona-de-desarrollo-próximo-y-scaffolding)
9. [El Safety Shield — escudo pedagógico](#9-el-safety-shield--escudo-pedagógico)
10. [El currículo como ontología](#10-el-currículo-como-ontología)
11. [Cómo encajan todas las piezas](#11-cómo-encajan-todas-las-piezas)
12. [Glosario rápido](#12-glosario-rápido)

---

## 1. Qué es OLIBOT y cuál es su objetivo

OLIBOT es un **agente pedagógico conversacional** diseñado para enseñar lectoescritura y numeración básica a niños de Educación Infantil (3-6 años). Opera como un tutor virtual que mantiene una conversación con el niño y le guía hacia el aprendizaje por descubrimiento — sin darle las respuestas directamente.

### El problema que resuelve

Los sistemas de tutoría inteligente clásicos son rígidos: siguen un árbol de decisiones predefinido. Los chatbots de LLM modernos son fluidos pero impredecibles: pueden dar la respuesta directamente sin darse cuenta, cambiar de tema de forma incoherente, o ignorar el nivel del alumno.

OLIBOT combina lo mejor de ambos mundos:
- **Razonamiento pedagógico formal** (BDI): garantiza que las decisiones didácticas sean correctas y consistentes.
- **Lenguaje natural fluido** (LLM): garantiza que la respuesta suene natural y adaptada a un niño de 5 años.

### El principio fundamental

> *El agente decide QUÉ hacer. El LLM decide CÓMO decirlo.*

Nunca al revés. El LLM nunca toma decisiones pedagógicas — solo genera texto.

---

## 2. Agentes inteligentes — conceptos fundamentales

Un **agente inteligente** es un sistema que:
1. **Percibe** su entorno (recibe información)
2. **Razona** sobre esa información
3. **Actúa** para conseguir sus objetivos

En OLIBOT, el entorno del agente es la conversación con el alumno. El agente percibe lo que dice el niño, razona sobre su nivel y necesidades, y decide qué respuesta pedagógica dar.

### Agente vs. programa normal

Un programa normal ejecuta instrucciones fijas: "si X, haz Y". Un agente tiene **objetivos** y **razona** sobre cómo alcanzarlos dadas las circunstancias actuales. Puede tener múltiples metas en conflicto y debe priorizarlas.

Por ejemplo:
- Meta 1: ayudar al alumno a aprender la vocal A
- Meta 2: no frustrarle si está teniendo dificultades
- Meta 3: nunca darle la respuesta directa

Cuando el alumno lleva 5 intentos fallidos y pide la respuesta, el agente tiene que equilibrar estas tres metas: no da la respuesta (meta 3), pero sí da una pista más directa de lo normal (meta 2) y la orienta hacia el aprendizaje (meta 1).

### Multi-Agent System (MAS)

OLIBOT usa JaCaMo, un **sistema multi-agente**. Aunque en la práctica solo hay un agente activo (`olibot`), el framework está diseñado para que múltiples agentes coexistan, compartan un entorno (workspace) y se comuniquen. Esta arquitectura sería extensible para, por ejemplo, añadir un "agente supervisor" que monitorice varias sesiones simultáneamente.

---

## 3. El modelo BDI — Creencias, Deseos e Intenciones

BDI (Belief-Desire-Intention) es el modelo teórico más influyente en agentes inteligentes racionales. Fue propuesto por Rao y Georgeff (1995) y describe cómo un agente razona en términos humanos:

### Creencias (Beliefs) — "Lo que sé"

Las creencias son el estado de conocimiento del agente sobre el mundo. No tienen por qué ser verdad — el agente actúa basándose en lo que *cree* que es verdad.

En OLIBOT, las creencias incluyen:
- El intent del alumno en este turno (`current_intent("ask_for_hint")`)
- Su tasa de éxito en la sesión (`current_success_rate(0.45)`)
- El tema activo (`current_topic_id("vocal_a")`)
- Si su última respuesta fue correcta (`current_is_correct("false")`)

Las creencias **cambian en cada turno** cuando llega nueva información del alumno.

### Deseos (Desires) — "Lo que quiero conseguir"

Los deseos son los **objetivos a largo plazo** del agente. En OLIBOT:
- Que el alumno aprenda los contenidos del currículo
- Que el alumno desarrolle autonomía (no depender del agente para las respuestas)
- Que el alumno no se frustre ni abandone

Los deseos son estables — no cambian turno a turno. Son la "misión" del agente.

### Intenciones (Intentions) — "Lo que voy a hacer ahora"

Las intenciones son los **compromisos de acción inmediata** del agente: el plan concreto que ha seleccionado para este turno en base a sus creencias actuales.

En OLIBOT, cuando el alumno pide la respuesta directamente, la intención es:
> *"Voy a dar una pista socrática de nivel 2, porque su tasa de éxito es 0.45 (dificultad moderada), y nunca voy a revelar la respuesta."*

### Por qué BDI en lugar de un árbol de decisiones

Un árbol de decisiones escala mal: hay que anticipar todas las combinaciones posibles. BDI es más flexible: el agente tiene **planes** (recetas de acción) y los selecciona dinámicamente según sus creencias actuales. Si una situación no estaba prevista exactamente, el agente puede combinar planes o usar el plan más cercano.

---

## 4. JaCaMo — el framework de agentes

JaCaMo es el framework que implementa el modelo BDI en OLIBOT. Se compone de tres capas independientes que trabajan juntas:

### Jason — el lenguaje del agente

**Jason** es el lenguaje de programación del agente. Usa **AgentSpeak**, un lenguaje declarativo basado en lógica de primer orden. El agente no se programa en el sentido clásico — se describe en términos de planes y creencias.

Ejemplo de plan Jason en OLIBOT:
```
Cuando percibo que el alumno pide una pista,
y su tasa de éxito es moderada,
entonces: calculo el nivel de pista → doy la pista → envío la decisión.
```

Esto es radicalmente diferente a un `if/else`: es razonamiento lógico sobre el estado del mundo.

### CArtAgO — el entorno del agente

**CArtAgO** (Common Artifact infrastructure for Agent Open environments) define el **entorno** en el que vive el agente. El entorno se compone de **artefactos** — objetos con propiedades observables y operaciones invocables.

En OLIBOT, el artefacto principal es `OlibotEnv`:
- **Propiedades observables**: cuando cambian, el agente recibe automáticamente las nuevas creencias
- **Operaciones**: el agente puede llamar a `postDecision(...)` para enviar su decisión

El concepto clave: el agente **observa** el entorno en lugar de llamar a funciones. Cuando llega un nuevo percept de Python, las propiedades del artefacto cambian, y el agente lo detecta automáticamente como un cambio en su base de creencias.

### Moise — la organización

**Moise** es la capa organizacional de JaCaMo (roles, grupos, normas). No se usa en OLIBOT actualmente, pero está disponible si el sistema crece a varios agentes con roles distintos (p.ej., "agente tutor" + "agente evaluador").

### El proyecto JaCaMo (`.jcm`)

El archivo `olibot.jcm` define la estructura del sistema:
- Qué agentes existen y qué código ejecutan
- Qué workspaces (entornos) existen
- Qué artefactos hay en cada workspace

Es el "plano" del sistema multi-agente.

---

## 5. La arquitectura "Think BDI, Talk LLM"

Este es el concepto central del TFM, inspirado en el framework ChatBDI (2024).

### El problema con los LLMs solos

Los modelos de lenguaje (como LLaMA) son excelentes generando texto natural, pero:
- No tienen memoria real entre turnos (sin arquitectura adicional)
- No tienen garantías de comportamiento pedagógico
- Pueden "alucinar" respuestas correctas cuando deberían dar pistas
- Su razonamiento no es auditable ni formal

### El problema con el BDI solo

Un agente BDI puro produce decisiones formales ("dar pista de nivel 2") pero no puede generar texto natural adaptado a un niño de 5 años. El texto resultante sería rígido y poco motivador.

### La solución: separación de responsabilidades

```
[BDI Agent]  →  QUÉ hacer pedagógicamente  →  "give_hint, level=2, topic=vocal_a"
                                                        ↓
[LLM]        →  CÓMO decirlo en lenguaje natural  →  "¡Casi! ¿Recuerdas el sonido que hace 
                                                       cuando abrimos mucho la boca?"
```

El BDI garantiza la **corrección pedagógica**. El LLM garantiza la **calidad lingüística**. Ninguno hace el trabajo del otro.

### La instrucción como interfaz

El puente entre ambos es la **instrucción** que el BDI pasa al LLM:
> *"The student requested a hint. Give a level-2 Socratic clue without revealing the answer."*

Esta instrucción no es texto para el alumno — es una directriz interna para el LLM. El LLM la usa como contexto para generar la respuesta final.

---

## 6. NLU — Entender al alumno

**NLU (Natural Language Understanding)** es el módulo que interpreta lo que escribe el alumno. Su tarea: convertir texto libre en un **intent** (intención) estructurado.

### Intents en OLIBOT

| Intent | Qué significa | Ejemplo |
|--------|---------------|---------|
| `greet` | El alumno saluda o inicia conversación | "hola", "buenos días" |
| `attempt_answer` | El alumno da una respuesta a la actividad | "creo que es la letra A", "cuatro" |
| `ask_for_hint` | El alumno pide ayuda | "no sé", "dame una pista" |
| `ask_for_answer` | El alumno pide la respuesta directamente | "dime la respuesta", "¿cuánto es?" |
| `express_emotion` | El alumno expresa un estado emocional | "esto es muy difícil", "qué aburrido" |

### Por qué usar el LLM para la clasificación

La clasificación de intents se podría hacer con un clasificador clásico (SVM, BERT fine-tuned). Sin embargo, para el vocabulario de un niño de 3-6 años, la variabilidad es enorme: "no sé nada", "¿me ayudas?", "no entiendo", "auxilio" son todas formas de pedir ayuda. Un LLM generaliza mucho mejor a esta variabilidad sin necesitar datos de entrenamiento.

### Entities

Además del intent, el NLU extrae **entidades**: información concreta del mensaje. Para `attempt_answer`, la entidad clave es `answer` — el texto de la respuesta que el alumno está dando. Esta entidad se pasa al motor de currículo para evaluar si es correcta.

---

## 7. NLG — Hablar con el alumno

**NLG (Natural Language Generation)** es el módulo que genera la respuesta en texto natural. Recibe la instrucción del BDI y produce el mensaje que leerá el alumno.

### La persona OLIBOT

El LLM no genera texto genérico — adopta la **persona** de OLIBOT: un tutor entusiasta, paciente, adaptado al vocabulario de Infantil. Esta persona se inyecta en el prompt del sistema:
- Habla como hablaría un maestro de infantil
- Usa frases cortas y simples
- Es motivador pero nunca da la respuesta
- Adapta el tono si el alumno está frustrado

### El rol de la instrucción BDI

La instrucción del BDI actúa como una restricción: le dice al LLM exactamente qué debe y qué no debe hacer en este turno. Si la instrucción dice "NUNCA des la respuesta. Da solo una pista socrática de nivel 2", el LLM está forzado a respetar esa directriz.

Aun así, el Safety Shield verifica el output del LLM por si acaso (ver sección 9).

---

## 8. Zona de Desarrollo Próximo y Scaffolding

Estos son conceptos de la psicología educativa de Vygotsky que fundamentan el motor pedagógico de OLIBOT.

### Zona de Desarrollo Próximo (ZDP)

La ZDP es la distancia entre:
- Lo que el alumno puede hacer **solo** (zona dominada)
- Lo que el alumno aún no puede hacer ni con ayuda (demasiado difícil)

Entre ambos extremos hay una zona intermedia: lo que el alumno **puede hacer con ayuda**. Esta es la ZDP — el espacio donde el aprendizaje es más efectivo.

```
[Dominado]  ←  ZDP (zona de aprendizaje óptimo)  →  [Demasiado difícil]
```

OLIBOT intenta mantener al alumno siempre en su ZDP: actividades que son un reto alcanzable, no demasiado fáciles ni demasiado difíciles.

### Scaffolding (andamiaje)

Scaffolding es la ayuda que el agente proporciona para que el alumno pueda trabajar dentro de su ZDP. La metáfora es el andamio de construcción: una estructura temporal que sostiene al alumno hasta que puede sostenerse solo. A medida que el alumno mejora, el andamio se retira gradualmente.

En OLIBOT, el scaffolding se materializa en los **niveles de pista**:

| Nivel | SR del alumno | Tipo de ayuda | Ejemplo |
|-------|---------------|---------------|---------|
| 1 | ≥ 0.60 | Pista sutil (Socrática) | "¿Qué sonido hace al principio?" |
| 2 | 0.30–0.59 | Pista moderada | "Es una vocal. ¿Cuáles conoces?" |
| 3 | < 0.30 | Pista casi directa | "Es la primera letra del abecedario. Se pronuncia aaaa." |

### Mastery (dominio)

Un tema se considera **dominado** cuando el alumno ha respondido correctamente al menos el 75% de los intentos, con un mínimo de 3 intentos. Este umbral viene de la literatura de tutoría inteligente (ITS).

Una vez dominado un tema, el sistema propone avanzar al siguiente. Los temas están organizados con **prerrequisitos**: no se puede trabajar consonantes sin haber dominado las vocales.

### Tasa de éxito de sesión (SR)

La **success rate** de sesión es el porcentaje de respuestas correctas en la sesión actual. Es la señal principal que usa el agente BDI para calcular el nivel de scaffolding. Es una medida en tiempo real — si el alumno empeora durante la sesión, el agente aumenta automáticamente el nivel de ayuda.

---

## 9. El Safety Shield — escudo pedagógico

El Safety Shield es una capa de seguridad pedagógica que garantiza que OLIBOT **nunca** viole el principio fundamental: no dar respuestas directas.

### Por qué existe

El LLM, por su naturaleza, tiende a ser "helpful" — quiere dar la mejor respuesta posible a la pregunta. Si el alumno pregunta "¿cuánto es 2+2?", el LLM podría responder "4" aunque se le haya instruido lo contrario. El Safety Shield es la red de seguridad.

### Cómo funciona — dos capas

**Capa 1 — Evaluación del intent (pre-LLM):**
Cuando el NLU detecta `ask_for_answer`, el BDI ya activa el plan de pista en lugar del de respuesta. El LLM recibe una instrucción que prohíbe explícitamente dar la respuesta.

**Capa 2 — Validación del output (post-LLM):**
Después de que el LLM genera el texto, el Safety Shield analiza el output buscando patrones que indiquen que se está dando una respuesta directa. Si los detecta, **reemplaza la respuesta** por una genérica segura.

### Shield invariante

El escudo tiene un **invariante absoluto**: independientemente del contexto, del intent, del nivel del alumno o del estado de JaCaMo, `ask_for_answer` **siempre** produce una pista, nunca una respuesta. Este invariante se cumple tanto en el agente Jason como en el PythonBDIFallback.

---

## 10. El currículo como ontología

### Qué es una ontología en este contexto

Una **ontología** es una representación formal del conocimiento de un dominio: qué conceptos existen, cómo se relacionan entre sí, qué propiedades tienen. En OLIBOT, el currículo es la ontología del dominio educativo.

### Estructura del currículo

El currículo de OLIBOT modeliza los contenidos de Educación Infantil (Real Decreto 95/2022, Área 3) como un **grafo dirigido acíclico (DAG)**:

```
                    vocales
                   ↗   ↗   ↗   ↗   ↗
             vocal_a  vocal_e  ...  vocal_u
                                      ↘
números 1-5 → número_5 ────────────► consonantes
                                      (prerrequisito:
                                       todas las vocales)
```

Cada nodo del grafo es un tema con:
- Una descripción para el alumno
- Tres pistas de scaffolding (niveles 1, 2, 3)
- Las respuestas correctas aceptadas
- Su dificultad (1-5)
- Sus prerrequisitos

### Selección del siguiente tema (ZDP-guided)

Cuando el alumno domina un tema, el sistema no avanza linealmente — selecciona el siguiente tema según criterios ZDP:
1. **Prioridad 1:** temas en progreso (iniciados pero no dominados) cuyos prerrequisitos están satisfechos
2. **Prioridad 2:** temas no iniciados con prerrequisitos satisfechos
3. **Prioridad 3:** repasar temas con baja tasa de éxito

Este mecanismo simula el criterio de un buen maestro: el trabajo más urgente es lo que ya empezamos y aún no dominamos.

---

## 11. Cómo encajan todas las piezas

Un turno completo de OLIBOT, desde el mensaje del alumno hasta la respuesta:

```
El niño escribe:  "no sé, dime tú"
       │
       ▼
  NLU (LLM)
  Clasifica: intent = ask_for_answer
       │
       ▼
  BDIBridge
  ┌─────────────────────────────────────────┐
  │  Envía a JaCaMo:                        │
  │    intent = "ask_for_answer"            │
  │    success_rate = 0.35  (baja)          │
  │    topic = "vocal_e"                    │
  │                                         │
  │  JaCaMo razona:                         │
  │    Creencia: ask_for_answer → NUNCA     │
  │              dar respuesta (invariante) │
  │    SR=0.35 < 0.60 → hint_level = 2     │
  │                                         │
  │  Decisión: give_hint, nivel 2           │
  └─────────────────────────────────────────┘
       │
       ▼
  NLG (LLM)
  Instrucción: "Student asked for the answer directly.
                NEVER give it. Give a level-2 Socratic hint."
  Genera: "¡Yo sé que tú también lo sabes! 
           La vocal E aparece en la palabra 'estrella'. 
           ¿Puedes escribirla?"
       │
       ▼
  Safety Shield
  Valida: ¿se reveló la respuesta? No. ✓
       │
       ▼
  Base de datos
  Guarda: mensaje del alumno, respuesta del bot,
          intent detectado, shield_triggered=False
       │
       ▼
  Frontend
  Muestra la respuesta al niño
```

### Por qué cada capa es necesaria

| Capa | Si se eliminara... |
|------|--------------------|
| NLU | El BDI recibiría texto libre — no podría razonar sobre él |
| BDI | El LLM tomaría las decisiones pedagógicas — impredecible |
| NLG | Las respuestas serían formales y frías ("Acción: dar pista nivel 2") |
| Safety Shield | El LLM podría dar respuestas directas en casos extremos |
| Currículo | No habría progresión — el agente no sabría qué enseñar ni en qué orden |
| Scaffolding | La ayuda sería siempre igual — sin adaptación al nivel del alumno |

### El PythonBDIFallback como seguro

JaCaMo puede no estar disponible (proceso Java caído, timeout, servidor sin Java). El `PythonBDIFallback` implementa exactamente los mismos planes en Python, garantizando que el sistema siempre funciona. El comportamiento pedagógico es idéntico.

---

## 12. Glosario rápido

| Término | Significado en OLIBOT |
|---------|----------------------|
| **Agente** | El sistema autónomo que razona y toma decisiones (el "cerebro" de OLIBOT) |
| **BDI** | Belief-Desire-Intention: modelo de razonamiento del agente |
| **Creencia (Belief)** | Información que el agente tiene sobre el estado actual del mundo |
| **Deseo (Desire)** | Objetivo a largo plazo del agente (que el alumno aprenda) |
| **Intención (Intention)** | Acción concreta que el agente decide ejecutar en este turno |
| **Plan** | Receta de acción: "si creencias X, haz Y" |
| **Percept** | Información del entorno que actualiza las creencias del agente |
| **JaCaMo** | Framework Java para programar sistemas multi-agente BDI |
| **Jason** | Lenguaje de programación del agente (basado en lógica) |
| **CArtAgO** | Framework para el entorno del agente (artefactos observables) |
| **Artefacto** | Objeto del entorno con propiedades que el agente puede observar |
| **Intent** | Intención comunicativa clasificada del mensaje del alumno |
| **NLU** | Natural Language Understanding: clasificar qué quiere decir el alumno |
| **NLG** | Natural Language Generation: generar la respuesta en texto natural |
| **LLM** | Large Language Model: modelo de lenguaje (LLaMA en este caso) |
| **Scaffolding** | Nivel de ayuda adaptado al progreso del alumno |
| **ZDP** | Zona de Desarrollo Próximo: rango óptimo de dificultad para aprender |
| **Mastery** | Indicador de dominio de un tema (≥75% aciertos en ≥3 intentos) |
| **Success Rate (SR)** | Tasa de éxito del alumno en la sesión actual |
| **Safety Shield** | Capa de seguridad que garantiza que nunca se dan respuestas directas |
| **Currículo** | Grafo de temas ordenados con prerrequisitos (ontología educativa) |
| **PythonBDIFallback** | Réplica Python del agente Jason, usada cuando JaCaMo no está disponible |
| **Think BDI, Talk LLM** | Patrón arquitectónico: BDI decide qué, LLM decide cómo |