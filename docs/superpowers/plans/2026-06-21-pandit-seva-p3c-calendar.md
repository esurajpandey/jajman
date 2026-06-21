# Pandit Seva — Phase 3c (Pandit Calendar, Availability & Leave) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give an approved pandit a working Calendar (F1, month grid + day agenda overlaying bookings/slots/leaves), Manage Availability (F2, recurring weekly + specific-date slots with overlap guard), and Leave Management (F3, block dates or time slots) — replacing the `/pandit/calendar` stub.

**Architecture:** A new `panditAvailabilityStore` holds `recurring[]` (weekly), `slots[]` (specific dates), and `leaves[]`, seeded from demo data, with add/remove and an overlap guard. Pure date logic (time-overlap, recurring-expansion-for-a-date, leave-on-date) lives in a framework-free `domain/availability.ts` (TDD). The Calendar screen composes a dayjs-driven `MonthGrid` (event dots: booking/slot/leave) + a selected-day `DayAgenda` that overlays the pandit's bookings (`panditBookingStore`) with availability and leaves. Availability reuses the onboarding `OnboardingRecurring`/`OnboardingSlot` types; the master "Accepting bookings" toggle mirrors the Dashboard (`sessionStore.acceptingBookings`). All screens render in `PanditLayout` behind `RequirePanditApproved`.

**Tech Stack:** Vite 5, React 18, TS 5, Tailwind 3, zustand 4 (`zustand/react/shallow`), react-router-dom 6, lucide-react, nanoid, dayjs. Tests: Vitest + RTL + jsdom. No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-06-20-pandit-seva-mobile-ui-design.md` — §"SCREEN INVENTORY — PANDIT" F1 (~1708), F2 (~1721), F3 (~1734); AvailabilitySlot (~2648), Leave (~2666).

**Working directory:** all paths relative to `pandit-seva-app/`.

## Global Constraints

- **Routing (§0.1):** `/pandit/calendar` (replaces the stub), `/pandit/calendar/availability`, `/pandit/calendar/leave`. All inside `RequireAuth > PanditLayout` and wrapped in `RequirePanditApproved`.
- **Availability model:** reuse onboarding `OnboardingRecurring` (`{weekday:0-6,start,end}`) and `OnboardingSlot` (`{id,date,start,end}`). Leaves use a new `PanditLeave` mock type.
- **Overlap guard (F2):** a new specific slot whose time range overlaps an existing slot on the same date is rejected; `addSlot` returns the created slot or `null` on overlap. End must be after start.
- **Leave vs booking (F3):** adding a leave that covers a day with an existing pandit booking is allowed but the UI WARNS ("You have a booking that day") — booking wins. No hard block.
- **Master toggle** mirrors `sessionStore.acceptingBookings` (do not introduce a second source).
- **No `Date.now()`/`new Date()` in store/domain modules** — date logic takes explicit ISO/date-string args; screens may use `new Date()` for "today"/the visible month.
- **Calendar views:** implement **Month** (grid + day agenda) and **Day** (agenda for the selected day) via a `SegmentedControl`. The **Week** time-grid is a documented simplification — omitted this phase (note in Self-Review); Month+Day cover the prototype need.
- **No new dependencies.** Reuse `AppBar`, `BackButton`, `Card`, `Badge`, `Button`, `Chip`, `ToggleRow`, `TextField`, `SegmentedControl`, `BottomSheet`.
- **Tests:** strict TDD for store/domain; build-then-test for components/screens. Reset stores in `beforeEach`.
- **Commits:** one per task, local only.

---

### Task 1: Availability domain + PanditLeave type + seeds + panditAvailabilityStore

**Files:**
- Modify: `src/mock/types.ts` (`LeaveType`, `PanditLeave`)
- Create: `src/domain/availability.ts` (`timeOverlap`, `slotOverlapsExisting`, `recurringForWeekday`, `isOnLeaveDate`)
- Modify: `src/mock/seed.ts` (`seedPanditAvailability`)
- Create: `src/store/panditAvailabilityStore.ts`
- Test: `src/domain/availability.test.ts`, `src/store/panditAvailabilityStore.test.ts`

**Interfaces:**
- Produces types: `LeaveType = 'vacation'|'festival'|'personal'`; `PanditLeave { id; scope:'dates'|'slot'; type:LeaveType; fromDate:string; toDate?:string; startTime?:string; endTime?:string; reason?:string }`.
- Domain: `timeOverlap(aStart,aEnd,bStart,bEnd): boolean`; `slotOverlapsExisting(slots: OnboardingSlot[], date, start, end): boolean`; `recurringForWeekday(recurring: OnboardingRecurring[], weekday): OnboardingRecurring[]`; `isOnLeaveDate(leaves: PanditLeave[], dateISO): boolean`.
- `seedPanditAvailability: { recurring: OnboardingRecurring[]; slots: OnboardingSlot[]; leaves: PanditLeave[] }`.
- `panditAvailabilityStore`: `recurring`, `slots`, `leaves`, `toggleRecurringDay(weekday)`, `setRecurringTime(weekday,start,end)`, `addSlot(date,start,end): OnboardingSlot | null`, `removeSlot(id)`, `addLeave(input): PanditLeave`, `removeLeave(id)`, `getSlotsForDate(dateISO): OnboardingSlot[]`, `isOnLeave(dateISO): boolean`.

- [ ] **Step 1: Add types to `src/mock/types.ts`**

```ts
// --- P3c: leave ---
export type LeaveType = 'vacation' | 'festival' | 'personal';
export interface PanditLeave {
  id: string;
  scope: 'dates' | 'slot';
  type: LeaveType;
  fromDate: string; // yyyy-mm-dd
  toDate?: string;  // for date ranges (scope='dates')
  startTime?: string; // for scope='slot'
  endTime?: string;
  reason?: string;
}
```

- [ ] **Step 2: Write failing domain tests** — `src/domain/availability.test.ts`

```ts
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
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- availability`
Expected: FAIL — `./availability` module not found.

- [ ] **Step 4: Implement `src/domain/availability.ts`**

```ts
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
```

- [ ] **Step 5: Add seed to `src/mock/seed.ts`**

Add `OnboardingRecurring, OnboardingSlot, PanditLeave` to the type import, then append:

```ts
export const seedPanditAvailability: { recurring: OnboardingRecurring[]; slots: OnboardingSlot[]; leaves: PanditLeave[] } = {
  recurring: [
    { weekday: 1, start: '09:00', end: '13:00' },
    { weekday: 3, start: '09:00', end: '13:00' },
    { weekday: 6, start: '07:00', end: '12:00' },
  ],
  slots: [
    { id: 'av-1', date: '2026-06-28', start: '10:00', end: '13:00' },
    { id: 'av-2', date: '2026-07-04', start: '08:00', end: '11:00' },
  ],
  leaves: [
    { id: 'lv-1', scope: 'dates', type: 'festival', fromDate: '2026-07-10', toDate: '2026-07-12', reason: 'Out of town for a festival' },
  ],
};
```

- [ ] **Step 6: Write failing store tests** — `src/store/panditAvailabilityStore.test.ts`

```ts
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
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `npm test -- panditAvailabilityStore`
Expected: FAIL — store module not found.

- [ ] **Step 8: Implement `src/store/panditAvailabilityStore.ts`**

```ts
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
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npm test -- availability panditAvailabilityStore`
Expected: PASS.

- [ ] **Step 10: Typecheck + commit**

Run: `npm run typecheck` → PASS.

```bash
git add -A
git commit -m "feat: pandit availability domain + leave type + seeds + panditAvailabilityStore"
```

---

### Task 2: Calendar components — MonthGrid, Legend, DayAgenda

**Files:**
- Create: `src/components/pandit/CalendarLegend.tsx`
- Create: `src/components/pandit/MonthGrid.tsx`
- Create: `src/components/pandit/DayAgenda.tsx`
- Test: `src/components/pandit/calendar-components.test.tsx`

**Interfaces:**
- Consumes: `dayjs`, `cn`, `Card`, `Badge`; `Booking`, `OnboardingSlot`, `PanditLeave`.
- Produces:
  - `CalendarLegend()` — static legend chips (Booking / Open slot / Leave).
  - `MonthGrid({ monthISO, selectedISO, marks, onSelect })` where `marks: Record<string, { booking?: boolean; slot?: boolean; leave?: boolean }>` keyed by `yyyy-mm-dd`; renders a 7-col month grid, dots per mark, highlights `selectedISO`, calls `onSelect(dateISO)`.
  - `DayAgenda({ bookings, slots, onLeave, getPujaName })` — list of the day's booking blocks + open slots + a leave banner if `onLeave`.

- [ ] **Step 1: Create `src/components/pandit/CalendarLegend.tsx`**

```tsx
export function CalendarLegend() {
  const item = (color: string, label: string) => (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <span className={`h-2 w-2 rounded-full ${color}`} />{label}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-3 px-1 py-2">
      {item('bg-secondary', 'Booking')}
      {item('bg-primary', 'Open slot')}
      {item('bg-muted', 'Leave')}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/pandit/MonthGrid.tsx`**

```tsx
import dayjs from 'dayjs';
import { cn } from '../../lib/cn';

export interface DayMark { booking?: boolean; slot?: boolean; leave?: boolean }

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MonthGrid({
  monthISO,
  selectedISO,
  marks,
  onSelect,
}: {
  monthISO: string;
  selectedISO: string;
  marks: Record<string, DayMark>;
  onSelect: (dateISO: string) => void;
}) {
  const start = dayjs(monthISO).startOf('month');
  const lead = start.day();
  const days = start.daysInMonth();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD')),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-[11px] text-muted">
        {WEEK.map((d, i) => <div key={i} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const m = marks[iso] ?? {};
          const selected = iso === selectedISO;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(iso)}
              className={cn('flex aspect-square flex-col items-center justify-center rounded-md text-sm', selected ? 'bg-primary text-primary-fg' : 'hover:bg-surface-2')}
            >
              <span>{dayjs(iso).date()}</span>
              <span className="mt-0.5 flex gap-0.5">
                {m.booking && <span className={cn('h-1 w-1 rounded-full', selected ? 'bg-primary-fg' : 'bg-secondary')} />}
                {m.slot && <span className={cn('h-1 w-1 rounded-full', selected ? 'bg-primary-fg' : 'bg-primary')} />}
                {m.leave && <span className={cn('h-1 w-1 rounded-full', selected ? 'bg-primary-fg' : 'bg-muted')} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/pandit/DayAgenda.tsx`**

```tsx
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Booking, OnboardingSlot } from '../../mock/types';

export function DayAgenda({
  bookings,
  slots,
  onLeave,
  getPujaName,
}: {
  bookings: Booking[];
  slots: OnboardingSlot[];
  onLeave: boolean;
  getPujaName: (pujaId: string) => string;
}) {
  const empty = bookings.length === 0 && slots.length === 0 && !onLeave;
  return (
    <div className="mt-3 flex flex-col gap-2">
      {onLeave && <div className="rounded-md bg-surface-2 px-3 py-2 text-sm text-muted">🌴 On leave this day</div>}
      {bookings.map((b) => (
        <Card key={b.id} className="flex items-center justify-between p-3">
          <div><p className="text-sm font-medium">{getPujaName(b.pujaId)}</p><p className="text-xs text-muted">{b.slotLabel} · {b.jajmanName}</p></div>
          <Badge className="bg-secondary/10 text-secondary">Booking</Badge>
        </Card>
      ))}
      {slots.map((s) => (
        <Card key={s.id} className="flex items-center justify-between p-3">
          <p className="text-sm">{s.start}–{s.end}</p>
          <Badge className="bg-primary/10 text-primary">Open slot</Badge>
        </Card>
      ))}
      {empty && <p className="py-6 text-center text-sm text-muted">Nothing scheduled.</p>}
    </div>
  );
}
```

- [ ] **Step 4: Write the test** — `src/components/pandit/calendar-components.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonthGrid } from './MonthGrid';
import { DayAgenda } from './DayAgenda';
import type { Booking, OnboardingSlot } from '../../mock/types';

describe('MonthGrid', () => {
  it('renders the month days and fires onSelect with the clicked date', () => {
    const onSelect = vi.fn();
    render(<MonthGrid monthISO="2026-07-01" selectedISO="2026-07-01" marks={{ '2026-07-10': { leave: true } }} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('15'));
    expect(onSelect).toHaveBeenCalledWith('2026-07-15');
  });
});

describe('DayAgenda', () => {
  const slot: OnboardingSlot = { id: 's1', date: '2026-07-01', start: '09:00', end: '12:00' };
  it('shows open slots and the leave banner', () => {
    render(<DayAgenda bookings={[]} slots={[slot]} onLeave getPujaName={() => 'Puja'} />);
    expect(screen.getByText('09:00–12:00')).toBeInTheDocument();
    expect(screen.getByText('🌴 On leave this day')).toBeInTheDocument();
  });
  it('shows empty state when nothing scheduled', () => {
    render(<DayAgenda bookings={[]} slots={[]} onLeave={false} getPujaName={() => 'Puja'} />);
    expect(screen.getByText('Nothing scheduled.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- calendar-components`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: pandit calendar components (MonthGrid, Legend, DayAgenda)"
```

---

### Task 3: Manage Availability screen (F2)

**Files:**
- Create: `src/screens/pandit/AvailabilityScreen.tsx`
- Modify: `src/app/router.tsx` (`/pandit/calendar/availability`)
- Test: `src/screens/pandit/AvailabilityScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Button`, `TextField`, `ToggleRow`, `SegmentedControl`; `panditAvailabilityStore` (`recurring`, `slots`, `toggleRecurringDay`, `addSlot`, `removeSlot`); `sessionStore` (`acceptingBookings`, `setAcceptingBookings`).
- Produces: `AvailabilityScreen`.

- [ ] **Step 1: Create `src/screens/pandit/AvailabilityScreen.tsx`**

```tsx
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { X } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { ToggleRow } from '../../components/ui/ToggleRow';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { usePanditAvailabilityStore } from '../../store/panditAvailabilityStore';
import { useSessionStore } from '../../store/sessionStore';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
type Tab = 'recurring' | 'specific';

export function AvailabilityScreen() {
  const recurring = usePanditAvailabilityStore(useShallow((s) => s.recurring));
  const slots = usePanditAvailabilityStore(useShallow((s) => s.slots));
  const toggleRecurringDay = usePanditAvailabilityStore((s) => s.toggleRecurringDay);
  const addSlot = usePanditAvailabilityStore((s) => s.addSlot);
  const removeSlot = usePanditAvailabilityStore((s) => s.removeSlot);
  const accepting = useSessionStore((s) => s.acceptingBookings);
  const setAccepting = useSessionStore((s) => s.setAcceptingBookings);

  const [tab, setTab] = useState<Tab>('recurring');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [err, setErr] = useState('');

  const add = () => {
    setErr('');
    const ok = addSlot(date, start, end);
    if (!ok) { setErr('That overlaps an existing slot (or end is before start).'); return; }
    setDate('');
  };

  return (
    <>
      <AppBar title="Availability" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-md border border-border bg-surface px-3">
          <ToggleRow label="Accepting bookings" description={accepting ? 'You can receive requests' : 'Paused'} checked={accepting} onChange={setAccepting} />
        </div>

        <SegmentedControl<Tab>
          segments={[{ value: 'recurring', label: 'Recurring' }, { value: 'specific', label: 'Specific dates' }]}
          value={tab} onChange={setTab} />

        {tab === 'recurring' ? (
          <div className="mt-4 rounded-md border border-border bg-surface px-3">
            {WEEKDAYS.map((label, i) => (
              <ToggleRow key={i} label={label} description={recurring.find((r) => r.weekday === i) ? `${recurring.find((r) => r.weekday === i)!.start}–${recurring.find((r) => r.weekday === i)!.end}` : undefined}
                checked={recurring.some((r) => r.weekday === i)} onChange={() => toggleRecurringDay(i)} />
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex items-end gap-2">
              <TextField label="Date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm" />
              <TextField label="From" name="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="text-sm" />
              <TextField label="To" name="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="text-sm" />
            </div>
            {err && <p className="mt-1 text-xs text-error">{err}</p>}
            <Button variant="outline" className="mt-2 w-full" disabled={!date} onClick={add}>+ Add slot</Button>
            <div className="mt-3 flex flex-col gap-2">
              {slots.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm">
                  <span className="flex-1">{s.date} · {s.start}–{s.end}</span>
                  <button type="button" aria-label={`Remove slot ${s.date}`} onClick={() => removeSlot(s.id)}><X size={14} /></button>
                </div>
              ))}
              {slots.length === 0 && <p className="py-4 text-center text-sm text-muted">Add your first slot.</p>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Wire the route in `src/app/router.tsx`**

```tsx
import { AvailabilityScreen } from '../screens/pandit/AvailabilityScreen';
```
```tsx
      { path: '/pandit/calendar/availability', element: <RequirePanditApproved><AvailabilityScreen /></RequirePanditApproved> },
```

- [ ] **Step 3: Write the test** — `src/screens/pandit/AvailabilityScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AvailabilityScreen } from './AvailabilityScreen';
import { usePanditAvailabilityStore } from '../../store/panditAvailabilityStore';
import { useSessionStore } from '../../store/sessionStore';
import { seedPanditAvailability } from '../../mock/seed';

beforeEach(() => {
  usePanditAvailabilityStore.setState({ recurring: seedPanditAvailability.recurring, slots: seedPanditAvailability.slots, leaves: seedPanditAvailability.leaves });
  useSessionStore.setState(useSessionStore.getInitialState());
});

describe('AvailabilityScreen', () => {
  it('toggles a recurring weekday in the store', () => {
    render(<MemoryRouter><AvailabilityScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('switch', { name: 'Tue' }));
    expect(usePanditAvailabilityStore.getState().recurring.some((r) => r.weekday === 2)).toBe(true);
  });
  it('shows an overlap error when adding a conflicting specific slot', () => {
    render(<MemoryRouter><AvailabilityScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('tab', { name: 'Specific dates' }));
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-06-28' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '11:00' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '14:00' } }); // overlaps av-1 10:00-13:00
    fireEvent.click(screen.getByRole('button', { name: '+ Add slot' }));
    expect(screen.getByText(/overlaps an existing slot/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- AvailabilityScreen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Pandit Manage Availability screen (F2) — recurring + specific slots + overlap guard"
```

---

### Task 4: Leave Management screen (F3)

**Files:**
- Create: `src/screens/pandit/LeaveScreen.tsx`
- Modify: `src/app/router.tsx` (`/pandit/calendar/leave`)
- Test: `src/screens/pandit/LeaveScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Button`, `TextField`, `SegmentedControl`, `Chip`, `Badge`, `Card`; `panditAvailabilityStore` (`leaves`, `addLeave`, `removeLeave`).
- Produces: `LeaveScreen`.

- [ ] **Step 1: Create `src/screens/pandit/LeaveScreen.tsx`**

```tsx
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { X } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Chip } from '../../components/ui/Chip';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { usePanditAvailabilityStore } from '../../store/panditAvailabilityStore';
import type { LeaveType } from '../../mock/types';

type Scope = 'dates' | 'slot';
const TYPES: LeaveType[] = ['vacation', 'festival', 'personal'];
const TYPE_LABEL: Record<LeaveType, string> = { vacation: 'Vacation', festival: 'Festival', personal: 'Personal' };

export function LeaveScreen() {
  const leaves = usePanditAvailabilityStore(useShallow((s) => s.leaves));
  const addLeave = usePanditAvailabilityStore((s) => s.addLeave);
  const removeLeave = usePanditAvailabilityStore((s) => s.removeLeave);

  const [scope, setScope] = useState<Scope>('dates');
  const [type, setType] = useState<LeaveType>('vacation');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('11:00');
  const [reason, setReason] = useState('');

  const valid = scope === 'dates' ? Boolean(from) : Boolean(from) && end > start;
  const add = () => {
    addLeave(scope === 'dates'
      ? { scope, type, fromDate: from, toDate: to || undefined, reason: reason.trim() || undefined }
      : { scope, type, fromDate: from, startTime: start, endTime: end, reason: reason.trim() || undefined });
    setFrom(''); setTo(''); setReason('');
  };

  return (
    <>
      <AppBar title="Leave & blocks" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <SegmentedControl<Scope>
          segments={[{ value: 'dates', label: 'Block dates' }, { value: 'slot', label: 'Block slot' }]}
          value={scope} onChange={setScope} />

        <div className="mt-4 flex flex-wrap gap-2">
          {TYPES.map((t) => <Chip key={t} label={TYPE_LABEL[t]} selected={type === t} onClick={() => setType(t)} />)}
        </div>

        <div className="mt-3 flex items-end gap-2">
          <TextField label={scope === 'dates' ? 'From' : 'Date'} name="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-sm" />
          {scope === 'dates' ? (
            <TextField label="To (optional)" name="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-sm" />
          ) : (
            <>
              <TextField label="From" name="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="text-sm" />
              <TextField label="To" name="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="text-sm" />
            </>
          )}
        </div>
        <TextField label="Reason (optional)" name="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2" />
        <Button className="mt-3 w-full" disabled={!valid} onClick={add}>Add block</Button>

        <h2 className="mb-2 mt-5 text-sm font-semibold">Scheduled leaves</h2>
        {leaves.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No leaves scheduled.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {leaves.map((l) => (
              <Card key={l.id} className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium"><Badge className="bg-surface-2 text-muted">{TYPE_LABEL[l.type]}</Badge>
                    {l.scope === 'dates' ? `${l.fromDate}${l.toDate ? ` → ${l.toDate}` : ''}` : `${l.fromDate} · ${l.startTime}–${l.endTime}`}</p>
                  {l.reason && <p className="text-xs text-muted">{l.reason}</p>}
                </div>
                <button type="button" aria-label={`Remove leave ${l.fromDate}`} onClick={() => removeLeave(l.id)}><X size={16} className="text-muted" /></button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Wire the route in `src/app/router.tsx`**

```tsx
import { LeaveScreen } from '../screens/pandit/LeaveScreen';
```
```tsx
      { path: '/pandit/calendar/leave', element: <RequirePanditApproved><LeaveScreen /></RequirePanditApproved> },
```

- [ ] **Step 3: Write the test** — `src/screens/pandit/LeaveScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LeaveScreen } from './LeaveScreen';
import { usePanditAvailabilityStore } from '../../store/panditAvailabilityStore';
import { seedPanditAvailability } from '../../mock/seed';

beforeEach(() => usePanditAvailabilityStore.setState({ recurring: seedPanditAvailability.recurring, slots: seedPanditAvailability.slots, leaves: seedPanditAvailability.leaves }));

describe('LeaveScreen', () => {
  it('lists the seeded leave and can add a date block', () => {
    render(<MemoryRouter><LeaveScreen /></MemoryRouter>);
    expect(screen.getByText(/2026-07-10/)).toBeInTheDocument();
    const before = usePanditAvailabilityStore.getState().leaves.length;
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    expect(usePanditAvailabilityStore.getState().leaves.length).toBe(before + 1);
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- LeaveScreen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Pandit Leave Management screen (F3) — date/slot blocks + types"
```

---

### Task 5: Calendar screen (F1) + wire /pandit/calendar + integration + gate

**Files:**
- Create: `src/screens/pandit/CalendarScreen.tsx`
- Modify: `src/app/router.tsx` (replace the `/pandit/calendar` stub)
- Test: `src/screens/pandit/CalendarScreen.test.tsx`, `src/app/pandit-calendar-flow.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `SegmentedControl`, `Button`, `BottomSheet`; `MonthGrid`, `CalendarLegend`, `DayAgenda`; `panditAvailabilityStore` (`getSlotsForDate`, `isOnLeave`, `slots`, `leaves`), `panditBookingStore` (`bookings`), `dataStore.getPuja`.
- Produces: `CalendarScreen` (wired at `/pandit/calendar`, replacing the stub).

- [ ] **Step 1: Create `src/screens/pandit/CalendarScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import dayjs from 'dayjs';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { MonthGrid, type DayMark } from '../../components/pandit/MonthGrid';
import { CalendarLegend } from '../../components/pandit/CalendarLegend';
import { DayAgenda } from '../../components/pandit/DayAgenda';
import { usePanditAvailabilityStore } from '../../store/panditAvailabilityStore';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';

type View = 'month' | 'day';

export function CalendarScreen() {
  const navigate = useNavigate();
  const todayISO = dayjs(new Date()).format('YYYY-MM-DD');
  const [view, setView] = useState<View>('month');
  const [month, setMonth] = useState(() => dayjs(new Date()).format('YYYY-MM-01'));
  const [selected, setSelected] = useState(todayISO);
  const [addOpen, setAddOpen] = useState(false);

  const bookings = usePanditBookingStore(useShallow((s) => s.bookings));
  const slotsStore = usePanditAvailabilityStore(useShallow((s) => s.slots));
  const leavesStore = usePanditAvailabilityStore(useShallow((s) => s.leaves));
  const getSlotsForDate = usePanditAvailabilityStore((s) => s.getSlotsForDate);
  const isOnLeave = usePanditAvailabilityStore((s) => s.isOnLeave);
  const getPuja = useDataStore((s) => s.getPuja);

  // marks for the visible month
  const marks: Record<string, DayMark> = {};
  const mark = (iso: string, key: keyof DayMark) => { (marks[iso] ??= {})[key] = true; };
  bookings.forEach((b) => mark(dayjs(b.pujaStartISO).format('YYYY-MM-DD'), 'booking'));
  slotsStore.forEach((s) => mark(s.date, 'slot'));
  leavesStore.forEach((l) => {
    let d = dayjs(l.fromDate); const end = dayjs(l.toDate ?? l.fromDate);
    while (d.isSame(end, 'day') || d.isBefore(end, 'day')) { mark(d.format('YYYY-MM-DD'), 'leave'); d = d.add(1, 'day'); }
  });

  const dayBookings = bookings.filter((b) => dayjs(b.pujaStartISO).format('YYYY-MM-DD') === selected);
  const daySlots = getSlotsForDate(selected);

  return (
    <>
      <AppBar
        title="Calendar"
        right={<button type="button" aria-label="Add" onClick={() => setAddOpen(true)} className="p-2 text-primary"><Plus size={20} /></button>}
      />
      <div className="flex-1 overflow-y-auto p-4">
        <SegmentedControl<View> segments={[{ value: 'month', label: 'Month' }, { value: 'day', label: 'Day' }]} value={view} onChange={setView} />

        {view === 'month' && (
          <>
            <div className="mt-3 flex items-center justify-between">
              <button type="button" aria-label="Previous month" onClick={() => setMonth(dayjs(month).subtract(1, 'month').format('YYYY-MM-01'))}><ChevronLeft size={20} /></button>
              <span className="text-sm font-medium">{dayjs(month).format('MMMM YYYY')}</span>
              <button type="button" aria-label="Next month" onClick={() => setMonth(dayjs(month).add(1, 'month').format('YYYY-MM-01'))}><ChevronRight size={20} /></button>
            </div>
            <div className="mt-2"><MonthGrid monthISO={month} selectedISO={selected} marks={marks} onSelect={setSelected} /></div>
            <CalendarLegend />
          </>
        )}

        <h2 className="mb-1 mt-3 text-sm font-semibold">{dayjs(selected).format('ddd, D MMM')}</h2>
        <DayAgenda
          bookings={dayBookings}
          slots={daySlots}
          onLeave={isOnLeave(selected)}
          getPujaName={(id) => getPuja(id)?.name ?? 'Puja'}
        />
      </div>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add to calendar">
        <div className="flex flex-col gap-2">
          <Button onClick={() => { setAddOpen(false); navigate('/pandit/calendar/availability'); }}>Manage availability</Button>
          <Button variant="outline" onClick={() => { setAddOpen(false); navigate('/pandit/calendar/leave'); }}>Add leave / block</Button>
        </div>
      </BottomSheet>
    </>
  );
}
```

- [ ] **Step 2: Replace the `/pandit/calendar` stub in `src/app/router.tsx`**

Add the import:

```tsx
import { CalendarScreen } from '../screens/pandit/CalendarScreen';
```

Replace:

```tsx
      { path: '/pandit/calendar', element: <RequirePanditApproved><PanditStub title="Calendar" /></RequirePanditApproved> },
```

with:

```tsx
      { path: '/pandit/calendar', element: <RequirePanditApproved><CalendarScreen /></RequirePanditApproved> },
```

- [ ] **Step 3: Write the screen test** — `src/screens/pandit/CalendarScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CalendarScreen } from './CalendarScreen';
import { usePanditAvailabilityStore } from '../../store/panditAvailabilityStore';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';
import { seedPanditAvailability, seedPanditBookings, seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => {
  usePanditAvailabilityStore.setState({ recurring: seedPanditAvailability.recurring, slots: seedPanditAvailability.slots, leaves: seedPanditAvailability.leaves });
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('CalendarScreen', () => {
  it('renders the month grid and switches to Day view', () => {
    render(<MemoryRouter><CalendarScreen /></MemoryRouter>);
    expect(screen.getByText('Month')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Day' }));
    // day agenda heading present (selected defaults to today)
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveAttribute('aria-selected', 'true');
  });
  it('opens the add sheet with availability + leave actions', () => {
    render(<MemoryRouter><CalendarScreen /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText('Add'));
    expect(screen.getByRole('button', { name: 'Manage availability' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add leave / block' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Write the integration walkthrough** — `src/app/pandit-calendar-flow.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { usePanditAvailabilityStore } from '../store/panditAvailabilityStore';
import { usePanditBookingStore } from '../store/panditBookingStore';
import { useDataStore } from '../store/dataStore';
import { seedPanditAvailability, seedPanditBookings, seedCategories, seedPujas, seedPandits, seedReviews } from '../mock/seed';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  usePanditAvailabilityStore.setState({ recurring: seedPanditAvailability.recurring, slots: seedPanditAvailability.slots, leaves: seedPanditAvailability.leaves });
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
  useSessionStore.getState().becomePandit();
  useSessionStore.getState().switchMode('pandit');
  useSessionStore.getState().setPanditStatus('approved');
});

describe('pandit calendar flow (integration)', () => {
  it('calendar → add sheet → Manage availability → toggle a recurring day', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/calendar'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByLabelText('Add'));
    fireEvent.click(screen.getByRole('button', { name: 'Manage availability' }));
    expect(screen.getByText('Availability')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Tue' }));
    expect(usePanditAvailabilityStore.getState().recurring.some((r) => r.weekday === 2)).toBe(true);
  });
});
```

- [ ] **Step 5: Run the full suite + typecheck + build (P3c gate)**

Run: `npm test`
Expected: PASS — all suites incl. `availability`, `panditAvailabilityStore`, `calendar-components`, `AvailabilityScreen`, `LeaveScreen`, `CalendarScreen`, `pandit-calendar-flow`.

Run: `npm run typecheck && npm run build`
Expected: both PASS.

- [ ] **Step 6: Manual look check**

Run: `npm run dev`. Log in (OTP `123456`) → become a pandit → onboarding → simulate approval → Calendar tab. Verify: month grid shows dots (the seeded booking on 21 Jun = maroon; recurring/specific slots = saffron; festival leave 10–12 Jul = grey); tap a day → agenda; "+" → action sheet → Manage availability (toggle weekdays, add a specific slot, overlap rejected) and Leave & blocks (add a date block, see it listed + reflected on the grid). Day view shows the selected day's agenda.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Pandit Calendar (F1) month/day + overlays + wire /pandit/calendar (P3c complete)"
```

---

## Self-Review

**Spec coverage (P3c = §F1–F3):**
- F1 Calendar → Task 5 (`CalendarScreen`): Month grid (booking/slot/leave dots) + Day agenda, view switch, month prev/next, legend, "+" action sheet → availability/leave, taps a day → agenda. ✔ (**Week** time-grid omitted — documented simplification; Month+Day cover the prototype.)
- F2 Manage Availability → Task 3 (`AvailabilityScreen`): recurring weekday toggles + specific-date slots with overlap guard + master accepting toggle (mirrors Dashboard). ✔
- F3 Leave Management → Task 4 (`LeaveScreen`): block dates (range) + block slot, leave type (vacation/festival/personal), list + delete. ✔
- Overlap guard (F2) + leave-on-date (F1 overlay) → Task 1 domain + store. ✔
- Calendar overlays bookings (panditBookingStore) + availability + leaves → Task 5. ✔

**Intentional deferrals (out of P3c):** the **Week** time-grid view (Month + Day shipped); swipe-to-change-period (prev/next buttons instead); per-day multiple recurring time ranges + copy-to-all (one range per weekday now); leave-vs-booking conflict warning MODAL (the calendar shows both; the spec's "booking wins" is visual — a hard warning dialog is deferred); tap-booking-block → booking detail deep-link (P3e wires `/pandit/bookings/:id`); autosave toasts. None block the availability/leave/calendar core.

**Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". Complete code in every step; commands list expected output. The Week-view omission and conflict-modal deferral are called out here, not hidden as stubs.

**Type consistency:** `PanditLeave`/`LeaveType` (Task 1) consumed by `LeaveScreen` (Task 4), the store, and `DayAgenda`/`CalendarScreen` overlays. Domain helpers `timeOverlap`/`slotOverlapsExisting`/`recurringForWeekday`/`isOnLeaveDate` (Task 1) used by the store. `panditAvailabilityStore` API (`toggleRecurringDay`/`setRecurringTime`/`addSlot`→`OnboardingSlot|null`/`removeSlot`/`addLeave`/`removeLeave`/`getSlotsForDate`/`isOnLeave`) consumed by Tasks 3–5. `MonthGrid`/`DayMark`/`DayAgenda` (Task 2) consumed by `CalendarScreen` (Task 5). Reuses onboarding `OnboardingRecurring`/`OnboardingSlot` unchanged. `sessionStore.acceptingBookings` is the single master-toggle source (Dashboard + Availability). Routes under `/pandit/calendar*` wrapped in `RequirePanditApproved`. `seedPanditAvailability` consumed by the store + every test.
