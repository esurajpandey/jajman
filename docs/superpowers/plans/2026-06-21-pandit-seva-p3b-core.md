# Pandit Seva — Phase 3b (Pandit Core: Dashboard + Requests + Accept/Reject) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stub Pandit Dashboard with real widgets and build the Requests inbox — list (24h countdown, OQ6), request detail, accept-with-travel/additional-charges (B4), and reject-with-reason (B5) — so an approved pandit can triage incoming booking requests end-to-end.

**Architecture:** The pandit's incoming requests live in a NEW dedicated `panditBookingStore` seeded with `SELF_PANDIT_ID`-facing bookings, kept SEPARATE from the Jajman `bookingStore` so they never appear in the Jajman bookings list (the two surfaces are demo-independent). Requests are `Booking`s in `requested` status with a `requestExpiresAt` 24h countdown; accept recomputes charges (reusing `charges.ts`) and advances to `accepted`; reject sets `rejected` + reason. The Dashboard reads the pandit store + a static `seedPanditStats` for the money/ratings minis (real earnings/ratings land in P3d/P3e) and a session `acceptingBookings` master toggle. All screens render in the existing `PanditLayout` behind `RequirePanditApproved`.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind 3, zustand 4 (`zustand/react/shallow`), react-router-dom 6, lucide-react, nanoid, dayjs. Tests: Vitest + RTL + jsdom. No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-06-20-pandit-seva-mobile-ui-design.md` — §"SCREEN INVENTORY — PANDIT" B1 (~1639), B2 (~1652), B3 (~1665), B4 (~1678), B5 (~1691); BookingRequest (~2633); §0.7 expiry; OQ3/OQ4/OQ6.

**Working directory:** all paths relative to `pandit-seva-app/`.

## Global Constraints

- **Routing (§0.1):** `/pandit/dashboard`, `/pandit/requests`, `/pandit/requests/:id`, `/pandit/requests/:id/accept`. All inside `RequireAuth > PanditLayout`, and the dashboard/requests routes stay wrapped in `RequirePanditApproved` (§0.6). The reject flow is a bottom sheet on the detail screen (no separate route, per B5).
- **Separate store:** pandit requests/bookings live in `panditBookingStore` seeded from `seedPanditBookings` (panditId `SELF_PANDIT_ID`). Do NOT add pandit requests to the Jajman `bookingStore` (it backs the Jajman bookings list).
- **24h countdown (OQ6):** requests carry `requestExpiresAt`; a request with `now >= requestExpiresAt` is expired and excluded from the active list. Countdown chip tone: normal ≥6h, amber <6h, red <1h, expired ≤0.
- **Charges at acceptance (B4):** total = base + travel + emergency surcharge (if urgent, OQ3) + Σ additional line items; advance = 30% of total (reuse `computeAdvance`). Reuse `charges.ts`.
- **No `Date.now()`/`new Date()` in store/domain modules** — selectors/mutations that need "now" take a `nowISO` param; screens may pass `new Date().toISOString()`.
- **No new dependencies.** Reuse `Countdown`, `StatusPill`, `MoneyBreakdown`, `Avatar`, `Card`, `Badge`, `Button`, `BottomSheet`, `Chip`, `charges.ts`.
- **Tests:** strict TDD for store/domain; build-then-test for components/screens. Reset stores in `beforeEach`.
- **Commits:** one per task, local only.

---

### Task 1: Pandit request domain (acceptCharges, countdown tone) + seeds + panditBookingStore + accepting toggle

**Files:**
- Modify: `src/mock/types.ts` (Booking: `jajmanName?`, `additionalCharges?`, `rejectionReason?`)
- Modify: `src/domain/charges.ts` (`acceptCharges`)
- Create: `src/domain/requests.ts` (`countdownTone`, `isRequestExpired`)
- Modify: `src/mock/seed.ts` (`SELF_PANDIT_ID`, `seedPanditBookings`, `seedPanditStats`)
- Modify: `src/store/sessionStore.ts` (`acceptingBookings` + `setAcceptingBookings`)
- Create: `src/store/panditBookingStore.ts`
- Test: `src/domain/charges.test.ts` (extend), `src/domain/requests.test.ts`, `src/store/panditBookingStore.test.ts`, `src/store/sessionStore.test.ts` (extend)

**Interfaces:**
- Produces: `acceptCharges(base, travel, additionalTotal, isEmergency, cfg?) → ComputedCharges & { additionalTotal }`; `countdownTone(deadlineISO, nowISO): 'normal'|'amber'|'red'|'expired'`; `isRequestExpired(deadlineISO, nowISO): boolean`; `SELF_PANDIT_ID`, `seedPanditBookings`, `seedPanditStats`; `sessionStore.acceptingBookings`/`setAcceptingBookings`; `panditBookingStore` with `bookings`, `getRequests(nowISO)`, `getRequest(id)`, `getToday(nowISO)`, `getUpcoming(nowISO)`, `accept(id, { travel, additionalCharges })`, `reject(id, reason)`.
- Booking gains optional `jajmanName?: string`, `additionalCharges?: { label: string; amount: number }[]`, `rejectionReason?: string`.

- [ ] **Step 1: Add optional fields to `Booking` in `src/mock/types.ts`**

In the `Booking` interface, add (after `isDisputed`):

```ts
  jajmanName?: string; // pandit-side display (single-jajman prototype)
  additionalCharges?: { label: string; amount: number }[]; // added at acceptance (B4)
  rejectionReason?: string; // pandit-rejected request reason (B5)
```

- [ ] **Step 2: Write failing domain tests**

Append to `src/domain/charges.test.ts`:

```ts
import { acceptCharges } from './charges';

describe('acceptCharges (B4 — base + travel + surcharge + additional)', () => {
  it('sums travel and additional into the subtotal; advance is 30%', () => {
    const c = acceptCharges(1000, 200, 300, false);
    expect(c.subtotal).toBe(1500);
    expect(c.additionalTotal).toBe(300);
    expect(c.advance).toBe(450);
    expect(c.remaining).toBe(1050);
  });
  it('adds a 20% emergency surcharge on base when urgent', () => {
    const c = acceptCharges(1000, 0, 0, true);
    expect(c.emergencySurcharge).toBe(200);
    expect(c.subtotal).toBe(1200);
  });
});
```

Create `src/domain/requests.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { countdownTone, isRequestExpired } from './requests';

const now = '2026-06-21T09:00:00.000Z';
describe('countdownTone (OQ6)', () => {
  it('normal when ≥6h remain', () => { expect(countdownTone('2026-06-21T20:00:00.000Z', now)).toBe('normal'); });
  it('amber when <6h remain', () => { expect(countdownTone('2026-06-21T12:00:00.000Z', now)).toBe('amber'); });
  it('red when <1h remains', () => { expect(countdownTone('2026-06-21T09:30:00.000Z', now)).toBe('red'); });
  it('expired at/after the deadline', () => { expect(countdownTone('2026-06-21T09:00:00.000Z', now)).toBe('expired'); });
});
describe('isRequestExpired', () => {
  it('true when now is past the deadline', () => { expect(isRequestExpired('2026-06-21T08:00:00.000Z', now)).toBe(true); });
  it('false when the deadline is ahead', () => { expect(isRequestExpired('2026-06-21T11:00:00.000Z', now)).toBe(false); });
});
```

Create `src/store/panditBookingStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { usePanditBookingStore } from './panditBookingStore';
import { seedPanditBookings } from '../mock/seed';

const now = '2026-06-21T09:00:00.000Z';
beforeEach(() => usePanditBookingStore.setState({ bookings: seedPanditBookings }));

describe('panditBookingStore', () => {
  it('getRequests excludes expired requests and sorts soonest-expiry first', () => {
    const reqs = usePanditBookingStore.getState().getRequests(now);
    expect(reqs.length).toBeGreaterScalarThan?.(0) ?? expect(reqs.length).toBeGreaterThan(0);
    expect(reqs.every((r) => r.status === 'requested')).toBe(true);
    for (let i = 1; i < reqs.length; i++) expect(reqs[i - 1].requestExpiresAt <= reqs[i].requestExpiresAt).toBe(true);
  });
  it('accept recomputes charges and advances to accepted', () => {
    const reqs = usePanditBookingStore.getState().getRequests(now);
    const id = reqs[0].id;
    const base = reqs[0].charges.base;
    usePanditBookingStore.getState().accept(id, { travel: 100, additionalCharges: [{ label: 'Samagri', amount: 200 }] });
    const b = usePanditBookingStore.getState().getRequest(id)!;
    expect(b.status).toBe('accepted');
    expect(b.charges.travel).toBe(100);
    expect(b.charges.subtotal).toBe(base + 100 + 200 + b.charges.emergencySurcharge);
    expect(b.additionalCharges).toEqual([{ label: 'Samagri', amount: 200 }]);
  });
  it('reject sets rejected + reason', () => {
    const id = usePanditBookingStore.getState().getRequests(now)[0].id;
    usePanditBookingStore.getState().reject(id, 'Outside my service area');
    const b = usePanditBookingStore.getState().getRequest(id)!;
    expect(b.status).toBe('rejected');
    expect(b.rejectionReason).toBe('Outside my service area');
  });
});
```

> Note: write the first assertion in `getRequests` simply as `expect(reqs.length).toBeGreaterThan(0);` — the `toBeGreaterScalarThan?.` shown above is a typo guard; use the plain form.

Append to `src/store/sessionStore.test.ts`:

```ts
describe('acceptingBookings toggle (P3b)', () => {
  beforeEach(() => useSessionStore.setState(useSessionStore.getInitialState()));
  it('defaults to true and toggles', () => {
    expect(useSessionStore.getState().acceptingBookings).toBe(true);
    useSessionStore.getState().setAcceptingBookings(false);
    expect(useSessionStore.getState().acceptingBookings).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- charges requests panditBookingStore sessionStore`
Expected: FAIL — `acceptCharges`/`countdownTone`/`isRequestExpired`/`panditBookingStore`/`acceptingBookings` missing.

- [ ] **Step 4: Add `acceptCharges` to `src/domain/charges.ts`**

```ts
/** B4 — pandit acceptance total: base + travel + emergency surcharge (urgent) + additional line items. */
export function acceptCharges(
  base: number,
  travel: number,
  additionalTotal: number,
  isEmergency: boolean,
  cfg: PricingConfig = defaultPricingConfig,
): ComputedCharges & { additionalTotal: number } {
  const emergencySurcharge = isEmergency ? Math.round((cfg.emergencySurchargePct / 100) * base) : 0;
  const subtotal = base + travel + emergencySurcharge + Math.max(0, additionalTotal);
  const advance = computeAdvance(subtotal, cfg);
  return { base, travel, emergencySurcharge, additionalTotal: Math.max(0, additionalTotal), subtotal, advance, remaining: subtotal - advance };
}
```

- [ ] **Step 5: Create `src/domain/requests.ts`**

```ts
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
```

- [ ] **Step 6: Add pandit seeds to `src/mock/seed.ts`**

Add `Booking` to the type import if not present, then append:

```ts
export const SELF_PANDIT_ID = 'pnd-self';

// Incoming requests + active bookings for the logged-in (onboarded) pandit. Kept separate
// from seedBookings (which is the Jajman's own bookings) so the two surfaces don't cross-contaminate.
export const seedPanditBookings: Booking[] = [
  { // urgent request, expiring soon (amber)
    id: 'preq-1', panditId: SELF_PANDIT_ID, pujaId: 'puja-ganesh', type: 'single', status: 'requested',
    pujaStartISO: '2026-06-21T15:00:00.000Z', slotLabel: '21 Jun · 03:00 PM', addressId: 'addr-home',
    attachments: [], notes: 'Please bring samagri. Parking in basement.', isEmergency: true,
    charges: { base: 1800, travel: 0, emergencySurcharge: 360, subtotal: 2160 },
    advanceAmount: 648, remainingAmount: 1512, amountPaid: 0,
    createdAt: '2026-06-21T05:00:00.000Z', requestExpiresAt: '2026-06-21T13:00:00.000Z', isDisputed: false,
    jajmanName: 'Anita Kulkarni',
  },
  { // normal single request (normal tone)
    id: 'preq-2', panditId: SELF_PANDIT_ID, pujaId: 'puja-satyanarayan', type: 'single', status: 'requested',
    pujaStartISO: '2026-07-02T09:00:00.000Z', slotLabel: '2 Jul · 09:00 AM', addressId: 'addr-temple',
    attachments: [], notes: '', isEmergency: false,
    charges: { base: 1500, travel: 0, emergencySurcharge: 0, subtotal: 1500 },
    advanceAmount: 450, remainingAmount: 1050, amountPaid: 0,
    createdAt: '2026-06-21T08:00:00.000Z', requestExpiresAt: '2026-06-22T08:00:00.000Z', isDisputed: false,
    jajmanName: 'Rohit Deshpande',
  },
  { // multi-pandit (lead) request
    id: 'preq-3', panditId: SELF_PANDIT_ID, pujaId: 'puja-mahamrityunjaya', type: 'multi', assignmentMode: 'lead',
    teamPanditIds: ['pnd-3', 'pnd-6'], status: 'requested',
    pujaStartISO: '2026-07-10T07:00:00.000Z', slotLabel: '10 Jul · 07:00 AM', addressId: 'addr-home',
    attachments: [], notes: 'Yagna for housewarming.', isEmergency: false,
    charges: { base: 2100, travel: 0, emergencySurcharge: 0, subtotal: 2100 },
    advanceAmount: 630, remainingAmount: 1470, amountPaid: 0,
    createdAt: '2026-06-21T07:30:00.000Z', requestExpiresAt: '2026-06-22T07:30:00.000Z', isDisputed: false,
    jajmanName: 'Lakshmi Iyer',
  },
  { // already-scheduled booking happening "today" (for the dashboard)
    id: 'pbkg-1', panditId: SELF_PANDIT_ID, pujaId: 'puja-ganesh', type: 'single', status: 'scheduled',
    pujaStartISO: '2026-06-21T17:00:00.000Z', slotLabel: '21 Jun · 05:00 PM', addressId: 'addr-home',
    attachments: [], notes: '', isEmergency: false,
    charges: { base: 1800, travel: 120, emergencySurcharge: 0, subtotal: 1920 },
    advanceAmount: 576, remainingAmount: 1344, amountPaid: 576,
    createdAt: '2026-06-18T09:00:00.000Z', requestExpiresAt: '2026-06-19T09:00:00.000Z', isDisputed: false,
    jajmanName: 'Vikram Sethi',
  },
  { // upcoming accepted booking
    id: 'pbkg-2', panditId: SELF_PANDIT_ID, pujaId: 'puja-satyanarayan', type: 'single', status: 'accepted',
    pujaStartISO: '2026-07-05T10:00:00.000Z', slotLabel: '5 Jul · 10:00 AM', addressId: 'addr-temple',
    attachments: [], notes: '', isEmergency: false,
    charges: { base: 1500, travel: 80, emergencySurcharge: 0, subtotal: 1580 },
    advanceAmount: 474, remainingAmount: 1106, amountPaid: 0,
    createdAt: '2026-06-20T09:00:00.000Z', requestExpiresAt: '2026-06-21T09:00:00.000Z', isDisputed: false,
    jajmanName: 'Priya Nair',
  },
];

export const seedPanditStats = {
  availableBalance: 12400,
  pendingBalance: 1344,
  monthEarnings: 38600,
  ratingAvg: 4.8,
  ratingCount: 64,
};
```

- [ ] **Step 7: Add the accepting toggle to `src/store/sessionStore.ts`**

Add to `SessionState`:

```ts
  acceptingBookings: boolean;
  setAcceptingBookings: (v: boolean) => void;
```

Add to the store body (initial + setter):

```ts
  acceptingBookings: true,
  setAcceptingBookings: (acceptingBookings) => set({ acceptingBookings }),
```

- [ ] **Step 8: Implement `src/store/panditBookingStore.ts`**

```ts
import { create } from 'zustand';
import dayjs from 'dayjs';
import type { Booking } from '../mock/types';
import { seedPanditBookings } from '../mock/seed';
import { acceptCharges } from '../domain/charges';
import { isRequestExpired } from '../domain/requests';

const LIVE: Booking['status'][] = ['accepted', 'advance_paid', 'scheduled', 'in_progress'];

interface AcceptOpts { travel: number; additionalCharges: { label: string; amount: number }[] }

interface State {
  bookings: Booking[];
  getRequests: (nowISO: string) => Booking[];
  getRequest: (id: string) => Booking | undefined;
  getToday: (nowISO: string) => Booking[];
  getUpcoming: (nowISO: string) => Booking[];
  accept: (id: string, opts: AcceptOpts) => void;
  reject: (id: string, reason: string) => void;
}

export const usePanditBookingStore = create<State>((set, get) => ({
  bookings: seedPanditBookings,
  getRequests: (nowISO) =>
    get().bookings
      .filter((b) => b.status === 'requested' && !isRequestExpired(b.requestExpiresAt, nowISO))
      .sort((a, b) => (a.requestExpiresAt < b.requestExpiresAt ? -1 : 1)),
  getRequest: (id) => get().bookings.find((b) => b.id === id),
  getToday: (nowISO) =>
    get().bookings.filter((b) => LIVE.includes(b.status) && dayjs(b.pujaStartISO).isSame(dayjs(nowISO), 'day')),
  getUpcoming: (nowISO) =>
    get().bookings
      .filter((b) => LIVE.includes(b.status) && dayjs(b.pujaStartISO).isAfter(dayjs(nowISO), 'day'))
      .sort((a, b) => (a.pujaStartISO < b.pujaStartISO ? -1 : 1)),
  accept: (id, { travel, additionalCharges }) =>
    set((s) => ({
      bookings: s.bookings.map((b) => {
        if (b.id !== id) return b;
        const additionalTotal = additionalCharges.reduce((sum, x) => sum + x.amount, 0);
        const c = acceptCharges(b.charges.base, travel, additionalTotal, b.isEmergency);
        return {
          ...b,
          status: 'accepted',
          charges: { base: c.base, travel: c.travel, emergencySurcharge: c.emergencySurcharge, subtotal: c.subtotal },
          additionalCharges,
          advanceAmount: c.advance,
          remainingAmount: c.remaining,
        };
      }),
    })),
  reject: (id, reason) =>
    set((s) => ({ bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: 'rejected', rejectionReason: reason } : b)) })),
}));
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npm test -- charges requests panditBookingStore sessionStore`
Expected: PASS.

- [ ] **Step 10: Typecheck + commit**

Run: `npm run typecheck` → PASS.

```bash
git add -A
git commit -m "feat: pandit request domain (acceptCharges, countdown tone) + seeds + panditBookingStore + accepting toggle"
```

---

### Task 2: Request components — CountdownChip, RequestCard

**Files:**
- Create: `src/components/pandit/CountdownChip.tsx`
- Create: `src/components/pandit/RequestCard.tsx`
- Test: `src/components/pandit/request-components.test.tsx`

**Interfaces:**
- Consumes: `Card`, `Badge`, `Avatar`; `Countdown` (existing); `countdownTone`; `Booking`; `dataStore.getPuja`.
- Produces: `CountdownChip({ deadlineISO, nowISO })`; `RequestCard({ request, puja, onClick, nowISO })`.

- [ ] **Step 1: Create `src/components/pandit/CountdownChip.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `src/components/pandit/RequestCard.tsx`**

```tsx
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { CountdownChip } from './CountdownChip';
import type { Booking, Puja } from '../../mock/types';

export function RequestCard({ request, puja, onClick, nowISO }: { request: Booking; puja?: Puja; onClick: () => void; nowISO: string }) {
  return (
    <Card onClick={onClick} className="flex cursor-pointer gap-3 p-3">
      <Avatar name={request.jajmanName ?? 'Jajman'} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">{request.jajmanName ?? 'Jajman'}</span>
          <CountdownChip deadlineISO={request.requestExpiresAt} nowISO={nowISO} />
        </div>
        <p className="flex items-center gap-1.5 truncate text-sm">
          {puja?.name ?? 'Puja'}
          {request.isEmergency && <Badge className="bg-error/10 text-error">Urgent</Badge>}
          {request.type === 'multi' && <Badge className="bg-info/10 text-info">Multi</Badge>}
        </p>
        <p className="text-xs text-muted">{request.slotLabel}</p>
        <p className="mt-1 text-sm"><span className="text-muted">Est. </span><span className="font-semibold">₹{request.charges.subtotal}</span></p>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Write the test** — `src/components/pandit/request-components.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RequestCard } from './RequestCard';
import { CountdownChip } from './CountdownChip';
import type { Booking, Puja } from '../../mock/types';

const now = '2026-06-21T09:00:00.000Z';
const req: Booking = {
  id: 'preq-1', panditId: 'pnd-self', pujaId: 'puja-ganesh', type: 'single', status: 'requested',
  pujaStartISO: '2026-06-21T15:00:00.000Z', slotLabel: '21 Jun · 03:00 PM', addressId: 'addr-home',
  attachments: [], notes: '', isEmergency: true,
  charges: { base: 1800, travel: 0, emergencySurcharge: 360, subtotal: 2160 },
  advanceAmount: 648, remainingAmount: 1512, amountPaid: 0,
  createdAt: now, requestExpiresAt: '2026-06-21T13:00:00.000Z', isDisputed: false, jajmanName: 'Anita Kulkarni',
};
const puja: Puja = { id: 'puja-ganesh', categoryId: 'cat-festival', name: 'Ganesh Puja', suggestedDurationMins: 90, minAmount: 800, maxAmount: 3100 };

describe('request components', () => {
  it('RequestCard shows jajman, puja, urgent badge, amount, and fires onClick', () => {
    const onClick = vi.fn();
    render(<RequestCard request={req} puja={puja} onClick={onClick} nowISO={now} />);
    expect(screen.getByText('Anita Kulkarni')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('₹2160')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Anita Kulkarni'));
    expect(onClick).toHaveBeenCalled();
  });
  it('CountdownChip shows remaining time', () => {
    render(<CountdownChip deadlineISO="2026-06-21T13:00:00.000Z" nowISO={now} />);
    expect(screen.getByText('4h 0m left')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- request-components`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pandit request components (CountdownChip, RequestCard)"
```

---

### Task 3: Requests list screen (B2) + route

**Files:**
- Create: `src/screens/pandit/RequestsScreen.tsx`
- Modify: `src/app/router.tsx` (replace the `/pandit/requests` stub with `RequestsScreen`)
- Test: `src/screens/pandit/RequestsScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `Inbox` (lucide); `panditBookingStore.getRequests`; `dataStore.getPuja`; `RequestCard`.
- Produces: `RequestsScreen` (wired at `/pandit/requests`, replacing the stub).

- [ ] **Step 1: Create `src/screens/pandit/RequestsScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Inbox } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { RequestCard } from '../../components/pandit/RequestCard';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';

export function RequestsScreen() {
  const navigate = useNavigate();
  const nowISO = new Date().toISOString();
  const requests = usePanditBookingStore(useShallow((s) => s.getRequests(nowISO)));
  const getPuja = useDataStore((s) => s.getPuja);

  return (
    <>
      <AppBar title="Requests" />
      <div className="flex-1 overflow-y-auto p-4">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox size={36} className="text-muted" />
            <p className="text-sm text-muted">No pending requests.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} puja={getPuja(r.pujaId)} nowISO={nowISO} onClick={() => navigate(`/pandit/requests/${r.id}`)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Wire the route in `src/app/router.tsx`**

Add the import:

```tsx
import { RequestsScreen } from '../screens/pandit/RequestsScreen';
```

Replace the existing `/pandit/requests` stub line:

```tsx
      { path: '/pandit/requests', element: <RequirePanditApproved><PanditStub title="Requests" /></RequirePanditApproved> },
```

with:

```tsx
      { path: '/pandit/requests', element: <RequirePanditApproved><RequestsScreen /></RequirePanditApproved> },
```

- [ ] **Step 3: Write the test** — `src/screens/pandit/RequestsScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RequestsScreen } from './RequestsScreen';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';
import { seedPanditBookings, seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => {
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('RequestsScreen', () => {
  it('lists the seeded incoming requests with jajman names', () => {
    render(<MemoryRouter><RequestsScreen /></MemoryRouter>);
    expect(screen.getByText('Rohit Deshpande')).toBeInTheDocument();
    expect(screen.getByText('Lakshmi Iyer')).toBeInTheDocument();
  });
});
```

> The urgent request `preq-1` expires `2026-06-21T13:00Z`; since the test runs at real "now" (well past mid-2026), it will be filtered out as expired — `preq-2`/`preq-3` (expiry `2026-06-22`) are also past real-now and would be filtered too. To keep this test stable regardless of the real clock, the screen uses real `new Date()`, so seeded 2026 requests are all expired today. **Therefore assert on a non-time-dependent path:** instead of the above, assert the empty state OR inject a controlled store. Use this stable version:

```tsx
  it('renders without crashing and shows the requests header', () => {
    render(<MemoryRouter><RequestsScreen /></MemoryRouter>);
    expect(screen.getByText('Requests')).toBeInTheDocument();
  });
  it('shows seeded requests when their expiry is in the future', () => {
    const future = new Date(Date.now() + 36 * 3600 * 1000).toISOString();
    usePanditBookingStore.setState({ bookings: seedPanditBookings.map((b) => (b.status === 'requested' ? { ...b, requestExpiresAt: future } : b)) });
    render(<MemoryRouter><RequestsScreen /></MemoryRouter>);
    expect(screen.getByText('Rohit Deshpande')).toBeInTheDocument();
  });
```

> Use the two stable tests above (header always renders; future-dated requests appear). Do NOT rely on the seed's hardcoded 2026 expiries being in the future at test runtime.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- RequestsScreen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Pandit Requests list screen (B2) + route"
```

---

### Task 4: Request detail screen (B3) + route

**Files:**
- Create: `src/screens/pandit/RequestDetailScreen.tsx`
- Modify: `src/app/router.tsx` (`/pandit/requests/:id`)
- Test: `src/screens/pandit/RequestDetailScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Card`, `Badge`, `Button`, `Avatar`, `CountdownChip`; `panditBookingStore.getRequest`; `dataStore.getPuja`, `bookingStore.getAddress`.
- Produces: `RequestDetailScreen` (Accept → `/pandit/requests/:id/accept`; Reject → opens the reject sheet built in Task 5 via `?action=reject`).

- [ ] **Step 1: Create `src/screens/pandit/RequestDetailScreen.tsx`**

```tsx
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Phone, MessageCircle } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { CountdownChip } from '../../components/pandit/CountdownChip';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';
import { useBookingStore } from '../../store/bookingStore';

export function RequestDetailScreen() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [, setSearch] = useSearchParams();
  const nowISO = new Date().toISOString();
  const request = usePanditBookingStore((s) => s.getRequest(id));
  const puja = useDataStore((s) => s.getPuja(request?.pujaId ?? ''));
  const address = useBookingStore((s) => s.getAddress(request?.addressId ?? ''));

  if (!request) {
    return <><AppBar title="Request" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Request not found.</div></>;
  }
  const decided = request.status !== 'requested';

  return (
    <>
      <AppBar title="Request" left={<BackButton />} right={<CountdownChip deadlineISO={request.requestExpiresAt} nowISO={nowISO} />} />
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="mb-3 flex items-center gap-3 p-3">
          <Avatar name={request.jajmanName ?? 'Jajman'} />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{request.jajmanName ?? 'Jajman'}</p>
            <p className="text-xs text-muted">Phone hidden — chat only</p>
          </div>
          <button type="button" aria-label="Chat" className="p-2 text-primary"><MessageCircle size={18} /></button>
          <button type="button" aria-label="Call (hidden)" disabled className="p-2 text-muted opacity-40"><Phone size={18} /></button>
        </Card>

        <Card className="mb-3 p-3">
          <p className="flex items-center gap-2 font-medium">{puja?.name ?? 'Puja'}
            {request.isEmergency && <Badge className="bg-error/10 text-error">Urgent</Badge>}
            {request.type === 'multi' && <Badge className="bg-info/10 text-info">Multi-pandit</Badge>}
          </p>
          <p className="text-xs text-muted">Base charge ₹{request.charges.base}{request.charges.emergencySurcharge ? ` · urgent surcharge ₹${request.charges.emergencySurcharge}` : ''}</p>
        </Card>

        <Card className="mb-3 p-3">
          <p className="text-xs text-muted">Schedule</p>
          <p className="text-sm font-medium">{request.slotLabel}</p>
          {request.isEmergency && <p className="text-xs text-warning">Urgent same-day — surcharge applies.</p>}
        </Card>

        <Card className="mb-3 p-3">
          <p className="text-xs text-muted">Address</p>
          <p className="text-sm">{address ? `${address.line}, ${address.city}` : '—'}</p>
          <div className="mt-2 flex items-center justify-center rounded-md border border-dashed border-border bg-surface-2 py-6 text-xs text-muted">📍 Location (mock)</div>
        </Card>

        {request.type === 'multi' && (
          <Card className="mb-3 p-3">
            <p className="text-xs text-muted">Multi-pandit</p>
            <p className="text-sm">You are the <span className="font-medium">lead</span>. Team: {(request.teamPanditIds ?? []).length} pandit(s).</p>
          </Card>
        )}

        {request.notes && (
          <Card className="mb-3 p-3"><p className="text-xs text-muted">Notes</p><p className="text-sm">{request.notes}</p></Card>
        )}
      </div>

      <div className="border-t border-border p-3">
        {decided ? (
          <p className="text-center text-sm text-muted">This request is {request.status}.</p>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSearch({ action: 'reject' })}>Reject</Button>
            <Button className="flex-1" onClick={() => navigate(`/pandit/requests/${request.id}/accept`)}>Accept</Button>
          </div>
        )}
      </div>
    </>
  );
}
```

> The reject sheet (Task 5) reads `?action=reject` and renders over this screen.

- [ ] **Step 2: Wire the route in `src/app/router.tsx`**

Add the import + a route in the `PanditLayout` group (gated):

```tsx
import { RequestDetailScreen } from '../screens/pandit/RequestDetailScreen';
```
```tsx
      { path: '/pandit/requests/:id', element: <RequirePanditApproved><RequestDetailScreen /></RequirePanditApproved> },
```

- [ ] **Step 3: Write the test** — `src/screens/pandit/RequestDetailScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequestDetailScreen } from './RequestDetailScreen';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';
import { useBookingStore } from '../../store/bookingStore';
import { seedPanditBookings, seedAddresses, seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => {
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  useBookingStore.setState({ addresses: seedAddresses });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('RequestDetailScreen', () => {
  it('shows the request context and Accept/Reject for a pending request', () => {
    render(
      <MemoryRouter initialEntries={['/pandit/requests/preq-2']}>
        <Routes><Route path="/pandit/requests/:id" element={<RequestDetailScreen />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Rohit Deshpande')).toBeInTheDocument();
    expect(screen.getByText('Satyanarayan Katha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- RequestDetailScreen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Pandit Request detail screen (B3) + route"
```

---

### Task 5: Accept flow (B4) + Reject sheet (B5)

**Files:**
- Create: `src/screens/pandit/AcceptRequestScreen.tsx`
- Create: `src/components/pandit/RejectSheet.tsx`
- Modify: `src/screens/pandit/RequestDetailScreen.tsx` (render `RejectSheet` when `?action=reject`)
- Modify: `src/app/router.tsx` (`/pandit/requests/:id/accept`)
- Test: `src/screens/pandit/AcceptRequestScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Button`, `TextField`, `ToggleRow`, `BottomSheet`, `Chip`, `Card`; `panditBookingStore.{getRequest,accept,reject}`; `acceptCharges`.
- Produces: `AcceptRequestScreen`, `RejectSheet({ open, onClose, onConfirm })`.

- [ ] **Step 1: Create `src/screens/pandit/AcceptRequestScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { ToggleRow } from '../../components/ui/ToggleRow';
import { Card } from '../../components/ui/Card';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { acceptCharges } from '../../domain/charges';

export function AcceptRequestScreen() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const request = usePanditBookingStore((s) => s.getRequest(id));
  const accept = usePanditBookingStore((s) => s.accept);

  const [chargeTravel, setChargeTravel] = useState(false);
  const [travel, setTravel] = useState('');
  const [lines, setLines] = useState<{ label: string; amount: string }[]>([]);

  if (!request) {
    return <><AppBar title="Accept Request" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Request not found.</div></>;
  }

  const travelNum = chargeTravel ? Number(travel) || 0 : 0;
  const additional = lines.filter((l) => l.label.trim() && Number(l.amount) > 0).map((l) => ({ label: l.label.trim(), amount: Number(l.amount) }));
  const additionalTotal = additional.reduce((s, x) => s + x.amount, 0);
  const c = acceptCharges(request.charges.base, travelNum, additionalTotal, request.isEmergency);

  const confirm = () => {
    accept(request.id, { travel: travelNum, additionalCharges: additional });
    navigate('/pandit/requests', { replace: true });
  };

  return (
    <>
      <AppBar title="Accept Request" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="p-3 text-sm">
          <div className="flex justify-between py-0.5"><span className="text-muted">Puja charge</span><span>₹{request.charges.base}</span></div>
          {c.emergencySurcharge > 0 && <div className="flex justify-between py-0.5"><span className="text-muted">Urgent surcharge</span><span>₹{c.emergencySurcharge}</span></div>}
        </Card>

        <div className="mt-4 rounded-md border border-border bg-surface px-3">
          <ToggleRow label="Add travel charge" checked={chargeTravel} onChange={setChargeTravel} />
        </div>
        {chargeTravel && (
          <div className="mt-2"><TextField label="Travel charge (₹)" name="travel" inputMode="numeric" value={travel} onChange={(e) => setTravel(e.target.value.replace(/\D/g, ''))} /></div>
        )}

        <h2 className="mb-1 mt-5 text-sm font-semibold">Additional charges</h2>
        {lines.map((l, i) => (
          <div key={i} className="mb-2 flex items-end gap-2">
            <TextField label="Label" name={`label-${i}`} value={l.label} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <TextField label="₹" name={`amount-${i}`} inputMode="numeric" value={l.amount} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, amount: e.target.value.replace(/\D/g, '') } : x)))} />
            <button type="button" aria-label={`Remove line ${i + 1}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="mb-3 text-muted"><X size={16} /></button>
          </div>
        ))}
        <Button variant="outline" className="w-full" onClick={() => setLines((ls) => [...ls, { label: '', amount: '' }])}><Plus size={16} /> Add charge line</Button>

        <Card className="mt-5 p-3 text-sm">
          <div className="flex justify-between py-0.5"><span className="text-muted">Travel</span><span>₹{c.travel}</span></div>
          <div className="flex justify-between py-0.5"><span className="text-muted">Additional</span><span>₹{c.additionalTotal}</span></div>
          <div className="my-1 border-t border-border" />
          <div className="flex justify-between py-0.5 font-semibold"><span>Total to jajman</span><span>₹{c.subtotal}</span></div>
          <div className="flex justify-between py-0.5 text-primary"><span>Advance (30%)</span><span>₹{c.advance}</span></div>
        </Card>
        <p className="mt-2 text-xs text-muted">The jajman will be asked to pay the advance to confirm.</p>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" onClick={confirm}>Confirm &amp; Accept</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `src/components/pandit/RejectSheet.tsx`**

```tsx
import { useState } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';

const REASONS = ['Not available that day', 'Outside my service area', 'Puja not offered', 'Charges not feasible', 'Other'];

export function RejectSheet({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const valid = reason !== null && (reason !== 'Other' || note.trim().length > 0);
  const finalReason = reason === 'Other' ? note.trim() : (reason ?? '');

  return (
    <BottomSheet open={open} onClose={onClose} title="Reject this request?">
      <div className="flex flex-wrap gap-2">
        {REASONS.map((r) => <Chip key={r} label={r} selected={reason === r} onClick={() => setReason(r)} />)}
      </div>
      {reason === 'Other' && (
        <textarea value={note} onChange={(e) => setNote(e.target.value)} aria-label="Reason note" rows={2} placeholder="Tell the jajman why…" className="mt-3 w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-primary" />
      )}
      <p className="mt-3 text-xs text-muted">We'll suggest other pandits to the jajman.</p>
      <Button className="mt-3 w-full border-error text-error" variant="outline" disabled={!valid} onClick={() => onConfirm(finalReason)}>Confirm reject</Button>
    </BottomSheet>
  );
}
```

- [ ] **Step 3: Render `RejectSheet` in `src/screens/pandit/RequestDetailScreen.tsx`**

Add imports:

```tsx
import { RejectSheet } from '../../components/pandit/RejectSheet';
import { usePanditBookingStore } from '../../store/panditBookingStore';
```

> `usePanditBookingStore` is already imported in this file from Task 4 — add only the `reject` selector usage. Inside the component add:

```tsx
  const reject = usePanditBookingStore((s) => s.reject);
  const [searchParams] = useSearchParams();
  const rejectOpen = searchParams.get('action') === 'reject';
```

> `useSearchParams` is already imported (Task 4 uses `setSearch`). Replace the Task-4 line `const [, setSearch] = useSearchParams();` with `const [searchParams, setSearch] = useSearchParams();` so both the getter and setter are available.

Before the closing fragment `</>`, add:

```tsx
      <RejectSheet
        open={rejectOpen}
        onClose={() => setSearch({})}
        onConfirm={(reason) => { reject(request.id, reason); navigate('/pandit/requests', { replace: true }); }}
      />
```

- [ ] **Step 4: Wire the accept route in `src/app/router.tsx`**

```tsx
import { AcceptRequestScreen } from '../screens/pandit/AcceptRequestScreen';
```
```tsx
      { path: '/pandit/requests/:id/accept', element: <RequirePanditApproved><AcceptRequestScreen /></RequirePanditApproved> },
```

- [ ] **Step 5: Write the test** — `src/screens/pandit/AcceptRequestScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AcceptRequestScreen } from './AcceptRequestScreen';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { seedPanditBookings } from '../../mock/seed';

beforeEach(() => usePanditBookingStore.setState({ bookings: seedPanditBookings }));

function renderAccept(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/pandit/requests/${id}/accept`]}>
      <Routes>
        <Route path="/pandit/requests/:id/accept" element={<AcceptRequestScreen />} />
        <Route path="/pandit/requests" element={<div>Requests list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AcceptRequestScreen', () => {
  it('adds a travel charge and accepts, advancing the request to accepted', () => {
    renderAccept('preq-2'); // base 1500, not urgent
    fireEvent.click(screen.getByRole('switch', { name: 'Add travel charge' }));
    fireEvent.change(screen.getByLabelText('Travel charge (₹)'), { target: { value: '100' } });
    expect(screen.getByText('₹1600')).toBeInTheDocument(); // total to jajman
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Accept' }));
    const b = usePanditBookingStore.getState().getRequest('preq-2')!;
    expect(b.status).toBe('accepted');
    expect(b.charges.travel).toBe(100);
    expect(screen.getByText('Requests list')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- AcceptRequestScreen`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Pandit Accept flow (B4) + Reject sheet (B5)"
```

---

### Task 6: Pandit Dashboard (B1) — real widgets (replace stub)

**Files:**
- Modify: `src/screens/pandit/PanditDashboardScreen.tsx` (replace the stub body)
- Test: `src/screens/pandit/PanditDashboardScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `Card`, `Badge`, `Button`, `ToggleRow`, `StatusPill`; `sessionStore` (`user`, `acceptingBookings`, `setAcceptingBookings`); `panditBookingStore` (`getRequests`, `getToday`, `getUpcoming`); `dataStore.getPuja`; `seedPanditStats`.
- Produces: the real `PanditDashboardScreen`.

- [ ] **Step 1: Replace `src/screens/pandit/PanditDashboardScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Star, Wallet, CalendarDays, ChevronRight } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ToggleRow } from '../../components/ui/ToggleRow';
import { useSessionStore } from '../../store/sessionStore';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';
import { seedPanditStats } from '../../mock/seed';

export function PanditDashboardScreen() {
  const navigate = useNavigate();
  const nowISO = new Date().toISOString();
  const name = useSessionStore((s) => s.user?.name ?? 'Pandit');
  const accepting = useSessionStore((s) => s.acceptingBookings);
  const setAccepting = useSessionStore((s) => s.setAcceptingBookings);
  const requests = usePanditBookingStore(useShallow((s) => s.getRequests(nowISO)));
  const today = usePanditBookingStore(useShallow((s) => s.getToday(nowISO)));
  const getPuja = useDataStore((s) => s.getPuja);

  return (
    <>
      <AppBar title={`Namaste, ${name}`} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-md border border-border bg-surface px-3">
          <ToggleRow label="Accepting bookings" description={accepting ? 'You appear in search and can receive requests' : 'Paused — you won’t receive new requests'} checked={accepting} onChange={setAccepting} />
        </div>

        <Card onClick={() => navigate('/pandit/requests')} className="mt-4 flex cursor-pointer items-center justify-between p-3">
          <div>
            <p className="text-sm font-medium">Pending requests</p>
            <p className="text-xs text-muted">{requests.length} awaiting your response</p>
          </div>
          <div className="flex items-center gap-2"><Badge className="bg-primary/10 text-primary">{requests.length}</Badge><ChevronRight size={18} className="text-muted" /></div>
        </Card>

        <h2 className="mb-2 mt-5 text-sm font-semibold">Today</h2>
        {today.length === 0 ? (
          <p className="rounded-md bg-surface-2 p-3 text-sm text-muted">No bookings today.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {today.map((b) => (
              <Card key={b.id} className="flex items-center justify-between p-3">
                <div><p className="text-sm font-medium">{getPuja(b.pujaId)?.name ?? 'Puja'}</p><p className="text-xs text-muted">{b.slotLabel} · {b.jajmanName}</p></div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Card onClick={() => navigate('/pandit/earnings')} className="cursor-pointer p-3">
            <Wallet size={18} className="text-primary" />
            <p className="mt-1 text-xs text-muted">Available</p>
            <p className="text-lg font-semibold">₹{seedPanditStats.availableBalance.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-muted">This month ₹{seedPanditStats.monthEarnings.toLocaleString('en-IN')}</p>
          </Card>
          <Card onClick={() => navigate('/pandit/ratings')} className="cursor-pointer p-3">
            <Star size={18} className="fill-accent text-accent" />
            <p className="mt-1 text-xs text-muted">Rating</p>
            <p className="text-lg font-semibold">{seedPanditStats.ratingAvg.toFixed(1)}</p>
            <p className="text-[11px] text-muted">{seedPanditStats.ratingCount} reviews</p>
          </Card>
        </div>

        <button type="button" onClick={() => navigate('/pandit/calendar')} className="mt-4 flex w-full items-center gap-2 rounded-md border border-border bg-surface px-3 py-3 text-sm">
          <CalendarDays size={18} className="text-muted" /> Manage availability <ChevronRight size={18} className="ml-auto text-muted" />
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Write the test** — `src/screens/pandit/PanditDashboardScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PanditDashboardScreen } from './PanditDashboardScreen';
import { useSessionStore, MOCK_OTP } from '../../store/sessionStore';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';
import { seedPanditBookings, seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('PanditDashboardScreen', () => {
  it('renders the greeting, accepting toggle, and earnings mini', () => {
    render(<MemoryRouter><PanditDashboardScreen /></MemoryRouter>);
    expect(screen.getByText(/Namaste/)).toBeInTheDocument();
    expect(screen.getByText('Pending requests')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Accepting bookings' })).toBeInTheDocument();
  });
  it('toggles accepting-bookings off', () => {
    render(<MemoryRouter><PanditDashboardScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('switch', { name: 'Accepting bookings' }));
    expect(useSessionStore.getState().acceptingBookings).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it passes**

Run: `npm test -- PanditDashboardScreen`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: real Pandit Dashboard (B1) — accepting toggle, requests, today, earnings/ratings minis"
```

---

### Task 7: Integration walkthrough + P3b gate

**Files:**
- Test: `src/app/pandit-core-flow.test.tsx`

**Interfaces:**
- Consumes: the real `routes`, `sessionStore`, `panditBookingStore`, `dataStore`.

- [ ] **Step 1: Write the integration walkthrough** — `src/app/pandit-core-flow.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { usePanditBookingStore } from '../store/panditBookingStore';
import { useDataStore } from '../store/dataStore';
import { seedPanditBookings, seedAddresses, seedCategories, seedPujas, seedPandits, seedReviews } from '../mock/seed';
import { useBookingStore } from '../store/bookingStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
  useBookingStore.setState({ addresses: seedAddresses });
  // approved pandit in pandit mode, with a future-dated request so it's not expired at runtime
  const future = new Date(Date.now() + 36 * 3600 * 1000).toISOString();
  usePanditBookingStore.setState({ bookings: seedPanditBookings.map((b) => (b.status === 'requested' ? { ...b, requestExpiresAt: future } : b)) });
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
  useSessionStore.getState().becomePandit();
  useSessionStore.getState().switchMode('pandit');
  useSessionStore.getState().setPanditStatus('approved');
});

describe('pandit core flow (integration)', () => {
  it('dashboard → requests → detail → accept advances the request', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/dashboard'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByText('Pending requests')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Pending requests'));
    // requests list shows a jajman; open the first
    fireEvent.click(screen.getByText('Rohit Deshpande'));
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Accept' }));
    expect(usePanditBookingStore.getState().getRequest('preq-2')!.status).toBe('accepted');
  });
});
```

> `preq-2` (Rohit Deshpande) is the stable target — non-urgent, future-dated in `beforeEach`. If the requests list orders by soonest expiry and multiple share the same future date, all three render; clicking the name text opens that specific request.

- [ ] **Step 2: Run the full suite + typecheck + build (P3b gate)**

Run: `npm test`
Expected: PASS — all suites incl. `requests`, `panditBookingStore`, `request-components`, `RequestsScreen`, `RequestDetailScreen`, `AcceptRequestScreen`, `PanditDashboardScreen`, `pandit-core-flow`.

Run: `npm run typecheck && npm run build`
Expected: both PASS.

- [ ] **Step 3: Manual look check**

Run: `npm run dev`. Log in (OTP `123456`) → become a pandit (or, if already approved in a fresh session, the gate sends pending → Simulate approval) → Pandit Dashboard shows the accepting toggle, pending-requests card, today's bookings, earnings/ratings minis. Tap "Pending requests" → Requests list (note: seeded 2026 requests are expired at the real current date, so the list may be empty in a live dev session — temporarily set a request's `requestExpiresAt` far in the future in `seed.ts` to demo, or accept that the live empty-state shows). Open a request → detail → Accept → add travel/charges → Confirm; or Reject → reason → confirm.

> Known demo caveat: the seed request expiries are fixed 2026 dates; in a live session past those dates the Requests list shows the empty state. Tests inject future dates to stay deterministic. A later polish pass can compute seed expiries relative to a demo "now".

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: pandit core integration walkthrough (P3b complete)"
```

---

## Self-Review

**Spec coverage (P3b = §B1–B5 + OQ4/OQ6):**
- B1 Pandit Dashboard → Task 6 (accepting toggle, pending-requests card, today's bookings, earnings/ratings minis, manage-availability quick action; replaces the P3a stub). ✔
- B2 Requests list → Task 3 (`RequestsScreen`, RequestCard list, empty state). ✔ (segmented All/Single/Multi/Urgent filter + pull-to-refresh deferred — see below.)
- B3 Request detail → Task 4 (jajman/puja/schedule/address/multi/notes cards + Accept/Reject footer + countdown). ✔
- B4 Accept flow → Task 5 (`AcceptRequestScreen`: travel toggle + additional line items + urgent surcharge + total/advance via `acceptCharges` → accept mutation). ✔
- B5 Reject flow → Task 5 (`RejectSheet`: PRD reason set + Other note → reject mutation). ✔
- OQ6 24h countdown → Task 1 (`countdownTone`/`isRequestExpired`) + Task 2 (`CountdownChip`); expired requests excluded from the list. ✔
- OQ4 multi-pandit awareness → Task 4 (lead/team context card) + Task 2 (Multi badge). ✔ (full multi acceptance handoff lands with the broader OQ4 work.)
- OQ3 urgent surcharge → Tasks 1/4/5 (emergency surcharge in `acceptCharges`, Urgent badge, schedule note). ✔

**Intentional deferrals (out of P3b scope):** segmented request filter + pull-to-refresh (B2); sparkline on the earnings card (static minis now; real earnings = P3d); calendar peek strip (calendar = P3c); chat/call deep-links from the request (chat = P3e); auto-expire toast + live countdown re-eval (the list filters expired statically per render); seed-expiry-relative-to-now demo polish. None block the accept/reject loop.

**Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". Complete code in every step; commands list expected output. "(mock)"/"chat only"/"coming"-style copy is intentional prototype text. The Task-3 note explicitly calls out the time-dependent-seed pitfall and gives stable test forms instead of a brittle hardcoded-date assertion.

**Type consistency:** `Booking.jajmanName/additionalCharges/rejectionReason` (Task 1) are consumed by RequestCard/detail/accept (Tasks 2,4,5). `acceptCharges` (Task 1) is used by `AcceptRequestScreen` (Task 5) and `panditBookingStore.accept` (Task 1). `countdownTone` (Task 1) → `CountdownChip` (Task 2). `panditBookingStore` API (`getRequests`/`getRequest`/`getToday`/`getUpcoming`/`accept`/`reject`) is consumed by Tasks 3–6. `sessionStore.acceptingBookings`/`setAcceptingBookings` (Task 1) → dashboard (Task 6). `SELF_PANDIT_ID`/`seedPanditBookings`/`seedPanditStats` (Task 1) consumed by the store + dashboard + tests. Routes use `/pandit/requests*` under `RequirePanditApproved` consistently; the Task-4 `useSearchParams` destructure is reconciled in Task 5 Step 3 to expose both getter and setter.
