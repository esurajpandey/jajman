import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Booking, OnboardingSlot } from '../../mock/types';

export function DayAgenda({
  bookings,
  slots,
  onLeave,
  getPujaName,
}: {
  bookings: Booking[];
  slots: OnboardingSlot[];
  onLeave: boolean;
  getPujaName: (pujaId: string) => string;
}) {
  const empty = bookings.length === 0 && slots.length === 0 && !onLeave;
  return (
    <div className="mt-3 flex flex-col gap-2">
      {onLeave && <div className="rounded-md bg-surface-2 px-3 py-2 text-sm text-muted">🌴 On leave this day</div>}
      {bookings.map((b) => (
        <Card key={b.id} className="flex items-center justify-between p-3">
          <div><p className="text-sm font-medium">{getPujaName(b.pujaId)}</p><p className="text-xs text-muted">{b.slotLabel} · {b.jajmanName}</p></div>
          <Badge className="bg-secondary/10 text-secondary">Booking</Badge>
        </Card>
      ))}
      {slots.map((s) => (
        <Card key={s.id} className="flex items-center justify-between p-3">
          <p className="text-sm">{s.start}–{s.end}</p>
          <Badge className="bg-primary/10 text-primary">Open slot</Badge>
        </Card>
      ))}
      {empty && <p className="py-6 text-center text-sm text-muted">Nothing scheduled.</p>}
    </div>
  );
}
