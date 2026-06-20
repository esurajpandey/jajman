import { Star } from 'lucide-react';
import { cn } from '../../lib/cn';

export function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const v = Math.max(0, Math.min(5, value));
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)}>
          <Star size={32} className={cn(n <= v ? 'fill-accent text-accent' : 'text-border')} />
        </button>
      ))}
    </div>
  );
}
