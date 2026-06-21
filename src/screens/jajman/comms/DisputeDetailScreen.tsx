import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { Paperclip } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { DisputeStepper } from '../../../components/comms/DisputeStepper';
import { useDisputeStore } from '../../../store/disputeStore';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';
import { REASON_LABEL } from '../../../lib/disputeLabels';

export function DisputeDetailScreen() {
  const navigate = useNavigate();
  const { disputeId = '' } = useParams();
  const dispute = useDisputeStore((s) => s.getDispute(disputeId));
  const addEvidence = useDisputeStore((s) => s.addEvidence);
  const booking = useBookingStore((s) => s.getBooking(dispute?.bookingId ?? ''));
  const puja = useDataStore((s) => s.getPuja(booking?.pujaId ?? ''));

  if (!dispute) {
    return <><AppBar title="Dispute" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Dispute not found.</div></>;
  }

  return (
    <>
      <AppBar title={`Dispute #${dispute.id.slice(-4)}`} left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="mb-4 p-3">
          <p className="text-sm font-medium">{puja?.name ?? 'Booking'}</p>
          <p className="text-xs text-muted">Reason: {REASON_LABEL[dispute.reasonCode]}</p>
          <p className="mt-1 text-sm">{dispute.description}</p>
          {booking && (
            <button type="button" onClick={() => navigate(`/app/booking/${booking.id}`)} className="mt-2 text-xs font-medium text-primary">View booking</button>
          )}
        </Card>

        <h2 className="mb-2 text-sm font-semibold">Status</h2>
        <DisputeStepper status={dispute.status} />

        {dispute.evidence.length > 0 && (
          <>
            <h2 className="mb-2 mt-5 text-sm font-semibold">Your evidence</h2>
            <div className="flex flex-wrap gap-2">
              {dispute.evidence.map((e) => (
                <span key={e.id} className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs"><Paperclip size={12} /> {e.name}</span>
              ))}
            </div>
          </>
        )}

        {dispute.activity.length > 0 && (
          <>
            <h2 className="mb-2 mt-5 text-sm font-semibold">Activity</h2>
            <div className="flex flex-col gap-2">
              {dispute.activity.map((a, i) => (
                <div key={i} className="rounded-md border border-border bg-surface p-3 text-sm">
                  <p className="text-xs font-medium text-muted">{a.from === 'admin' ? 'Support team' : 'You'} · {a.at.slice(0, 10)}</p>
                  <p>{a.text}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {dispute.resolution && (
          <div className="mt-5 rounded-md border border-success/30 bg-success/5 p-3">
            <p className="text-sm font-semibold text-success">Resolved</p>
            <p className="text-sm">{dispute.resolution.note}</p>
            {dispute.resolution.refundAmount != null && <p className="mt-1 text-sm">Refund: ₹{dispute.resolution.refundAmount}</p>}
          </div>
        )}

        {(dispute.status === 'open' || dispute.status === 'under_review') && (
          <Button
            variant="outline"
            className="mt-5 w-full"
            onClick={() => addEvidence(dispute.id, { id: `ev-${nanoid(5)}`, kind: 'image', name: `evidence-${dispute.evidence.length + 1}.jpg` })}
          >
            <Paperclip size={16} /> Add more evidence (mock)
          </Button>
        )}
      </div>
    </>
  );
}
