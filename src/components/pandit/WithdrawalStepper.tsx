import { Check, X } from 'lucide-react';
import type { WithdrawalStatus } from '../../mock/types';
import { cn } from '../../lib/cn';

const STEPS: { key: WithdrawalStatus; label: string }[] = [
  { key: 'requested', label: 'Requested' },
  { key: 'processing', label: 'Processing' },
  { key: 'paid', label: 'Paid' },
];
const ORDER = STEPS.map((s) => s.key);

export function WithdrawalStepper({ status }: { status: WithdrawalStatus }) {
  if (status === 'failed') {
    return (
      <div className="flex items-center gap-2 rounded-md bg-error/10 px-3 py-2 text-sm font-medium text-error">
        <X size={16} /> Failed
      </div>
    );
  }
  const currentIdx = ORDER.indexOf(status);
  const reached = (i: number) => i <= currentIdx;
  return (
    <ol className="flex flex-col gap-0">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[10px]', reached(i) ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-muted')}>
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
