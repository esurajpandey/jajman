import { useState } from 'react';
import { TextField } from '../ui/TextField';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import type { Address, AddressType } from '../../mock/types';

const TYPES: { value: AddressType; label: string }[] = [
  { value: 'home', label: 'Home' }, { value: 'parents', label: 'Parents' }, { value: 'relative', label: 'Relative' },
  { value: 'temple', label: 'Temple' }, { value: 'custom', label: 'Custom' },
];

export function AddressForm({ initial, onSave, submitLabel = 'Save address' }: { initial?: Partial<Address>; onSave: (a: Omit<Address, 'id'>) => void; submitLabel?: string }) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [type, setType] = useState<AddressType>(initial?.type ?? 'home');
  const [line, setLine] = useState(initial?.line ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const valid = label.trim() && line.trim() && city.trim();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="mb-1 block text-sm font-medium">Type</span>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => <Chip key={t.value} label={t.label} selected={type === t.value} onClick={() => setType(t.value)} />)}
        </div>
      </div>
      <TextField label="Label" name="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Home" />
      <TextField label="Address" name="line" value={line} onChange={(e) => setLine(e.target.value)} placeholder="Flat, building, street, area" />
      <TextField label="City" name="city" value={city} onChange={(e) => setCity(e.target.value)} />
      <TextField label="Notes (optional)" name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Parking, landmark…" />
      {/* Mock map pin — decorative for the prototype */}
      <div className="flex items-center justify-center rounded-md border border-dashed border-border bg-surface-2 py-6 text-xs text-muted">📍 Location pin (mock)</div>
      <Button disabled={!valid} onClick={() => onSave({ label: label.trim(), type, line: line.trim(), city: city.trim(), notes: notes.trim() || undefined })}>{submitLabel}</Button>
    </div>
  );
}
