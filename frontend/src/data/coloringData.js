/**
 * coloringData.js — SVG outlines for the free-drawing coloring activity.
 *
 * Each SVG is a coloring-book style black outline (fill="none", stroke="black").
 * The child paints on a canvas placed behind the SVG overlay.
 *
 * Structure:
 *   COLORING_DATA[subject] = { label, emoji, variants: [{ id, label, svg }] }
 */

const SVG_ATTRS = `xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" stroke="black" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"`;

const svgs = {
  perro_1: `<svg ${SVG_ATTRS}>
  <ellipse cx="100" cy="130" rx="52" ry="38"/>
  <circle cx="100" cy="72" r="32"/>
  <path d="M72 58 Q52 48 48 78 Q60 90 76 80"/>
  <path d="M128 58 Q148 48 152 78 Q140 90 124 80"/>
  <ellipse cx="100" cy="86" rx="14" ry="10"/>
  <ellipse cx="100" cy="80" rx="6" ry="4" fill="black"/>
  <circle cx="86" cy="64" r="4" fill="black"/>
  <circle cx="114" cy="64" r="4" fill="black"/>
  <path d="M92 92 Q100 100 108 92"/>
  <path d="M76 162 L70 192 Q76 196 82 192 L82 162"/>
  <path d="M118 162 L114 192 Q120 196 126 192 L124 162"/>
  <path d="M58 150 L52 192 Q58 196 64 192 L66 150"/>
  <path d="M140 150 L138 192 Q144 196 150 192 L148 150"/>
  <path d="M150 120 Q175 100 170 80"/>
</svg>`,

  perro_2: `<svg ${SVG_ATTRS}>
  <ellipse cx="100" cy="140" rx="44" ry="36"/>
  <circle cx="100" cy="76" r="30"/>
  <path d="M80 52 L68 22 L94 46"/>
  <path d="M120 52 L132 22 L106 46"/>
  <ellipse cx="100" cy="88" rx="16" ry="12"/>
  <ellipse cx="100" cy="82" rx="7" ry="5" fill="black"/>
  <circle cx="86" cy="68" r="4" fill="black"/>
  <circle cx="114" cy="68" r="4" fill="black"/>
  <path d="M90 94 Q100 104 110 94"/>
  <path d="M96 100 Q100 112 104 100"/>
  <path d="M80 170 L76 196 Q84 200 88 196 L84 170"/>
  <path d="M120 170 L116 196 Q124 200 128 196 L124 170"/>
  <path d="M144 132 Q168 120 164 104 Q160 88 148 96"/>
  <path d="M74 108 Q100 116 126 108"/>
</svg>`,

  gato_1: `<svg ${SVG_ATTRS}>
  <ellipse cx="100" cy="138" rx="48" ry="40"/>
  <circle cx="100" cy="74" r="30"/>
  <path d="M76 52 L64 24 L94 48"/>
  <path d="M124 52 L136 24 L106 48"/>
  <circle cx="86" cy="68" r="9"/>
  <circle cx="86" cy="68" r="5" fill="black"/>
  <circle cx="114" cy="68" r="9"/>
  <circle cx="114" cy="68" r="5" fill="black"/>
  <path d="M96 82 L100 78 L104 82 Z" fill="black"/>
  <path d="M96 84 Q100 90 104 84"/>
  <line x1="82" y1="82" x2="56" y2="78"/>
  <line x1="82" y1="86" x2="56" y2="86"/>
  <line x1="82" y1="90" x2="58" y2="94"/>
  <line x1="118" y1="82" x2="144" y2="78"/>
  <line x1="118" y1="86" x2="144" y2="86"/>
  <line x1="118" y1="90" x2="142" y2="94"/>
  <path d="M78 170 L74 196 Q82 200 86 196 L82 170"/>
  <path d="M122 170 L118 196 Q126 200 130 196 L126 170"/>
  <path d="M148 140 Q172 120 168 90 Q164 70 150 80"/>
</svg>`,

  gato_2: `<svg ${SVG_ATTRS}>
  <ellipse cx="100" cy="145" rx="42" ry="38"/>
  <circle cx="100" cy="76" r="32"/>
  <path d="M74 52 L62 20 L92 46"/>
  <path d="M126 52 L138 20 L108 46"/>
  <circle cx="86" cy="70" r="10"/>
  <circle cx="86" cy="70" r="5" fill="black"/>
  <circle cx="114" cy="70" r="10"/>
  <circle cx="114" cy="70" r="5" fill="black"/>
  <path d="M96 84 L100 80 L104 84 Z" fill="black"/>
  <path d="M94 86 Q100 94 106 86"/>
  <line x1="84" y1="84" x2="58" y2="80"/>
  <line x1="84" y1="88" x2="58" y2="90"/>
  <line x1="116" y1="84" x2="142" y2="80"/>
  <line x1="116" y1="88" x2="142" y2="90"/>
  <path d="M80 174 L78 194 Q86 198 90 194 L86 174"/>
  <path d="M120 174 L118 194 Q126 198 130 194 L124 174"/>
  <path d="M58 150 Q36 130 40 106 Q44 84 60 90 Q68 94 62 108"/>
</svg>`,

  pato: `<svg ${SVG_ATTRS}>
  <ellipse cx="102" cy="138" rx="54" ry="42"/>
  <circle cx="90" cy="76" r="26"/>
  <path d="M64 74 Q46 70 42 80 Q46 88 64 84"/>
  <path d="M64 84 Q50 88 46 96 Q54 100 66 94"/>
  <circle cx="80" cy="68" r="5" fill="black"/>
  <path d="M72 120 Q100 108 138 124 Q128 148 100 152 Q76 148 72 120Z"/>
  <path d="M80 126 Q105 116 132 128"/>
  <path d="M150 130 Q172 120 174 108 Q168 100 156 110"/>
  <path d="M152 140 Q176 134 180 122 Q172 114 160 124"/>
  <path d="M86 176 L82 196 M82 196 L68 200 M82 196 L94 202"/>
  <path d="M112 176 L108 196 M108 196 L94 200 M108 196 L120 202"/>
</svg>`,

  conejo: `<svg ${SVG_ATTRS}>
  <ellipse cx="100" cy="145" rx="46" ry="42"/>
  <circle cx="100" cy="82" r="30"/>
  <path d="M84 54 Q76 10 86 4 Q96 0 94 50"/>
  <path d="M116 54 Q124 10 114 4 Q104 0 106 50"/>
  <path d="M85 50 Q80 18 88 12 Q94 8 92 48"/>
  <path d="M115 50 Q120 18 112 12 Q106 8 108 48"/>
  <circle cx="88" cy="76" r="5" fill="black"/>
  <circle cx="112" cy="76" r="5" fill="black"/>
  <ellipse cx="100" cy="90" rx="5" ry="4" fill="black"/>
  <path d="M94 93 Q100 100 106 93"/>
  <line x1="94" y1="90" x2="72" y2="86"/>
  <line x1="94" y1="93" x2="72" y2="93"/>
  <line x1="106" y1="90" x2="128" y2="86"/>
  <line x1="106" y1="93" x2="128" y2="93"/>
  <path d="M76 148 L68 174 Q76 180 82 174 L80 148"/>
  <path d="M124 148 L122 174 Q128 180 134 174 L128 148"/>
  <path d="M64 172 Q44 170 42 180 Q44 190 68 188 L72 172"/>
  <path d="M136 172 Q156 170 158 180 Q156 190 132 188 L128 172"/>
  <circle cx="148" cy="148" r="14"/>
</svg>`,

  mariposa: `<svg ${SVG_ATTRS}>
  <ellipse cx="100" cy="100" rx="7" ry="38"/>
  <circle cx="100" cy="56" r="10"/>
  <path d="M96 48 Q84 28 78 18"/>
  <circle cx="78" cy="18" r="4"/>
  <path d="M104 48 Q116 28 122 18"/>
  <circle cx="122" cy="18" r="4"/>
  <path d="M94 80 Q56 52 40 76 Q32 100 56 118 Q76 128 94 112"/>
  <path d="M106 80 Q144 52 160 76 Q168 100 144 118 Q124 128 106 112"/>
  <path d="M94 112 Q62 120 50 140 Q52 162 76 156 Q94 146 96 128"/>
  <path d="M106 112 Q138 120 150 140 Q148 162 124 156 Q106 146 104 128"/>
  <circle cx="66" cy="88" r="10"/>
  <circle cx="134" cy="88" r="10"/>
  <circle cx="68" cy="140" r="8"/>
  <circle cx="132" cy="140" r="8"/>
</svg>`,

  pez: `<svg ${SVG_ATTRS}>
  <!-- body -->
  <ellipse cx="92" cy="100" rx="62" ry="48"/>
  <!-- tail fin -->
  <path d="M150 100 Q178 68 174 50 Q158 74 150 100"/>
  <path d="M150 100 Q178 132 174 150 Q158 126 150 100"/>
  <!-- eye -->
  <circle cx="62" cy="90" r="14"/>
  <circle cx="62" cy="90" r="6" fill="black"/>
  <!-- mouth -->
  <path d="M32 104 Q38 116 48 108"/>
  <!-- top fin -->
  <path d="M78 54 Q96 28 118 50 Q104 56 78 54"/>
  <!-- bottom fin -->
  <path d="M84 146 Q72 172 56 166 Q68 152 84 146"/>
  <!-- scales: simple arc rows -->
  <path d="M88 74 Q100 64 112 74"/>
  <path d="M108 80 Q120 70 132 80"/>
  <path d="M122 94 Q134 84 146 94"/>
  <path d="M100 96 Q112 86 124 96"/>
  <path d="M108 112 Q120 102 132 112"/>
  <path d="M88 120 Q100 110 112 120"/>
</svg>`,

  pajaro: `<svg ${SVG_ATTRS}>
  <ellipse cx="104" cy="124" rx="50" ry="36"/>
  <circle cx="76" cy="80" r="28"/>
  <path d="M50 78 L32 72 L48 86"/>
  <path d="M50 86 L34 92 L48 92"/>
  <circle cx="68" cy="72" r="8"/>
  <circle cx="68" cy="72" r="4" fill="black"/>
  <path d="M90 118 Q120 98 152 112 Q144 138 118 148 Q94 148 90 118Z"/>
  <path d="M98 122 Q122 108 146 118"/>
  <path d="M96 132 Q120 120 144 130"/>
  <path d="M148 128 Q172 118 176 104"/>
  <path d="M150 136 Q174 132 180 118"/>
  <line x1="88" y1="158" x2="84" y2="180"/>
  <line x1="84" y1="180" x2="70" y2="184"/>
  <line x1="84" y1="180" x2="96" y2="188"/>
  <line x1="116" y1="158" x2="112" y2="180"/>
  <line x1="112" y1="180" x2="98" y2="184"/>
  <line x1="112" y1="180" x2="124" y2="188"/>
</svg>`,

  elefante: `<svg ${SVG_ATTRS}>
  <ellipse cx="108" cy="132" rx="66" ry="48"/>
  <ellipse cx="64" cy="78" rx="38" ry="34"/>
  <path d="M38 64 Q10 44 8 80 Q12 118 44 110 Q52 96 40 80"/>
  <path d="M88 62 Q108 54 110 70 Q108 84 90 82"/>
  <path d="M36 94 Q20 102 18 118 Q20 136 28 148 Q36 158 32 168"/>
  <path d="M32 168 Q22 176 26 184 Q34 188 40 182"/>
  <circle cx="58" cy="68" r="7"/>
  <circle cx="58" cy="68" r="3.5" fill="black"/>
  <path d="M68 172 L64 196 Q72 200 80 196 L78 172"/>
  <path d="M96 172 L94 196 Q102 200 110 196 L108 172"/>
  <path d="M120 170 L118 196 Q126 200 134 196 L132 170"/>
  <path d="M144 168 L142 196 Q150 200 158 196 L156 168"/>
  <path d="M172 120 Q184 112 182 100 Q184 92 178 94 Q176 98 180 100"/>
</svg>`,

  sol: `<svg ${SVG_ATTRS}>
  <circle cx="100" cy="100" r="42"/>
  <circle cx="88" cy="94" r="5" fill="black"/>
  <circle cx="112" cy="94" r="5" fill="black"/>
  <path d="M82 112 Q100 126 118 112"/>
  <line x1="100" y1="52" x2="100" y2="30"/>
  <line x1="123" y1="59" x2="138" y2="42"/>
  <line x1="145" y1="100" x2="170" y2="100"/>
  <line x1="123" y1="141" x2="138" y2="158"/>
  <line x1="100" y1="148" x2="100" y2="170"/>
  <line x1="77" y1="141" x2="62" y2="158"/>
  <line x1="55" y1="100" x2="30" y2="100"/>
  <line x1="77" y1="59" x2="62" y2="42"/>
  <line x1="116" y1="56" x2="126" y2="38"/>
  <line x1="144" y1="84" x2="166" y2="78"/>
  <line x1="144" y1="116" x2="166" y2="122"/>
  <line x1="116" y1="144" x2="126" y2="162"/>
  <line x1="84" y1="144" x2="74" y2="162"/>
  <line x1="56" y1="116" x2="34" y2="122"/>
  <line x1="56" y1="84" x2="34" y2="78"/>
  <line x1="84" y1="56" x2="74" y2="38"/>
</svg>`,

  casa: `<svg ${SVG_ATTRS}>
  <rect x="28" y="108" width="144" height="82" rx="4"/>
  <path d="M18 112 L100 30 L182 112"/>
  <rect x="134" y="44" width="22" height="36"/>
  <path d="M134 44 Q134 36 145 34 Q156 36 156 44"/>
  <path d="M82 190 L82 152 Q100 142 118 152 L118 190"/>
  <circle cx="82" cy="170" r="3" fill="black"/>
  <rect x="36" y="122" width="44" height="38" rx="4"/>
  <line x1="58" y1="122" x2="58" y2="160"/>
  <line x1="36" y1="141" x2="80" y2="141"/>
  <rect x="120" y="122" width="44" height="38" rx="4"/>
  <line x1="142" y1="122" x2="142" y2="160"/>
  <line x1="120" y1="141" x2="164" y2="141"/>
  <path d="M60 90 Q100 64 140 90"/>
</svg>`,

  arbol: `<svg ${SVG_ATTRS}>
  <rect x="86" y="148" width="28" height="46" rx="6"/>
  <path d="M86 188 Q68 192 60 200"/>
  <path d="M114 188 Q132 192 140 200"/>
  <path d="M18 152 Q30 120 60 116 Q70 96 86 96 Q90 88 100 86 Q110 88 114 96 Q130 96 140 116 Q170 120 182 152 Z"/>
  <path d="M34 120 Q48 90 70 86 Q78 68 90 64 Q100 60 110 64 Q122 68 130 86 Q152 90 166 120 Z"/>
  <path d="M52 96 Q64 66 82 58 Q90 44 100 42 Q110 44 118 58 Q136 66 148 96 Z"/>
  <path d="M64 84 Q72 72 80 80"/>
  <path d="M120 80 Q128 72 136 84"/>
  <path d="M84 64 Q92 52 100 58"/>
  <path d="M100 58 Q108 52 116 64"/>
</svg>`,

  corazon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" stroke="black" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none">
  <path d="M100 170 Q48 138 32 104 Q18 72 40 54 Q60 38 80 48 Q92 54 100 66 Q108 54 120 48 Q140 38 160 54 Q182 72 168 104 Q152 138 100 170 Z"/>
  <path d="M62 64 Q56 80 66 96"/>
  <circle cx="72" cy="114" r="10"/>
  <circle cx="128" cy="114" r="10"/>
  <path d="M82 106 Q100 120 118 106"/>
</svg>`,

  // ── NEW subjects ─────────────────────────────────────────────────────────

  oso: `<svg ${SVG_ATTRS}>
  <!-- body -->
  <ellipse cx="100" cy="138" rx="52" ry="46"/>
  <!-- head -->
  <circle cx="100" cy="76" r="36"/>
  <!-- ears: big outer + smaller inner -->
  <circle cx="72" cy="48" r="20"/>
  <circle cx="72" cy="48" r="11"/>
  <circle cx="128" cy="48" r="20"/>
  <circle cx="128" cy="48" r="11"/>
  <!-- muzzle -->
  <ellipse cx="100" cy="90" rx="20" ry="14"/>
  <!-- eyes -->
  <circle cx="86" cy="66" r="6" fill="black"/>
  <circle cx="114" cy="66" r="6" fill="black"/>
  <!-- nose -->
  <ellipse cx="100" cy="83" rx="7" ry="5" fill="black"/>
  <!-- mouth -->
  <path d="M92 90 Q100 100 108 90"/>
  <!-- legs -->
  <path d="M72 174 L68 196 Q78 200 86 196 L84 174"/>
  <path d="M128 174 L124 196 Q132 200 140 196 L136 174"/>
  <path d="M56 154 L50 194 Q60 198 68 194 L66 154"/>
  <path d="M144 154 L138 194 Q148 198 156 194 L152 154"/>
</svg>`,

  flor: `<svg ${SVG_ATTRS}>
  <!-- petals: 6 large ellipses around center -->
  <ellipse cx="100" cy="52" rx="18" ry="30"/>
  <ellipse cx="100" cy="148" rx="18" ry="30"/>
  <ellipse cx="52" cy="100" rx="30" ry="18"/>
  <ellipse cx="148" cy="100" rx="30" ry="18"/>
  <ellipse cx="65" cy="65" rx="22" ry="14" transform="rotate(-45 65 65)"/>
  <ellipse cx="135" cy="65" rx="22" ry="14" transform="rotate(45 135 65)"/>
  <ellipse cx="65" cy="135" rx="22" ry="14" transform="rotate(45 65 135)"/>
  <ellipse cx="135" cy="135" rx="22" ry="14" transform="rotate(-45 135 135)"/>
  <!-- center -->
  <circle cx="100" cy="100" r="26"/>
  <!-- face -->
  <circle cx="91" cy="96" r="5" fill="black"/>
  <circle cx="109" cy="96" r="5" fill="black"/>
  <path d="M88 108 Q100 118 112 108"/>
  <!-- stem -->
  <line x1="100" y1="170" x2="100" y2="198"/>
  <!-- leaves -->
  <path d="M100 186 Q78 176 68 182 Q74 194 100 186"/>
  <path d="M100 178 Q122 168 132 174 Q126 186 100 178"/>
</svg>`,

  estrella: `<svg ${SVG_ATTRS}>
  <!-- big 5-point star -->
  <path d="M100 12 L120 72 L184 72 L132 108 L152 168 L100 132 L48 168 L68 108 L16 72 L80 72 Z"/>
  <!-- face in center -->
  <circle cx="88" cy="90" r="6" fill="black"/>
  <circle cx="112" cy="90" r="6" fill="black"/>
  <path d="M84 106 Q100 120 116 106"/>
  <!-- sparkle dots on points -->
  <circle cx="100" cy="22" r="4" fill="black"/>
  <circle cx="172" cy="78" r="4" fill="black"/>
  <circle cx="142" cy="160" r="4" fill="black"/>
  <circle cx="58" cy="160" r="4" fill="black"/>
  <circle cx="28" cy="78" r="4" fill="black"/>
</svg>`,

  helado: `<svg ${SVG_ATTRS}>
  <!-- two scoops stacked -->
  <circle cx="100" cy="88" r="40"/>
  <circle cx="100" cy="52" r="30"/>
  <!-- cone -->
  <path d="M62 112 L100 196 L138 112 Z"/>
  <!-- cone waffle lines -->
  <line x1="72" y1="126" x2="128" y2="126"/>
  <line x1="66" y1="144" x2="134" y2="144"/>
  <line x1="82" y1="112" x2="100" y2="196"/>
  <line x1="118" y1="112" x2="100" y2="196"/>
  <!-- face on bottom scoop -->
  <circle cx="88" cy="90" r="5" fill="black"/>
  <circle cx="112" cy="90" r="5" fill="black"/>
  <path d="M88 102 Q100 112 112 102"/>
  <!-- sprinkles on top scoop -->
  <line x1="90" y1="40" x2="96" y2="34" stroke-width="5" stroke-linecap="round"/>
  <line x1="106" y1="36" x2="112" y2="42" stroke-width="5" stroke-linecap="round"/>
  <line x1="98" y1="52" x2="98" y2="44" stroke-width="5" stroke-linecap="round"/>
</svg>`,

  nube: `<svg ${SVG_ATTRS}>
  <!-- cloud body: overlapping bumps + flat bottom -->
  <path d="M30 148 L30 132 Q30 110 54 110 Q56 84 80 80 Q88 58 110 60 Q132 58 142 78 Q164 76 168 98 Q186 100 184 122 Q182 142 160 146 L30 148 Z"/>
  <!-- face -->
  <circle cx="84" cy="108" r="6" fill="black"/>
  <circle cx="118" cy="108" r="6" fill="black"/>
  <path d="M88 124 Q100 136 114 124"/>
  <!-- raindrops -->
  <path d="M60 160 Q60 174 64 180 Q68 174 68 160"/>
  <path d="M94 164 Q94 180 98 186 Q102 180 102 164"/>
  <path d="M130 160 Q130 174 134 180 Q138 174 138 160"/>
</svg>`,

  pelota: `<svg ${SVG_ATTRS}>
  <!-- ball outline -->
  <circle cx="100" cy="100" r="80"/>
  <!-- stripe decoration -->
  <path d="M28 72 Q100 48 172 72"/>
  <path d="M20 100 Q100 76 180 100"/>
  <path d="M28 128 Q100 152 172 128"/>
  <!-- face -->
  <circle cx="86" cy="96" r="7" fill="black"/>
  <circle cx="114" cy="96" r="7" fill="black"/>
  <path d="M84 112 Q100 128 116 112"/>
</svg>`,
};

/**
 * COLORING_DATA — subjects available for free drawing.
 * Each subject has one or more SVG variants.
 */
export const COLORING_DATA = {
  perro:     { label: "Perro",      emoji: "🐶", variants: [
    { id: "perro_1",   label: "Perrito",      svg: svgs.perro_1 },
    { id: "perro_2",   label: "Perro alegre", svg: svgs.perro_2 },
  ]},
  gato:      { label: "Gato",       emoji: "🐱", variants: [
    { id: "gato_1",    label: "Gatito",        svg: svgs.gato_1 },
    { id: "gato_2",    label: "Gato curioso",  svg: svgs.gato_2 },
  ]},
  pato:      { label: "Pato",       emoji: "🦆", variants: [{ id: "pato",      label: "Pato",      svg: svgs.pato }]},
  conejo:    { label: "Conejo",     emoji: "🐰", variants: [{ id: "conejo",    label: "Conejo",    svg: svgs.conejo }]},
  mariposa:  { label: "Mariposa",   emoji: "🦋", variants: [{ id: "mariposa",  label: "Mariposa",  svg: svgs.mariposa }]},
  pez:       { label: "Pez",        emoji: "🐟", variants: [{ id: "pez",       label: "Pez",       svg: svgs.pez }]},
  pajaro:    { label: "Pájaro",     emoji: "🐦", variants: [{ id: "pajaro",    label: "Pájaro",    svg: svgs.pajaro }]},
  elefante:  { label: "Elefante",   emoji: "🐘", variants: [{ id: "elefante",  label: "Elefante",  svg: svgs.elefante }]},
  sol:       { label: "Sol",        emoji: "☀️", variants: [{ id: "sol",       label: "Sol",       svg: svgs.sol }]},
  casa:      { label: "Casa",       emoji: "🏠", variants: [{ id: "casa",      label: "Casa",      svg: svgs.casa }]},
  arbol:     { label: "Árbol",      emoji: "🌳", variants: [{ id: "arbol",     label: "Árbol",     svg: svgs.arbol }]},
  corazon:   { label: "Corazón",    emoji: "❤️", variants: [{ id: "corazon",   label: "Corazón",   svg: svgs.corazon }]},
  oso:       { label: "Oso",        emoji: "🐻", variants: [{ id: "oso",       label: "Osito",     svg: svgs.oso }]},
  flor:      { label: "Flor",       emoji: "🌸", variants: [{ id: "flor",      label: "Flor",      svg: svgs.flor }]},
  estrella:  { label: "Estrella",   emoji: "⭐", variants: [{ id: "estrella",  label: "Estrella",  svg: svgs.estrella }]},
  helado:    { label: "Helado",     emoji: "🍦", variants: [{ id: "helado",    label: "Helado",    svg: svgs.helado }]},
  nube:      { label: "Nube",       emoji: "☁️", variants: [{ id: "nube",      label: "Nube",      svg: svgs.nube }]},
  pelota:    { label: "Pelota",     emoji: "⚽", variants: [{ id: "pelota",    label: "Pelota",    svg: svgs.pelota }]},
};

/** Returns a random subject key different from the one currently active. */
export function getRandomDifferentSubject(currentSubject) {
  const keys = Object.keys(COLORING_DATA).filter(k => k !== currentSubject);
  return keys[Math.floor(Math.random() * keys.length)];
}

/** Returns a random variant for a given subject key, or random subject if key not found. */
export function getColoringVariant(subject) {
  const entry = COLORING_DATA[subject];
  if (!entry) {
    const keys = Object.keys(COLORING_DATA);
    const random = COLORING_DATA[keys[Math.floor(Math.random() * keys.length)]];
    return random.variants[0];
  }
  const idx = Math.floor(Math.random() * entry.variants.length);
  return entry.variants[idx];
}

/** Returns all subjects as a flat array for the subject-picker UI. */
export const ALL_SUBJECTS = Object.entries(COLORING_DATA).map(([key, val]) => ({
  key,
  label: val.label,
  emoji: val.emoji,
}));