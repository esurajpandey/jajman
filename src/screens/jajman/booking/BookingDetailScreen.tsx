import { useNavigate, useParams } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { StatusStepper } from '../../../components/ui/StatusStepper';
import { MoneyBreakdown } from '../../../components/ui/MoneyBreakdown';
import { Countdown } from '../../../components/ui/Countdown';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';

export function BookingDetailScreen() {
  const navigate = useNavigate();
  const { bookingId = '' } = useParams();
  const booking = useBookingStore((s) => s.getBooking(bookingId));
  const simulateAccept = useBookingStore((s) => s.simulateAccept);
  const getAddress = useBookingStore((s) => s.getAddress);
  const pandit = useDataStore((s) => s.getPandit(booking?.panditId ?? ''));
  const puja = useDataStore((s) => s.getPuja(booking?.pujaId ?? ''));

  if (!booking) {
    return <><AppBar title="Booking" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Booking not found.</div></>;
  }

  const remainingDue = booking.status === 'completed' && booking.amountPaid < booking.charges.subtotal;

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

        <MoneyBreakdown charges={booking.charges} advance={booking.advanceAmount} remaining={booking.remainingAmount} highlightAdvance={booking.status === 'accepted'} />
      </div>

      <div className="border-t border-border p-3">
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
        {!['accepted'].includes(booking.status) && !remainingDue && (
          <Button variant="outline" className="w-full" onClick={() => navigate(`/app/chat/${booking.panditId}`)}>
            Message pandit
          </Button>
        )}
      </div>
    </>
  );
}
