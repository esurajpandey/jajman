import { Check } from 'lucide-react';
import type { BookingStatus } from '../../domain/types';
import { cn } from '../../lib/cn';

const STEPS: { key: BookingStatus; label: string }[] = [
  { key: 'requested', label: 'Requested' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'advance_paid', label: 'Advance paid' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'rated', label: 'Rated' },
];

const ORDER = STEPS.map((s) => s.key);

export function StatusStepper({ status }: { status: BookingStatus }) {
  const currentIdx = ORDER.indexOf(status);
  const reached = (i: number) => currentIdx >= 0 && i <= currentIdx;
  if (currentIdx === -1) {
    return (
      <div className="rounded-md bg-surface-2 px-3 py-2 text-sm font-medium capitalize text-muted">
        {status.replace(/_/g, ' ')}
      </div>
    );
  }
  return (
    <ol className="flex flex-col gap-0">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-[10px]',
                reached(i) ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-muted',
              )}
            >
              {reached(i) ? <Check size={12} /> : i + 1}
            </span>
            {i < STEPS.length - 1 && <span className={cn('h-5 w-0.5', reached(i + 1) ? 'bg-primary' : 'bg-border')} />}
          </div>
          <span className={cn('text-sm', reached(i) ? 'font-medium text-text' : 'text-muted')}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
