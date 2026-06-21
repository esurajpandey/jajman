import type { SeriesBucket } from '../../domain/earnings';

export function MiniBarChart({ data }: { data: SeriesBucket[] }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted">No earnings yet.</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-36 items-end gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <div
            className="w-full rounded-t bg-primary"
            style={{ height: `${Math.max(2, Math.round((d.value / max) * 100))}%` }}
            aria-label={`${d.label}: ₹${d.value}`}
          />
          <span className="text-[10px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
