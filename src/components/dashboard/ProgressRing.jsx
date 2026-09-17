function ProgressRing({
  value = 0,
  max = 100,
  size = 64,
  stroke = 7,
  colorClass = "stroke-emerald-600",
  trackClass = "stroke-emerald-100",
  label,
  sublabel,
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const offset = circumference - (pct / 100) * circumference;
  const title = label || `${Math.round(pct)} percent`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          className={trackClass}
          strokeWidth={stroke}
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={colorClass}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-foreground">{Math.round(pct)}%</span>
        {sublabel ? <span className="text-[9px] text-muted-foreground">{sublabel}</span> : null}
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}

export default ProgressRing;
