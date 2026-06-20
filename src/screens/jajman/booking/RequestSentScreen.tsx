import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { Button } from '../../../components/ui/Button';
import { Countdown } from '../../../components/ui/Countdown';
import { useBookingStore } from '../../../store/bookingStore';

export function RequestSentScreen() {
  const navigate = useNavigate();
  const { bookingId = '' } = useParams();
  const booking = useBookingStore((s) => s.getBooking(bookingId));

  return (
    <>
      <AppBar title="Request sent" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <CheckCircle2 size={56} className="text-success" />
        <h1 className="text-lg font-semibold">Booking request sent 🙏</h1>
        <p className="text-sm text-muted">The pandit will respond soon. Requests expire in{' '}
          {booking ? <Countdown deadlineISO={booking.requestExpiresAt} /> : '24h'}.</p>
        <Button className="mt-4 w-full" onClick={() => navigate(`/app/booking/${bookingId}`)}>View booking</Button>
        <button type="button" onClick={() => navigate('/app/home')} className="text-sm text-muted">Back to home</button>
      </div>
    </>
  );
}
