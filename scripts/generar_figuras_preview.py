#!/usr/bin/env python3
"""
generar_figuras_preview.py
===========================
Genera una carpeta `figuras_preview/` con:
  - index.html  → página interactiva que muestra los 3 niveles de dificultad
  - svg/        → SVGs individuales por carácter y nivel (easy / medium / hard)

Los tres niveles:
  Nivel 0 — Fácil   : strokesEasy (o strokes si no hay)
  Nivel 1 — Medio   : strokes
  Nivel 2 — Difícil : solo primer + último punto por trazo (el niño rellena)

La flecha de inicio se calcula automáticamente de points[0]→points[1].

Uso:
    python3 scripts/generar_figuras_preview.py
"""

import json
import math
import os
import subprocess

# ── Rutas ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
LETTER_DATA_PATH = os.path.join(PROJECT_ROOT, "frontend", "src", "data", "letterData.js")
OUT_DIR      = os.path.join(SCRIPT_DIR, "figuras_preview")

# ── Agrupación temática ────────────────────────────────────────────────────────
GROUPS = [
    ("Trazos pregráficos (3 años)",                ["LINEA_H", "LINEA_V", "CURVA", "ZIGZAG", "CIRCULO", "ANGULO"]),
    ("Vocales mayúsculas (4 años)",                ["A", "E", "I", "O", "U"]),
    ("Vocales minúsculas (4 años)",                ["a", "e", "i", "o", "u"]),
    ("Números (4 años)",                           ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]),
    ("Consonantes mayúsculas fase 1 (4 años)",     ["M", "P", "T", "S", "L"]),
    ("Consonantes mayúsculas fase 2 (5 años)",     ["N", "D", "F", "R"]),
    ("Consonantes minúsculas fase 1 (4 años)",     ["m", "p", "t", "s", "l"]),
    ("Consonantes minúsculas fase 2 (5 años)",     ["n", "d", "f", "r"]),
    ("Otras consonantes mayúsculas (referencia)",  ["B", "C", "G", "H", "J", "K", "Q", "V", "W", "X", "Y", "Z"]),
]

KEY_LABELS = {
    "LINEA_H": "Línea →", "LINEA_V": "Línea ↓", "CURVA": "Curva ~",
    "ZIGZAG": "Zigzag ⚡", "CIRCULO": "Círculo ○", "ANGULO": "Ángulo ∧",
    # Vocales mayúsculas
    "A": "A", "E": "E", "I": "I", "O": "O", "U": "U",
    # Vocales minúsculas
    "a": "a", "e": "e", "i": "i", "o": "o", "u": "u",
    # Dígitos
    **{str(d): str(d) for d in range(10)},
    # Consonantes
    **{c: c for c in "BCDFGHJKLMNPQRSTVWXYZbcdfghjklmnpqrstvwxyz"},
}


# ── Extracción de LETTER_DATA vía Node.js ─────────────────────────────────────
def load_letter_data() -> dict:
    node_code = f"""
import {{ LETTER_DATA }} from '{LETTER_DATA_PATH.replace(os.sep, "/")}';
process.stdout.write(JSON.stringify(LETTER_DATA));
"""
    result = subprocess.run(
        ["node", "--input-type=module"],
        input=node_code,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Node error:\n{result.stderr}")
    return json.loads(result.stdout)


# ── Cálculo de niveles (mismo algoritmo que en letterData.js) ─────────────────
def _strokes_for_level(char: dict, level: int) -> list:
    """
    level=0  fácil   → strokesEasy (o strokes si no hay)
    level=1  medio   → strokes
    level=2  difícil → solo primer+último punto; en cerradas, añade punto central
    """
    medium = char.get("strokes", [])
    if level == 0:
        return char.get("strokesEasy", medium)
    if level == 1:
        return medium
    # level == 2: hard
    hard = []
    for s in medium:
        pts = s["points"]
        if len(pts) <= 2:
            hard.append(s)
            continue
        first = pts[0]
        last  = pts[-1]
        dist  = math.hypot(first["x"] - last["x"], first["y"] - last["y"])
        if dist < 0.06:
            mid = pts[len(pts) // 2]
            hard.append({"points": [first, mid, last]})
        else:
            hard.append({"points": [first, last]})
    return hard


def _arrow_angle(pts: list) -> float:
    """Calcula el ángulo de la flecha desde points[0] → points[1]."""
    if len(pts) < 2:
        return 0.0
    dx = pts[1]["x"] - pts[0]["x"]
    dy = pts[1]["y"] - pts[0]["y"]
    return math.degrees(math.atan2(dy, dx))


# ── Generador de SVG ──────────────────────────────────────────────────────────
LEVEL_COLORS = {
    0: "#22c55e",   # verde — fácil
    1: "#f97316",   # naranja — medio
    2: "#ef4444",   # rojo — difícil
}
LEVEL_LABELS = {0: "Fácil", 1: "Medio", 2: "Difícil"}

def make_svg(char_data: dict, key: str, level: int = 1, size: int = 280) -> str:
    W = H = size
    strokes = _strokes_for_level(char_data, level)
    demo_color = LEVEL_COLORS[level]
    parts = []

    # Fondo
    parts.append(f'<rect width="{W}" height="{H}" fill="#f9fafb" rx="10"/>')

    # Borde de color según nivel
    parts.append(
        f'<rect width="{W}" height="{H}" fill="none" rx="10" '
        f'stroke="{demo_color}" stroke-width="2.5" opacity="0.4"/>'
    )

    # 1. Línea guía gruesa semitransparente
    guide_w = W * 0.22
    for stroke in strokes:
        pts = stroke["points"]
        if len(pts) < 2:
            continue
        d = " ".join(
            f"{'M' if i == 0 else 'L'}{p['x']*W:.1f} {p['y']*H:.1f}"
            for i, p in enumerate(pts)
        )
        parts.append(
            f'<path d="{d}" stroke="#374151" stroke-width="{guide_w:.1f}" '
            f'stroke-linecap="round" stroke-linejoin="round" '
            f'fill="none" opacity="0.10"/>'
        )

    # 2. Trazo de demo
    demo_w = W * 0.042
    for stroke in strokes:
        pts = stroke["points"]
        if len(pts) < 2:
            continue
        d = " ".join(
            f"{'M' if i == 0 else 'L'}{p['x']*W:.1f} {p['y']*H:.1f}"
            for i, p in enumerate(pts)
        )
        parts.append(
            f'<path d="{d}" stroke="{demo_color}" stroke-width="{demo_w:.1f}" '
            f'stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.7"/>'
        )

    # 3. Puntos, números y flechas
    hit_r = W * 0.065
    dot_r = hit_r * 0.55
    n_strokes = len(strokes)

    for s_idx, stroke in enumerate(strokes):
        pts = stroke["points"]
        for w_idx, wp in enumerate(pts):
            px, py = wp["x"] * W, wp["y"] * H
            fill = "#4a90d9" if w_idx == 0 else "rgba(74,144,217,0.4)"
            parts.append(
                f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{dot_r:.1f}" fill="{fill}"/>'
            )

        # Número de trazo
        if n_strokes > 1 and pts:
            p0 = pts[0]
            px0, py0 = p0["x"] * W, p0["y"] * H
            fsz = max(10, hit_r * 0.85)
            parts.append(
                f'<text x="{px0:.1f}" y="{py0:.1f}" text-anchor="middle" '
                f'dominant-baseline="middle" font-size="{fsz:.1f}" '
                f'font-weight="bold" fill="#1e40af" font-family="sans-serif">'
                f'{s_idx + 1}</text>'
            )

        # Flecha de inicio (ángulo auto-calculado)
        if pts:
            angle = _arrow_angle(pts)
            arrow_len = W * 0.13
            rad = math.radians(angle)
            ax, ay = pts[0]["x"] * W, pts[0]["y"] * H
            tx = ax + math.cos(rad) * arrow_len
            ty = ay + math.sin(rad) * arrow_len
            hl = arrow_len * 0.35
            a1 = rad + math.pi * 0.75
            a2 = rad - math.pi * 0.75
            hx1 = tx + math.cos(a1) * hl
            hy1 = ty + math.sin(a1) * hl
            hx2 = tx + math.cos(a2) * hl
            hy2 = ty + math.sin(a2) * hl
            parts.append(
                f'<line x1="{ax:.1f}" y1="{ay:.1f}" x2="{tx:.1f}" y2="{ty:.1f}" '
                f'stroke="#2563eb" stroke-width="2.2" stroke-dasharray="4 3"/>'
            )
            parts.append(
                f'<polygon points="{tx:.1f},{ty:.1f} {hx1:.1f},{hy1:.1f} {hx2:.1f},{hy2:.1f}" '
                f'fill="#2563eb"/>'
            )

    # Etiqueta de nivel
    lbl = LEVEL_LABELS[level]
    parts.append(
        f'<text x="{W//2}" y="{H - 5}" text-anchor="middle" '
        f'font-size="12" fill="{demo_color}" font-weight="bold" '
        f'font-family="sans-serif">{lbl}</text>'
    )

    inner = "\n  ".join(parts)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{W}" height="{H}" viewBox="0 0 {W} {H}">\n  {inner}\n</svg>'
    )


# ── HTML interactivo ──────────────────────────────────────────────────────────
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>OLIBOT — Preview figuras (3 niveles)</title>
<style>
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: sans-serif; background: #f1f5f9; color: #1e293b; padding: 24px; }}
h1 {{ font-size: 22px; margin-bottom: 6px; }}
.subtitle {{ color: #64748b; font-size: 14px; margin-bottom: 20px; }}
.legend {{ display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }}
.legend-item {{ display: flex; align-items: center; gap: 6px; font-size: 13px; }}
.legend-dot {{ width: 14px; height: 14px; border-radius: 50%; }}
.controls {{
  display: flex; flex-wrap: wrap; gap: 16px; align-items: center;
  background: white; padding: 14px 18px; border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1); margin-bottom: 24px;
}}
.controls label {{ font-size: 14px; color: #374151; }}
.controls input[type=range] {{ width: 140px; }}
#sizeVal {{ font-weight: bold; color: #2563eb; }}
button {{
  padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: 14px;
  border: none; font-weight: 600;
}}
#dlAll {{ background: #2563eb; color: white; }}
#dlAll:hover {{ background: #1d4ed8; }}
.group {{ margin-bottom: 36px; }}
.group-title {{
  font-size: 15px; font-weight: bold; color: #1e40af;
  border-bottom: 2px solid #bfdbfe; padding-bottom: 6px; margin-bottom: 16px;
}}
.grid {{ display: flex; flex-wrap: wrap; gap: 20px; }}
/* Tarjeta que agrupa los 3 niveles de un carácter */
.char-card {{
  background: white; border-radius: 14px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.10);
  padding: 10px 12px; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  transition: box-shadow 0.15s;
}}
.char-card:hover {{ box-shadow: 0 4px 16px rgba(37,99,235,0.18); }}
.char-title {{ font-size: 14px; font-weight: 700; color: #1e293b; }}
.levels-row {{ display: flex; gap: 8px; align-items: flex-end; }}
.level-col {{ display: flex; flex-direction: column; align-items: center; gap: 3px; }}
.level-col canvas {{ border-radius: 7px; display: block; }}
.level-label {{ font-size: 10px; font-weight: 700; }}
.lvl-easy   {{ color: #22c55e; }}
.lvl-medium {{ color: #f97316; }}
.lvl-hard   {{ color: #ef4444; }}
</style>
</head>
<body>
<h1>🖊️ OLIBOT — Preview de figuras (3 niveles de dificultad)</h1>
<p class="subtitle">
  Cada carácter muestra los 3 niveles. El tamaño de los canvas se ajusta con el deslizador.
</p>

<div class="legend">
  <div class="legend-item">
    <div class="legend-dot" style="background:#22c55e"></div>
    <span><b>Fácil (nivel 0)</b> — máxima guía, todos los puntos</span>
  </div>
  <div class="legend-item">
    <div class="legend-dot" style="background:#f97316"></div>
    <span><b>Medio (nivel 1)</b> — guía estándar</span>
  </div>
  <div class="legend-item">
    <div class="legend-dot" style="background:#ef4444"></div>
    <span><b>Difícil (nivel 2)</b> — solo inicio y final de cada trazo</span>
  </div>
</div>

<div class="controls">
  <label>Tamaño canvas:
    <input type="range" id="sizeSlider" min="80" max="300" value="160" step="10">
    &nbsp;<span id="sizeVal">160 px</span>
  </label>
  <button id="dlAll">📦 Descargar todo (ZIP)</button>
</div>

<div id="app"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
        onerror="this.onerror=null;console.warn('JSZip no disponible offline.')">
</script>

<script>
// ── Datos ─────────────────────────────────────────────────────────────────────
const LETTER_DATA = {letter_data_json};
const GROUPS      = {groups_json};
const KEY_LABELS  = {key_labels_json};

// ── Lógica de niveles (espejo de letterData.js) ───────────────────────────────
function strokesToHard(strokes) {{
  return strokes.map(s => {{
    const pts = s.points;
    if (pts.length <= 2) return s;
    const first = pts[0], last = pts[pts.length - 1];
    const dist = Math.hypot(first.x - last.x, first.y - last.y);
    if (dist < 0.06) {{
      const mid = pts[Math.floor(pts.length / 2)];
      return {{ points: [first, mid, last] }};
    }}
    return {{ points: [first, last] }};
  }});
}}

function getStrokesForLevel(char, level) {{
  if (level === 0) return char.strokesEasy ?? char.strokes;
  if (level === 2) return strokesToHard(char.strokes);
  return char.strokes;
}}

// ── Auto-cálculo de flecha ────────────────────────────────────────────────────
function arrowAngleDeg(pts) {{
  if (pts.length < 2) return 0;
  return Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * 180 / Math.PI;
}}

// ── Colores por nivel ─────────────────────────────────────────────────────────
const LEVEL_COLOR = ["#22c55e", "#f97316", "#ef4444"];
const LEVEL_LABEL = ["Fácil", "Medio", "Difícil"];

// ── Dibujo en canvas ──────────────────────────────────────────────────────────
function drawFigure(canvas, char, level, size) {{
  const W = size, H = size;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const demoColor = LEVEL_COLOR[level];

  ctx.fillStyle = "#f9fafb";
  ctx.fillRect(0, 0, W, H);

  // Borde de color
  ctx.save();
  ctx.strokeStyle = demoColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.roundRect(1, 1, W-2, H-2, 8);
  ctx.stroke();
  ctx.restore();

  const strokes = getStrokesForLevel(char, level);

  // Línea guía
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = W * 0.22;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const st of strokes) {{
    const pts = st.points;
    if (pts.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(pts[0].x * W, pts[0].y * H);
    for (const p of pts.slice(1)) ctx.lineTo(p.x * W, p.y * H);
    ctx.stroke();
  }}
  ctx.restore();

  // Trazo de demo
  ctx.save();
  ctx.strokeStyle = demoColor;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = W * 0.042;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const st of strokes) {{
    const pts = st.points;
    if (pts.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(pts[0].x * W, pts[0].y * H);
    for (const p of pts.slice(1)) ctx.lineTo(p.x * W, p.y * H);
    ctx.stroke();
  }}
  ctx.restore();

  // Puntos, números y flechas
  const hitR = W * 0.065;
  const dotR = hitR * 0.55;
  strokes.forEach((st, sIdx) => {{
    const pts = st.points;
    pts.forEach((wp, wIdx) => {{
      ctx.beginPath();
      ctx.arc(wp.x * W, wp.y * H, dotR, 0, Math.PI * 2);
      ctx.fillStyle = wIdx === 0 ? "#4a90d9" : "rgba(74,144,217,0.4)";
      ctx.fill();
    }});

    if (strokes.length > 1 && pts.length > 0) {{
      ctx.save();
      ctx.fillStyle = "#1e40af";
      ctx.font = `bold ${{Math.max(9, hitR * 0.85).toFixed(0)}}px sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(sIdx + 1, pts[0].x * W, pts[0].y * H);
      ctx.restore();
    }}

    if (pts.length > 0) {{
      const angle = arrowAngleDeg(pts);
      const arrowLen = W * 0.13;
      const rad = angle * Math.PI / 180;
      const ax = pts[0].x * W, ay = pts[0].y * H;
      const tx = ax + Math.cos(rad) * arrowLen;
      const ty = ay + Math.sin(rad) * arrowLen;
      const hl = arrowLen * 0.35;

      ctx.save();
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.cos(rad + Math.PI*0.75)*hl, ty + Math.sin(rad + Math.PI*0.75)*hl);
      ctx.lineTo(tx + Math.cos(rad - Math.PI*0.75)*hl, ty + Math.sin(rad - Math.PI*0.75)*hl);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }}
  }});
}}

// ── Render UI ─────────────────────────────────────────────────────────────────
let currentSize = 160;
const allCanvases = []; // {{canvas, key, level}}

function renderAll(size) {{
  const app = document.getElementById("app");
  app.innerHTML = "";
  allCanvases.length = 0;

  for (const [groupLabel, keys] of GROUPS) {{
    const available = keys.filter(k => LETTER_DATA[k]);
    if (!available.length) continue;

    const section = document.createElement("div");
    section.className = "group";
    const title = document.createElement("div");
    title.className = "group-title";
    title.textContent = groupLabel;
    section.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "grid";

    for (const key of available) {{
      const char = LETTER_DATA[key];
      const charCard = document.createElement("div");
      charCard.className = "char-card";

      const charTitle = document.createElement("div");
      charTitle.className = "char-title";
      charTitle.textContent = KEY_LABELS[key] || key;
      charCard.appendChild(charTitle);

      const levelsRow = document.createElement("div");
      levelsRow.className = "levels-row";

      for (let lvl = 0; lvl <= 2; lvl++) {{
        const col = document.createElement("div");
        col.className = "level-col";

        const canvas = document.createElement("canvas");
        drawFigure(canvas, char, lvl, size);

        const lbl = document.createElement("div");
        lbl.className = `level-label lvl-${{["easy","medium","hard"][lvl]}}`;
        lbl.textContent = LEVEL_LABEL[lvl];

        col.appendChild(canvas);
        col.appendChild(lbl);
        levelsRow.appendChild(col);
        allCanvases.push({{ canvas, key, level: lvl }});
      }}

      charCard.appendChild(levelsRow);
      grid.appendChild(charCard);
    }}

    section.appendChild(grid);
    app.appendChild(section);
  }}
}}

function downloadCanvas(canvas, key, level) {{
  canvas.toBlob(blob => {{
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `figura_${{key.replace("/","_")}}_lvl${{level}}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }});
}}

async function downloadAll() {{
  if (typeof JSZip === "undefined") {{
    for (const {{ canvas, key, level }} of allCanvases) {{
      await new Promise(r => setTimeout(r, 60));
      downloadCanvas(canvas, key, level);
    }}
    return;
  }}
  const zip = new JSZip();
  const folder = zip.folder("figuras_olibot");
  await Promise.all(allCanvases.map(( {{ canvas, key, level }}) => new Promise(resolve => {{
    canvas.toBlob(blob => {{
      folder.file(`figura_${{key.replace("/","_")}}_lvl${{level}}.png`, blob);
      resolve();
    }});
  }})));
  const content = await zip.generateAsync({{ type: "blob" }});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(content);
  a.download = "figuras_olibot_3niveles.zip";
  a.click();
  URL.revokeObjectURL(a.href);
}}

document.getElementById("sizeSlider").addEventListener("input", e => {{
  currentSize = parseInt(e.target.value);
  document.getElementById("sizeVal").textContent = currentSize + " px";
  renderAll(currentSize);
}});
document.getElementById("dlAll").addEventListener("click", downloadAll);
renderAll(currentSize);
</script>
</body>
</html>
"""


def build_html(letter_data: dict) -> str:
    all_group_keys = {k for _, keys in GROUPS for k in keys}
    filtered = {k: v for k, v in letter_data.items() if k in all_group_keys}
    groups_list = [[label, keys] for label, keys in GROUPS]
    return HTML_TEMPLATE.format(
        letter_data_json=json.dumps(filtered, ensure_ascii=False, indent=2),
        groups_json=json.dumps(groups_list, ensure_ascii=False),
        key_labels_json=json.dumps(KEY_LABELS, ensure_ascii=False),
    )


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("Cargando LETTER_DATA desde letterData.js...")
    letter_data = load_letter_data()
    print(f"  {len(letter_data)} caracteres: {sorted(letter_data.keys())}")

    os.makedirs(OUT_DIR, exist_ok=True)

    # HTML interactivo
    html_path = os.path.join(OUT_DIR, "index.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(build_html(letter_data))
    print(f"\n✅  HTML (3 niveles) generado:\n   {html_path}")

    # SVGs individuales (un SVG por carácter × nivel)
    svg_dir = os.path.join(OUT_DIR, "svg")
    os.makedirs(svg_dir, exist_ok=True)
    n_svg = 0
    for _, keys in GROUPS:
        for key in keys:
            if key not in letter_data:
                continue
            for level in range(3):
                svg = make_svg(letter_data[key], key, level=level, size=280)
                safe = key.replace("/", "_").replace("\\", "_")
                lname = ["easy", "medium", "hard"][level]
                fname = os.path.join(svg_dir, f"figura_{safe}_{lname}.svg")
                with open(fname, "w", encoding="utf-8") as f:
                    f.write(svg)
                n_svg += 1

    print(f"✅  {n_svg} SVGs en:\n   {svg_dir}/")
    print()
    print("Cómo usar:")
    print(f"  • Abre '{html_path}' en el navegador.")
    print(f"  • Cada carácter muestra Fácil (verde) | Medio (naranja) | Difícil (rojo).")
    print(f"  • Deslizador para ajustar tamaño. ZIP para descargar todo.")


if __name__ == "__main__":
    main()
