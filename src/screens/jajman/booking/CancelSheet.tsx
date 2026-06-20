import { useState } from 'react';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { RefundBreakdown } from '../../../components/ui/RefundBreakdown';
import { computeRefund } from '../../../domain/money';
import type { Booking } from '../../../mock/types';

export function CancelSheet({ open, booking, onClose, onConfirm }: { open: boolean; booking: Booking; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  const { refundAmount, platformCut } = computeRefund(booking.amountPaid, 'jajman');
  return (
    <BottomSheet open={open} onClose={onClose} title="Cancel booking"
      footer={<Button className="w-full" onClick={() => onConfirm(reason)}>Confirm cancellation</Button>}>
      <p className="mb-3 text-sm text-muted">Cancelling this booking{booking.amountPaid > 0 ? ' will refund your advance minus a 5% platform cut.' : '.'}</p>
      {booking.amountPaid > 0 && <div className="mb-3"><RefundBreakdown amountPaid={booking.amountPaid} platformCut={platformCut} refundAmount={refundAmount} /></div>}
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason" rows={2}
        placeholder="Reason (optional)" className="w-full rounded-md border border-border bg-surface p-2 text-sm outline-none focus:border-primary" />
    </BottomSheet>
  );
}
