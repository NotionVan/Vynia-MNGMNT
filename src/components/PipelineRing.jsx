// ─── PIPELINE RING (full-circle SVG progress ring) ───
export default function PipelineRing({ count, total, color, bg }) {
  const size = 68;
  const sw = 5;
  const r = (size - sw) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? count / total : 0;
  const offset = circ * (1 - pct);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={bg} strokeWidth={sw} />
      {pct > 0 && (
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.65, 0, 0.35, 1)" }}
        />
      )}
    </svg>
  );
}
