import type { PanditSummary } from '../../mock/types';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { RatingStars } from './RatingStars';

export function PanditCard({ p, onClick }: { p: PanditSummary; onClick?: () => void }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`View ${p.name}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="flex cursor-pointer gap-3 p-3 transition active:scale-[0.99]"
    >
      <Avatar name={p.name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-semibold">{p.name}</h3>
          <RatingStars value={p.rating} count={p.ratingCount} />
        </div>
        <p className="truncate text-xs text-muted">{p.specializations.join(' • ')}</p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          <span>{p.city}</span>
          <span>•</span>
          <span>{p.distanceKm} km</span>
          <span>•</span>
          <span>{p.experienceYears}y exp</span>
        </div>
        <div className="mt-1 text-sm">
          <span className="text-muted">From </span>
          <span className="font-semibold text-text">₹{p.startingPrice}</span>
        </div>
      </div>
    </Card>
  );
}
