import { Star } from 'lucide-react';

export function RatingStars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star size={14} className="fill-accent text-accent" />
      <span className="font-medium">{value.toFixed(1)}</span>
      {count != null && <span className="text-muted">({count})</span>}
    </span>
  );
}
