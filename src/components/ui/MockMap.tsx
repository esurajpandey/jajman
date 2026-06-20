import { MapPin } from 'lucide-react';
import type { PanditSummary } from '../../mock/types';

/** A purely decorative mock map: a soft grid backdrop with pins placed deterministically by index. */
export function MockMap({
  pandits,
  selectedId,
  onSelect,
}: {
  pandits: PanditSummary[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-surface-2">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {pandits.map((p, i) => {
        const left = 12 + ((i * 37) % 76);
        const top = 14 + ((i * 53) % 68);
        const active = p.id === selectedId;
        return (
          <button
            key={p.id}
            type="button"
            aria-label={`Pandit ${p.name}`}
            onClick={() => onSelect?.(p.id)}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <MapPin
              size={active ? 34 : 26}
              className={active ? 'fill-primary text-primary' : 'fill-secondary text-secondary'}
            />
          </button>
        );
      })}
    </div>
  );
}
