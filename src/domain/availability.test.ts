import { describe, it, expect } from 'vitest';
import { timeOverlap, slotOverlapsExisting, recurringForWeekday, isOnLeaveDate } from './availability';
import type { OnboardingSlot, OnboardingRecurring, PanditLeave } from '../mock/types';

describe('timeOverlap', () => {
  it('true when ranges intersect', () => { expect(timeOverlap('09:00', '11:00', '10:00', '12:00')).toBe(true); });
  it('false when adjacent (end == start)', () => { expect(timeOverlap('09:00', '10:00', '10:00', '11:00')).toBe(false); });
  it('false when disjoint', () => { expect(timeOverlap('09:00', '10:00', '11:00', '12:00')).toBe(false); });
});

describe('slotOverlapsExisting', () => {
  const slots: OnboardingSlot[] = [{ id: 's1', date: '2026-07-01', start: '09:00', end: '12:00' }];
  it('true for an overlapping slot on the same date', () => { expect(slotOverlapsExisting(slots, '2026-07-01', '11:00', '13:00')).toBe(true); });
  it('false for a different date', () => { expect(slotOverlapsExisting(slots, '2026-07-02', '09:00', '12:00')).toBe(false); });
  it('false for a non-overlapping time on the same date', () => { expect(slotOverlapsExisting(slots, '2026-07-01', '12:00', '14:00')).toBe(false); });
});

describe('recurringForWeekday', () => {
  const rec: OnboardingRecurring[] = [{ weekday: 1, start: '09:00', end: '17:00' }];
  it('returns the entries for a weekday', () => { expect(recurringForWeekday(rec, 1)).toHaveLength(1); });
  it('empty for a weekday with none', () => { expect(recurringForWeekday(rec, 2)).toHaveLength(0); });
});

describe('isOnLeaveDate', () => {
  const leaves: PanditLeave[] = [
    { id: 'l1', scope: 'dates', type: 'vacation', fromDate: '2026-07-10', toDate: '2026-07-12' },
    { id: 'l2', scope: 'slot', type: 'personal', fromDate: '2026-07-20', startTime: '09:00', endTime: '11:00' },
  ];
  it('true within a date-range leave (inclusive)', () => { expect(isOnLeaveDate(leaves, '2026-07-11')).toBe(true); });
  it('true on a single-day slot-leave date', () => { expect(isOnLeaveDate(leaves, '2026-07-20')).toBe(true); });
  it('false outside any leave', () => { expect(isOnLeaveDate(leaves, '2026-07-15')).toBe(false); });
});
