import { describe, it, expect, beforeEach } from 'vitest';
import { usePanditAvailabilityStore } from './panditAvailabilityStore';
import { seedPanditAvailability } from '../mock/seed';

beforeEach(() => usePanditAvailabilityStore.setState({
  recurring: seedPanditAvailability.recurring,
  slots: seedPanditAvailability.slots,
  leaves: seedPanditAvailability.leaves,
}));

describe('panditAvailabilityStore', () => {
  it('toggleRecurringDay adds then removes a weekday', () => {
    usePanditAvailabilityStore.getState().toggleRecurringDay(2); // add Tue
    expect(usePanditAvailabilityStore.getState().recurring.some((r) => r.weekday === 2)).toBe(true);
    usePanditAvailabilityStore.getState().toggleRecurringDay(2); // remove
    expect(usePanditAvailabilityStore.getState().recurring.some((r) => r.weekday === 2)).toBe(false);
  });
  it('addSlot rejects an overlapping slot (returns null)', () => {
    const ok = usePanditAvailabilityStore.getState().addSlot('2026-06-28', '11:00', '14:00'); // overlaps av-1 10-13
    expect(ok).toBeNull();
  });
  it('addSlot accepts a non-overlapping slot', () => {
    const created = usePanditAvailabilityStore.getState().addSlot('2026-06-28', '14:00', '16:00');
    expect(created).not.toBeNull();
    expect(usePanditAvailabilityStore.getState().slots.find((s) => s.id === created!.id)).toBeDefined();
  });
  it('addLeave + removeLeave manage leaves', () => {
    const lv = usePanditAvailabilityStore.getState().addLeave({ scope: 'dates', type: 'vacation', fromDate: '2026-08-01', toDate: '2026-08-03' });
    expect(usePanditAvailabilityStore.getState().leaves.find((l) => l.id === lv.id)).toBeDefined();
    usePanditAvailabilityStore.getState().removeLeave(lv.id);
    expect(usePanditAvailabilityStore.getState().leaves.find((l) => l.id === lv.id)).toBeUndefined();
  });
  it('isOnLeave reflects a seeded festival block', () => {
    expect(usePanditAvailabilityStore.getState().isOnLeave('2026-07-11')).toBe(true);
    expect(usePanditAvailabilityStore.getState().isOnLeave('2026-07-15')).toBe(false);
  });
  it('getSlotsForDate returns specific + recurring-expanded slots', () => {
    // 2026-06-28 is a Sunday(0); has specific av-1. 2026-06-29 is Monday(1); recurring 09-13.
    expect(usePanditAvailabilityStore.getState().getSlotsForDate('2026-06-28').length).toBeGreaterThan(0);
    expect(usePanditAvailabilityStore.getState().getSlotsForDate('2026-06-29').some((s) => s.start === '09:00')).toBe(true);
  });
});
