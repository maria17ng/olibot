# Guión de Defensa TFM — OLIBOT
> Tiempo estimado: 20-25 min presentación + 10-15 min preguntas

---

## ESTRUCTURA DE LA PRESENTACIÓN

### PORTADA
**Di:**
> "Buenos días. Mi TFM se titula OLIBOT: un agente pedagógico híbrido BDI-LLM para educación infantil.
> El nombre viene de *Olibot*, el nombre del robot que ven los niños.
> La idea central es: ¿cómo combinar la fiabilidad de un agente BDI clásico con la fluidez conversacional de los LLMs modernos para enseñar a leer y escribir a niños de 3 a 5 años?"

---

### ÍNDICE
**Di:**
> "La presentación tiene seis bloques. Empiezo con la motivación, paso por las bases teóricas y la arquitectura, luego profundizo en la parte más técnica —el agente BDI y el currículum—, y termino con la interfaz y las conclusiones."

---

### SLIDE: ¿Por qué OLIBOT?
**Di:**
> "El punto de partida es normativo: el Decreto 36/2022 de Madrid establece que los niños de 5.º de Infantil deben tener al menos 45 minutos diarios de lectoescritura. Pero con ratios alumno-docente de 25 a 1, es imposible dar atención individualizada.
>
> Al mismo tiempo, los LLMs son hoy lo suficientemente rápidos y baratos para correr en local. La pregunta no era *si* se podía hacer, sino *cómo hacerlo bien*, sin que el sistema de IA diese respuestas directas o contenido inapropiado a un niño de 3 años."

---

### SLIDE: Fundamentos pedagógicos
**Di:**
> "El marco teórico tiene dos pilares. Primero, la Zona de Desarrollo Próximo de Vygotsky: el aprendizaje ocurre en la frontera entre lo que el niño sabe solo y lo que puede hacer con ayuda. OLIBOT implementa eso con scaffolding graduado en tres niveles de pista.
>
> Segundo, el método sintético-fonético, que es el que impone el Decreto 36/2022: se empieza por el fonema, luego la sílaba, luego la palabra. Nunca al revés. Es diferente del método léxico o global, donde el niño memoriza palabras completas. La literatura respalda el método fonético para lectoescritura temprana."

---

### SLIDE: Agentes BDI — la base de razonamiento
**Di:**
> "Antes de entrar en la arquitectura, necesito justificar por qué usé un agente BDI en lugar de solo un LLM.
>
> El problema con un LLM puro es la imprevisibilidad: puede alucinar, puede dar la respuesta directamente en lugar de guiar, y puede olvidar las reglas didácticas entre un turno y el siguiente.
>
> Un agente BDI mantiene creencias explícitas sobre el alumno —cuántos fallos ha tenido, qué tema está haciendo, su edad—, tiene un deseo claro —que el niño domine el currículum—, y ejecuta planes deterministas.
>
> El principio rector del diseño es **'Think BDI, Talk LLM'**: el agente decide *qué* hacer; el LLM decide *cómo decirlo* con lenguaje natural adaptado a la edad del niño."

---

### SLIDE: Arquitectura global
**Di:**
> "La arquitectura tiene cinco componentes. El frontend en React se comunica con el backend FastAPI por REST y Server-Sent Events para el streaming. El backend coordina con el agente JaCaMo por HTTP, y con los LLMs a través de Ollama —que corre en local, sin enviar datos a ningún servidor externo.
>
> Un punto importante que quiero destacar: la voz. El reconocimiento y síntesis de voz se hace enteramente en el **browser** con la Web Speech API nativa. No hay Whisper, no hay ElevenLabs, no hay llamadas a servidores externos de audio. Esto es clave para la privacidad —ningún audio del niño sale del dispositivo— y para la latencia."

---

### SLIDE: Pipeline de procesamiento
**Di:**
> "Cuando el niño dice algo, el pipeline tiene cuatro etapas.
> 1. El **NLU** clasifica la intención.
> 2. El **agente BDI** elige el plan pedagógico apropiado.
> 3. El **NLG** genera el texto usando el LLM, pero con un prompt muy controlado.
> 4. El **Safety Shield** filtra antes de que la respuesta llegue al niño.
>
> Si en algún momento el Shield detecta que el LLM ha dado la respuesta directamente —por ejemplo, 'La vocal A se escribe así'—, la respuesta se descarta y se sustituye por una pista socrática."

---

### SLIDE: NLU — clasificación por embeddings
**Di:**
> "El NLU merece un slide propio porque es una decisión técnica no trivial.
>
> Lo que hace es vectorizar el mensaje del niño con `nomic-embed-text` —un modelo de embeddings de 768 dimensiones que corre en Ollama— y calcular la similitud coseno contra 216 ejemplos pre-vectorizados de 12 intenciones distintas. Si la similitud más alta supera el umbral 0.72, tenemos intención clasificada en unos 50 ms.
>
> Si no supera el umbral, cae a un LLM ligero (llama3.2:1b, 400 ms), y si tampoco, al modelo principal (llama3.1:8b, ~2 s).
>
> La ventaja frente a hacer fine-tuning es el mantenimiento: añadir una intención nueva es añadir ejemplos en un fichero Python y ejecutar un script. No se reentrena nada."

**→ AQUÍ puedes abrir `backend/llm/nlu.py` líneas 38-58 si el profesor quiere ver el código.**

---

### SLIDE: Gestión pedagógica en JaCaMo
**Di:**
> "El agente JaCaMo corre en un proceso Java separado. Python le envía una percepción —la intención del alumno, el tema actual, los aciertos— y JaCaMo devuelve un BDIDecision con la acción a tomar.
>
> El criterio de dominio es: tasa de éxito ≥ 70% con al menos 2-3 intentos según la edad. Si no hay JaCaMo disponible —por ejemplo en desarrollo—, el sistema usa un fallback Python que replica la misma lógica. Esto permite desarrollar y demostrar OLIBOT sin necesidad de tener Gradle instalado.
>
> El timeout es de 8 segundos. Si JaCaMo no responde, el fallback Python toma el control sin que el niño note nada."

**→ AQUÍ puedes abrir `backend/core/bdi_bridge.py` y mostrar `_decide_inner()` si te preguntan por el BDI.**

---

### SLIDE: Currículum — origen y estructura
**Di:**
> "El currículum de OLIBOT está directamente extraído del Decreto 36/2022 de la Comunidad de Madrid, concretamente del Área III —Comunicación y representación de la realidad— Bloque D.
>
> Lo traduje a un grafo acíclico dirigido donde cada nodo es un tema con prerrequisitos explícitos. El niño no puede acceder a las vocales hasta que haya dominado los trazos pregráficos; no puede pasar a consonantes sin dominar vocales; y así sucesivamente.
>
> Esto garantiza la secuencia metodológica fonética incluso si el LLM intentase saltársela."

---

### SLIDE: Definición de tema en código
**Di:**
> "Esto es lo que parece en código. Cada tema es un `CurriculumTopic`: tiene un id, un nombre para mostrar, una categoría, la lista de prerrequisitos como lista de IDs, y las pistas de scaffolding graduadas.
>
> Miren el ejemplo de `vocal_a`: tiene cuatro prerrequisitos —los cuatro trazos pregráficos— y sus pistas van desde *'empieza por arriba y baja hacia la izquierda'* hasta casi dibujar la letra.
>
> La función `prerequisites_met()` es determinista: comprueba creencias en el modelo del estudiante. El LLM nunca decide si un niño está listo para avanzar."

**→ AQUÍ puedes abrir `backend/pedagogy/curriculum.py` líneas 1-60 para mostrar el dataclass y un topic real.**

---

### SLIDE: Interfaz orientada a Infantil
**Di:**
> "La interfaz tiene un requisito de diseño inusual: el usuario no sabe leer. Así que no puede haber texto, no puede haber menús desplegables, no puede haber nada que requiera lecto-escritura para operar.
>
> Todo es voz, iconos y animaciones. El avatar de Olibot reacciona visualmente —cambia de expresión según la respuesta—. Las actividades de grafomotricidad permiten practicar trazos de letras directamente en pantalla táctil.
>
> El streaming es importante: el LLM empieza a generar la respuesta y en cuanto hay un fragmento de frase completo, se manda al TTS. El robot empieza a hablar en menos de un segundo, mientras el backend sigue generando el resto."

---

### SLIDE: Conclusiones y trabajo futuro
**Di:**
> "Las aportaciones principales son cuatro. Primera: un tutor fiable porque la unión BDI+LLM evita que la IA alucine o salte el método socrático. Segunda: alineación normativa real con el Decreto 36/2022. Tercera: accesibilidad genuina para niños de 3 años que no saben leer. Y cuarta: flexibilidad multi-modelo —funciona completamente offline con Ollama, o en la nube con Gemini o Groq para colegios con recursos.
>
> Las líneas futuras más importantes son: detección emocional por tono de voz para detectar frustración, un placement test para ubicar al alumno nuevo en el grafo curricular, y sobre todo: validación empírica con grupos de control en aulas reales. Este TFM es un prototipo robusto y funcional, pero la validación longitudinal es trabajo futuro."

---

### CIERRE
**Di:**
> "Con esto termino la presentación. Quedo a disposición del tribunal para preguntas, y si quieren vemos una demostración en vivo del sistema."

---
---

## CÓDIGO A MOSTRAR EN VIVO

Si el tribunal pide ver código, abre estos ficheros en este orden de prioridad:

### 1. `backend/pedagogy/curriculum.py` — líneas 1–80
Muestra: el dataclass `CurriculumTopic`, el enum `CurriculumCategory`, y el topic `vocal_a` con sus prerrequisitos.
**Mensaje clave:** "La lógica curricular es completamente transparente y auditada. No hay ninguna IA decidiendo la secuencia."

### 2. `backend/llm/nlu.py` — líneas 38–58
Muestra: `_cosine_similarity()` y `_classify_by_embedding()`.
**Mensaje clave:** "50 líneas de Python, sin dependencias raras. Todo funciona con math.sqrt() de la librería estándar."

### 3. `backend/core/bdi_bridge.py` — líneas 130–200 aprox.
Muestra: `_decide_inner()` del `PythonBDIFallback`.
**Mensaje clave:** "Este es el 'Think BDI' en acción: condiciones explícitas, no probabilísticas."

### 4. `backend/core/safety_shield.py` — líneas 25–50
Muestra: `DIRECT_ANSWER_PATTERNS` y `SCAFFOLDING_REDIRECTS`.
**Mensaje clave:** "La capa de seguridad es determinista también. Si el LLM dice 'la respuesta es', se descarta."

### 5. `backend/llm/nlg.py` — buscar `OLIBOT_PERSONA_PROMPT`
Muestra: el bloque `PROHIBICIONES` del system prompt.
**Mensaje clave:** "El LLM está en una 'caja': tiene instrucciones explícitas de no dar respuestas directas."

---
---

## PREGUNTAS ESPERADAS DEL TRIBUNAL

### P1: "¿Por qué usar BDI en lugar de solo un LLM con un buen prompt?"
**Respuesta:**
> "Porque los LLMs no tienen memoria de estado entre turnos —o si la tienen, es context window, que tiene límites—. El BDI mantiene un modelo del alumno en base de datos: cuántos fallos ha tenido hoy, qué tema está haciendo, cuánto tiempo lleva. Además, las garantías son distintas: un LLM puede alucinar y decir 'la vocal A se escribe así', aunque le diga que no lo haga. Un plan BDI o se ejecuta o no se ejecuta, no existe el 'casi'. La combinación da lo mejor de los dos mundos: lenguaje natural fluido + lógica pedagógica garantizada."

### P2: "¿Por qué JaCaMo/Jason y no otro framework BDI?"
**Respuesta:**
> "JaCaMo es el estándar académico de facto para agentes BDI multiagente: Jason para el agente, CArtAgO para el entorno, Moise para la organización. Hay abundante literatura y es mantenido activamente. Además, el lenguaje AgentSpeak de Jason es directamente legible como pseudocódigo BDI, lo que facilita la auditabilidad. La alternativa Python (SPADE, Mesa) no tiene la semántica BDI tan bien definida."

### P3: "¿Cómo funciona exactamente el NLU? ¿No bastaría con regex?"
**Respuesta:**
> "Regex bastaría para 'quiero colorear' o 'no sé'. Pero un niño de 5 años dice cosas como 'ponme un perrito', 'no entiendo nada', 'quiero el de la jirafa'... El vocabulario infantil es impredecible. Con embeddings, cualquier frase semánticamente cercana a los ejemplos se clasifica bien, aunque las palabras exactas no aparezcan en los patrones. Además, como los embeddings son vectores pre-calculados, la clasificación tarda ~50 ms, que es mucho más rápida que invocar un LLM completo para esto."

### P4: "¿Por qué Web Speech API y no Whisper?"
**Respuesta:**
> "Tres razones. Primera: latencia. Whisper en CPU tarda entre 2 y 5 segundos en transcribir; la Web Speech API responde en menos de 500 ms porque usa el reconocedor del sistema operativo, que tiene hardware dedicado en muchos dispositivos. Segunda: privacidad. El audio nunca sale del dispositivo. Tercera: coste cero, sin API key, funciona offline en Chrome/Edge. El inconveniente es que depende del browser y no funciona en Firefox sin configuración extra, pero para un prototipo dirigido a tablets de colegio es perfectamente válido."

### P5: "¿Cómo evitas que el LLM dé la respuesta directamente al niño?"
**Respuesta:**
> "Dos capas. Primera: el system prompt tiene un bloque `PROHIBICIONES` explícito —se le dice al LLM que está prohibido revelar la respuesta, que debe guiar como Sócrates, que si el alumno lleva 3 fallos le dé una pista muy concreta pero no la respuesta—. Segunda: el Safety Shield. Después de que el LLM genera la respuesta, antes de enviarla al niño, se evalúan patrones como 'la respuesta es', 'se escribe', 'el resultado es'. Si se detectan, la respuesta se descarta y se inyecta una redirección socrática predefinida. Es defensa en profundidad."

### P6: "¿El currículum está basado en algo real o lo diseñaste tú?"
**Respuesta:**
> "Está basado en el Decreto 36/2022 de la Comunidad de Madrid, que regula el currículo de Educación Infantil (3-6 años), concretamente el Área III —Comunicación y representación de la realidad— y el Bloque D de lectoescritura. El método sintético-fonético que impone ese decreto es la base: fonema → sílaba → palabra. Lo que hice fue traducirlo a un grafo de prerrequisitos en Python, con los temas como nodos y las dependencias como aristas. No inventé la secuencia curricular; la codifiqué desde la normativa."

### P7: "¿Cómo validas que el trazo del niño es correcto?"
**Respuesta:**
> "Con una función `evaluateStroke()` en el frontend. El trazo del niño se compara contra una lista de waypoints ordenados que definen el trazo modelo de cada letra. La función calcula: cobertura de waypoints (qué porcentaje de puntos clave alcanzó), penalización por longitud excesiva (si el niño hace garabatos en lugar de trazos precisos), y tolerancia de dirección. Si supera el 70% de puntuación, se considera correcto. No uso ML para esto; un niño de 3 años hace trazos tan distintos que un clasificador neuronal necesitaría miles de ejemplos etiquetados. Las reglas geométricas son más robustas en este dominio."

### P8: "¿Escala a muchos alumnos simultáneos?"
**Respuesta:**
> "Para el prototipo, SQLite con NullPool es suficiente para 10-20 alumnos. NullPool es importante: evita que las conexiones a SQLite se saturen en un entorno async. Si se quisiera escalar, la arquitectura lo permite sin cambios en la lógica de negocio: se sustituye SQLite por PostgreSQL cambiando la connection string, y se despliega el backend con múltiples workers Uvicorn detrás de un load balancer. La separación entre backend y agente JaCaMo también permite escalar el BDI independientemente."

### P9: "¿Lo has probado con niños reales?"
**Respuesta:**
> "No, y lo reconozco explícitamente como la principal limitación del trabajo. Lo que sí he hecho es diseñar el sistema iterativamente con el marco de Vygotsky y ZDP como guía, y he realizado pruebas funcionales completas con los flujos de interacción. La validación longitudinal con grupos de control en aulas reales es la primera línea de trabajo futuro. Un TFM tiene un alcance temporal limitado; un ensayo controlado con menores requeriría aprobación ética y coordinación con un centro escolar."

### P10: "¿Qué diferencia hay entre JaCaMo real y el fallback Python?"
**Respuesta:**
> "JaCaMo es el estándar académico con semántica BDI formal —tiene ciclo de razonamiento definido, gestión de planes con fallos, trazabilidad de intenciones—. El fallback Python replica la *lógica* del BDI pero sin la maquinaria formal: es básicamente un árbol de decisión muy estructurado. Para la demo funcional son equivalentes. Para un despliegue en producción o para publicar resultados académicos, el JaCaMo real da más garantías de corrección y auditabilidad del razonamiento."

### P11: "¿Qué es el Safety Shield exactamente?"
**Respuesta:**
> "Es una capa de validación que se ejecuta después de que el LLM genera cada respuesta, antes de enviarla al niño. Evalúa dos cosas: primero, que no haya respuestas directas —patrones de texto que revelan la solución—; segundo, que el lenguaje sea apropiado para menores. Si falla cualquier comprobación, la respuesta se descarta y se sustituye por una redirección socrática predefinida. También hay un segundo nivel: cuando JaCaMo está activo, las reglas de seguridad corren en el agente Jason, que tiene acceso al contexto pedagógico completo para decisiones más matizadas."

### P12: "¿Por qué Ollama y no la API de OpenAI directamente?"
**Respuesta:**
> "Tres razones principales. Primera: privacidad. En un contexto de menores de edad, enviar las conversaciones a servidores externos de OpenAI sería problemáticamente desde GDPR. Segunda: coste cero para el prototipo y para centros educativos con presupuesto limitado. Tercera: funcionamiento offline —muchos colegios tienen conectividad limitada—. OLIBOT también soporta Gemini y Groq como backends opcionales si el centro prefiere velocidad a privacidad, pero Ollama es el modo por defecto."

---
---

## NOTAS FINALES PARA LA DEFENSA

- **Si te preguntan algo que no sabes:** "Es una buena pregunta, no lo he evaluado cuantitativamente en este TFM, pero la hipótesis sería..."
- **Si te preguntan por trabajo futuro:** siempre menciona (1) validación empírica con niños, (2) detección emocional, (3) panel docente.
- **Si el profe quiere ver código en vivo:** empieza por `curriculum.py` (el más legible y el más ligado a la normativa), luego `nlu.py` (el más técnico pero conciso).
- **Tiempo:** si vas corto de tiempo, los slides de BDI y Currículum son los más importantes; el de Interfaz se puede resumir en 1 minuto.
- **Demo en vivo:** si la haces, ten preparado un niño de "4 años" ya registrado en la BD para no perder tiempo creando perfil.
