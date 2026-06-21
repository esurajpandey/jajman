import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { Image, FileText, X } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { Card } from '../../../components/ui/Card';
import { useDisputeStore } from '../../../store/disputeStore';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';
import { REASON_LABEL } from '../../../lib/disputeLabels';
import type { BookingAttachment, DisputeReason } from '../../../mock/types';

const REASONS: DisputeReason[] = ['pandit_no_show', 'puja_incomplete', 'quality_issue', 'payment_issue', 'other'];

export function RaiseDisputeScreen() {
  const navigate = useNavigate();
  const { bookingId = '' } = useParams();
  const booking = useBookingStore((s) => s.getBooking(bookingId));
  const puja = useDataStore((s) => s.getPuja(booking?.pujaId ?? ''));
  const createDispute = useDisputeStore((s) => s.createDispute);

  const [reason, setReason] = useState<DisputeReason | null>(null);
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<BookingAttachment[]>([]);

  const addEvidence = (kind: 'image' | 'doc') =>
    setEvidence((e) => [...e, { id: `ev-${nanoid(5)}`, kind, name: kind === 'image' ? `photo-${e.length + 1}.jpg` : `doc-${e.length + 1}.pdf` }]);

  const valid = reason !== null && description.trim().length > 0;

  const submit = () => {
    if (!valid || !booking) return;
    const d = createDispute({ bookingId: booking.id, reasonCode: reason, description: description.trim(), evidence }, new Date().toISOString());
    navigate(`/app/disputes/${d.id}`, { replace: true });
  };

  if (!booking) {
    return <><AppBar title="Raise Dispute" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Booking not found.</div></>;
  }

  return (
    <>
      <AppBar title="Raise Dispute" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="mb-4 p-3">
          <p className="text-sm font-medium">{puja?.name ?? 'Booking'}</p>
          <p className="text-xs text-muted">{booking.slotLabel} · {booking.id}</p>
        </Card>

        <h2 className="mb-2 text-sm font-semibold">What went wrong?</h2>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <Chip key={r} label={REASON_LABEL[r]} selected={reason === r} onClick={() => setReason(r)} />
          ))}
        </div>

        <h2 className="mb-2 mt-5 text-sm font-semibold">Describe the issue</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Description"
          rows={4}
          placeholder="Tell us what happened…"
          className="w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-primary"
        />

        <h2 className="mb-2 mt-5 text-sm font-semibold">Evidence (optional)</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => addEvidence('image')} className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border py-3 text-sm"><Image size={16} /> Add photo</button>
          <button type="button" onClick={() => addEvidence('doc')} className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border py-3 text-sm"><FileText size={16} /> Add document</button>
        </div>
        {evidence.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {evidence.map((a) => (
              <span key={a.id} className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs">
                {a.name}
                <button type="button" aria-label={`Remove ${a.name}`} onClick={() => setEvidence((e) => e.filter((x) => x.id !== a.id))}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={!valid} onClick={submit}>Submit dispute</Button>
      </div>
    </>
  );
}
