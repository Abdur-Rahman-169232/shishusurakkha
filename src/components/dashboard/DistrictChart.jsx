function DistrictChart({ data = [] }) {
  const rows = [...data].sort((a, b) => (b.registered || 0) - (a.registered || 0));
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No district data yet.</p>;
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const coverage = row.registered > 0 ? (row.given / (row.registered * 14)) * 100 : 0;
        const targetPct = row.registered > 0 ? (row.target / row.registered) * 100 : 0;
        return (
          <div key={row.district}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <p className="font-heading font-semibold text-foreground">{row.district}</p>
              <p className="text-xs text-muted-foreground">
                {row.registered} children · {Math.round(coverage)}% covered
              </p>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-500"
                style={{ width: `${Math.min(100, coverage)}%` }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-amber-500"
                style={{ left: `${Math.min(100, targetPct)}%` }}
                aria-hidden="true"
              />
            </div>
            {row.upazila ? <p className="mt-1 text-xs text-muted-foreground">{row.upazila}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

export default DistrictChart;
