import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { X } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { ToggleRow } from '../../components/ui/ToggleRow';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { usePanditAvailabilityStore } from '../../store/panditAvailabilityStore';
import { useSessionStore } from '../../store/sessionStore';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
type Tab = 'recurring' | 'specific';

export function AvailabilityScreen() {
  const recurring = usePanditAvailabilityStore(useShallow((s) => s.recurring));
  const slots = usePanditAvailabilityStore(useShallow((s) => s.slots));
  const toggleRecurringDay = usePanditAvailabilityStore((s) => s.toggleRecurringDay);
  const addSlot = usePanditAvailabilityStore((s) => s.addSlot);
  const removeSlot = usePanditAvailabilityStore((s) => s.removeSlot);
  const accepting = useSessionStore((s) => s.acceptingBookings);
  const setAccepting = useSessionStore((s) => s.setAcceptingBookings);

  const [tab, setTab] = useState<Tab>('recurring');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [err, setErr] = useState('');

  const add = () => {
    setErr('');
    const ok = addSlot(date, start, end);
    if (!ok) { setErr('That overlaps an existing slot (or end is before start).'); return; }
    setDate('');
  };

  return (
    <>
      <AppBar title="Availability" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-md border border-border bg-surface px-3">
          <ToggleRow label="Accepting bookings" description={accepting ? 'You can receive requests' : 'Paused'} checked={accepting} onChange={setAccepting} />
        </div>

        <SegmentedControl<Tab>
          segments={[{ value: 'recurring', label: 'Recurring' }, { value: 'specific', label: 'Specific dates' }]}
          value={tab} onChange={setTab} />

        {tab === 'recurring' ? (
          <div className="mt-4 rounded-md border border-border bg-surface px-3">
            {WEEKDAYS.map((label, i) => (
              <ToggleRow key={i} label={label} description={recurring.find((r) => r.weekday === i) ? `${recurring.find((r) => r.weekday === i)!.start}–${recurring.find((r) => r.weekday === i)!.end}` : undefined}
                checked={recurring.some((r) => r.weekday === i)} onChange={() => toggleRecurringDay(i)} />
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex items-end gap-2">
              <TextField label="Date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm" />
              <TextField label="From" name="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="text-sm" />
              <TextField label="To" name="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="text-sm" />
            </div>
            {err && <p className="mt-1 text-xs text-error">{err}</p>}
            <Button variant="outline" className="mt-2 w-full" disabled={!date} onClick={add}>+ Add slot</Button>
            <div className="mt-3 flex flex-col gap-2">
              {slots.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm">
                  <span className="flex-1">{s.date} · {s.start}–{s.end}</span>
                  <button type="button" aria-label={`Remove slot ${s.date}`} onClick={() => removeSlot(s.id)}><X size={14} /></button>
                </div>
              ))}
              {slots.length === 0 && <p className="py-4 text-center text-sm text-muted">Add your first slot.</p>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
