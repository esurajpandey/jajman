import dayjs from 'dayjs';
import type { OnboardingSlot, OnboardingRecurring, PanditLeave } from '../mock/types';

/** HH:MM ranges overlap (adjacent endpoints do NOT count as overlap). */
export function timeOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function slotOverlapsExisting(slots: OnboardingSlot[], date: string, start: string, end: string): boolean {
  return slots.some((s) => s.date === date && timeOverlap(s.start, s.end, start, end));
}

export function recurringForWeekday(recurring: OnboardingRecurring[], weekday: number): OnboardingRecurring[] {
  return recurring.filter((r) => r.weekday === weekday);
}

/** A date falls under a leave: within a date-range (inclusive), or equals a slot-leave's date. */
export function isOnLeaveDate(leaves: PanditLeave[], dateISO: string): boolean {
  const d = dayjs(dateISO);
  return leaves.some((l) => {
    if (l.scope === 'slot') return l.fromDate === dateISO;
    const from = dayjs(l.fromDate);
    const to = dayjs(l.toDate ?? l.fromDate);
    return (d.isSame(from, 'day') || d.isAfter(from, 'day')) && (d.isSame(to, 'day') || d.isBefore(to, 'day'));
  });
}
