import { Star } from 'lucide-react';

export function RatingSummary({ value, count }: { value: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-3xl font-bold">{value.toFixed(1)}</span>
      <div>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={14} className={n <= Math.round(value) ? 'fill-accent text-accent' : 'text-border'} />
          ))}
        </div>
        <span className="text-xs text-muted">{count} reviews</span>
      </div>
    </div>
  );
}
