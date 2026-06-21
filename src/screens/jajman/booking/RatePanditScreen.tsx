import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { Image } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { RatingInput } from '../../../components/ui/RatingInput';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';
import { useSessionStore } from '../../../store/sessionStore';

export function RatePanditScreen() {
  const navigate = useNavigate();
  const { bookingId = '' } = useParams();
  const booking = useBookingStore((s) => s.getBooking(bookingId));
  const rateBooking = useBookingStore((s) => s.rateBooking);
  const addReview = useDataStore((s) => s.addReview);
  const pandit = useDataStore((s) => s.getPandit(booking?.panditId ?? ''));
  const userName = useSessionStore((s) => s.user?.name ?? 'Devotee');
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(false);

  if (!booking || !pandit) {
    return <><AppBar title="Rate" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Booking not found.</div></>;
  }

  if (booking.status === 'rated') {
    return (
      <>
        <AppBar title="Rate pandit" left={<BackButton />} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm text-muted">You've already reviewed this pandit. 🙏</p>
          <Button onClick={() => navigate(`/app/booking/${booking.id}`, { replace: true })}>Back to booking</Button>
        </div>
      </>
    );
  }
  if (booking.status !== 'completed') {
    return (
      <>
        <AppBar title="Rate pandit" left={<BackButton />} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm text-muted">You can rate the pandit once the puja is completed.</p>
          <Button onClick={() => navigate(`/app/booking/${booking.id}`, { replace: true })}>Back to booking</Button>
        </div>
      </>
    );
  }

  const submit = () => {
    addReview({ id: `rev-${nanoid(5)}`, panditId: pandit.id, jajmanName: userName, rating: stars, text: text.trim() || 'Great experience.', date: new Date().toISOString().slice(0, 10), mine: true });
    rateBooking(booking.id);
    navigate(`/app/booking/${booking.id}`, { replace: true });
  };

  return (
    <>
      <AppBar title="Rate pandit" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex flex-col items-center gap-2">
          <Avatar name={pandit.name} size={64} />
          <p className="font-semibold">{pandit.name}</p>
          <RatingInput value={stars} onChange={setStars} />
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Review" rows={4}
          placeholder="Share your experience…" className="w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-primary" />
        <button type="button" onClick={() => setPhoto(true)} className="mt-3 flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-primary">
          <Image size={16} /> {photo ? 'Photo added' : 'Add a photo'}
        </button>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={stars === 0} onClick={submit}>Submit review</Button>
      </div>
    </>
  );
}
