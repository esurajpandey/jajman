import { useParams } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { MoneyBreakdown } from '../../../components/ui/MoneyBreakdown';
import { StatusPill } from '../../../components/ui/StatusPill';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';

export function ReceiptScreen() {
  const { bookingId = '' } = useParams();
  const booking = useBookingStore((s) => s.getBooking(bookingId));
  const pandit = useDataStore((s) => s.getPandit(booking?.panditId ?? ''));
  const puja = useDataStore((s) => s.getPuja(booking?.pujaId ?? ''));

  if (!booking) {
    return (
      <>
        <AppBar title="Receipt" left={<BackButton />} />
        <div className="flex-1 p-6 text-sm text-muted">Booking not found.</div>
      </>
    );
  }

  return (
    <>
      <AppBar title="Receipt" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold">{puja?.name ?? 'Puja'}</p>
            <p className="text-xs text-muted">{pandit?.name ?? 'Pandit'} · {booking.slotLabel}</p>
            <p className="text-xs text-muted">Booking {booking.id}</p>
          </div>
          <StatusPill status={booking.status} />
        </div>
        <MoneyBreakdown charges={booking.charges} advance={booking.advanceAmount} remaining={booking.remainingAmount} highlightAdvance={false} />
        <p className="mt-2 text-xs text-muted">
          Paid so far: ₹{booking.amountPaid}
          {booking.cancellation ? ` · Refund ₹${booking.cancellation.refundAmount} (platform cut ₹${booking.cancellation.platformCut})` : ''}
        </p>
        <Button variant="outline" className="mt-4 w-full">Download PDF (mock)</Button>
      </div>
    </>
  );
}
