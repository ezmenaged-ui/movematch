/* Hand-drawn brand illustrations (inline SVG: no image requests, crisp at any size, no licensing).
   Palette: brand steel blue + warm orange accent + kraft boxes + a touch of green. */

const C = {
  blue: '#4f7cab', blueDark: '#2f557d', blueLight: '#dcebfa', glass: '#bfe0fb',
  orange: '#f59e3b', orangeDark: '#d97f1e', kraft: '#d9a46a', kraftDark: '#b98149', tape: '#efd2a6',
  ink: '#263240', tire: '#2b2f36', hub: '#c9d2dc', body: '#ffffff', bodyShade: '#eef2f7', line: '#d5dde7',
  green: '#4caf7a', greenDark: '#2f8a5a', pot: '#e07a4f', skin1: '#f1c7a1', skin2: '#a86b45', hair: '#3a2a20',
};

function Box({ x, y, w, h, tilt = 0 }: { x: number; y: number; w: number; h: number; tilt?: number }) {
  return (
    <g transform={`rotate(${tilt} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y} width={w} height={h} rx={4} fill={C.kraft} />
      <rect x={x} y={y} width={w} height={h * 0.16} rx={4} fill={C.kraftDark} opacity={0.35} />
      <rect x={x + w / 2 - w * 0.09} y={y} width={w * 0.18} height={h} fill={C.tape} opacity={0.9} />
      <rect x={x + w * 0.12} y={y + h * 0.58} width={w * 0.26} height={h * 0.16} rx={2} fill="#fff" opacity={0.75} />
    </g>
  );
}

function Wheel({ cx, cy, r = 34 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={C.tire} />
      <circle cx={cx} cy={cy} r={r * 0.52} fill={C.hub} />
      <circle cx={cx} cy={cy} r={r * 0.18} fill={C.tire} />
    </g>
  );
}

/** Side-view box truck. Drawn in a 0 0 600 300 box, cab on the left. */
function Truck({ x = 0, y = 0, s = 1, open = false }: { x?: number; y?: number; s?: number; open?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* cargo box */}
      <rect x={190} y={20} width={400} height={210} rx={14} fill={C.body} stroke={C.line} strokeWidth={3} />
      <rect x={190} y={190} width={400} height={40} rx={0} fill={C.bodyShade} />
      <rect x={190} y={150} width={400} height={18} fill={C.blue} />
      <rect x={190} y={168} width={400} height={7} fill={C.orange} />
      <text x={390} y={118} textAnchor="middle" fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif" fontWeight={700} fontSize={64} letterSpacing={2} fill={C.blueDark}>MOVEMATCH</text>
      <text x={390} y={142} textAnchor="middle" fontFamily="'Heebo', 'Assistant', sans-serif" fontWeight={600} fontSize={20} fill={C.orangeDark}>5 הצעות · מובילים מדורגים</text>
      {open && (
        <g>
          <rect x={548} y={36} width={38} height={150} fill={C.ink} opacity={0.85} />
          <Box x={552} y={120} w={30} h={30} />
          <Box x={552} y={86} w={30} h={30} />
        </g>
      )}
      {/* chassis */}
      <rect x={30} y={226} width={565} height={22} rx={6} fill={C.ink} />
      {/* cab */}
      <path d="M190 64 H118 C104 64 96 70 90 82 L52 150 C46 160 44 168 44 180 V234 H190 Z" fill={C.blue} />
      <path d="M176 82 H124 C116 82 112 86 108 93 L80 148 H176 Z" fill={C.glass} />
      <path d="M118 90 L100 128" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
      <rect x={150} y={168} width={22} height={6} rx={3} fill={C.blueDark} />
      <rect x={36} y={200} width={20} height={16} rx={4} fill="#ffd166" />
      <rect x={30} y={222} width={40} height={12} rx={5} fill={C.ink} />
      <rect x={58} y={160} width={132} height={8} fill={C.orange} />
      {/* wheels */}
      <Wheel cx={120} cy={248} />
      <Wheel cx={430} cy={248} />
      <Wheel cx={515} cy={248} />
    </g>
  );
}

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M30 0 C10 10 6 34 24 50 C26 30 30 18 30 0Z" fill={C.green} />
      <path d="M32 6 C52 14 58 36 40 52 C38 32 34 22 32 6Z" fill={C.greenDark} />
      <path d="M31 20 C20 30 18 44 30 56 C32 42 32 32 31 20Z" fill={C.green} />
      <path d="M12 54 H52 L46 92 H18 Z" fill={C.pot} />
      <rect x={10} y={50} width={44} height={10} rx={3} fill="#c9653d" />
    </g>
  );
}

function Mover({ x, y, shirt, skin, flip = false }: { x: number; y: number; shirt: string; skin: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      {/* legs */}
      <path d="M-14 120 L-20 190" stroke={C.ink} strokeWidth={18} strokeLinecap="round" />
      <path d="M12 120 L22 190" stroke={C.ink} strokeWidth={18} strokeLinecap="round" />
      <ellipse cx={-22} cy={194} rx={16} ry={7} fill={C.tire} />
      <ellipse cx={26} cy={194} rx={16} ry={7} fill={C.tire} />
      {/* body */}
      <path d="M-28 50 C-28 36 -18 30 0 30 C18 30 28 36 28 50 V122 H-28 Z" fill={shirt} />
      <rect x={-28} y={108} width={56} height={14} fill={C.ink} opacity={0.25} />
      {/* head */}
      <circle cx={0} cy={6} r={22} fill={skin} />
      <path d="M-23 2 C-23 -18 23 -18 23 2 Z" fill={C.blue} />
      <rect x={4} y={-2} width={30} height={8} rx={4} fill={C.blueDark} />
      <circle cx={8} cy={10} r={2.6} fill={C.ink} />
      <path d="M6 19 Q12 23 17 18" stroke={C.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      {/* arms reaching forward to the box */}
      <path d="M10 52 L52 74" stroke={shirt} strokeWidth={16} strokeLinecap="round" />
      <circle cx={56} cy={76} r={9} fill={skin} />
    </g>
  );
}

/** Clean truck on white with boxes and a plant (V1 hero, V3 hero). */
export function TruckScene({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  if (compact) {
    return (
      <svg className={className} viewBox="0 0 900 200" role="img" aria-label="משאית הובלה של MoveMatch" preserveAspectRatio="xMidYMid meet">
        <rect width="900" height="200" fill="#fff" />
        <path d="M0 176 H900" stroke={C.line} strokeWidth={3} />
        <g opacity={0.5} stroke={C.blueLight} strokeWidth={8} strokeLinecap="round"><path d="M70 90 H150" /><path d="M40 120 H130" /></g>
        <Truck x={200} y={10} s={0.62} />
        <Box x={640} y={124} w={56} h={50} />
        <Box x={700} y={134} w={44} h={40} />
        <Box x={650} y={82} w={44} h={42} tilt={-4} />
        <Plant x={760} y={102} s={0.8} />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 720 560" role="img" aria-label="משאית הובלה נקייה של MoveMatch עם ארגזים" preserveAspectRatio="xMidYMid meet">
      <rect width="720" height="560" fill="#fff" />
      <circle cx="380" cy="250" r="230" fill={C.blueLight} opacity={0.55} />
      <circle cx="610" cy="110" r="38" fill="#ffe2b8" />
      <g stroke={C.blueLight} strokeWidth={10} strokeLinecap="round"><path d="M40 300 H110" /><path d="M20 340 H90" /></g>
      <ellipse cx="300" cy="438" rx="280" ry="14" fill={C.ink} opacity={0.08} />
      <Truck x={30} y={196} s={0.84} />
      <Box x={540} y={392} w={66} h={58} />
      <Box x={610} y={404} w={52} h={46} />
      <Box x={552} y={338} w={52} h={52} tilt={-5} />
      <Plant x={672} y={386} s={0.6} />
      <path d="M40 452 H690" stroke={C.line} strokeWidth={3} />
    </svg>
  );
}

/** Two friendly movers carrying a box toward an open truck (V2 wizard side panel). */
export function MoversScene({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  return (
    <svg className={className} viewBox={compact ? '20 200 600 280' : '0 0 640 560'} role="img" aria-label="מובילים מחייכים מעמיסים ארגז למשאית" preserveAspectRatio="xMidYMid meet">
      <rect width="640" height="560" fill="#fff" />
      <circle cx="330" cy="260" r="230" fill={C.blueLight} opacity={0.55} />
      <circle cx="540" cy="92" r="34" fill="#ffe2b8" />
      <ellipse cx="320" cy="470" rx="290" ry="14" fill={C.ink} opacity={0.08} />
      {/* truck rear, open */}
      <g transform="translate(330 150)">
        <rect x={0} y={0} width={270} height={250} rx={14} fill={C.body} stroke={C.line} strokeWidth={3} />
        <rect x={18} y={18} width={234} height={200} rx={6} fill={C.ink} opacity={0.88} />
        <Box x={34} y={150} w={62} h={58} />
        <Box x={100} y={162} w={50} h={46} />
        <Box x={40} y={96} w={52} h={52} tilt={-3} />
        <Box x={170} y={140} w={66} h={68} />
        <rect x={0} y={218} width={270} height={14} fill={C.blue} />
        <rect x={0} y={232} width={270} height={6} fill={C.orange} />
        <rect x={-6} y={238} width={282} height={26} rx={6} fill={C.ink} />
        <rect x={60} y={264} width={150} height={10} rx={3} fill={C.tire} />
      </g>
      {/* movers + box */}
      <Mover x={110} y={262} shirt={C.orange} skin={C.skin1} />
      <Mover x={300} y={262} shirt={C.blue} skin={C.skin2} flip />
      <Box x={150} y={290} w={110} h={88} />
      <Plant x={30} y={378} s={0.9} />
      <path d="M20 470 H620" stroke={C.line} strokeWidth={3} />
    </svg>
  );
}
