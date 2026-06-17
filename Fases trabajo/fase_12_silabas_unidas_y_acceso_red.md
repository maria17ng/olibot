# Fase 12 — Sílabas en minúscula unidas y acceso desde la red (tablet) (junio 2026)

Mejoras de trazado de sílabas/palabras del nivel Rojo (edad 6) y corrección del acceso
desde dispositivos externos (tablet) en la misma red local.

---

## Tabla de cambios

| # | Tema | Área | Estado |
|---|------|------|--------|
| 1 | Sílabas del nivel Rojo no aparecían (pantalla en blanco) | Frontend | ✅ |
| 2 | Sílabas trazadas letra por letra y en mayúscula | Frontend | ✅ |
| 3 | Todas las sílabas en minúscula | Frontend | ✅ |
| 4 | Letras de la sílaba se superponían / no entraban en el lienzo | Frontend | ✅ |
| 5 | Crear niño desde la tablet no funcionaba | Backend (red) | ✅ |

---

## Detalle técnico

### #1 — Mapeo de sílabas de edad 6
- **Causa:** el backend servía `silaba_inv_as` para el nivel Rojo, pero `letterData.js`
  no tenía esos topics en `SYLLABLE_LETTERS` ni en `TOPIC_MAP` → `charData = null` →
  pantalla en blanco sin ejercicio.
- **Arreglo:** añadidas las entradas de edad 6 a `SYLLABLE_LETTERS`:
  - Inversas VC: `silaba_inv_as/es/al/ar/an`
  - Complejas CCV: `silaba_bra/tra/pla/cla`
- **Archivo:** [frontend/src/data/letterData.js](../frontend/src/data/letterData.js)

### #2 y #3 — Minúsculas y trazado unido (un solo glifo)
- **Causa:** las sílabas se trazaban **letra por letra** (primero "A", se borraba, luego
  "S") y en mayúscula, lo que no enseña a leer la sílaba como unidad.
- **Arreglo:**
  1. **Todas las sílabas en minúscula.** Las de edad 5 (`silaba_ma`, `silaba_mi`,
     `silaba_sa`, `silaba_la`, `silaba_pa`) pasaron de `["M","A"]` a `["m","a"]`, etc.
     Las `_min` y las de edad 6 ya eran minúsculas.
  2. **Glifo unido:** nueva función `_composeStrokes(letterKeys, level)` que compone
     varias letras en **un único glifo** de izquierda a derecha, con **línea base
     compartida** y **escala uniforme** (no deforma las letras). Así "as", "bra", etc.
     se trazan seguidas como una sola unión de letras.
  3. **`getSyllableCharData(topicId, level)`** devuelve `{ key, tutorial, strokes }` con
     el glifo compuesto y un tutorial generado: *"¡Vamos a trazar `as`! Sigue los
     puntitos y traza todas las letras juntas, una detrás de otra."*
  4. Se añadió la letra minúscula `b` a `LETTER_DATA` (faltaba; necesaria para "bra").
- **Frontend de trazado:** en `ChatWindow.jsx` la sílaba se traza **entera de una vez**
  (se eliminó el avance letra-a-letra `syllableLetterIdx`); al terminar pasa a la fase de
  decirla en voz alta (`syllableSayPhase`).
- **Archivos:** [frontend/src/data/letterData.js](../frontend/src/data/letterData.js),
  [frontend/src/components/ChatWindow.jsx](../frontend/src/components/ChatWindow.jsx)

### #4 — Tamaño y separación de las letras compuestas
- **Causa:** el glifo compuesto ocupaba casi todo el ancho y los puntos guía (con radio
  visible) de letras contiguas se solapaban.
- **Arreglo:** constantes de la banda de escritura en `_composeStrokes`:
  `TOP=0.24`, `BOTTOM=0.80`, `GAP=0.10`, `USABLE=0.72`. `GAP` controla la separación
  entre letras y `USABLE` el ancho total ocupado (centrado en el lienzo). Subir `GAP`
  separa más las letras; subir `USABLE` las agranda.
- **Archivo:** [frontend/src/data/letterData.js](../frontend/src/data/letterData.js)

### #5 — Acceso desde la tablet (misma red local)
- **Síntoma:** desde la tablet se cargaba el frontend (`http://10.156.x.149:5173`) pero al
  **crear un niño** fallaba. Parecía un problema de BBDD, pero **no lo era**.
- **Causa raíz:** el frontend resuelve el API con
  `http://${window.location.hostname}:5050/api/v1` (correcto: en la tablet apunta a la IP
  del PC). El problema era que **uvicorn escuchaba solo en `127.0.0.1`** (sin `--host`),
  así que el POST de creación nunca llegaba al backend desde la tablet. CORS ya estaba
  abierto (`allow_origins=["*"]`), no era el bloqueo.
- **Arreglo:** arrancar el backend escuchando en todas las interfaces:
  ```bash
  ../.venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 5050 --reload
  ```
- **Verificación desde la tablet:** abrir `http://10.156.x.149:5050/health` debe devolver
  el JSON de estado. Si no responde, revisar el **firewall** del PC (permitir el puerto
  5050) y que ambos estén en la **misma red**.
- **Archivos:** comando de arranque (sin cambios de código);
  [frontend/src/services/api.js](../frontend/src/services/api.js) ya usaba
  `window.location.hostname`; [backend/main.py](../backend/main.py) ya tenía CORS abierto.

---

## Cómo verificar

**Sílabas (Rojo):**
1. Entrar como alumno de nivel Rojo → debe proponer `silaba_inv_as`.
2. El ejercicio muestra "as" en **minúscula** y como **un solo trazo unido** (letras
   juntas, misma línea base), no letra por letra.
3. Al completar el trazo, pasa a la fase de decir la sílaba en voz alta.

**Tablet:**
1. PC: backend con `--host 0.0.0.0`.
2. Tablet (misma red): `http://IP_DEL_PC:5050/health` responde JSON.
3. Tablet: `http://IP_DEL_PC:5173` → crear niño funciona.
