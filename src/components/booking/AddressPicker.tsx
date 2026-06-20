import { Check, MapPin, Plus } from 'lucide-react';
import type { Address } from '../../mock/types';
import { cn } from '../../lib/cn';

export function AddressPicker({
  addresses,
  selectedId,
  onSelect,
  onAdd,
}: {
  addresses: Address[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {addresses.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onSelect(a.id)}
          className={cn(
            'flex items-start gap-3 rounded-md border p-3 text-left',
            selectedId === a.id ? 'border-primary bg-primary/5' : 'border-border bg-surface',
          )}
        >
          <MapPin size={18} className="mt-0.5 text-primary" />
          <span className="flex-1">
            <span className="block text-sm font-medium">{a.label}</span>
            <span className="block text-xs text-muted">{a.line}, {a.city}</span>
          </span>
          {selectedId === a.id && <Check size={18} className="text-primary" />}
        </button>
      ))}
      <button type="button" onClick={onAdd} className="flex items-center gap-2 rounded-md border border-dashed border-border p-3 text-sm text-primary">
        <Plus size={16} /> Add a new address
      </button>
    </div>
  );
}
