# Pandit Seva — Phase 1d (Bookings & Lifecycle) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps. **Git: commit LOCALLY only — NEVER `git push`/`git remote`/`git branch -M`/`git checkout <other>`. The user pushes manually. No push-blocking guards.**

**Goal:** Close the Jajman booking lifecycle: a **Bookings list** (tabs Upcoming/Ongoing/Completed/Cancelled), a richer booking **detail** with **cancel + refund (−5% of amount paid, §0.3)** and alt-state rendering, **rate the pandit** after completion (stars + review + mock photo), and **repeat/recurring** (rebook same pandit/puja; recurring monthly/quarterly/annual with a manage screen).

**Architecture:** Reuse `jajmanTab` (§0.2, already built+tested) to bucket bookings. Extend `bookingStore` with `cancelBooking` (uses `computeRefund`, already built), `rateBooking`, and recurring CRUD; add `addReview` to `dataStore`. A pure `nextRecurrence` helper (TDD). New components: `BookingCard`, `StatusPill`, `RefundBreakdown`, `RatingInput`. The Bookings tab lives under the tabbed `AppLayout`; rate/recurring drill-downs under `AppPlainLayout`.

**Tech Stack:** existing (React 18 + TS + Tailwind + zustand + react-router-dom 6 + lucide-react + dayjs + nanoid). Tests: Vitest + RTL.

**Builds on:** P0+P1a+P1b+P1c (on `main`). Reuse `Button`, `Card`, `Badge`, `Avatar`, `AppBar`, `BackButton`, `Chip`, `SegmentedControl`, `BottomSheet`, `SectionHeader`, `StatusStepper`, `MoneyBreakdown`, `RatingStars`, `cn`, `useBookingStore`, `useDataStore`, `jajmanTab`, `computeRefund`, `nextRecurrence` (new). Reference spec §0.2 (tabs), §0.3 (refund), §0.5 stub, Appendix RecurringSeries.

**Working directory:** paths relative to `pandit-seva-app/` (branch `p1d-bookings`).

---

### Task 1: Lifecycle types, recurrence logic, store mutations

**Files:**
- Modify: `src/mock/types.ts`
- Modify: `src/mock/seed.ts`
- Create: `src/domain/recurrence.ts`
- Test: `src/domain/recurrence.test.ts`
- Modify: `src/store/dataStore.ts`
- Modify: `src/store/dataStore.test.ts`
- Modify: `src/store/bookingStore.ts`
- Modify: `src/store/bookingStore.test.ts`

- [ ] **Step 1: Extend `src/mock/types.ts`** — add a `cancellation` field to `Booking` (place after `isDisputed`) and add recurring types:

```ts
  cancellation?: {
    initiatedBy: 'jajman' | 'pandit';
    refundAmount: number;
    platformCut: number;
    reason?: string;
  };
```

```ts
export type RecurInterval = 'monthly' | 'quarterly' | 'annual';
export interface RecurringSeries {
  id: string;
  panditId: string;
  pujaId: string;
  interval: RecurInterval;
  nextDate: string; // ISO
  status: 'active' | 'paused' | 'cancelled';
  generatedBookingIds: string[];
  createdAt: string;
}
```

- [ ] **Step 2: Add more seed bookings + a recurring series to `src/mock/seed.ts`** — extend `seedBookings` so the Bookings tabs have content (keep the existing `bkg-demo-1` completed entry, add these):

```ts
  {
    id: 'bkg-demo-2', panditId: 'pnd-1', pujaId: 'puja-satyanarayan', type: 'single', status: 'scheduled',
    pujaStartISO: '2026-07-05T09:00:00.000Z', slotLabel: '5 Jul · 09:00 AM', addressId: 'addr-home',
    attachments: [], notes: '', isEmergency: false,
    charges: { base: 1100, travel: 48, emergencySurcharge: 0, subtotal: 1148 },
    advanceAmount: 344, remainingAmount: 804, amountPaid: 344,
    createdAt: '2026-06-18T09:00:00.000Z', requestExpiresAt: '2026-06-19T09:00:00.000Z', isDisputed: false,
  },
  {
    id: 'bkg-demo-3', panditId: 'pnd-3', pujaId: 'puja-mahamrityunjaya', type: 'single', status: 'requested',
    pujaStartISO: '2026-07-12T11:00:00.000Z', slotLabel: '12 Jul · 11:00 AM', addressId: 'addr-temple',
    attachments: [], notes: '', isEmergency: false,
    charges: { base: 2100, travel: 102, emergencySurcharge: 0, subtotal: 2202 },
    advanceAmount: 661, remainingAmount: 1541, amountPaid: 0,
    createdAt: '2026-06-20T08:00:00.000Z', requestExpiresAt: '2026-06-21T08:00:00.000Z', isDisputed: false,
  },
  {
    id: 'bkg-demo-4', panditId: 'pnd-6', pujaId: 'puja-ganesh', type: 'single', status: 'rated',
    pujaStartISO: '2026-05-02T16:00:00.000Z', slotLabel: '2 May · 04:00 PM', addressId: 'addr-home',
    attachments: [], notes: '', isEmergency: false,
    charges: { base: 1500, travel: 86, emergencySurcharge: 0, subtotal: 1586 },
    advanceAmount: 476, remainingAmount: 1110, amountPaid: 1586,
    createdAt: '2026-04-20T09:00:00.000Z', requestExpiresAt: '2026-04-21T09:00:00.000Z', isDisputed: false,
  },
```

And add a recurring series export:

```ts
import type { RecurringSeries } from './types';
export const seedRecurring: RecurringSeries[] = [
  { id: 'rec-1', panditId: 'pnd-1', pujaId: 'puja-satyanarayan', interval: 'monthly', nextDate: '2026-07-15T09:00:00.000Z', status: 'active', generatedBookingIds: ['bkg-demo-1'], createdAt: '2026-05-15T09:00:00.000Z' },
];
```

- [ ] **Step 3: Write the failing test** — `src/domain/recurrence.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { nextRecurrence } from './recurrence';

describe('nextRecurrence', () => {
  it('monthly adds one month', () => {
    expect(nextRecurrence('2026-01-15T09:00:00.000Z', 'monthly')).toBe('2026-02-15T09:00:00.000Z');
  });
  it('quarterly adds three months', () => {
    expect(nextRecurrence('2026-01-15T09:00:00.000Z', 'quarterly')).toBe('2026-04-15T09:00:00.000Z');
  });
  it('annual adds one year', () => {
    expect(nextRecurrence('2026-01-15T09:00:00.000Z', 'annual')).toBe('2027-01-15T09:00:00.000Z');
  });
});
```

- [ ] **Step 4: Run to verify it fails** — `npm test -- recurrence` → FAIL (no module).

- [ ] **Step 5: Implement `src/domain/recurrence.ts`**

```ts
import dayjs from 'dayjs';
import type { RecurInterval } from '../mock/types';

export function nextRecurrence(fromISO: string, interval: RecurInterval): string {
  const d = dayjs(fromISO);
  if (interval === 'monthly') return d.add(1, 'month').toISOString();
  if (interval === 'quarterly') return d.add(3, 'month').toISOString();
  return d.add(1, 'year').toISOString();
}
```

- [ ] **Step 6: Run to verify it passes** — `npm test -- recurrence` → PASS.

- [ ] **Step 7: Add `addReview` to `src/store/dataStore.ts`** — add to the interface `addReview: (review: Review) => void;` and the implementation:

```ts
  addReview: (review) => set((s) => ({ reviews: [review, ...s.reviews] })),
```

- [ ] **Step 8: Add a dataStore test** — in `src/store/dataStore.test.ts` add:

```ts
  it('addReview prepends a review', () => {
    const before = useDataStore.getState().getReviewsForPandit('pnd-1').length;
    useDataStore.getState().addReview({ id: 'rev-new', panditId: 'pnd-1', jajmanName: 'Test', rating: 5, text: 'Great', date: '2026-06-20' });
    expect(useDataStore.getState().getReviewsForPandit('pnd-1').length).toBe(before + 1);
  });
```

- [ ] **Step 9: Extend `src/store/bookingStore.ts`** — add recurring state + cancel/rate/recurring actions. Add imports at top: `import { computeRefund } from '../domain/money';`, `import { nextRecurrence } from '../domain/recurrence';`, `import { seedRecurring } from './../mock/seed';`, and `import type { RecurInterval, RecurringSeries } from '../mock/types';`. Extend the interface + store:

```ts
  // add to BookingState interface:
  recurring: RecurringSeries[];
  cancelBooking: (id: string, initiatedBy: 'jajman' | 'pandit', reason?: string) => void;
  rateBooking: (id: string) => void;
  createRecurring: (panditId: string, pujaId: string, interval: RecurInterval, fromISO: string) => RecurringSeries;
  pauseRecurring: (id: string) => void;
  resumeRecurring: (id: string) => void;
  cancelRecurring: (id: string) => void;
  getRecurring: () => RecurringSeries[];
```

```ts
  // add to the store object (alongside the existing actions):
  recurring: seedRecurring,

  cancelBooking: (id, initiatedBy, reason) =>
    set((s) => ({
      bookings: s.bookings.map((b) => {
        if (b.id !== id) return b;
        const { refundAmount, platformCut } = computeRefund(b.amountPaid, initiatedBy);
        return { ...b, status: 'cancelled', cancellation: { initiatedBy, refundAmount, platformCut, reason } };
      }),
    })),

  rateBooking: (id) =>
    set((s) => ({ bookings: s.bookings.map((b) => (b.id === id && b.status === 'completed' ? { ...b, status: 'rated' } : b)) })),

  createRecurring: (panditId, pujaId, interval, fromISO) => {
    const series: RecurringSeries = {
      id: `rec-${nanoid(6)}`, panditId, pujaId, interval,
      nextDate: nextRecurrence(fromISO, interval), status: 'active', generatedBookingIds: [], createdAt: fromISO,
    };
    set((s) => ({ recurring: [series, ...s.recurring] }));
    return series;
  },

  pauseRecurring: (id) => set((s) => ({ recurring: s.recurring.map((r) => (r.id === id ? { ...r, status: 'paused' } : r)) })),
  resumeRecurring: (id) => set((s) => ({ recurring: s.recurring.map((r) => (r.id === id ? { ...r, status: 'active' } : r)) })),
  cancelRecurring: (id) => set((s) => ({ recurring: s.recurring.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)) })),
  getRecurring: () => get().recurring,
```

- [ ] **Step 10: Add bookingStore tests** — in `src/store/bookingStore.test.ts` add:

```ts
  it('cancelBooking (jajman) refunds amount paid minus 5%', () => {
    // bkg-demo-1: amountPaid 288 → cut 14, refund 274
    useBookingStore.getState().cancelBooking('bkg-demo-1', 'jajman', 'changed plans');
    const b = useBookingStore.getState().getBooking('bkg-demo-1')!;
    expect(b.status).toBe('cancelled');
    expect(b.cancellation).toEqual({ initiatedBy: 'jajman', refundAmount: 274, platformCut: 14, reason: 'changed plans' });
  });

  it('cancelBooking (pandit) refunds in full', () => {
    useBookingStore.getState().cancelBooking('bkg-demo-1', 'pandit');
    expect(useBookingStore.getState().getBooking('bkg-demo-1')!.cancellation).toMatchObject({ refundAmount: 288, platformCut: 0 });
  });

  it('createRecurring computes the next date and pause/resume/cancel work', () => {
    const r = useBookingStore.getState().createRecurring('pnd-1', 'puja-satyanarayan', 'monthly', '2026-06-15T09:00:00.000Z');
    expect(r.nextDate).toBe('2026-07-15T09:00:00.000Z');
    useBookingStore.getState().pauseRecurring(r.id);
    expect(useBookingStore.getState().getRecurring().find((x) => x.id === r.id)?.status).toBe('paused');
    useBookingStore.getState().cancelRecurring(r.id);
    expect(useBookingStore.getState().getRecurring().find((x) => x.id === r.id)?.status).toBe('cancelled');
  });
```

- [ ] **Step 11: Run all tests + typecheck** — `npm test` (all pass), `npm run typecheck` (clean).

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: lifecycle types (cancellation, recurring), recurrence logic, addReview, booking cancel/rate/recurring mutations + seeds"
```

---

### Task 2: Lifecycle components

**Files:**
- Create: `src/components/ui/StatusPill.tsx`
- Create: `src/components/ui/RefundBreakdown.tsx`
- Create: `src/components/ui/RatingInput.tsx`
- Create: `src/components/booking/BookingCard.tsx`
- Test: `src/components/booking/lifecycle-components.test.tsx`

- [ ] **Step 1: Create `src/components/ui/StatusPill.tsx`**

```tsx
import type { BookingStatus } from '../../domain/types';
import { Badge } from './Badge';

const LABEL: Record<BookingStatus, string> = {
  requested: 'Requested', accepted: 'Accepted', advance_paid: 'Advance paid', scheduled: 'Scheduled',
  in_progress: 'In progress', completed: 'Completed', rated: 'Rated', rejected: 'Rejected',
  cancelled: 'Cancelled', refund_initiated: 'Refund initiated', refund_completed: 'Refunded', expired: 'Expired',
};
const TONE: Partial<Record<BookingStatus, string>> = {
  scheduled: 'bg-info/10 text-info', accepted: 'bg-info/10 text-info', in_progress: 'bg-warning/15 text-warning',
  completed: 'bg-success/10 text-success', rated: 'bg-success/10 text-success',
  cancelled: 'bg-error/10 text-error', rejected: 'bg-error/10 text-error', expired: 'bg-error/10 text-error',
  refund_initiated: 'bg-warning/15 text-warning', refund_completed: 'bg-success/10 text-success',
};

export function StatusPill({ status }: { status: BookingStatus }) {
  return <Badge className={TONE[status] ?? 'bg-surface-2 text-muted'}>{LABEL[status]}</Badge>;
}
```

- [ ] **Step 2: Create `src/components/ui/RefundBreakdown.tsx`** (§0.3 — uses "amount paid")

```tsx
export function RefundBreakdown({ amountPaid, platformCut, refundAmount }: { amountPaid: number; platformCut: number; refundAmount: number }) {
  return (
    <div className="rounded-md border border-border bg-surface p-3 text-sm">
      <div className="flex justify-between py-0.5"><span className="text-muted">Amount paid</span><span>₹{amountPaid}</span></div>
      <div className="flex justify-between py-0.5"><span className="text-muted">Platform cut (5%)</span><span>−₹{platformCut}</span></div>
      <div className="my-1 border-t border-border" />
      <div className="flex justify-between py-0.5 font-semibold text-success"><span>You receive</span><span>₹{refundAmount}</span></div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/ui/RatingInput.tsx`**

```tsx
import { Star } from 'lucide-react';
import { cn } from '../../lib/cn';

export function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)}>
          <Star size={32} className={cn(n <= value ? 'fill-accent text-accent' : 'text-border')} />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/booking/BookingCard.tsx`**

```tsx
import type { Booking } from '../../mock/types';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { StatusPill } from '../ui/StatusPill';
import { useDataStore } from '../../store/dataStore';

export function BookingCard({ booking, onClick }: { booking: Booking; onClick?: () => void }) {
  const pandit = useDataStore((s) => s.getPandit(booking.panditId));
  const puja = useDataStore((s) => s.getPuja(booking.pujaId));
  return (
    <Card role="button" tabIndex={0} onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      aria-label={`Booking ${puja?.name ?? ''}`} className="flex cursor-pointer gap-3 p-3 transition active:scale-[0.99]">
      <Avatar name={pandit?.name ?? '?'} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold">{puja?.name}</h3>
          <StatusPill status={booking.status} />
        </div>
        <p className="truncate text-xs text-muted">{pandit?.name}</p>
        <p className="text-xs text-muted">{booking.slotLabel}</p>
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Write the test** — `src/components/booking/lifecycle-components.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusPill } from '../ui/StatusPill';
import { RefundBreakdown } from '../ui/RefundBreakdown';
import { RatingInput } from '../ui/RatingInput';
import { BookingCard } from './BookingCard';
import { seedBookings } from '../../mock/seed';

describe('lifecycle components', () => {
  it('StatusPill labels a status', () => {
    render(<StatusPill status="scheduled" />);
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });
  it('RefundBreakdown shows amount paid, cut, and refund', () => {
    render(<RefundBreakdown amountPaid={288} platformCut={14} refundAmount={274} />);
    expect(screen.getByText('Amount paid')).toBeInTheDocument();
    expect(screen.getByText('−₹14')).toBeInTheDocument();
    expect(screen.getByText('₹274')).toBeInTheDocument();
  });
  it('RatingInput reports the chosen star', () => {
    const onChange = vi.fn();
    render(<RatingInput value={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '4 stars' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });
  it('BookingCard shows puja, pandit, and status', () => {
    render(<BookingCard booking={seedBookings[0]} />);
    expect(screen.getByText('Ganesh Puja')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test** — `npm test -- lifecycle-components` → PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: lifecycle components (StatusPill, RefundBreakdown, RatingInput, BookingCard)"
```

---

### Task 3: Bookings list (tabs)

**Files:**
- Create: `src/screens/jajman/BookingsListScreen.tsx`
- Test: `src/screens/jajman/BookingsListScreen.test.tsx`

- [ ] **Step 1: Create `src/screens/jajman/BookingsListScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../components/ui/AppBar';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { BookingCard } from '../../components/booking/BookingCard';
import { useBookingStore } from '../../store/bookingStore';
import { jajmanTab, type JajmanBookingTab } from '../../domain/booking';

const TABS: { value: JajmanBookingTab; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function BookingsListScreen() {
  const navigate = useNavigate();
  const bookings = useBookingStore(useShallow((s) => s.bookings));
  const [tab, setTab] = useState<JajmanBookingTab>('upcoming');
  const visible = bookings.filter((b) => jajmanTab(b.status) === tab);

  return (
    <>
      <AppBar title="My bookings" />
      <div className="border-b border-border p-3">
        <SegmentedControl segments={TABS} value={tab} onChange={setTab} />
      </div>
      <div className="flex-1 p-4">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="text-4xl">🗒️</div>
            <p className="text-sm text-muted">No {tab} bookings.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((b) => (
              <BookingCard key={b.id} booking={b} onClick={() => navigate(`/app/booking/${b.id}`)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

> Lives under the tabbed `AppLayout` (the Bookings bottom-tab) — the layout provides the scroll container + tabs.

- [ ] **Step 2: Write the test** — `src/screens/jajman/BookingsListScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BookingsListScreen } from './BookingsListScreen';
import { useBookingStore } from '../../store/bookingStore';

beforeEach(() => useBookingStore.setState(useBookingStore.getInitialState()));

describe('BookingsListScreen', () => {
  it('shows scheduled bookings under Upcoming and switches tabs', () => {
    render(<MemoryRouter><BookingsListScreen /></MemoryRouter>);
    // seed bkg-demo-2 is scheduled (Upcoming) → its puja "Satyanarayan Katha" shows
    expect(screen.getByText('Satyanarayan Katha')).toBeInTheDocument();
    // switch to Completed → demo-1 (Ganesh Puja, completed)
    fireEvent.click(screen.getByRole('tab', { name: 'Completed' }));
    expect(screen.getByText('Ganesh Puja')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test** — `npm test -- BookingsListScreen` → PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: Bookings list screen with lifecycle tabs"
```

---

### Task 4: Cancel + refund, alt-state detail, rate pandit

**Files:**
- Modify: `src/screens/jajman/booking/BookingDetailScreen.tsx`
- Create: `src/screens/jajman/booking/CancelSheet.tsx`
- Create: `src/screens/jajman/booking/RatePanditScreen.tsx`
- Test: `src/screens/jajman/booking/lifecycle-flow.test.tsx`

- [ ] **Step 1: Create `src/screens/jajman/booking/CancelSheet.tsx`** (uses BottomSheet + RefundBreakdown; computes the preview via computeRefund)

```tsx
import { useState } from 'react';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { RefundBreakdown } from '../../../components/ui/RefundBreakdown';
import { computeRefund } from '../../../domain/money';
import type { Booking } from '../../../mock/types';

export function CancelSheet({ open, booking, onClose, onConfirm }: { open: boolean; booking: Booking; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  const { refundAmount, platformCut } = computeRefund(booking.amountPaid, 'jajman');
  return (
    <BottomSheet open={open} onClose={onClose} title="Cancel booking"
      footer={<Button className="w-full" onClick={() => onConfirm(reason)}>Confirm cancellation</Button>}>
      <p className="mb-3 text-sm text-muted">Cancelling this booking{booking.amountPaid > 0 ? ' will refund your advance minus a 5% platform cut.' : '.'}</p>
      {booking.amountPaid > 0 && <div className="mb-3"><RefundBreakdown amountPaid={booking.amountPaid} platformCut={platformCut} refundAmount={refundAmount} /></div>}
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason" rows={2}
        placeholder="Reason (optional)" className="w-full rounded-md border border-border bg-surface p-2 text-sm outline-none focus:border-primary" />
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Update `src/screens/jajman/booking/BookingDetailScreen.tsx`** — add: (a) a cancellation banner + `RefundBreakdown` when `booking.cancellation` exists; (b) a "Cancel booking" action (opens CancelSheet) when status ∈ {requested, accepted, advance_paid, scheduled}; (c) a "Rate pandit" CTA when status === 'completed' and not rated; (d) a "Rebook"/"Make recurring" entry when status ∈ {completed, rated}. Concretely:
  - Import `useState`, `CancelSheet`, `StatusPill`, `RefundBreakdown`, `cancelBooking` from the store.
  - Add `const [cancelOpen, setCancelOpen] = useState(false);` and `const cancelBooking = useBookingStore((s) => s.cancelBooking);`.
  - Below the StatusStepper, when `booking.cancellation`, render: `<div className="mt-3"><p className="mb-2 text-sm font-medium text-error">Cancelled{booking.cancellation.reason ? ` · ${booking.cancellation.reason}` : ''}</p>{booking.amountPaid > 0 && <RefundBreakdown amountPaid={booking.amountPaid} platformCut={booking.cancellation.platformCut} refundAmount={booking.cancellation.refundAmount} />}</div>`.
  - In the sticky footer, ADD (alongside the existing pay CTAs):
    - When `['requested','accepted','advance_paid','scheduled'].includes(booking.status)`: a secondary "Cancel booking" button → `setCancelOpen(true)`.
    - When `booking.status === 'completed'`: a "Rate pandit" button → `navigate('/app/booking/' + booking.id + '/rate')` (in addition to pay-remaining if due).
    - When `booking.status === 'rated' || booking.status === 'completed'`: a "Rebook" button → `navigate('/app/book/' + booking.panditId + '?puja=' + booking.pujaId)`.
  - Render `<CancelSheet open={cancelOpen} booking={booking} onClose={() => setCancelOpen(false)} onConfirm={(reason) => { cancelBooking(booking.id, 'jajman', reason); setCancelOpen(false); }} />` at the end.
  Keep the existing simulate-accept + pay-advance/pay-remaining logic intact.

- [ ] **Step 3: Create `src/screens/jajman/booking/RatePanditScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { Image } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { RatingInput } from '../../../components/ui/RatingInput';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';
import { useSessionStore } from '../../../store/sessionStore';

export function RatePanditScreen() {
  const navigate = useNavigate();
  const { bookingId = '' } = useParams();
  const booking = useBookingStore((s) => s.getBooking(bookingId));
  const rateBooking = useBookingStore((s) => s.rateBooking);
  const addReview = useDataStore((s) => s.addReview);
  const pandit = useDataStore((s) => s.getPandit(booking?.panditId ?? ''));
  const userName = useSessionStore((s) => s.user?.name ?? 'Devotee');
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(false);

  if (!booking || !pandit) {
    return <><AppBar title="Rate" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Booking not found.</div></>;
  }

  const submit = () => {
    addReview({ id: `rev-${nanoid(5)}`, panditId: pandit.id, jajmanName: userName, rating: stars, text: text.trim() || 'Great experience.', date: '2026-06-20' });
    rateBooking(booking.id);
    navigate(`/app/booking/${booking.id}`, { replace: true });
  };

  return (
    <>
      <AppBar title="Rate pandit" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex flex-col items-center gap-2">
          <Avatar name={pandit.name} size={64} />
          <p className="font-semibold">{pandit.name}</p>
          <RatingInput value={stars} onChange={setStars} />
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Review" rows={4}
          placeholder="Share your experience…" className="w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-primary" />
        <button type="button" onClick={() => setPhoto(true)} className="mt-3 flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-primary">
          <Image size={16} /> {photo ? 'Photo added' : 'Add a photo'}
        </button>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={stars === 0} onClick={submit}>Submit review</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Write the test** — `src/screens/jajman/booking/lifecycle-flow.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BookingDetailScreen } from './BookingDetailScreen';
import { RatePanditScreen } from './RatePanditScreen';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';

beforeEach(() => {
  useBookingStore.setState(useBookingStore.getInitialState());
  useDataStore.setState(useDataStore.getInitialState());
});

function harness(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/booking/:bookingId" element={<BookingDetailScreen />} />
        <Route path="/app/booking/:bookingId/rate" element={<RatePanditScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('lifecycle flow', () => {
  it('cancel a scheduled booking refunds advance minus 5%', () => {
    harness('/app/booking/bkg-demo-2'); // scheduled, amountPaid 344
    fireEvent.click(screen.getByRole('button', { name: /Cancel booking/ }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm cancellation/ }));
    const b = useBookingStore.getState().getBooking('bkg-demo-2')!;
    expect(b.status).toBe('cancelled');
    expect(b.cancellation?.refundAmount).toBe(327); // 344 − round(0.05*344)=17 → 327
  });

  it('rate a completed booking adds a review and marks it rated', () => {
    const reviewsBefore = useDataStore.getState().getReviewsForPandit('pnd-2').length;
    harness('/app/booking/bkg-demo-1/rate'); // completed, pandit pnd-2
    fireEvent.click(screen.getByRole('button', { name: '5 stars' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));
    expect(useDataStore.getState().getReviewsForPandit('pnd-2').length).toBe(reviewsBefore + 1);
    expect(useBookingStore.getState().getBooking('bkg-demo-1')?.status).toBe('rated');
  });
});
```

- [ ] **Step 5: Run the test** — `npm test -- lifecycle-flow` → PASS. (If the demo-1 booking needs the pay-remaining state to not interfere with the rate route, note demo-1 is `completed` with amountPaid 288 < subtotal 960, so it has remaining due AND can be rated — both CTAs may show; the test navigates directly to the rate route so it's unaffected.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: cancel+refund (CancelSheet), cancellation/alt-state in detail, rate-pandit screen"
```

---

### Task 5: Repeat/recurring + route integration

**Files:**
- Create: `src/screens/jajman/booking/ManageRecurringScreen.tsx`
- Create: `src/screens/jajman/booking/RecurringSheet.tsx`
- Modify: `src/screens/jajman/booking/BookingDetailScreen.tsx`
- Modify: `src/screens/jajman/booking/BookingFlow.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/screens/jajman/HomeScreen.tsx`
- Test: `src/app/lifecycle-flow.test.tsx`

- [ ] **Step 1: Create `src/screens/jajman/booking/RecurringSheet.tsx`** (pick interval → createRecurring)

```tsx
import { useState } from 'react';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Chip } from '../../../components/ui/Chip';
import { Button } from '../../../components/ui/Button';
import type { RecurInterval } from '../../../mock/types';

const OPTS: { value: RecurInterval; label: string }[] = [
  { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'annual', label: 'Annual' },
];

export function RecurringSheet({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (i: RecurInterval) => void }) {
  const [interval, setInterval] = useState<RecurInterval>('monthly');
  return (
    <BottomSheet open={open} onClose={onClose} title="Make this recurring"
      footer={<Button className="w-full" onClick={() => onConfirm(interval)}>Create recurring booking</Button>}>
      <p className="mb-3 text-sm text-muted">We'll remind you and pre-fill this booking on your chosen cadence.</p>
      <div className="flex gap-2">
        {OPTS.map((o) => <Chip key={o.value} label={o.label} selected={interval === o.value} onClick={() => setInterval(o.value)} />)}
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Create `src/screens/jajman/booking/ManageRecurringScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import dayjs from 'dayjs';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';

export function ManageRecurringScreen() {
  const navigate = useNavigate();
  const recurring = useBookingStore(useShallow((s) => s.recurring));
  const pauseRecurring = useBookingStore((s) => s.pauseRecurring);
  const resumeRecurring = useBookingStore((s) => s.resumeRecurring);
  const cancelRecurring = useBookingStore((s) => s.cancelRecurring);
  const getPandit = useDataStore((s) => s.getPandit);
  const getPuja = useDataStore((s) => s.getPuja);
  const active = recurring.filter((r) => r.status !== 'cancelled');

  return (
    <>
      <AppBar title="Recurring pujas" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        {active.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center"><div className="text-4xl">🔁</div><p className="text-sm text-muted">No recurring pujas yet.</p></div>
        ) : (
          <div className="flex flex-col gap-3">
            {active.map((r) => (
              <Card key={r.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{getPuja(r.pujaId)?.name}</p>
                    <p className="text-xs text-muted">{getPandit(r.panditId)?.name} · {r.interval}</p>
                    <p className="text-xs text-muted">Next: {dayjs(r.nextDate).format('D MMM YYYY')}</p>
                  </div>
                  <Badge className={r.status === 'paused' ? 'bg-warning/15 text-warning' : 'bg-success/10 text-success'}>{r.status}</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  {r.status === 'active' ? (
                    <Button variant="outline" className="flex-1" onClick={() => pauseRecurring(r.id)}>Pause</Button>
                  ) : (
                    <Button variant="outline" className="flex-1" onClick={() => resumeRecurring(r.id)}>Resume</Button>
                  )}
                  <Button variant="ghost" className="flex-1 text-error" onClick={() => cancelRecurring(r.id)}>Cancel</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Wire "Make recurring" into `BookingDetailScreen`** — import `useState` (already added in Task 4), `RecurringSheet`, `createRecurring`, `useNavigate` (already there). Add `const [recurOpen, setRecurOpen] = useState(false);` + `const createRecurring = useBookingStore((s) => s.createRecurring);`. In the footer, for `status ∈ {completed, rated}`, add a "Make recurring" button → `setRecurOpen(true)`. Render `<RecurringSheet open={recurOpen} onClose={() => setRecurOpen(false)} onConfirm={(interval) => { createRecurring(booking.panditId, booking.pujaId, interval, new Date().toISOString()); setRecurOpen(false); navigate('/app/recurring'); }} />`. (Using `new Date().toISOString()` is fine in app code.)

- [ ] **Step 4: Make `BookingFlow` honor a `?puja=` prefill (rebook)** — in `src/screens/jajman/booking/BookingFlow.tsx`, read `const pujaParam = params.get('puja');` and include it in the `startDraft` opts: add `pujaId: pujaParam ?? null` to the startDraft options object (and the effect deps). This pre-selects the puja when rebooking.

- [ ] **Step 5: Wire routes in `src/app/router.tsx`** — import `BookingsListScreen`, `RatePanditScreen`, `ManageRecurringScreen`. Add `/app/bookings` to the `RequireAuth` + `AppLayout` (tabbed) children. Add to the `RequireAuth` + `AppPlainLayout` children: `{ path: '/app/booking/:bookingId/rate', element: <RatePanditScreen /> }` and `{ path: '/app/recurring', element: <ManageRecurringScreen /> }`.

- [ ] **Step 6: Add Home entry to recurring** — in `HomeScreen.tsx`, the existing "See all" or a profile entry can link to recurring later; for now add a small link is optional. SKIP unless trivial — the Bookings tab + booking detail are the primary entries. (No change required.)

- [ ] **Step 7: Write the integration test** — `src/app/lifecycle-flow.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { useBookingStore } from '../store/bookingStore';
import { useDataStore } from '../store/dataStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useBookingStore.setState(useBookingStore.getInitialState());
  useDataStore.setState(useDataStore.getInitialState());
  useSessionStore.getState().setPendingPhone('9');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('bookings lifecycle (integration)', () => {
  it('Bookings tab → open a scheduled booking → cancel it', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/bookings'] });
    render(<RouterProvider router={router} />);
    // scheduled demo-2 (Satyanarayan Katha) under Upcoming
    fireEvent.click(screen.getByText('Satyanarayan Katha'));
    fireEvent.click(screen.getByRole('button', { name: /Cancel booking/ }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm cancellation/ }));
    expect(useBookingStore.getState().getBooking('bkg-demo-2')?.status).toBe('cancelled');
  });
});
```

- [ ] **Step 8: Run the full suite + typecheck + build + dev smoke** — `npm test` (all pass), `npm run typecheck` (clean), `npm run build` (succeeds). Boot `npm run dev` background, curl localhost → 200, stop.

- [ ] **Step 9: Commit** (commit only — do NOT push)

```bash
git add -A
git commit -m "feat: rebook + recurring (manage screen + sheet); wire bookings/rate/recurring routes (P1d complete)"
```

---

## Self-Review

**Spec coverage (P1d = bookings & lifecycle):**
- Bookings list with tabs (Upcoming/Ongoing/Completed/Cancelled via `jajmanTab`) → Task 3. ✔
- Cancel + refund (−5% of amount paid via `computeRefund`, §0.3; "amount paid" copy in `RefundBreakdown`) → Tasks 1,2,4. ✔
- Alt-state rendering (cancelled banner + StatusStepper fallback) → Task 4. ✔
- Rate pandit (stars + review + mock photo, adds a `Review`) → Tasks 2,4. ✔
- Repeat (rebook same pandit/puja via `?puja=` prefill) + recurring (create + manage: pause/resume/cancel; `nextRecurrence`) → Tasks 1,5. ✔
- §0.2 tab mapping reused; §0.3 refund base = amount paid. ✔

**Deferred (correct):** Pandit-initiated cancel UI → P3 (the `cancelBooking('pandit')` path exists + tested, but the trigger is the Pandit surface). Disputes → P2. Recurring auto-generation of future bookings → out of scope (series tracks nextDate only). i18n → P5.

**Placeholder scan:** every step has complete code or exact edits + commands. The mock photo toggle and `new Date()` in app code are intentional (only the workflow sandbox forbids `new Date()`).

**Type consistency:** `RecurInterval`/`RecurringSeries`/`Booking.cancellation` (Task 1) used across store + screens. `nextRecurrence` (Task 1) used by `createRecurring`. `computeRefund` (existing) used by `cancelBooking` + `CancelSheet`. `addReview` (dataStore) used by `RatePanditScreen`. `StatusPill`/`RefundBreakdown`/`RatingInput`/`BookingCard` (Task 2) consumed by Tasks 3-5. `jajmanTab`/`JajmanBookingTab` (existing) used by `BookingsListScreen`. `routes` consumed by the integration test.
