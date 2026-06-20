import type { Review } from '../../mock/types';

export function DistributionBars({ reviews }: { reviews: Review[] }) {
  const total = reviews.length || 1;
  return (
    <div className="flex flex-col gap-1">
      {[5, 4, 3, 2, 1].map((star) => {
        const n = reviews.filter((r) => Math.round(r.rating) === star).length;
        const pct = Math.round((n / total) * 100);
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-muted">{star}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-7 text-right text-muted">{n}</span>
          </div>
        );
      })}
    </div>
  );
}
