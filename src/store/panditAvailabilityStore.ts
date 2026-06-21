import { create } from 'zustand';
import dayjs from 'dayjs';
import { nanoid } from 'nanoid';
import type { OnboardingRecurring, OnboardingSlot, PanditLeave } from '../mock/types';
import { seedPanditAvailability } from '../mock/seed';
import { slotOverlapsExisting, recurringForWeekday, isOnLeaveDate } from '../domain/availability';

interface LeaveInput { scope: 'dates' | 'slot'; type: PanditLeave['type']; fromDate: string; toDate?: string; startTime?: string; endTime?: string; reason?: string }

interface State {
  recurring: OnboardingRecurring[];
  slots: OnboardingSlot[];
  leaves: PanditLeave[];
  toggleRecurringDay: (weekday: number) => void;
  setRecurringTime: (weekday: number, start: string, end: string) => void;
  addSlot: (date: string, start: string, end: string) => OnboardingSlot | null;
  removeSlot: (id: string) => void;
  addLeave: (input: LeaveInput) => PanditLeave;
  removeLeave: (id: string) => void;
  getSlotsForDate: (dateISO: string) => OnboardingSlot[];
  isOnLeave: (dateISO: string) => boolean;
}

export const usePanditAvailabilityStore = create<State>((set, get) => ({
  recurring: seedPanditAvailability.recurring,
  slots: seedPanditAvailability.slots,
  leaves: seedPanditAvailability.leaves,
  toggleRecurringDay: (weekday) =>
    set((s) => ({
      recurring: s.recurring.some((r) => r.weekday === weekday)
        ? s.recurring.filter((r) => r.weekday !== weekday)
        : [...s.recurring, { weekday, start: '09:00', end: '17:00' }],
    })),
  setRecurringTime: (weekday, start, end) =>
    set((s) => ({ recurring: s.recurring.map((r) => (r.weekday === weekday ? { ...r, start, end } : r)) })),
  addSlot: (date, start, end) => {
    if (!(end > start) || slotOverlapsExisting(get().slots, date, start, end)) return null;
    const slot: OnboardingSlot = { id: `av-${nanoid(5)}`, date, start, end };
    set((s) => ({ slots: [...s.slots, slot] }));
    return slot;
  },
  removeSlot: (id) => set((s) => ({ slots: s.slots.filter((x) => x.id !== id) })),
  addLeave: (input) => {
    const leave: PanditLeave = { id: `lv-${nanoid(5)}`, ...input };
    set((s) => ({ leaves: [...s.leaves, leave] }));
    return leave;
  },
  removeLeave: (id) => set((s) => ({ leaves: s.leaves.filter((l) => l.id !== id) })),
  getSlotsForDate: (dateISO) => {
    const specific = get().slots.filter((s) => s.date === dateISO);
    const weekday = dayjs(dateISO).day();
    const expanded: OnboardingSlot[] = recurringForWeekday(get().recurring, weekday).map((r) => ({ id: `rec-${weekday}-${r.start}`, date: dateISO, start: r.start, end: r.end }));
    return [...specific, ...expanded].sort((a, b) => (a.start < b.start ? -1 : 1));
  },
  isOnLeave: (dateISO) => isOnLeaveDate(get().leaves, dateISO),
}));
