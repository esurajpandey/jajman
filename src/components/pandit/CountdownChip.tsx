import { Clock } from 'lucide-react';
import { Countdown } from '../ui/Countdown';
import { countdownTone } from '../../domain/requests';
import { cn } from '../../lib/cn';

const TONE: Record<string, string> = {
  normal: 'bg-surface-2 text-muted',
  amber: 'bg-warning/15 text-warning',
  red: 'bg-error/10 text-error',
  expired: 'bg-error/10 text-error',
};

export function CountdownChip({ deadlineISO, nowISO }: { deadlineISO: string; nowISO: string }) {
  const tone = countdownTone(deadlineISO, nowISO);
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', TONE[tone])}>
      <Clock size={12} />
      <Countdown deadlineISO={deadlineISO} nowISO={nowISO} />
    </span>
  );
}
