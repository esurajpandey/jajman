import { useState } from 'react';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import type { Puja } from '../../../mock/types';

export function PujaChargeSheet({ puja, open, onClose, onAdd }: { puja: Puja | null; open: boolean; onClose: () => void; onAdd: (charge: number, durationMins: number) => void }) {
  const [charge, setCharge] = useState('');
  const [duration, setDuration] = useState('');
  if (!puja) return null;
  const chargeNum = Number(charge) || 0;
  const out = chargeNum > 0 && (chargeNum < puja.minAmount || chargeNum > puja.maxAmount);
  return (
    <BottomSheet open={open} onClose={onClose} title={puja.name}>
      <p className="mb-3 text-xs text-muted">Suggested: {puja.suggestedDurationMins} min · ₹{puja.minAmount}–₹{puja.maxAmount}</p>
      <div className="flex flex-col gap-3">
        <TextField label="Your charge (₹)" name="charge" inputMode="numeric" value={charge} onChange={(e) => setCharge(e.target.value.replace(/\D/g, ''))} placeholder={String(puja.minAmount)} />
        {out && <p className="-mt-2 text-xs text-warning">Below/above suggested range — admin may review.</p>}
        <TextField label="Duration (min)" name="duration" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ''))} placeholder={String(puja.suggestedDurationMins)} />
        <Button disabled={chargeNum <= 0} onClick={() => onAdd(chargeNum, Number(duration) || puja.suggestedDurationMins)}>Add this puja</Button>
      </div>
    </BottomSheet>
  );
}
