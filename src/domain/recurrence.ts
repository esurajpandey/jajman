import dayjs from 'dayjs';
import type { RecurInterval } from '../mock/types';

export function nextRecurrence(fromISO: string, interval: RecurInterval): string {
  const d = dayjs(fromISO);
  if (interval === 'monthly') return d.add(1, 'month').toISOString();
  if (interval === 'quarterly') return d.add(3, 'month').toISOString();
  return d.add(1, 'year').toISOString();
}
