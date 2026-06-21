import dayjs from 'dayjs';

export type CountdownTone = 'normal' | 'amber' | 'red' | 'expired';

/** OQ6 countdown colour: normal ≥6h, amber <6h, red <1h, expired ≤0. */
export function countdownTone(deadlineISO: string, nowISO: string): CountdownTone {
  const mins = dayjs(deadlineISO).diff(dayjs(nowISO), 'minute');
  if (mins <= 0) return 'expired';
  if (mins < 60) return 'red';
  if (mins < 360) return 'amber';
  return 'normal';
}

export function isRequestExpired(deadlineISO: string, nowISO: string): boolean {
  return dayjs(deadlineISO).diff(dayjs(nowISO), 'minute') <= 0;
}
