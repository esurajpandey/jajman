import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { StatusStepper } from '../../../components/ui/StatusStepper';
import { MoneyBreakdown } from '../../../components/ui/MoneyBreakdown';
import { Countdown } from '../../../components/ui/Countdown';
import { RefundBreakdown } from '../../../components/ui/RefundBreakdown';
import { CancelSheet } from './CancelSheet';
import { RecurringSheet } from './RecurringSheet';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';
import { useChatStore } from '../../../store/chatStore';

export function BookingDetailScreen() {
  const navigate = useNavigate();
  const { bookingId = '' } = useParams();
  const booking = useBookingStore((s) => s.getBooking(bookingId));
  const simulateAccept = useBookingStore((s) => s.simulateAccept);
  const getAddress = useBookingStore((s) => s.getAddress);
  const cancelBooking = useBookingStore((s) => s.cancelBooking);
  const createRecurring = useBookingStore((s) => s.createRecurring);
  const pandit = useDataStore((s) => s.getPandit(booking?.panditId ?? ''));
  const puja = useDataStore((s) => s.getPuja(booking?.pujaId ?? ''));
  const ensureThread = useChatStore((s) => s.ensureThreadForBooking);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [recurOpen, setRecurOpen] = useState(false);

  if (!booking) {
    return <><AppBar title="Booking" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Booking not found.</div></>;
  }

  const remainingDue = (booking.status === 'completed' || booking.status === 'rated') && booking.amountPaid < booking.charges.subtotal;
  const canCancel = ['requested', 'accepted', 'advance_paid', 'scheduled'].includes(booking.status);

  return (
    <>
      <AppBar title="Booking" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold">{puja?.name}</h1>
            <p className="text-sm text-muted">{pandit?.name} · {booking.slotLabel}</p>
            <p className="text-xs text-muted">{getAddress(booking.addressId)?.label}</p>
          </div>
          {booking.isEmergency && <Badge className="bg-error/10 text-error">Urgent</Badge>}
        </div>

        {booking.status === 'requested' && (
          <div className="mb-4 rounded-md bg-surface-2 p-3 text-sm">
            Waiting for the pandit to accept · <Countdown deadlineISO={booking.requestExpiresAt} />
            <button onClick={() => simulateAccept(booking.id)} className="mt-2 block text-xs font-medium text-primary">
              (demo) simulate pandit accepts
            </button>
          </div>
        )}

        <div className="mb-4"><StatusStepper status={booking.status} /></div>

        {booking.cancellation && (
          <div className="mt-3">
            <p className="mb-2 text-sm font-medium text-error">Cancelled{booking.cancellation.reason ? ` · ${booking.cancellation.reason}` : ''}</p>
            {booking.amountPaid > 0 && <RefundBreakdown amountPaid={booking.amountPaid} platformCut={booking.cancellation.platformCut} refundAmount={booking.cancellation.refundAmount} />}
          </div>
        )}

        <MoneyBreakdown charges={booking.charges} advance={booking.advanceAmount} remaining={booking.remainingAmount} highlightAdvance={booking.status === 'accepted'} />
      </div>

      <div className="border-t border-border p-3 flex flex-col gap-2">
        {booking.status === 'accepted' && (
          <Button className="w-full" onClick={() => navigate(`/app/booking/${booking.id}/pay/advance`)}>
            Pay advance ₹{booking.advanceAmount}
          </Button>
        )}
        {remainingDue && (
          <Button className="w-full" onClick={() => navigate(`/app/booking/${booking.id}/pay/remaining`)}>
            Pay remaining ₹{booking.remainingAmount}
          </Button>
        )}
        {booking.status === 'completed' && (
          <Button className="w-full" onClick={() => navigate(`/app/booking/${booking.id}/rate`)}>
            Rate pandit
          </Button>
        )}
        {(booking.status === 'rated' || booking.status === 'completed') && (
          <Button variant="outline" className="w-full" onClick={() => navigate(`/app/book/${booking.panditId}?puja=${booking.pujaId}`)}>
            Rebook
          </Button>
        )}
        {(booking.status === 'rated' || booking.status === 'completed') && (
          <Button variant="outline" className="w-full" onClick={() => setRecurOpen(true)}>
            Make recurring
          </Button>
        )}
        {canCancel && (
          <Button variant="outline" className="w-full" onClick={() => setCancelOpen(true)}>
            Cancel booking
          </Button>
        )}
        {['advance_paid', 'scheduled', 'in_progress'].includes(booking.status) && (
          <Button variant="outline" className="w-full" onClick={() => { const t = ensureThread(booking.id, booking.panditId); navigate(`/app/chat/${t.id}`); }}>
            Message pandit
          </Button>
        )}
        {['scheduled', 'in_progress', 'completed', 'rated'].includes(booking.status) && (
          <button
            type="button"
            onClick={() => navigate(`/app/booking/${booking.id}/dispute/new`)}
            className="mt-3 w-full rounded-md border border-error/30 px-3 py-2 text-sm font-medium text-error"
          >
            Raise a dispute
          </button>
        )}
      </div>

      <CancelSheet
        open={cancelOpen}
        booking={booking}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => { cancelBooking(booking.id, 'jajman', reason); setCancelOpen(false); }}
      />
      <RecurringSheet
        open={recurOpen}
        onClose={() => setRecurOpen(false)}
        onConfirm={(interval) => { createRecurring(booking.panditId, booking.pujaId, interval, new Date().toISOString()); setRecurOpen(false); navigate('/app/recurring'); }}
      />
    </>
  );
}
