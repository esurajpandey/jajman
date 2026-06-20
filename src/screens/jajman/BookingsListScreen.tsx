import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../components/ui/AppBar';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { BookingCard } from '../../components/booking/BookingCard';
import { useBookingStore } from '../../store/bookingStore';
import { jajmanTab } from '../../domain/booking';
import type { JajmanBookingTab } from '../../domain/types';

const TABS: { value: JajmanBookingTab; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function BookingsListScreen() {
  const navigate = useNavigate();
  const bookings = useBookingStore(useShallow((s) => s.bookings));
  const [tab, setTab] = useState<JajmanBookingTab>('upcoming');
  const visible = bookings.filter((b) => jajmanTab(b.status) === tab);

  return (
    <>
      <AppBar title="My bookings" />
      <div className="border-b border-border p-3">
        <SegmentedControl segments={TABS} value={tab} onChange={setTab} />
      </div>
      <div className="flex-1 p-4">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="text-4xl">🗒️</div>
            <p className="text-sm text-muted">No {tab} bookings.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((b) => (
              <BookingCard key={b.id} booking={b} onClick={() => navigate(`/app/booking/${b.id}`)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
