function Sparkline({ data = [], width = 80, height = 28, colorClass = "stroke-primary" }) {
  if (!data.length) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = data.length === 1 ? 0 : width / (data.length - 1);
  const points = data.map((value, index) => {
    const x = data.length === 1 ? width / 2 : index * step;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const polyline = points.map((p) => p.join(",")).join(" ");
  const polygon = `0,${height} ${polyline} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polygon points={polygon} className="fill-primary opacity-[0.12]" />
      <polyline
        points={polyline}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={colorClass}
      />
    </svg>
  );
}

export default Sparkline;
