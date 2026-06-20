import { useState } from 'react';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Chip } from '../../../components/ui/Chip';
import { Button } from '../../../components/ui/Button';
import type { RecurInterval } from '../../../mock/types';

const OPTS: { value: RecurInterval; label: string }[] = [
  { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'annual', label: 'Annual' },
];

export function RecurringSheet({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (i: RecurInterval) => void }) {
  const [interval, setInterval] = useState<RecurInterval>('monthly');
  return (
    <BottomSheet open={open} onClose={onClose} title="Make this recurring"
      footer={<Button className="w-full" onClick={() => onConfirm(interval)}>Create recurring booking</Button>}>
      <p className="mb-3 text-sm text-muted">We'll remind you and pre-fill this booking on your chosen cadence.</p>
      <div className="flex gap-2">
        {OPTS.map((o) => <Chip key={o.value} label={o.label} selected={interval === o.value} onClick={() => setInterval(o.value)} />)}
      </div>
    </BottomSheet>
  );
}
