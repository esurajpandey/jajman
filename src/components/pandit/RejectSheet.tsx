import { useState } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';

const REASONS = ['Not available that day', 'Outside my service area', 'Puja not offered', 'Charges not feasible', 'Other'];

export function RejectSheet({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const valid = reason !== null && (reason !== 'Other' || note.trim().length > 0);
  const finalReason = reason === 'Other' ? note.trim() : (reason ?? '');

  return (
    <BottomSheet open={open} onClose={onClose} title="Reject this request?">
      <div className="flex flex-wrap gap-2">
        {REASONS.map((r) => <Chip key={r} label={r} selected={reason === r} onClick={() => setReason(r)} />)}
      </div>
      {reason === 'Other' && (
        <textarea value={note} onChange={(e) => setNote(e.target.value)} aria-label="Reason note" rows={2} placeholder="Tell the jajman why…" className="mt-3 w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-primary" />
      )}
      <p className="mt-3 text-xs text-muted">We'll suggest other pandits to the jajman.</p>
      <Button className="mt-3 w-full border-error text-error" variant="outline" disabled={!valid} onClick={() => onConfirm(finalReason)}>Confirm reject</Button>
    </BottomSheet>
  );
}
