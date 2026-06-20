import type { BookingStatus } from '../../domain/types';
import { Badge } from './Badge';

const LABEL: Record<BookingStatus, string> = {
  requested: 'Requested', accepted: 'Accepted', advance_paid: 'Advance paid', scheduled: 'Scheduled',
  in_progress: 'In progress', completed: 'Completed', rated: 'Rated', rejected: 'Rejected',
  cancelled: 'Cancelled', refund_initiated: 'Refund initiated', refund_completed: 'Refunded', expired: 'Expired',
};
const TONE: Partial<Record<BookingStatus, string>> = {
  scheduled: 'bg-info/10 text-info', accepted: 'bg-info/10 text-info', advance_paid: 'bg-info/10 text-info', in_progress: 'bg-warning/15 text-warning',
  completed: 'bg-success/10 text-success', rated: 'bg-success/10 text-success',
  cancelled: 'bg-error/10 text-error', rejected: 'bg-error/10 text-error', expired: 'bg-error/10 text-error',
  refund_initiated: 'bg-warning/15 text-warning', refund_completed: 'bg-success/10 text-success',
};

export function StatusPill({ status }: { status: BookingStatus }) {
  return <Badge className={TONE[status] ?? 'bg-surface-2 text-muted'}>{LABEL[status]}</Badge>;
}
