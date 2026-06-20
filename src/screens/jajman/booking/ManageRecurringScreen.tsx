import { useShallow } from 'zustand/react/shallow';
import dayjs from 'dayjs';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';

export function ManageRecurringScreen() {
  const recurring = useBookingStore(useShallow((s) => s.recurring));
  const pauseRecurring = useBookingStore((s) => s.pauseRecurring);
  const resumeRecurring = useBookingStore((s) => s.resumeRecurring);
  const cancelRecurring = useBookingStore((s) => s.cancelRecurring);
  const getPandit = useDataStore((s) => s.getPandit);
  const getPuja = useDataStore((s) => s.getPuja);
  const active = recurring.filter((r) => r.status !== 'cancelled');

  return (
    <>
      <AppBar title="Recurring pujas" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        {active.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center"><div className="text-4xl">🔁</div><p className="text-sm text-muted">No recurring pujas yet.</p></div>
        ) : (
          <div className="flex flex-col gap-3">
            {active.map((r) => (
              <Card key={r.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{getPuja(r.pujaId)?.name}</p>
                    <p className="text-xs text-muted">{getPandit(r.panditId)?.name} · {r.interval}</p>
                    <p className="text-xs text-muted">Next: {dayjs(r.nextDate).format('D MMM YYYY')}</p>
                  </div>
                  <Badge className={r.status === 'paused' ? 'bg-warning/15 text-warning' : 'bg-success/10 text-success'}>{r.status}</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  {r.status === 'active' ? (
                    <Button variant="outline" className="flex-1" onClick={() => pauseRecurring(r.id)}>Pause</Button>
                  ) : (
                    <Button variant="outline" className="flex-1" onClick={() => resumeRecurring(r.id)}>Resume</Button>
                  )}
                  <Button variant="ghost" className="flex-1 text-error" onClick={() => cancelRecurring(r.id)}>Cancel</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
