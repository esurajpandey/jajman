import type { Booking } from '../../mock/types';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { StatusPill } from '../ui/StatusPill';
import { useDataStore } from '../../store/dataStore';

export function BookingCard({ booking, onClick }: { booking: Booking; onClick?: () => void }) {
  const pandit = useDataStore((s) => s.getPandit(booking.panditId));
  const puja = useDataStore((s) => s.getPuja(booking.pujaId));
  return (
    <Card role="button" tabIndex={0} onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      aria-label={`Booking ${puja?.name ?? ''}`} className="flex cursor-pointer gap-3 p-3 transition active:scale-[0.99]">
      <Avatar name={pandit?.name ?? '?'} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold">{puja?.name}</h3>
          <StatusPill status={booking.status} />
        </div>
        <p className="truncate text-xs text-muted">{pandit?.name}</p>
        <p className="text-xs text-muted">{booking.slotLabel}</p>
      </div>
    </Card>
  );
}
