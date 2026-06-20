# Pandit Seva — Phase 1c (Booking Flow) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox (`- [ ]`) steps. **Git: commit LOCALLY only — NEVER `git push` / `git remote` / `git branch -M` / `git checkout <other>`. The user pushes manually. No push-blocking guards.**

**Goal:** A Jajman can book a pandit end-to-end (mock): from a pandit's "Book" CTA → pick puja → date/slot → address → attachments/notes → review a charge breakdown → send the request (24h countdown) → (pandit acceptance simulated) → pay the advance → land "Scheduled"; pay the remaining on a completed booking. Plus multi-pandit (build-your-own-team **and** lead-brings-team, §OQ4 A&B) and urgent/emergency booking with a surcharge + time window (§OQ3, expiry per §0.7).

**Architecture:** A `bookingStore` (zustand) holds saved `addresses`, all `bookings`, and an in-progress `draft`. The flow screens read/write the draft; `createBookingFromDraft` commits it to a `Booking` (status `requested`) using a pure `computeCharges` helper (base + travel estimate + emergency surcharge → subtotal → advance/remaining, §0.8) and `computeRequestExpiry` (§0.7). A minimal `BookingDetailScreen` shows the lifecycle `StatusStepper` and the contextual CTA (pay advance / pay remaining / chat). Pandit acceptance is simulated in-store (real Pandit surface is P3). The full Bookings *list* + cancel/rate/repeat is P1d.

**Tech Stack:** existing (React 18 + TS + Tailwind + zustand + react-router-dom 6 + lucide-react + dayjs + nanoid). Tests: Vitest + RTL.

**Builds on:** P0+P1a+P1b (on `main`). Reuse `Button`, `Card`, `Badge`, `Avatar`, `AppBar`, `BackButton`, `Chip`, `SectionHeader`, `BottomSheet`, `RatingStars`, `Stepper`, `cn`, `useDataStore` (pandits/pujas + `getPandit`), `useSessionStore`, `AppPlainLayout`. Domain: `computeAdvance`, `computeRequestExpiry`, `canCreateEmergency`, `defaultPricingConfig`, `BookingStatus`. Reference spec §0.2 (status enum), §0.3 (refund — not used until cancel/P1d), §0.7 (expiry), §0.8 (pricing/advance estimate), §OQ3/§OQ4.

**Working directory:** paths relative to `pandit-seva-app/` (branch `p1c-booking`).

---

### Task 1: Booking domain types, store, and charge logic

**Files:**
- Modify: `src/mock/types.ts`
- Modify: `src/mock/seed.ts`
- Create: `src/domain/charges.ts`
- Test: `src/domain/charges.test.ts`
- Create: `src/store/bookingStore.ts`
- Test: `src/store/bookingStore.test.ts`

- [ ] **Step 1: Extend `src/mock/types.ts`** — append booking + address types (import the canonical `BookingStatus` from the domain):

```ts
import type { BookingStatus } from '../domain/types';

export type AddressType = 'home' | 'parents' | 'relative' | 'temple' | 'custom';
export interface Address {
  id: string;
  label: string;
  type: AddressType;
  line: string;
  city: string;
  notes?: string;
}

export type AttachmentKind = 'image' | 'doc' | 'note';
export interface BookingAttachment {
  id: string;
  kind: AttachmentKind;
  name: string;
}

export interface BookingCharges {
  base: number;
  travel: number;
  emergencySurcharge: number;
  subtotal: number;
}

export type BookingType = 'single' | 'multi';
export type AssignmentMode = 'build' | 'lead';

export interface Booking {
  id: string;
  panditId: string; // single: the pandit; multi: the lead
  pujaId: string;
  type: BookingType;
  assignmentMode?: AssignmentMode;
  teamPanditIds?: string[];
  status: BookingStatus;
  pujaStartISO: string;
  slotLabel: string;
  addressId: string;
  attachments: BookingAttachment[];
  notes: string;
  isEmergency: boolean;
  charges: BookingCharges;
  advanceAmount: number;
  remainingAmount: number;
  amountPaid: number;
  createdAt: string;
  requestExpiresAt: string;
  isDisputed: boolean;
}
```

- [ ] **Step 2: Add seed addresses + one demo "completed" booking to `src/mock/seed.ts`** — append:

```ts
import type { Address, Booking } from './types';

export const seedAddresses: Address[] = [
  { id: 'addr-home', label: 'Home', type: 'home', line: '12 Tulsi Apartments, Kothrud', city: 'Pune', notes: 'Ring the bell twice' },
  { id: 'addr-parents', label: "Parents' home", type: 'parents', line: '4 Shanti Nagar, Aundh', city: 'Pune' },
  { id: 'addr-temple', label: 'Community temple', type: 'temple', line: 'Ganesh Mandir, FC Road', city: 'Pune' },
];

// One already-completed booking so the "pay remaining" screen is demoable before the Pandit surface exists.
export const seedBookings: Booking[] = [
  {
    id: 'bkg-demo-1',
    panditId: 'pnd-2',
    pujaId: 'puja-ganesh',
    type: 'single',
    status: 'completed',
    pujaStartISO: '2026-06-10T09:00:00.000Z',
    slotLabel: '10 Jun · 09:00 AM',
    addressId: 'addr-home',
    attachments: [],
    notes: '',
    isEmergency: false,
    charges: { base: 800, travel: 160, emergencySurcharge: 0, subtotal: 960 },
    advanceAmount: 288,
    remainingAmount: 672,
    amountPaid: 288,
    createdAt: '2026-06-01T09:00:00.000Z',
    requestExpiresAt: '2026-06-02T09:00:00.000Z',
    isDisputed: false,
  },
];
```

- [ ] **Step 3: Write the failing test** — `src/domain/charges.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { computeCharges, travelEstimate } from './charges';

describe('computeCharges', () => {
  it('no emergency: subtotal = base + travel, advance 30%', () => {
    expect(computeCharges(1000, 200, false)).toEqual({
      base: 1000, travel: 200, emergencySurcharge: 0, subtotal: 1200, advance: 360, remaining: 840,
    });
  });

  it('emergency adds 20% of base as surcharge', () => {
    expect(computeCharges(1000, 200, true)).toEqual({
      base: 1000, travel: 200, emergencySurcharge: 200, subtotal: 1400, advance: 420, remaining: 980,
    });
  });

  it('advance + remaining always equals subtotal', () => {
    const c = computeCharges(1111, 333, false);
    expect(c.advance + c.remaining).toBe(c.subtotal);
  });
});

describe('travelEstimate', () => {
  it('is a non-negative rounded function of distance', () => {
    expect(travelEstimate(0)).toBe(0);
    expect(travelEstimate(5)).toBeGreaterThan(0);
    expect(Number.isInteger(travelEstimate(7.3))).toBe(true);
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm test -- charges`
Expected: FAIL — cannot find module `./charges`.

- [ ] **Step 5: Implement `src/domain/charges.ts`**

```ts
import { PricingConfig, defaultPricingConfig } from './types';
import { computeAdvance } from './money';

export interface ComputedCharges {
  base: number;
  travel: number;
  emergencySurcharge: number;
  subtotal: number;
  advance: number;
  remaining: number;
}

/** Mock travel estimate: ₹20/km, rounded. */
export function travelEstimate(distanceKm: number): number {
  return Math.round(Math.max(0, distanceKm) * 20);
}

/**
 * §0.8 — subtotal = base + travel + emergency surcharge; emergency surcharge = pct of base.
 * The advance shown at request time is an ESTIMATE (30% of subtotal).
 */
export function computeCharges(
  base: number,
  travel: number,
  isEmergency: boolean,
  cfg: PricingConfig = defaultPricingConfig,
): ComputedCharges {
  const emergencySurcharge = isEmergency ? Math.round((cfg.emergencySurchargePct / 100) * base) : 0;
  const subtotal = base + travel + emergencySurcharge;
  const advance = computeAdvance(subtotal, cfg);
  return { base, travel, emergencySurcharge, subtotal, advance, remaining: subtotal - advance };
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- charges`
Expected: PASS.

- [ ] **Step 7: Write the failing test** — `src/store/bookingStore.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useBookingStore } from './bookingStore';

const NOW = '2026-06-20T09:00:00.000Z';

beforeEach(() => useBookingStore.setState(useBookingStore.getInitialState()));

describe('bookingStore', () => {
  it('seeds addresses and the demo booking', () => {
    const s = useBookingStore.getState();
    expect(s.addresses.length).toBeGreaterThan(0);
    expect(s.getBooking('bkg-demo-1')?.status).toBe('completed');
  });

  it('startDraft → patchDraft → createBookingFromDraft creates a requested booking', () => {
    const s = useBookingStore.getState();
    s.startDraft('pnd-1');
    s.patchDraft({ pujaId: 'puja-satyanarayan', pujaStartISO: '2026-07-01T09:00:00.000Z', slotLabel: '1 Jul · 09:00 AM', addressId: 'addr-home' });
    const booking = useBookingStore.getState().createBookingFromDraft(NOW);
    expect(booking.status).toBe('requested');
    expect(booking.panditId).toBe('pnd-1');
    expect(booking.charges.subtotal).toBeGreaterThan(0);
    expect(booking.advanceAmount + booking.remainingAmount).toBe(booking.charges.subtotal);
    expect(useBookingStore.getState().getBooking(booking.id)).toBeTruthy();
  });

  it('non-emergency request expires in 24h', () => {
    const s = useBookingStore.getState();
    s.startDraft('pnd-1');
    s.patchDraft({ pujaId: 'puja-satyanarayan', pujaStartISO: '2026-07-01T09:00:00.000Z', slotLabel: 'x', addressId: 'addr-home' });
    const b = useBookingStore.getState().createBookingFromDraft(NOW);
    expect(b.requestExpiresAt).toBe('2026-06-21T09:00:00.000Z');
  });

  it('simulateAccept → payAdvance advances status and records payment', () => {
    const s = useBookingStore.getState();
    s.startDraft('pnd-1');
    s.patchDraft({ pujaId: 'puja-satyanarayan', pujaStartISO: '2026-07-01T09:00:00.000Z', slotLabel: 'x', addressId: 'addr-home' });
    const b = useBookingStore.getState().createBookingFromDraft(NOW);
    useBookingStore.getState().simulateAccept(b.id);
    expect(useBookingStore.getState().getBooking(b.id)?.status).toBe('accepted');
    useBookingStore.getState().payAdvance(b.id);
    const paid = useBookingStore.getState().getBooking(b.id)!;
    expect(paid.status).toBe('scheduled');
    expect(paid.amountPaid).toBe(paid.advanceAmount);
  });

  it('payRemaining on a completed booking records the rest', () => {
    useBookingStore.getState().payRemaining('bkg-demo-1');
    const b = useBookingStore.getState().getBooking('bkg-demo-1')!;
    expect(b.amountPaid).toBe(b.charges.subtotal);
  });
});
```

- [ ] **Step 8: Run to verify it fails**

Run: `npm test -- bookingStore`
Expected: FAIL — cannot find module `./bookingStore`.

- [ ] **Step 9: Implement `src/store/bookingStore.ts`**

```ts
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Address, Booking, BookingAttachment, BookingType, AssignmentMode } from '../mock/types';
import { seedAddresses, seedBookings, seedPandits, seedPujas } from './../mock/seed';
import { computeCharges, travelEstimate } from '../domain/charges';
import { computeRequestExpiry } from '../domain/booking';

export interface BookingDraft {
  panditId: string;
  pujaId: string | null;
  pujaStartISO: string | null;
  slotLabel: string | null;
  addressId: string | null;
  attachments: BookingAttachment[];
  notes: string;
  isEmergency: boolean;
  type: BookingType;
  assignmentMode?: AssignmentMode;
  teamPanditIds: string[];
}

interface BookingState {
  bookings: Booking[];
  addresses: Address[];
  draft: BookingDraft | null;
  startDraft: (panditId: string, opts?: Partial<BookingDraft>) => void;
  patchDraft: (p: Partial<BookingDraft>) => void;
  clearDraft: () => void;
  createBookingFromDraft: (nowISO: string) => Booking;
  simulateAccept: (bookingId: string) => void;
  payAdvance: (bookingId: string) => void;
  payRemaining: (bookingId: string) => void;
  getBooking: (id: string) => Booking | undefined;
  getAddress: (id: string) => Address | undefined;
}

function baseCharge(panditId: string, pujaId: string | null): number {
  const pandit = seedPandits.find((p) => p.id === panditId);
  const sp = pandit?.supportedPujas.find((s) => s.pujaId === pujaId);
  if (sp) return sp.charge;
  const puja = seedPujas.find((p) => p.id === pujaId);
  return puja?.minAmount ?? 1100;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: seedBookings,
  addresses: seedAddresses,
  draft: null,

  startDraft: (panditId, opts) =>
    set({
      draft: {
        panditId,
        pujaId: null,
        pujaStartISO: null,
        slotLabel: null,
        addressId: null,
        attachments: [],
        notes: '',
        isEmergency: false,
        type: 'single',
        teamPanditIds: [],
        ...opts,
      },
    }),

  patchDraft: (p) => set((s) => (s.draft ? { draft: { ...s.draft, ...p } } : s)),
  clearDraft: () => set({ draft: null }),

  createBookingFromDraft: (nowISO) => {
    const d = get().draft;
    if (!d) throw new Error('no draft');
    const pandit = seedPandits.find((p) => p.id === d.panditId);
    const base = baseCharge(d.panditId, d.pujaId);
    const travel = travelEstimate(pandit?.distanceKm ?? 0);
    const c = computeCharges(base, travel, d.isEmergency);
    const booking: Booking = {
      id: `bkg-${nanoid(6)}`,
      panditId: d.panditId,
      pujaId: d.pujaId ?? '',
      type: d.type,
      assignmentMode: d.assignmentMode,
      teamPanditIds: d.teamPanditIds.length ? d.teamPanditIds : undefined,
      status: 'requested',
      pujaStartISO: d.pujaStartISO ?? nowISO,
      slotLabel: d.slotLabel ?? '',
      addressId: d.addressId ?? '',
      attachments: d.attachments,
      notes: d.notes,
      isEmergency: d.isEmergency,
      charges: { base: c.base, travel: c.travel, emergencySurcharge: c.emergencySurcharge, subtotal: c.subtotal },
      advanceAmount: c.advance,
      remainingAmount: c.remaining,
      amountPaid: 0,
      createdAt: nowISO,
      requestExpiresAt: computeRequestExpiry(nowISO, d.pujaStartISO ?? nowISO, d.isEmergency),
      isDisputed: false,
    };
    set((s) => ({ bookings: [booking, ...s.bookings], draft: null }));
    return booking;
  },

  simulateAccept: (bookingId) =>
    set((s) => ({
      bookings: s.bookings.map((b) => (b.id === bookingId && b.status === 'requested' ? { ...b, status: 'accepted' } : b)),
    })),

  payAdvance: (bookingId) =>
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === bookingId && (b.status === 'accepted' || b.status === 'advance_paid')
          ? { ...b, status: 'scheduled', amountPaid: b.advanceAmount }
          : b,
      ),
    })),

  payRemaining: (bookingId) =>
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === bookingId ? { ...b, amountPaid: b.charges.subtotal } : b,
      ),
    })),

  getBooking: (id) => get().bookings.find((b) => b.id === id),
  getAddress: (id) => get().addresses.find((a) => a.id === id),
}));
```

- [ ] **Step 10: Run all tests + typecheck**

Run: `npm test` (all pass — charges + bookingStore + prior), then `npm run typecheck` (clean).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: booking domain types, charge logic, seeded addresses/booking, bookingStore"
```

---

### Task 2: Booking components

**Files:**
- Create: `src/components/ui/MoneyBreakdown.tsx`
- Create: `src/components/ui/StatusStepper.tsx`
- Create: `src/components/ui/Countdown.tsx`
- Create: `src/components/booking/SlotPicker.tsx`
- Create: `src/components/booking/AddressPicker.tsx`
- Create: `src/components/booking/AttachmentUploader.tsx`
- Test: `src/components/booking/booking-components.test.tsx`

- [ ] **Step 1: Create `src/components/ui/MoneyBreakdown.tsx`**

```tsx
import type { BookingCharges } from '../../mock/types';

export function MoneyBreakdown({
  charges,
  advance,
  remaining,
  highlightAdvance = true,
}: {
  charges: BookingCharges;
  advance: number;
  remaining: number;
  highlightAdvance?: boolean;
}) {
  const Row = ({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) => (
    <div className={`flex items-center justify-between py-1 text-sm ${strong ? 'font-semibold' : ''} ${accent ? 'text-primary' : ''}`}>
      <span className={strong || accent ? '' : 'text-muted'}>{label}</span>
      <span>{value}</span>
    </div>
  );
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <Row label="Puja charge" value={`₹${charges.base}`} />
      <Row label="Travel (estimate)" value={`₹${charges.travel}`} />
      {charges.emergencySurcharge > 0 && <Row label="Urgent surcharge" value={`₹${charges.emergencySurcharge}`} />}
      <div className="my-1 border-t border-border" />
      <Row label="Total" value={`₹${charges.subtotal}`} strong />
      <Row label="Advance now (est.)" value={`₹${advance}`} accent={highlightAdvance} />
      <Row label="Remaining after puja" value={`₹${remaining}`} />
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/ui/StatusStepper.tsx`** (booking lifecycle timeline)

```tsx
import { Check } from 'lucide-react';
import type { BookingStatus } from '../../domain/types';
import { cn } from '../../lib/cn';

const STEPS: { key: BookingStatus; label: string }[] = [
  { key: 'requested', label: 'Requested' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'advance_paid', label: 'Advance paid' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'rated', label: 'Rated' },
];

const ORDER = STEPS.map((s) => s.key);

export function StatusStepper({ status }: { status: BookingStatus }) {
  // scheduled implies advance_paid is done; treat amountPaid step as reached at scheduled
  const currentIdx = ORDER.indexOf(status === 'scheduled' ? 'scheduled' : status);
  const reached = (i: number) => currentIdx >= 0 && i <= currentIdx;
  return (
    <ol className="flex flex-col gap-0">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-[10px]',
                reached(i) ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-muted',
              )}
            >
              {reached(i) ? <Check size={12} /> : i + 1}
            </span>
            {i < STEPS.length - 1 && <span className={cn('h-5 w-0.5', reached(i + 1) ? 'bg-primary' : 'bg-border')} />}
          </div>
          <span className={cn('text-sm', reached(i) ? 'font-medium text-text' : 'text-muted')}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
```

> Note: alternate states (rejected/cancelled/expired/refund_*) are rendered as a banner by screens, not as steps — handled in P1d. For P1c the stepper covers the happy path.

- [ ] **Step 3: Create `src/components/ui/Countdown.tsx`** (counts down to an ISO deadline; static-friendly for tests)

```tsx
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

export function Countdown({ deadlineISO, nowISO }: { deadlineISO: string; nowISO?: string }) {
  const [now, setNow] = useState(() => (nowISO ? dayjs(nowISO) : dayjs()));
  useEffect(() => {
    if (nowISO) return; // fixed clock (tests) — don't tick
    const t = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(t);
  }, [nowISO]);

  const diffMin = Math.max(0, dayjs(deadlineISO).diff(now, 'minute'));
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  const expired = diffMin <= 0;
  return (
    <span className={expired ? 'text-error' : 'text-text'}>
      {expired ? 'Expired' : `${h}h ${m}m left`}
    </span>
  );
}
```

- [ ] **Step 4: Create `src/components/booking/SlotPicker.tsx`** (date chips + time slots; emits an ISO + label)

```tsx
import dayjs from 'dayjs';
import { Chip } from '../ui/Chip';

const TIMES = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM'];

export function SlotPicker({
  baseDateISO,
  selectedISO,
  onSelect,
}: {
  baseDateISO: string; // a fixed "today" for deterministic rendering/tests
  selectedISO: string | null;
  onSelect: (iso: string, label: string) => void;
}) {
  const base = dayjs(baseDateISO);
  const days = Array.from({ length: 7 }, (_, i) => base.add(i, 'day'));

  const pick = (day: dayjs.Dayjs, time: string) => {
    const [hm, ap] = time.split(' ');
    let [hh, mm] = hm.split(':').map(Number);
    if (ap === 'PM' && hh !== 12) hh += 12;
    if (ap === 'AM' && hh === 12) hh = 0;
    const iso = day.hour(hh).minute(mm).second(0).millisecond(0).toISOString();
    onSelect(iso, `${day.format('D MMM')} · ${time}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Date</h3>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {days.map((d) => {
            const active = selectedISO != null && dayjs(selectedISO).isSame(d, 'day');
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => pick(d, TIMES[0])}
                className={`flex w-14 shrink-0 flex-col items-center rounded-md border px-2 py-2 ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
              >
                <span className="text-[10px] uppercase text-muted">{d.format('ddd')}</span>
                <span className="text-base font-semibold">{d.format('D')}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Time</h3>
        <div className="flex flex-wrap gap-2">
          {TIMES.map((t) => {
            const day = selectedISO ? dayjs(selectedISO) : days[0];
            const active = selectedISO != null && dayjs(selectedISO).format('hh:mm A') === t;
            return <Chip key={t} label={t} selected={active} onClick={() => pick(day, t)} />;
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/booking/AddressPicker.tsx`**

```tsx
import { Check, MapPin, Plus } from 'lucide-react';
import type { Address } from '../../mock/types';
import { cn } from '../../lib/cn';

export function AddressPicker({
  addresses,
  selectedId,
  onSelect,
  onAdd,
}: {
  addresses: Address[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {addresses.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onSelect(a.id)}
          className={cn(
            'flex items-start gap-3 rounded-md border p-3 text-left',
            selectedId === a.id ? 'border-primary bg-primary/5' : 'border-border bg-surface',
          )}
        >
          <MapPin size={18} className="mt-0.5 text-primary" />
          <span className="flex-1">
            <span className="block text-sm font-medium">{a.label}</span>
            <span className="block text-xs text-muted">{a.line}, {a.city}</span>
          </span>
          {selectedId === a.id && <Check size={18} className="text-primary" />}
        </button>
      ))}
      <button type="button" onClick={onAdd} className="flex items-center gap-2 rounded-md border border-dashed border-border p-3 text-sm text-primary">
        <Plus size={16} /> Add a new address
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Create `src/components/booking/AttachmentUploader.tsx`** (mock; adds chips, captures notes)

```tsx
import { Image, FileText, X } from 'lucide-react';
import type { BookingAttachment } from '../../mock/types';

export function AttachmentUploader({
  attachments,
  notes,
  onAdd,
  onRemove,
  onNotes,
}: {
  attachments: BookingAttachment[];
  notes: string;
  onAdd: (kind: 'image' | 'doc') => void;
  onRemove: (id: string) => void;
  onNotes: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button type="button" onClick={() => onAdd('image')} className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border py-3 text-sm">
          <Image size={16} /> Add photo
        </button>
        <button type="button" onClick={() => onAdd('doc')} className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border py-3 text-sm">
          <FileText size={16} /> Add document
        </button>
      </div>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a) => (
            <span key={a.id} className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs">
              {a.name}
              <button type="button" aria-label={`Remove ${a.name}`} onClick={() => onRemove(a.id)}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <textarea
        value={notes}
        onChange={(e) => onNotes(e.target.value)}
        placeholder="Notes for the pandit (parking, contact person, special requests)…"
        aria-label="Notes"
        rows={3}
        className="w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}
```

- [ ] **Step 7: Write the test** — `src/components/booking/booking-components.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MoneyBreakdown } from '../ui/MoneyBreakdown';
import { StatusStepper } from '../ui/StatusStepper';
import { Countdown } from '../ui/Countdown';
import { SlotPicker } from './SlotPicker';

describe('booking components', () => {
  it('MoneyBreakdown shows charges, advance, and the surcharge only when present', () => {
    const { rerender } = render(
      <MoneyBreakdown charges={{ base: 1000, travel: 200, emergencySurcharge: 0, subtotal: 1200 }} advance={360} remaining={840} />,
    );
    expect(screen.getByText('₹1200')).toBeInTheDocument();
    expect(screen.queryByText('Urgent surcharge')).not.toBeInTheDocument();
    rerender(<MoneyBreakdown charges={{ base: 1000, travel: 200, emergencySurcharge: 200, subtotal: 1400 }} advance={420} remaining={980} />);
    expect(screen.getByText('Urgent surcharge')).toBeInTheDocument();
  });

  it('StatusStepper marks steps up to the current status', () => {
    render(<StatusStepper status="advance_paid" />);
    expect(screen.getByText('Requested')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('Countdown shows time left for a future deadline and Expired for a past one', () => {
    const now = '2026-06-20T09:00:00.000Z';
    render(<Countdown deadlineISO="2026-06-21T09:00:00.000Z" nowISO={now} />);
    expect(screen.getByText('24h 0m left')).toBeInTheDocument();
  });

  it('SlotPicker emits an ISO + label when a time is chosen', () => {
    const onSelect = vi.fn();
    render(<SlotPicker baseDateISO="2026-06-20T00:00:00.000Z" selectedISO={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: '11:00 AM' }));
    expect(onSelect).toHaveBeenCalled();
    expect(onSelect.mock.calls[0][1]).toMatch(/11:00 AM/);
  });
});
```

- [ ] **Step 8: Run the test**

Run: `npm test -- booking-components`
Expected: PASS — 4 assertions green.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: booking components (MoneyBreakdown, StatusStepper, Countdown, SlotPicker, AddressPicker, AttachmentUploader)"
```

---

### Task 3: Single booking flow (wizard)

**Files:**
- Create: `src/screens/jajman/booking/BookingFlow.tsx`
- Create: `src/screens/jajman/booking/RequestSentScreen.tsx`
- Test: `src/screens/jajman/booking/BookingFlow.test.tsx`

- [ ] **Step 1: Create `src/screens/jajman/booking/BookingFlow.tsx`** — a 5-step wizard driven by the booking draft. Mounted at `/app/book/:panditId` (and `/app/book/:panditId/emergency`). Uses a fixed "now" from the store-free `dayjs()` only at submit; for slot base date use today.

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Stepper } from '../../../components/ui/Stepper';
import { Chip } from '../../../components/ui/Chip';
import { SlotPicker } from '../../../components/booking/SlotPicker';
import { AddressPicker } from '../../../components/booking/AddressPicker';
import { AttachmentUploader } from '../../../components/booking/AttachmentUploader';
import { MoneyBreakdown } from '../../../components/ui/MoneyBreakdown';
import { useDataStore } from '../../../store/dataStore';
import { useBookingStore } from '../../../store/bookingStore';
import { computeCharges, travelEstimate } from '../../../domain/charges';
import dayjs from 'dayjs';
import { nanoid } from 'nanoid';

const STEP_TITLES = ['Puja', 'Date & time', 'Address', 'Details', 'Review'];

export function BookingFlow() {
  const navigate = useNavigate();
  const { panditId = '' } = useParams();
  const [params] = useSearchParams();
  const isEmergency = params.get('urgent') === '1';

  const pandit = useDataStore((s) => s.getPandit(panditId));
  const pujas = useDataStore((s) => s.pujas);
  const addresses = useBookingStore((s) => s.addresses);
  const draft = useBookingStore((s) => s.draft);
  const startDraft = useBookingStore((s) => s.startDraft);
  const patchDraft = useBookingStore((s) => s.patchDraft);
  const createBooking = useBookingStore((s) => s.createBookingFromDraft);
  const [step, setStep] = useState(0);
  const today = dayjs().startOf('day').toISOString();

  useEffect(() => {
    startDraft(panditId, { isEmergency, type: 'single' });
  }, [panditId, isEmergency, startDraft]);

  if (!pandit || !draft) {
    return <><AppBar title="Book" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Loading…</div></>;
  }

  const supported = pandit.supportedPujas;
  const canNext =
    (step === 0 && !!draft.pujaId) ||
    (step === 1 && !!draft.pujaStartISO) ||
    (step === 2 && !!draft.addressId) ||
    step === 3 ||
    step === 4;

  const submit = () => {
    const booking = createBooking(dayjs().toISOString());
    navigate(`/app/booking/${booking.id}/sent`, { replace: true });
  };

  const base = draft.pujaId ? supported.find((s) => s.pujaId === draft.pujaId)?.charge ?? 0 : 0;
  const charges = computeCharges(base, travelEstimate(pandit.distanceKm), draft.isEmergency);

  return (
    <>
      <AppBar
        title={isEmergency ? 'Urgent booking' : `Book ${pandit.name}`}
        left={<BackButton />}
      />
      <div className="border-b border-border px-4 py-3">
        <Stepper total={STEP_TITLES.length} current={step} />
        <p className="mt-2 text-sm font-medium">{STEP_TITLES[step]}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {step === 0 && (
          <div className="flex flex-col gap-2">
            {supported.length === 0 && <p className="text-sm text-muted">This pandit has no pujas configured.</p>}
            {supported.map((sp) => {
              const puja = pujas.find((p) => p.id === sp.pujaId);
              return (
                <button
                  key={sp.pujaId}
                  type="button"
                  onClick={() => patchDraft({ pujaId: sp.pujaId })}
                  className={`flex items-center justify-between rounded-md border p-3 text-left ${draft.pujaId === sp.pujaId ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <span><span className="block text-sm font-medium">{puja?.name}</span><span className="block text-xs text-muted">{sp.durationMins} min</span></span>
                  <span className="font-semibold">₹{sp.charge}</span>
                </button>
              );
            })}
          </div>
        )}

        {step === 1 && (
          <SlotPicker
            baseDateISO={today}
            selectedISO={draft.pujaStartISO}
            onSelect={(iso, label) => patchDraft({ pujaStartISO: iso, slotLabel: label })}
          />
        )}

        {step === 2 && (
          <AddressPicker
            addresses={addresses}
            selectedId={draft.addressId}
            onSelect={(id) => patchDraft({ addressId: id })}
            onAdd={() => alert('Add-address is part of Address Management (P2).')}
          />
        )}

        {step === 3 && (
          <AttachmentUploader
            attachments={draft.attachments}
            notes={draft.notes}
            onAdd={(kind) => patchDraft({ attachments: [...draft.attachments, { id: nanoid(5), kind, name: kind === 'image' ? 'Photo.jpg' : 'Document.pdf' }] })}
            onRemove={(id) => patchDraft({ attachments: draft.attachments.filter((a) => a.id !== id) })}
            onNotes={(v) => patchDraft({ notes: v })}
          />
        )}

        {step === 4 && (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-border bg-surface p-3 text-sm">
              <p className="font-medium">{pujas.find((p) => p.id === draft.pujaId)?.name}</p>
              <p className="text-muted">{draft.slotLabel}</p>
              <p className="text-muted">{addresses.find((a) => a.id === draft.addressId)?.label}</p>
              {draft.isEmergency && <p className="mt-1 text-error">Urgent · same-day surcharge applies</p>}
            </div>
            <MoneyBreakdown charges={{ base: charges.base, travel: charges.travel, emergencySurcharge: charges.emergencySurcharge, subtotal: charges.subtotal }} advance={charges.advance} remaining={charges.remaining} />
            <p className="text-xs text-muted">You'll pay the advance after the pandit accepts (within 24h). The advance is an estimate and is confirmed on acceptance.</p>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        {step < 4 ? (
          <Button className="w-full" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>Continue</Button>
        ) : (
          <Button className="w-full" onClick={submit}>Send booking request</Button>
        )}
      </div>
    </>
  );
}
```

> Uses `alert()` for the add-address stub (P2). `dayjs()`/`nanoid` are allowed in app code (only the workflow-script sandbox forbids them).

- [ ] **Step 2: Create `src/screens/jajman/booking/RequestSentScreen.tsx`**

```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { Button } from '../../../components/ui/Button';
import { Countdown } from '../../../components/ui/Countdown';
import { useBookingStore } from '../../../store/bookingStore';

export function RequestSentScreen() {
  const navigate = useNavigate();
  const { bookingId = '' } = useParams();
  const booking = useBookingStore((s) => s.getBooking(bookingId));

  return (
    <>
      <AppBar title="Request sent" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <CheckCircle2 size={56} className="text-success" />
        <h1 className="text-lg font-semibold">Booking request sent 🙏</h1>
        <p className="text-sm text-muted">The pandit will respond soon. Requests expire in{' '}
          {booking ? <Countdown deadlineISO={booking.requestExpiresAt} /> : '24h'}.</p>
        <Button className="mt-4 w-full" onClick={() => navigate(`/app/booking/${bookingId}`)}>View booking</Button>
        <button type="button" onClick={() => navigate('/app/home')} className="text-sm text-muted">Back to home</button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Write the test** — `src/screens/jajman/booking/BookingFlow.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BookingFlow } from './BookingFlow';
import { useBookingStore } from '../../../store/bookingStore';

beforeEach(() => useBookingStore.setState(useBookingStore.getInitialState()));

function renderFlow() {
  return render(
    <MemoryRouter initialEntries={['/app/book/pnd-1']}>
      <Routes>
        <Route path="/app/book/:panditId" element={<BookingFlow />} />
        <Route path="/app/booking/:bookingId/sent" element={<div>SENT</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BookingFlow', () => {
  it('walks puja → slot → address → details → review → send', () => {
    renderFlow();
    // Step 0: pick the first puja
    fireEvent.click(screen.getByText('Satyanarayan Katha'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    // Step 1: pick a time
    fireEvent.click(screen.getByRole('button', { name: '09:00 AM' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    // Step 2: pick the home address
    fireEvent.click(screen.getByText('Home'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    // Step 3: details (optional) → continue
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    // Step 4: review → send
    expect(screen.getByText(/Advance now/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send booking request' }));
    expect(screen.getByText('SENT')).toBeInTheDocument();
    // a requested booking now exists
    expect(useBookingStore.getState().bookings.some((b) => b.status === 'requested' && b.panditId === 'pnd-1')).toBe(true);
  });
});
```

- [ ] **Step 4: Run the test**

Run: `npm test -- BookingFlow`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: single-pandit booking wizard + request-sent screen"
```

---

### Task 4: Booking detail + advance/remaining payment

**Files:**
- Create: `src/screens/jajman/booking/BookingDetailScreen.tsx`
- Create: `src/screens/jajman/booking/PaymentScreen.tsx`
- Test: `src/screens/jajman/booking/payment-flow.test.tsx`

- [ ] **Step 1: Create `src/screens/jajman/booking/BookingDetailScreen.tsx`**

```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { StatusStepper } from '../../../components/ui/StatusStepper';
import { MoneyBreakdown } from '../../../components/ui/MoneyBreakdown';
import { Countdown } from '../../../components/ui/Countdown';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';

export function BookingDetailScreen() {
  const navigate = useNavigate();
  const { bookingId = '' } = useParams();
  const booking = useBookingStore((s) => s.getBooking(bookingId));
  const simulateAccept = useBookingStore((s) => s.simulateAccept);
  const getAddress = useBookingStore((s) => s.getAddress);
  const pandit = useDataStore((s) => s.getPandit(booking?.panditId ?? ''));
  const puja = useDataStore((s) => s.getPuja(booking?.pujaId ?? ''));

  if (!booking) {
    return <><AppBar title="Booking" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Booking not found.</div></>;
  }

  const remainingDue = booking.status === 'completed' && booking.amountPaid < booking.charges.subtotal;

  return (
    <>
      <AppBar title="Booking" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold">{puja?.name}</h1>
            <p className="text-sm text-muted">{pandit?.name} · {booking.slotLabel}</p>
            <p className="text-xs text-muted">{getAddress(booking.addressId)?.label}</p>
          </div>
          {booking.isEmergency && <Badge className="bg-error/10 text-error">Urgent</Badge>}
        </div>

        {booking.status === 'requested' && (
          <div className="mb-4 rounded-md bg-surface-2 p-3 text-sm">
            Waiting for the pandit to accept · <Countdown deadlineISO={booking.requestExpiresAt} />
            <button onClick={() => simulateAccept(booking.id)} className="mt-2 block text-xs font-medium text-primary">
              (demo) simulate pandit accepts
            </button>
          </div>
        )}

        <div className="mb-4"><StatusStepper status={booking.status} /></div>

        <MoneyBreakdown charges={booking.charges} advance={booking.advanceAmount} remaining={booking.remainingAmount} highlightAdvance={booking.status === 'accepted'} />
      </div>

      <div className="border-t border-border p-3">
        {booking.status === 'accepted' && (
          <Button className="w-full" onClick={() => navigate(`/app/booking/${booking.id}/pay/advance`)}>
            Pay advance ₹{booking.advanceAmount}
          </Button>
        )}
        {remainingDue && (
          <Button className="w-full" onClick={() => navigate(`/app/booking/${booking.id}/pay/remaining`)}>
            Pay remaining ₹{booking.remainingAmount}
          </Button>
        )}
        {!['accepted'].includes(booking.status) && !remainingDue && (
          <Button variant="outline" className="w-full" onClick={() => navigate(`/app/chat/${booking.panditId}`)}>
            Message pandit
          </Button>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `src/screens/jajman/booking/PaymentScreen.tsx`** (handles advance + remaining via a `kind` route param; mock methods, simulated processing)

```tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Loader2, Smartphone, CreditCard, Building2, Wallet } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { useBookingStore } from '../../../store/bookingStore';
import { cn } from '../../../lib/cn';

const METHODS = [
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'netbanking', label: 'Net banking', icon: Building2 },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
];

export function PaymentScreen() {
  const navigate = useNavigate();
  const { bookingId = '', kind = 'advance' } = useParams();
  const booking = useBookingStore((s) => s.getBooking(bookingId));
  const payAdvance = useBookingStore((s) => s.payAdvance);
  const payRemaining = useBookingStore((s) => s.payRemaining);
  const [method, setMethod] = useState('upi');
  const [phase, setPhase] = useState<'idle' | 'processing' | 'done'>('idle');

  if (!booking) return <><AppBar title="Payment" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Booking not found.</div></>;

  const amount = kind === 'remaining' ? booking.remainingAmount : booking.advanceAmount;

  const pay = () => {
    setPhase('processing');
    setTimeout(() => {
      if (kind === 'remaining') payRemaining(booking.id);
      else payAdvance(booking.id);
      setPhase('done');
    }, 1200);
  };

  if (phase === 'done') {
    return (
      <>
        <AppBar title="Payment" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15"><Check size={36} className="text-success" /></div>
          <h1 className="text-lg font-semibold">Payment successful</h1>
          <p className="text-sm text-muted">₹{amount} paid via {METHODS.find((m) => m.id === method)?.label}.</p>
          <Button className="mt-4 w-full" onClick={() => navigate(`/app/booking/${booking.id}`, { replace: true })}>Done</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <AppBar title={kind === 'remaining' ? 'Pay remaining' : 'Pay advance'} left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-md bg-surface-2 p-4 text-center">
          <p className="text-xs text-muted">Amount</p>
          <p className="text-3xl font-bold">₹{amount}</p>
        </div>
        <h3 className="mb-2 text-sm font-semibold">Payment method</h3>
        <div className="flex flex-col gap-2">
          {METHODS.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.id} type="button" onClick={() => setMethod(m.id)} className={cn('flex items-center gap-3 rounded-md border p-3 text-left', method === m.id ? 'border-primary bg-primary/5' : 'border-border')}>
                <Icon size={18} className="text-primary" />
                <span className="flex-1 text-sm">{m.label}</span>
                {method === m.id && <Check size={16} className="text-primary" />}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">This is a mock payment — no real transaction occurs.</p>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={phase === 'processing'} onClick={pay}>
          {phase === 'processing' ? <><Loader2 size={18} className="animate-spin" /> Processing…</> : `Pay ₹${amount}`}
        </Button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Write the test** — `src/screens/jajman/booking/payment-flow.test.tsx`

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BookingDetailScreen } from './BookingDetailScreen';
import { PaymentScreen } from './PaymentScreen';
import { useBookingStore } from '../../../store/bookingStore';

beforeEach(() => useBookingStore.setState(useBookingStore.getInitialState()));

function harness(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/booking/:bookingId" element={<BookingDetailScreen />} />
        <Route path="/app/booking/:bookingId/pay/:kind" element={<PaymentScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('payment flow', () => {
  it('accepted booking → pay advance → scheduled with advance recorded', async () => {
    vi.useFakeTimers();
    // create + accept a booking
    const s = useBookingStore.getState();
    s.startDraft('pnd-1');
    s.patchDraft({ pujaId: 'puja-satyanarayan', pujaStartISO: '2026-07-01T09:00:00.000Z', slotLabel: 'x', addressId: 'addr-home' });
    const b = useBookingStore.getState().createBookingFromDraft('2026-06-20T09:00:00.000Z');
    useBookingStore.getState().simulateAccept(b.id);

    harness(`/app/booking/${b.id}/pay/advance`);
    fireEvent.click(screen.getByRole('button', { name: /Pay ₹/ }));
    vi.advanceTimersByTime(1300);
    await waitFor(() => expect(screen.getByText('Payment successful')).toBeInTheDocument());
    expect(useBookingStore.getState().getBooking(b.id)?.status).toBe('scheduled');
    vi.useRealTimers();
  });

  it('completed demo booking shows pay-remaining CTA', () => {
    harness('/app/booking/bkg-demo-1');
    expect(screen.getByRole('button', { name: /Pay remaining/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test**

Run: `npm test -- payment-flow`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: booking detail (status timeline) + advance/remaining mock payment"
```

---

### Task 5: Multi-pandit (A&B) + emergency entry + route integration

**Files:**
- Create: `src/screens/jajman/booking/MultiPanditScreen.tsx`
- Create: `src/screens/jajman/booking/EmergencyEntryScreen.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/screens/jajman/PanditDetailScreen.tsx`
- Modify: `src/screens/jajman/HomeScreen.tsx`
- Test: `src/app/booking-flow.test.tsx`

- [ ] **Step 1: Create `src/screens/jajman/booking/MultiPanditScreen.tsx`** (§OQ4 A&B chooser → build team or pick lead)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Users, UserCheck } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { useDataStore } from '../../../store/dataStore';
import { cn } from '../../../lib/cn';

export function MultiPanditScreen() {
  const navigate = useNavigate();
  const pandits = useDataStore(useShallow((s) => s.getApprovedPandits()));
  const [mode, setMode] = useState<'build' | 'lead' | null>(null);
  const [team, setTeam] = useState<string[]>([]);
  const [lead, setLead] = useState<string | null>(null);

  const toggle = (id: string) => setTeam((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  const canProceed = (mode === 'build' && team.length >= 2) || (mode === 'lead' && !!lead);

  const proceed = () => {
    // Hand off to the single booking flow on the lead/first pandit, carrying the team via the URL.
    const leadId = mode === 'lead' ? lead! : team[0];
    const others = mode === 'build' ? team.slice(1).join(',') : '';
    navigate(`/app/book/${leadId}?team=${others}&mode=${mode}`);
  };

  return (
    <>
      <AppBar title="Multi-pandit booking" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 text-sm text-muted">Some pujas (Yagna, Maha Mrityunjaya Jaap, marriage) need several pandits. Choose how to assemble the team.</p>
        <div className="mb-4 flex flex-col gap-2">
          <button type="button" onClick={() => setMode('build')} className={cn('flex items-start gap-3 rounded-md border p-3 text-left', mode === 'build' ? 'border-primary bg-primary/5' : 'border-border')}>
            <Users size={20} className="text-primary" />
            <span><span className="block text-sm font-medium">Build my own team</span><span className="block text-xs text-muted">Pick each pandit yourself.</span></span>
          </button>
          <button type="button" onClick={() => setMode('lead')} className={cn('flex items-start gap-3 rounded-md border p-3 text-left', mode === 'lead' ? 'border-primary bg-primary/5' : 'border-border')}>
            <UserCheck size={20} className="text-primary" />
            <span><span className="block text-sm font-medium">Book a lead pandit who brings the team</span><span className="block text-xs text-muted">The lead arranges the supporting pandits.</span></span>
          </button>
        </div>

        {mode && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{mode === 'build' ? `Select team (${team.length})` : 'Select the lead pandit'}</h3>
            {pandits.map((p) => {
              const selected = mode === 'build' ? team.includes(p.id) : lead === p.id;
              return (
                <button key={p.id} type="button" onClick={() => (mode === 'build' ? toggle(p.id) : setLead(p.id))} className={cn('flex items-center gap-3 rounded-md border p-3 text-left', selected ? 'border-primary bg-primary/5' : 'border-border')}>
                  <Avatar name={p.name} size={36} />
                  <span className="flex-1 text-sm font-medium">{p.name}</span>
                  {selected && <span className="text-xs font-medium text-primary">Selected</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={!canProceed} onClick={proceed}>Continue</Button>
      </div>
    </>
  );
}
```

> The booking flow already reads `panditId`; the `team`/`mode` query params are carried into the draft so the booking is typed `multi`. Update `BookingFlow` Step 1 effect to read these (see Step 4).

- [ ] **Step 2: Create `src/screens/jajman/booking/EmergencyEntryScreen.tsx`** (§OQ3 — urgent same-day, surcharge + time window)

```tsx
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Zap } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { PanditCard } from '../../../components/ui/PanditCard';
import { useDataStore } from '../../../store/dataStore';
import { sortPandits } from '../../../domain/search';

export function EmergencyEntryScreen() {
  const navigate = useNavigate();
  const pandits = useDataStore(useShallow((s) => s.getApprovedPandits()));
  // "available now" = fastest responders
  const available = sortPandits(pandits, 'distance').filter((p) => p.responseTimeMins <= 20).slice(0, 5);

  return (
    <>
      <AppBar title="Urgent booking" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-start gap-3 rounded-md border border-error/30 bg-error/5 p-3">
          <Zap size={20} className="text-error" />
          <p className="text-sm text-muted">Same-day bookings carry an urgent surcharge and are limited to pandits who can respond before the puja time.</p>
        </div>
        <h3 className="mb-2 text-sm font-semibold">Available for urgent booking</h3>
        <div className="flex flex-col gap-3">
          {available.map((p) => (
            <PanditCard key={p.id} p={p} onClick={() => navigate(`/app/book/${p.id}?urgent=1`)} />
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Wire routes in `src/app/router.tsx`** — import the booking screens + add them to the `RequireAuth` + `AppPlainLayout` group:

```tsx
import { BookingFlow } from '../screens/jajman/booking/BookingFlow';
import { RequestSentScreen } from '../screens/jajman/booking/RequestSentScreen';
import { BookingDetailScreen } from '../screens/jajman/booking/BookingDetailScreen';
import { PaymentScreen } from '../screens/jajman/booking/PaymentScreen';
import { MultiPanditScreen } from '../screens/jajman/booking/MultiPanditScreen';
import { EmergencyEntryScreen } from '../screens/jajman/booking/EmergencyEntryScreen';
```

Add to the `AppPlainLayout` children array:

```tsx
      { path: '/app/book/:panditId', element: <BookingFlow /> },
      { path: '/app/booking/:bookingId/sent', element: <RequestSentScreen /> },
      { path: '/app/booking/:bookingId', element: <BookingDetailScreen /> },
      { path: '/app/booking/:bookingId/pay/:kind', element: <PaymentScreen /> },
      { path: '/app/multi-pandit', element: <MultiPanditScreen /> },
      { path: '/app/urgent', element: <EmergencyEntryScreen /> },
```

- [ ] **Step 4: Make `BookingFlow` carry multi-pandit context** — in `src/screens/jajman/booking/BookingFlow.tsx`, extend the `useSearchParams` read + the `startDraft` effect:

```tsx
  const teamParam = params.get('team') || '';
  const modeParam = params.get('mode'); // 'build' | 'lead' | null
  // ...
  useEffect(() => {
    const team = teamParam ? teamParam.split(',').filter(Boolean) : [];
    startDraft(panditId, {
      isEmergency,
      type: modeParam ? 'multi' : 'single',
      assignmentMode: modeParam === 'build' || modeParam === 'lead' ? modeParam : undefined,
      teamPanditIds: team,
    });
  }, [panditId, isEmergency, teamParam, modeParam, startDraft]);
```

And on the Review step (step 4), when `draft.type === 'multi'`, show a one-line team summary above the breakdown:

```tsx
            {draft.type === 'multi' && (
              <p className="rounded-md bg-surface-2 p-2 text-xs text-muted">
                Multi-pandit · {draft.assignmentMode === 'lead' ? 'lead brings the team' : `${draft.teamPanditIds.length + 1} pandits`}
              </p>
            )}
```

- [ ] **Step 5: Add entry points** — 
  - In `src/screens/jajman/PanditDetailScreen.tsx`, the "Book" button already navigates to `/app/book/${pandit.id}` — leave it.
  - In `src/screens/jajman/HomeScreen.tsx`, add two quick-action entries near the top (below the search bar): an "Urgent booking" chip → `/app/urgent`, and a "Multi-pandit puja" chip → `/app/multi-pandit`. Add a small row:

```tsx
        <div className="mt-3 flex gap-2 px-4">
          <button type="button" onClick={() => navigate('/app/urgent')} className="flex-1 rounded-md border border-error/30 bg-error/5 px-3 py-2 text-xs font-medium text-error">⚡ Urgent booking</button>
          <button type="button" onClick={() => navigate('/app/multi-pandit')} className="flex-1 rounded-md border border-border px-3 py-2 text-xs font-medium">👥 Multi-pandit puja</button>
        </div>
```

(place this right after the SearchBar wrapper div).

- [ ] **Step 6: Write the integration test** — `src/app/booking-flow.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { useBookingStore } from '../store/bookingStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useBookingStore.setState(useBookingStore.getInitialState());
  useSessionStore.getState().setPendingPhone('9876543210');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('booking flow (integration)', () => {
  it('book a pandit end-to-end → request sent', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/book/pnd-1'] });
    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByText('Satyanarayan Katha'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));        // puja → slot
    fireEvent.click(screen.getByRole('button', { name: '09:00 AM' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));        // slot → address
    fireEvent.click(screen.getByText('Home'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));        // address → details
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));        // details → review
    fireEvent.click(screen.getByRole('button', { name: 'Send booking request' }));

    expect(screen.getByText(/Booking request sent/)).toBeInTheDocument();
    expect(useBookingStore.getState().bookings.some((b) => b.status === 'requested')).toBe(true);
  });
});
```

- [ ] **Step 7: Run the full suite + typecheck + build + dev smoke**

Run: `npm test` (all pass incl. booking-flow), `npm run typecheck` (clean), `npm run build` (succeeds). Boot `npm run dev` in background, curl `http://localhost:5173/` → 200, stop it.

- [ ] **Step 8: Commit** (commit only — do NOT push)

```bash
git add -A
git commit -m "feat: multi-pandit (A&B) + urgent booking entry; wire booking routes + Home/detail entry points (P1c complete)"
```

---

## Self-Review

**Spec coverage (P1c = booking flow):**
- Select puja → date/slot → address → attachments/notes → summary (charge breakdown) → send request → 24h countdown → advance payment → scheduled → remaining payment → Tasks 1-4. ✔
- §0.8 advance = 30% of subtotal (estimate); §0.7 expiry (24h non-emergency) → `charges.ts` + `bookingStore` + tested. ✔
- §0.2 lifecycle via `StatusStepper` (happy path; alt states deferred to P1d). ✔
- §OQ4 multi-pandit A (build team) **and** B (lead brings team) → Task 5 MultiPanditScreen + draft `assignmentMode`. ✔
- §OQ3 emergency/urgent with surcharge + responder/time-window gating + §0.7 emergency expiry (min(now+24h, pujaStart−60min)) → Task 5 EmergencyEntryScreen + `isEmergency` charges + `computeRequestExpiry`. ✔

**Deferred (correct):** Bookings *list* with tabs, cancel/refund (§0.3), rate, repeat/recurring → P1d. Real pandit acceptance → P3 (simulated here via a demo button). Real add-address → P2 (stubbed with an alert). Chat → P2 (CTA routes to the existing NotFound). i18n → P5.

**Placeholder scan:** every step has complete code or an exact command + expected output. The "(demo) simulate pandit accepts" button and the add-address `alert()` are intentional prototype stubs, not plan gaps.

**Type consistency:** `Address`/`Booking`/`BookingCharges`/`BookingAttachment` (Task 1) used across the store + screens. `computeCharges`/`travelEstimate` (Task 1) used by `bookingStore` + `BookingFlow`. `useBookingStore` actions (`startDraft`/`patchDraft`/`createBookingFromDraft`/`simulateAccept`/`payAdvance`/`payRemaining`/`getBooking`/`getAddress`) consistent across Tasks 3-5. `MoneyBreakdown`/`StatusStepper`/`Countdown`/`SlotPicker`/`AddressPicker`/`AttachmentUploader` (Task 2) consumed by Tasks 3-4. `routes` export consumed by `booking-flow.test.tsx`. `BookingStatus` imported from `domain/types` everywhere (single source).
