import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { X } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Chip } from '../../components/ui/Chip';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { usePanditAvailabilityStore } from '../../store/panditAvailabilityStore';
import type { LeaveType } from '../../mock/types';

type Scope = 'dates' | 'slot';
const TYPES: LeaveType[] = ['vacation', 'festival', 'personal'];
const TYPE_LABEL: Record<LeaveType, string> = { vacation: 'Vacation', festival: 'Festival', personal: 'Personal' };

export function LeaveScreen() {
  const leaves = usePanditAvailabilityStore(useShallow((s) => s.leaves));
  const addLeave = usePanditAvailabilityStore((s) => s.addLeave);
  const removeLeave = usePanditAvailabilityStore((s) => s.removeLeave);

  const [scope, setScope] = useState<Scope>('dates');
  const [type, setType] = useState<LeaveType>('vacation');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('11:00');
  const [reason, setReason] = useState('');

  const valid = scope === 'dates' ? Boolean(from) : Boolean(from) && end > start;
  const add = () => {
    addLeave(scope === 'dates'
      ? { scope, type, fromDate: from, toDate: to || undefined, reason: reason.trim() || undefined }
      : { scope, type, fromDate: from, startTime: start, endTime: end, reason: reason.trim() || undefined });
    setFrom(''); setTo(''); setReason('');
  };

  return (
    <>
      <AppBar title="Leave & blocks" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <SegmentedControl<Scope>
          segments={[{ value: 'dates', label: 'Block dates' }, { value: 'slot', label: 'Block slot' }]}
          value={scope} onChange={setScope} />

        <div className="mt-4 flex flex-wrap gap-2">
          {TYPES.map((t) => <Chip key={t} label={TYPE_LABEL[t]} selected={type === t} onClick={() => setType(t)} />)}
        </div>

        <div className="mt-3 flex items-end gap-2">
          <TextField label={scope === 'dates' ? 'From' : 'Date'} name="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-sm" />
          {scope === 'dates' ? (
            <TextField label="To (optional)" name="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-sm" />
          ) : (
            <>
              <TextField label="From" name="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="text-sm" />
              <TextField label="To" name="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="text-sm" />
            </>
          )}
        </div>
        <TextField label="Reason (optional)" name="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2" />
        <Button className="mt-3 w-full" disabled={!valid} onClick={add}>Add block</Button>

        <h2 className="mb-2 mt-5 text-sm font-semibold">Scheduled leaves</h2>
        {leaves.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No leaves scheduled.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {leaves.map((l) => (
              <Card key={l.id} className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium"><Badge className="bg-surface-2 text-muted">{TYPE_LABEL[l.type]}</Badge>
                    {l.scope === 'dates' ? `${l.fromDate}${l.toDate ? ` → ${l.toDate}` : ''}` : `${l.fromDate} · ${l.startTime}–${l.endTime}`}</p>
                  {l.reason && <p className="text-xs text-muted">{l.reason}</p>}
                </div>
                <button type="button" aria-label={`Remove leave ${l.fromDate}`} onClick={() => removeLeave(l.id)}><X size={16} className="text-muted" /></button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
