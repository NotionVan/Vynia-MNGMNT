import { ESTADOS, ESTADO_PROGRESS } from "../constants/estados.js";

// ─── ESTADO GAUGE (half-circle SVG) ───
export default function EstadoGauge({ estado, size = 44 }) {
  const cfg = ESTADOS[estado] || ESTADOS["Sin empezar"];
  const progress = ESTADO_PROGRESS[estado] ?? 0;
  const h = Math.round(size * 0.6);
  const r = Math.round(size * 0.36);
  const cx = size / 2;
  const cy = h - 2;
  const semi = Math.PI * r;
  const offset = semi * (1 - progress);
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} style={{ flexShrink: 0 }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={cfg.bg} strokeWidth="4" strokeLinecap="round" />
      {progress > 0 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={cfg.color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={semi} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.65, 0, 0.35, 1)" }} />
      )}
    </svg>
  );
}
