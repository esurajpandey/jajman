import type { KeyboardEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Booking } from '../../mock/types';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { StatusPill } from '../ui/StatusPill';
import { useDataStore } from '../../store/dataStore';
import { cn } from '../../lib/cn';

export function BookingCard({ booking, onClick }: { booking: Booking; onClick?: () => void }) {
  const { pandit, puja } = useDataStore(
    useShallow((s) => ({ pandit: s.getPandit(booking.panditId), puja: s.getPuja(booking.pujaId) })),
  );
  const interactive = !!onClick;
  const interactiveProps = interactive
    ? {
        role: 'button',
        tabIndex: 0,
        onClick,
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        },
        'aria-label': `View booking${puja ? ` for ${puja.name}` : ''}`,
      }
    : {};
  return (
    <Card {...interactiveProps} className={cn('flex gap-3 p-3 transition', interactive && 'cursor-pointer active:scale-[0.99]')}>
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
