import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { X } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Stepper } from '../../../components/ui/Stepper';
import { TextField } from '../../../components/ui/TextField';
import { ToggleRow } from '../../../components/ui/ToggleRow';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';
import type { OnboardingRecurring } from '../../../mock/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function OnbAvailabilityScreen() {
  const navigate = useNavigate();
  const draft = usePanditOnboardingStore(useShallow((s) => s.draft.availability));
  const setRecurring = usePanditOnboardingStore((s) => s.setRecurring);
  const addSlot = usePanditOnboardingStore((s) => s.addSlot);
  const removeSlot = usePanditOnboardingStore((s) => s.removeSlot);
  const setStep = usePanditOnboardingStore((s) => s.setStep);

  const [date, setDate] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');

  const toggleDay = (weekday: number) => {
    const exists = draft.recurring.some((r) => r.weekday === weekday);
    const next: OnboardingRecurring[] = exists
      ? draft.recurring.filter((r) => r.weekday !== weekday)
      : [...draft.recurring, { weekday, start: '09:00', end: '17:00' }];
    setRecurring(next);
  };

  const review = () => { setStep(5); navigate('/pandit/onboarding/submit'); };
  const canAddSlot = date.trim() && end > start;

  return (
    <>
      <AppBar title="Availability" left={<BackButton to="/pandit/onboarding/documents" />} right={<Stepper total={5} current={4} />} />
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="mb-1 text-sm font-semibold">Recurring weekly</h2>
        <div className="rounded-md border border-border bg-surface px-3">
          {WEEKDAYS.map((label, i) => (
            <ToggleRow key={i} label={label} description={draft.recurring.some((r) => r.weekday === i) ? '09:00–17:00' : undefined}
              checked={draft.recurring.some((r) => r.weekday === i)} onChange={() => toggleDay(i)} />
          ))}
        </div>

        <h2 className="mb-1 mt-5 text-sm font-semibold">Specific dates</h2>
        <div className="flex items-end gap-2">
          <TextField label="Date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm" />
          <TextField label="From" name="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="text-sm" />
          <TextField label="To" name="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="text-sm" />
        </div>
        <Button variant="outline" className="mt-2 w-full" disabled={!canAddSlot} onClick={() => { addSlot(date, start, end); setDate(''); }}>+ Add slot</Button>
        {draft.slots.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {draft.slots.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm">
                <span className="flex-1">{s.date} · {s.start}–{s.end}</span>
                <button type="button" aria-label={`Remove slot ${s.date}`} onClick={() => removeSlot(s.id)}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted">You can change this anytime later.</p>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" onClick={review}>Review & submit</Button>
      </div>
    </>
  );
}
