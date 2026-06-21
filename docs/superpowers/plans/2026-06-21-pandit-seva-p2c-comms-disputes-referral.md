# Pandit Seva — Phase 2c (Notifications, Disputes, Referral, Help) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the Jajman secondary surfaces — Notifications center, Disputes (list + detail + raise-with-evidence), Referral program, and Help/Support — replacing the three disabled "Soon" rows on the Profile hub with real routes, and wire the two cross-phase items deferred from P2b (chat phone-visibility default; default-address pre-selection in booking).

**Architecture:** New screens render under `AppPlainLayout` (tab-less, back button) inside `RequireAuth`, all under the `/app/*` prefix. New domain state lives in three small zustand stores mirroring the existing ones — `notificationStore`, `disputeStore`, `referralStore` — plus static FAQ data; the new mock entities (`AppNotification`, `Dispute`, `ReferralRecord`) are simplified, prototype-friendly subsets of the spec's full data model. Evidence reuses the existing `BookingAttachment` shape; the dispute timeline uses a small dedicated `DisputeStepper`. A global notifications bell is added to the Home app bar; the "Raise dispute" entry is added to Booking detail per spec.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind 3, zustand 4 (`zustand/react/shallow`), react-router-dom 6, lucide-react, nanoid. Tests: Vitest + React Testing Library + jsdom. No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-06-20-pandit-seva-mobile-ui-design.md` — §J Notifications center (~1327), §K Referral (~1340), §L Disputes (~1355), Appendix A Help/Support (~3153); Mock Data Model: Dispute (~2803), ReferralRecord (~2853), Notification (~2867); Enums (~2391, esp. `DisputeStatus`, `NotifType`).

**Working directory:** all paths relative to `pandit-seva-app/`.

## Global Constraints

- **Route prefix:** authenticated Jajman routes are `/app/*`. Spec bare paths map accordingly: `/notifications`→`/app/notifications`, `/referral`→`/app/referral`, `/disputes`→`/app/disputes`, `/disputes/:id`→`/app/disputes/:disputeId`, `/bookings/:id/dispute/new`→`/app/booking/:bookingId/dispute/new`, Help→`/app/help`.
- **Layout placement:** all new screens are drill-downs → add them to the `AppPlainLayout` children group in `src/app/router.tsx` (inside `RequireAuth`). Do not add tab screens.
- **No new dependencies.** Reuse existing components and stores.
- **Dates:** never call `Date.now()`/`new Date()` in store or domain modules. Display dates by slicing stored ISO strings (`iso.slice(0, 10)`). `new Date()` inside a screen event handler is acceptable but avoid it where a test would depend on "now".
- **Jajman dispute reasons (spec, verbatim):** "Pandit didn't arrive", "Puja incomplete", "Quality issue", "Payment issue", "Other". Reason codes: `pandit_no_show | puja_incomplete | quality_issue | payment_issue | other`.
- **DisputeStatus (mock subset):** `open | under_review | resolved | rejected`.
- **Tests:** strict TDD (failing test first) for store/domain logic; build-then-test for presentational components/screens (repo convention). Reset zustand stores in `beforeEach` via `setState(...)` or `getInitialState()`.
- **Commits:** one per task, local only (do not push).

---

### Task 1: Cross-phase wirings (chat phone-visibility default + booking default address)

**Files:**
- Modify: `src/store/chatStore.ts` (seed new threads from `uiStore.phoneShareDefault`)
- Modify: `src/store/bookingStore.ts` (`startDraft` pre-selects the default address)
- Test: `src/store/chatStore.test.ts`, `src/store/bookingStore.test.ts` (extend)

**Interfaces:**
- Consumes: `uiStore.phoneShareDefault` (P2b), `bookingStore.getDefaultAddress()` (P2b).
- Produces: no new exports — behavior change only. New threads created via `ensureThreadForBooking` start `phoneShared = phoneShareDefault`; a fresh booking draft's `addressId` defaults to the default address id.

- [ ] **Step 1: Write the failing tests**

Append to `src/store/chatStore.test.ts`:

```ts
import { useUiStore } from './uiStore';

describe('phone-visibility default (P2c wiring)', () => {
  beforeEach(() => {
    useChatStore.setState(useChatStore.getInitialState());
    useUiStore.setState(useUiStore.getInitialState());
  });

  it('new threads inherit uiStore.phoneShareDefault = true', () => {
    useUiStore.getState().setPhoneShareDefault(true);
    const t = useChatStore.getState().ensureThreadForBooking('bkg-new-1', 'pnd-1');
    expect(t.phoneShared).toBe(true);
  });

  it('new threads default to hidden when phoneShareDefault = false', () => {
    const t = useChatStore.getState().ensureThreadForBooking('bkg-new-2', 'pnd-1');
    expect(t.phoneShared).toBe(false);
  });
});
```

Append to `src/store/bookingStore.test.ts`:

```ts
describe('startDraft pre-selects the default address (P2c wiring)', () => {
  beforeEach(() => useBookingStore.setState({ addresses: seedAddresses, draft: null }));

  it('uses the default address id when no override is given', () => {
    useBookingStore.getState().startDraft('pnd-1');
    expect(useBookingStore.getState().draft?.addressId).toBe('addr-home');
  });

  it('an explicit addressId override still wins', () => {
    useBookingStore.getState().startDraft('pnd-1', { addressId: 'addr-temple' });
    expect(useBookingStore.getState().draft?.addressId).toBe('addr-temple');
  });
});
```

> `seedAddresses` is already imported in `bookingStore.test.ts` from the P2b work; if not present, add `import { seedAddresses } from '../mock/seed';`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- chatStore bookingStore`
Expected: FAIL — new thread `phoneShared` is hardcoded `false`; draft `addressId` is `null`.

- [ ] **Step 3: Wire `phoneShareDefault` into `src/store/chatStore.ts`**

Add the import at the top:

```ts
import { useUiStore } from './uiStore';
```

In `ensureThreadForBooking`, change the created thread's `phoneShared` from `false` to the stored default:

```ts
  ensureThreadForBooking: (bookingId, panditId) => {
    set((s) => {
      if (s.threads.some((t) => t.bookingId === bookingId)) return s;
      const thread: ChatThread = {
        id: `thr-${nanoid(6)}`,
        bookingId,
        panditId,
        phoneShared: useUiStore.getState().phoneShareDefault,
        messages: [],
      };
      return { threads: [thread, ...s.threads] };
    });
    return get().getThreadForBooking(bookingId)!;
  },
```

- [ ] **Step 4: Wire the default address into `src/store/bookingStore.ts` `startDraft`**

Replace the `addressId: null,` line inside `startDraft`'s draft object with:

```ts
        addressId: get().getDefaultAddress()?.id ?? null,
```

The full `startDraft` becomes:

```ts
  startDraft: (panditId, opts) =>
    set({
      draft: {
        panditId,
        pujaId: null,
        pujaStartISO: null,
        slotLabel: null,
        addressId: get().getDefaultAddress()?.id ?? null,
        attachments: [],
        notes: '',
        isEmergency: false,
        type: 'single',
        teamPanditIds: [],
        ...opts,
      },
    }),
```

> `...opts` still spreads last, so an explicit `opts.addressId` overrides the default.

- [ ] **Step 5: Run the focused tests, then the full suite**

Run: `npm test -- chatStore bookingStore`
Expected: PASS — all four new assertions green.

Run: `npm test`
Expected: PASS. **If a pre-existing booking-flow test now fails because the address step is pre-satisfied** (the draft starts with a default `addressId` instead of `null`), update that test to reflect the intended new behavior (default address pre-selected; the user can still change it) — keep the assertion truthful to the new UX. Report any such change as a concern.

- [ ] **Step 6: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add -A
git commit -m "feat: wire phoneShareDefault into new chat threads + default-address pre-select in booking draft"
```

---

### Task 2: Mock entities, seeds, and stores (notifications / disputes / referral / FAQ)

**Files:**
- Modify: `src/mock/types.ts` (AppNotification, Dispute, ReferralRecord + enums)
- Modify: `src/mock/seed.ts` (seedNotifications, seedDisputes, seedReferrals, referralCode)
- Create: `src/mock/faq.ts`
- Create: `src/store/notificationStore.ts`
- Create: `src/store/disputeStore.ts`
- Create: `src/store/referralStore.ts`
- Test: `src/store/notificationStore.test.ts`, `src/store/disputeStore.test.ts`, `src/store/referralStore.test.ts`

**Interfaces:**
- Produces:
  - Types: `NotifType`, `AppNotification`; `DisputeStatus`, `DisputeReason`, `DisputeResolutionType`, `Dispute`; `ReferralType`, `ReferralStatus`, `ReferralRecord`; `FaqEntry`.
  - `notificationStore`: `notifications: AppNotification[]`, `getNotifications(): AppNotification[]` (newest first), `unreadCount(): number`, `markRead(id)`, `markAllRead()`.
  - `disputeStore`: `disputes: Dispute[]`, `getDisputes(): Dispute[]` (newest first), `getDispute(id): Dispute | undefined`, `createDispute(input: { bookingId: string; reasonCode: DisputeReason; description: string; evidence: BookingAttachment[] }, nowISO: string): Dispute`, `addEvidence(id, att: BookingAttachment)`.
  - `referralStore`: `code: string`, `history: ReferralRecord[]`, `getHistory(): ReferralRecord[]`.
  - `faqEntries: FaqEntry[]`.

- [ ] **Step 1: Add the entity types to `src/mock/types.ts`**

Append:

```ts
// --- P2c: notifications ---
export type NotifType = 'booking' | 'payment' | 'request' | 'dispute' | 'system' | 'referral' | 'review';
export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string; // ISO
  link?: string; // in-app route to deep-link to
}

// --- P2c: disputes ---
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected';
export type DisputeReason = 'pandit_no_show' | 'puja_incomplete' | 'quality_issue' | 'payment_issue' | 'other';
export type DisputeResolutionType = 'refund_full' | 'refund_partial' | 'redo' | 'declined';
export interface DisputeActivity {
  from: 'you' | 'admin';
  text: string;
  at: string; // ISO
}
export interface Dispute {
  id: string;
  bookingId: string;
  reasonCode: DisputeReason;
  description: string;
  status: DisputeStatus;
  evidence: BookingAttachment[];
  activity: DisputeActivity[];
  timeline: { status: DisputeStatus; at: string }[];
  resolution?: { type: DisputeResolutionType; note: string; refundAmount?: number; resolvedAt: string };
  createdAt: string;
}

// --- P2c: referral ---
export type ReferralType = 'refer_jajman' | 'refer_pandit';
export type ReferralStatus = 'invited' | 'joined' | 'rewarded';
export interface ReferralRecord {
  id: string;
  type: ReferralType;
  inviteeName: string;
  status: ReferralStatus;
  rewardNote?: string;
  createdAt: string; // ISO
}

// --- P2c: FAQ (static) ---
export interface FaqEntry {
  id: string;
  topic: string;
  question: string;
  answer: string;
}
```

- [ ] **Step 2: Add seeds to `src/mock/seed.ts`**

Add to the type import at the top of the file (extend the existing `import type { ... } from './types';` line) these names: `AppNotification, Dispute, ReferralRecord`.

Append:

```ts
export const seedNotifications: AppNotification[] = [
  { id: 'ntf-1', type: 'booking', title: 'Booking accepted', body: 'Pandit Ramesh Sharma accepted your Satyanarayan Katha.', read: false, createdAt: '2026-06-18T10:00:00.000Z', link: '/app/booking/bkg-demo-2' },
  { id: 'ntf-2', type: 'payment', title: 'Advance paid', body: 'Your advance of ₹344 was received.', read: false, createdAt: '2026-06-18T10:05:00.000Z', link: '/app/booking/bkg-demo-2' },
  { id: 'ntf-3', type: 'request', title: 'Request awaiting response', body: 'Your Maha Mrityunjaya Jaap request expires in 24h.', read: true, createdAt: '2026-06-20T08:00:00.000Z', link: '/app/booking/bkg-demo-3' },
  { id: 'ntf-4', type: 'review', title: 'Rate your pandit', body: 'How was your Ganesh Puja with Pandit Anil Shastri?', read: true, createdAt: '2026-05-02T18:00:00.000Z', link: '/app/booking/bkg-demo-4/rate' },
  { id: 'ntf-5', type: 'referral', title: 'Refer & earn', body: 'Invite friends and earn rewards (coming soon).', read: true, createdAt: '2026-04-30T09:00:00.000Z', link: '/app/referral' },
];

export const seedDisputes: Dispute[] = [
  {
    id: 'dsp-1', bookingId: 'bkg-demo-1', reasonCode: 'puja_incomplete',
    description: 'Some rituals from the agreed scope were skipped during the puja.',
    status: 'under_review', evidence: [{ id: 'ev-1', kind: 'image', name: 'photo-1.jpg' }],
    activity: [{ from: 'admin', text: 'We are reviewing your dispute and have contacted the pandit.', at: '2026-06-12T09:00:00.000Z' }],
    timeline: [
      { status: 'open', at: '2026-06-11T09:00:00.000Z' },
      { status: 'under_review', at: '2026-06-12T09:00:00.000Z' },
    ],
    createdAt: '2026-06-11T09:00:00.000Z',
  },
  {
    id: 'dsp-2', bookingId: 'bkg-demo-4', reasonCode: 'payment_issue',
    description: 'I was charged the remaining amount twice.',
    status: 'resolved', evidence: [],
    activity: [{ from: 'admin', text: 'Confirmed a duplicate charge; a partial refund has been issued.', at: '2026-05-06T09:00:00.000Z' }],
    timeline: [
      { status: 'open', at: '2026-05-04T09:00:00.000Z' },
      { status: 'under_review', at: '2026-05-05T09:00:00.000Z' },
      { status: 'resolved', at: '2026-05-06T09:00:00.000Z' },
    ],
    resolution: { type: 'refund_partial', note: 'Duplicate charge refunded.', refundAmount: 1110, resolvedAt: '2026-05-06T09:00:00.000Z' },
    createdAt: '2026-05-04T09:00:00.000Z',
  },
];

export const referralCode = 'SURAJ2026';
export const seedReferrals: ReferralRecord[] = [
  { id: 'ref-1', type: 'refer_jajman', inviteeName: 'Ananya G.', status: 'joined', createdAt: '2026-05-20T09:00:00.000Z' },
  { id: 'ref-2', type: 'refer_pandit', inviteeName: 'Pandit Keshav', status: 'invited', createdAt: '2026-06-01T09:00:00.000Z' },
  { id: 'ref-3', type: 'refer_jajman', inviteeName: 'Ravi M.', status: 'rewarded', rewardNote: '₹100 wallet credit', createdAt: '2026-04-15T09:00:00.000Z' },
];
```

- [ ] **Step 3: Create `src/mock/faq.ts`**

```ts
import type { FaqEntry } from './types';

export const faqEntries: FaqEntry[] = [
  { id: 'faq-1', topic: 'Booking', question: 'How do I book a pandit?', answer: 'Open a pandit profile, tap Book, then choose the puja, date, address, and confirm. You pay a small advance to confirm.' },
  { id: 'faq-2', topic: 'Booking', question: 'Can I book for an urgent same-day puja?', answer: 'Yes — use “Urgent booking” on the Home screen. An emergency surcharge applies and eligibility depends on the time window.' },
  { id: 'faq-3', topic: 'Payments', question: 'How much advance do I pay?', answer: 'The advance is 30% of the estimated total. The remaining amount is paid after the puja is completed.' },
  { id: 'faq-4', topic: 'Payments', question: 'How do refunds work if I cancel?', answer: 'Jajman-initiated cancellations are refunded minus a 5% platform cut on the amount paid. Pandit-initiated cancellations are refunded in full.' },
  { id: 'faq-5', topic: 'Disputes', question: 'What if something goes wrong?', answer: 'Open the booking and choose “Raise dispute”. Add a reason and evidence; our team reviews it and proposes a resolution.' },
  { id: 'faq-6', topic: 'Account', question: 'How do I change my language or theme?', answer: 'Go to Profile → Language for app language, and Profile → Settings → Appearance for light/dark theme.' },
];
```

- [ ] **Step 4: Write the failing store tests**

`src/store/notificationStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from './notificationStore';
import { seedNotifications } from '../mock/seed';

beforeEach(() => useNotificationStore.setState({ notifications: seedNotifications }));

describe('notificationStore', () => {
  it('unreadCount counts unread notifications', () => {
    expect(useNotificationStore.getState().unreadCount()).toBe(2);
  });
  it('markRead marks one read', () => {
    useNotificationStore.getState().markRead('ntf-1');
    expect(useNotificationStore.getState().unreadCount()).toBe(1);
  });
  it('markAllRead clears the unread count', () => {
    useNotificationStore.getState().markAllRead();
    expect(useNotificationStore.getState().unreadCount()).toBe(0);
  });
  it('getNotifications returns newest first', () => {
    const list = useNotificationStore.getState().getNotifications();
    expect(list[0].createdAt >= list[list.length - 1].createdAt).toBe(true);
  });
});
```

`src/store/disputeStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useDisputeStore } from './disputeStore';
import { seedDisputes } from '../mock/seed';

beforeEach(() => useDisputeStore.setState({ disputes: seedDisputes }));

describe('disputeStore', () => {
  it('createDispute adds an open dispute with a timeline entry', () => {
    const d = useDisputeStore.getState().createDispute(
      { bookingId: 'bkg-demo-3', reasonCode: 'pandit_no_show', description: 'No-show', evidence: [] },
      '2026-06-21T09:00:00.000Z',
    );
    expect(d.status).toBe('open');
    expect(d.timeline[0]).toEqual({ status: 'open', at: '2026-06-21T09:00:00.000Z' });
    expect(useDisputeStore.getState().getDispute(d.id)).toBeDefined();
  });
  it('addEvidence appends an attachment', () => {
    useDisputeStore.getState().addEvidence('dsp-1', { id: 'ev-x', kind: 'doc', name: 'receipt.pdf' });
    expect(useDisputeStore.getState().getDispute('dsp-1')!.evidence).toHaveLength(2);
  });
  it('getDisputes returns newest first', () => {
    const list = useDisputeStore.getState().getDisputes();
    expect(list[0].createdAt >= list[list.length - 1].createdAt).toBe(true);
  });
});
```

`src/store/referralStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useReferralStore } from './referralStore';
import { seedReferrals, referralCode } from '../mock/seed';

beforeEach(() => useReferralStore.setState({ code: referralCode, history: seedReferrals }));

describe('referralStore', () => {
  it('exposes the referral code', () => {
    expect(useReferralStore.getState().code).toBe('SURAJ2026');
  });
  it('getHistory returns the referral records', () => {
    expect(useReferralStore.getState().getHistory()).toHaveLength(3);
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npm test -- notificationStore disputeStore referralStore`
Expected: FAIL — the three store modules don't exist yet.

- [ ] **Step 6: Implement `src/store/notificationStore.ts`**

```ts
import { create } from 'zustand';
import type { AppNotification } from '../mock/types';
import { seedNotifications } from '../mock/seed';

interface NotificationState {
  notifications: AppNotification[];
  getNotifications: () => AppNotification[];
  unreadCount: () => number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: seedNotifications,
  getNotifications: () => [...get().notifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
  markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
}));
```

- [ ] **Step 7: Implement `src/store/disputeStore.ts`**

```ts
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { BookingAttachment, Dispute, DisputeReason } from '../mock/types';
import { seedDisputes } from '../mock/seed';

interface CreateDisputeInput {
  bookingId: string;
  reasonCode: DisputeReason;
  description: string;
  evidence: BookingAttachment[];
}

interface DisputeState {
  disputes: Dispute[];
  getDisputes: () => Dispute[];
  getDispute: (id: string) => Dispute | undefined;
  createDispute: (input: CreateDisputeInput, nowISO: string) => Dispute;
  addEvidence: (id: string, att: BookingAttachment) => void;
}

export const useDisputeStore = create<DisputeState>((set, get) => ({
  disputes: seedDisputes,
  getDisputes: () => [...get().disputes].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  getDispute: (id) => get().disputes.find((d) => d.id === id),
  createDispute: (input, nowISO) => {
    const dispute: Dispute = {
      id: `dsp-${nanoid(6)}`,
      bookingId: input.bookingId,
      reasonCode: input.reasonCode,
      description: input.description,
      status: 'open',
      evidence: input.evidence,
      activity: [],
      timeline: [{ status: 'open', at: nowISO }],
      createdAt: nowISO,
    };
    set((s) => ({ disputes: [dispute, ...s.disputes] }));
    return dispute;
  },
  addEvidence: (id, att) =>
    set((s) => ({ disputes: s.disputes.map((d) => (d.id === id ? { ...d, evidence: [...d.evidence, att] } : d)) })),
}));
```

- [ ] **Step 8: Implement `src/store/referralStore.ts`**

```ts
import { create } from 'zustand';
import type { ReferralRecord } from '../mock/types';
import { seedReferrals, referralCode } from '../mock/seed';

interface ReferralState {
  code: string;
  history: ReferralRecord[];
  getHistory: () => ReferralRecord[];
}

export const useReferralStore = create<ReferralState>((_set, get) => ({
  code: referralCode,
  history: seedReferrals,
  getHistory: () => get().history,
}));
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npm test -- notificationStore disputeStore referralStore`
Expected: PASS.

- [ ] **Step 10: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add -A
git commit -m "feat: notification/dispute/referral entities, seeds, stores + FAQ data"
```

---

### Task 3: Components — NotificationRow, DisputeListItem, DisputeStepper, ReferralHistoryRow

**Files:**
- Create: `src/components/comms/NotificationRow.tsx`
- Create: `src/components/comms/DisputeListItem.tsx`
- Create: `src/components/comms/DisputeStepper.tsx`
- Create: `src/components/comms/ReferralHistoryRow.tsx`
- Create: `src/lib/disputeLabels.ts`
- Test: `src/components/comms/comms-components.test.tsx`

**Interfaces:**
- Consumes: `Card`, `Badge` (existing UI); `AppNotification`, `Dispute`, `ReferralRecord`, `DisputeReason`, `DisputeStatus` (types).
- Produces: `NotificationRow({ n, onClick })`; `DisputeListItem({ dispute, bookingRef, onClick })`; `DisputeStepper({ status })`; `ReferralHistoryRow({ record })`; `REASON_LABEL: Record<DisputeReason,string>`, `DISPUTE_STATUS_LABEL: Record<DisputeStatus,string>`, `DISPUTE_STATUS_TONE: Record<DisputeStatus,string>`.

- [ ] **Step 1: Create `src/lib/disputeLabels.ts`**

```ts
import type { DisputeReason, DisputeStatus } from '../mock/types';

export const REASON_LABEL: Record<DisputeReason, string> = {
  pandit_no_show: "Pandit didn't arrive",
  puja_incomplete: 'Puja incomplete',
  quality_issue: 'Quality issue',
  payment_issue: 'Payment issue',
  other: 'Other',
};

export const DISPUTE_STATUS_LABEL: Record<DisputeStatus, string> = {
  open: 'Open',
  under_review: 'Under review',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

export const DISPUTE_STATUS_TONE: Record<DisputeStatus, string> = {
  open: 'bg-warning/15 text-warning',
  under_review: 'bg-info/10 text-info',
  resolved: 'bg-success/10 text-success',
  rejected: 'bg-error/10 text-error',
};
```

- [ ] **Step 2: Create `src/components/comms/NotificationRow.tsx`**

```tsx
import { CalendarCheck, CreditCard, Clock, ShieldAlert, Bell, Gift, Star, type LucideIcon } from 'lucide-react';
import type { AppNotification, NotifType } from '../../mock/types';

const ICON: Record<NotifType, LucideIcon> = {
  booking: CalendarCheck,
  payment: CreditCard,
  request: Clock,
  dispute: ShieldAlert,
  system: Bell,
  referral: Gift,
  review: Star,
};

export function NotificationRow({ n, onClick }: { n: AppNotification; onClick: () => void }) {
  const Icon = ICON[n.type];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left last:border-0"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-primary">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-sm ${n.read ? 'font-medium' : 'font-semibold'}`}>{n.title}</span>
          {!n.read && <span aria-label="Unread" className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </span>
        <span className="block text-xs text-muted">{n.body}</span>
        <span className="mt-0.5 block text-[11px] text-muted">{n.createdAt.slice(0, 10)}</span>
      </span>
    </button>
  );
}
```

- [ ] **Step 3: Create `src/components/comms/DisputeListItem.tsx`**

```tsx
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Dispute } from '../../mock/types';
import { REASON_LABEL, DISPUTE_STATUS_LABEL, DISPUTE_STATUS_TONE } from '../../lib/disputeLabels';

export function DisputeListItem({ dispute, bookingRef, onClick }: { dispute: Dispute; bookingRef: string; onClick: () => void }) {
  return (
    <Card onClick={onClick} className="flex cursor-pointer items-center justify-between gap-2 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{REASON_LABEL[dispute.reasonCode]}</p>
        <p className="truncate text-xs text-muted">{bookingRef} · {dispute.createdAt.slice(0, 10)}</p>
      </div>
      <Badge className={DISPUTE_STATUS_TONE[dispute.status]}>{DISPUTE_STATUS_LABEL[dispute.status]}</Badge>
    </Card>
  );
}
```

- [ ] **Step 4: Create `src/components/comms/DisputeStepper.tsx`**

```tsx
import { Check } from 'lucide-react';
import type { DisputeStatus } from '../../mock/types';
import { cn } from '../../lib/cn';

const STEPS: { key: DisputeStatus; label: string }[] = [
  { key: 'open', label: 'Raised' },
  { key: 'under_review', label: 'Under admin review' },
  { key: 'resolved', label: 'Resolved' },
];
const ORDER = STEPS.map((s) => s.key);

export function DisputeStepper({ status }: { status: DisputeStatus }) {
  if (status === 'rejected') {
    return <div className="rounded-md bg-error/10 px-3 py-2 text-sm font-medium text-error">Dispute rejected</div>;
  }
  const currentIdx = ORDER.indexOf(status);
  const reached = (i: number) => currentIdx >= 0 && i <= currentIdx;
  return (
    <ol className="flex flex-col gap-0">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[10px]', reached(i) ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-muted')}>
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

- [ ] **Step 5: Create `src/components/comms/ReferralHistoryRow.tsx`**

```tsx
import { Badge } from '../ui/Badge';
import type { ReferralRecord, ReferralStatus } from '../../mock/types';

const STATUS_LABEL: Record<ReferralStatus, string> = { invited: 'Invited', joined: 'Joined', rewarded: 'Rewarded' };
const STATUS_TONE: Record<ReferralStatus, string> = {
  invited: 'bg-surface-2 text-muted',
  joined: 'bg-info/10 text-info',
  rewarded: 'bg-success/10 text-success',
};

export function ReferralHistoryRow({ record }: { record: ReferralRecord }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{record.inviteeName}</p>
        <p className="text-xs text-muted">{record.type === 'refer_pandit' ? 'Pandit' : 'Jajman'}{record.rewardNote ? ` · ${record.rewardNote}` : ''}</p>
      </div>
      <Badge className={STATUS_TONE[record.status]}>{STATUS_LABEL[record.status]}</Badge>
    </div>
  );
}
```

- [ ] **Step 6: Write the test** — `src/components/comms/comms-components.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationRow } from './NotificationRow';
import { DisputeListItem } from './DisputeListItem';
import { DisputeStepper } from './DisputeStepper';
import { ReferralHistoryRow } from './ReferralHistoryRow';
import type { AppNotification, Dispute, ReferralRecord } from '../../mock/types';

const notif: AppNotification = { id: 'n1', type: 'booking', title: 'Booking accepted', body: 'Accepted.', read: false, createdAt: '2026-06-18T10:00:00.000Z' };
const dispute: Dispute = { id: 'd1', bookingId: 'b1', reasonCode: 'puja_incomplete', description: 'x', status: 'under_review', evidence: [], activity: [], timeline: [], createdAt: '2026-06-11T09:00:00.000Z' };
const ref: ReferralRecord = { id: 'r1', type: 'refer_jajman', inviteeName: 'Ananya G.', status: 'rewarded', rewardNote: '₹100', createdAt: '2026-04-15T09:00:00.000Z' };

describe('comms components', () => {
  it('NotificationRow shows title + unread dot and fires onClick', () => {
    const onClick = vi.fn();
    render(<NotificationRow n={notif} onClick={onClick} />);
    expect(screen.getByText('Booking accepted')).toBeInTheDocument();
    expect(screen.getByLabelText('Unread')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Booking accepted'));
    expect(onClick).toHaveBeenCalled();
  });
  it('DisputeListItem shows reason + status', () => {
    render(<DisputeListItem dispute={dispute} bookingRef="bkg-demo-1" onClick={() => {}} />);
    expect(screen.getByText('Puja incomplete')).toBeInTheDocument();
    expect(screen.getByText('Under review')).toBeInTheDocument();
  });
  it('DisputeStepper renders the review step as reached', () => {
    render(<DisputeStepper status="under_review" />);
    expect(screen.getByText('Under admin review')).toBeInTheDocument();
  });
  it('ReferralHistoryRow shows invitee + reward', () => {
    render(<ReferralHistoryRow record={ref} />);
    expect(screen.getByText('Ananya G.')).toBeInTheDocument();
    expect(screen.getByText('Rewarded')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test -- comms-components`
Expected: PASS — 4 assertions green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: comms components (NotificationRow, DisputeListItem, DisputeStepper, ReferralHistoryRow) + labels"
```

---

### Task 4: Notifications center screen + Home bell + route

**Files:**
- Create: `src/screens/jajman/comms/NotificationsScreen.tsx`
- Modify: `src/screens/jajman/HomeScreen.tsx` (add the global notifications bell)
- Modify: `src/app/router.tsx` (`/app/notifications`)
- Test: `src/screens/jajman/comms/NotificationsScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `NotificationRow`; `notificationStore` (`getNotifications`, `unreadCount`, `markRead`, `markAllRead`).
- Produces: `NotificationsScreen`. Home gains a bell button → `/app/notifications` with an unread badge.

- [ ] **Step 1: Create `src/screens/jajman/comms/NotificationsScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { BellOff } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { NotificationRow } from '../../../components/comms/NotificationRow';
import { useNotificationStore } from '../../../store/notificationStore';

export function NotificationsScreen() {
  const navigate = useNavigate();
  const notifications = useNotificationStore(useShallow((s) => s.getNotifications()));
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const open = (id: string, link?: string) => {
    markRead(id);
    if (link) navigate(link);
  };

  return (
    <>
      <AppBar
        title="Notifications"
        left={<BackButton />}
        right={<button type="button" onClick={markAllRead} className="px-2 text-xs font-medium text-primary">Mark all read</button>}
      />
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <BellOff size={36} className="text-muted" />
            <p className="text-sm text-muted">You’re all caught up.</p>
          </div>
        ) : (
          notifications.map((n) => <NotificationRow key={n.id} n={n} onClick={() => open(n.id, n.link)} />)
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Add the notifications bell to `src/screens/jajman/HomeScreen.tsx`**

Add `Bell` to the lucide import (it currently imports `Moon, Sun`):

```tsx
import { Moon, Sun, Bell } from 'lucide-react';
```

Add the notification store import alongside the others:

```tsx
import { useNotificationStore } from '../../store/notificationStore';
```

Inside `HomeScreen`, add the unread selector near the other hooks:

```tsx
  const unread = useNotificationStore((s) => s.unreadCount());
```

Replace the AppBar `right={...}` (currently just the theme-toggle button) with a cluster containing the bell + the existing theme toggle:

```tsx
        right={
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => navigate('/app/notifications')}
              aria-label="Notifications"
              className="relative p-2 text-muted"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-fg">
                  {unread}
                </span>
              )}
            </button>
            <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className="p-2 text-muted">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        }
```

- [ ] **Step 3: Wire the route in `src/app/router.tsx`**

Add the import:

```tsx
import { NotificationsScreen } from '../screens/jajman/comms/NotificationsScreen';
```

In the `AppPlainLayout` children array, add:

```tsx
      { path: '/app/notifications', element: <NotificationsScreen /> },
```

- [ ] **Step 4: Write the test** — `src/screens/jajman/comms/NotificationsScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationsScreen } from './NotificationsScreen';
import { useNotificationStore } from '../../../store/notificationStore';
import { seedNotifications } from '../../../mock/seed';

beforeEach(() => useNotificationStore.setState({ notifications: seedNotifications }));

describe('NotificationsScreen', () => {
  it('lists notifications and clears unread on Mark all read', () => {
    render(<MemoryRouter><NotificationsScreen /></MemoryRouter>);
    expect(screen.getByText('Booking accepted')).toBeInTheDocument();
    expect(useNotificationStore.getState().unreadCount()).toBe(2);
    fireEvent.click(screen.getByText('Mark all read'));
    expect(useNotificationStore.getState().unreadCount()).toBe(0);
  });
});
```

- [ ] **Step 5: Run the test, then the full suite**

Run: `npm test -- NotificationsScreen HomeScreen`
Expected: PASS (HomeScreen's existing tests still pass with the new bell).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Notifications center + global Home bell with unread badge"
```

---

### Task 5: Disputes — list + detail screens + routes

**Files:**
- Create: `src/screens/jajman/comms/DisputesListScreen.tsx`
- Create: `src/screens/jajman/comms/DisputeDetailScreen.tsx`
- Modify: `src/app/router.tsx` (`/app/disputes`, `/app/disputes/:disputeId`)
- Test: `src/screens/jajman/comms/DisputesListScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Card`, `Button`, `Badge`, `DisputeListItem`, `DisputeStepper`, `REASON_LABEL`/`DISPUTE_STATUS_*`; `disputeStore` (`getDisputes`, `getDispute`, `addEvidence`); `dataStore` (`getPuja`), `bookingStore` (`getBooking`).
- Produces: `DisputesListScreen`, `DisputeDetailScreen`.

- [ ] **Step 1: Create `src/screens/jajman/comms/DisputesListScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { ShieldCheck } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { DisputeListItem } from '../../../components/comms/DisputeListItem';
import { useDisputeStore } from '../../../store/disputeStore';

export function DisputesListScreen() {
  const navigate = useNavigate();
  const disputes = useDisputeStore(useShallow((s) => s.getDisputes()));

  return (
    <>
      <AppBar title="Disputes" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        {disputes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <ShieldCheck size={36} className="text-muted" />
            <p className="text-sm text-muted">No disputes — we hope it stays that way.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {disputes.map((d) => (
              <DisputeListItem key={d.id} dispute={d} bookingRef={d.bookingId} onClick={() => navigate(`/app/disputes/${d.id}`)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `src/screens/jajman/comms/DisputeDetailScreen.tsx`**

```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { Paperclip } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { DisputeStepper } from '../../../components/comms/DisputeStepper';
import { useDisputeStore } from '../../../store/disputeStore';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';
import { REASON_LABEL } from '../../../lib/disputeLabels';

export function DisputeDetailScreen() {
  const navigate = useNavigate();
  const { disputeId = '' } = useParams();
  const dispute = useDisputeStore((s) => s.getDispute(disputeId));
  const addEvidence = useDisputeStore((s) => s.addEvidence);
  const booking = useBookingStore((s) => s.getBooking(dispute?.bookingId ?? ''));
  const puja = useDataStore((s) => s.getPuja(booking?.pujaId ?? ''));

  if (!dispute) {
    return <><AppBar title="Dispute" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Dispute not found.</div></>;
  }

  return (
    <>
      <AppBar title={`Dispute #${dispute.id.slice(-4)}`} left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="mb-4 p-3">
          <p className="text-sm font-medium">{puja?.name ?? 'Booking'}</p>
          <p className="text-xs text-muted">Reason: {REASON_LABEL[dispute.reasonCode]}</p>
          <p className="mt-1 text-sm">{dispute.description}</p>
          {booking && (
            <button type="button" onClick={() => navigate(`/app/booking/${booking.id}`)} className="mt-2 text-xs font-medium text-primary">View booking</button>
          )}
        </Card>

        <h2 className="mb-2 text-sm font-semibold">Status</h2>
        <DisputeStepper status={dispute.status} />

        {dispute.evidence.length > 0 && (
          <>
            <h2 className="mb-2 mt-5 text-sm font-semibold">Your evidence</h2>
            <div className="flex flex-wrap gap-2">
              {dispute.evidence.map((e) => (
                <span key={e.id} className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs"><Paperclip size={12} /> {e.name}</span>
              ))}
            </div>
          </>
        )}

        {dispute.activity.length > 0 && (
          <>
            <h2 className="mb-2 mt-5 text-sm font-semibold">Activity</h2>
            <div className="flex flex-col gap-2">
              {dispute.activity.map((a, i) => (
                <div key={i} className="rounded-md border border-border bg-surface p-3 text-sm">
                  <p className="text-xs font-medium text-muted">{a.from === 'admin' ? 'Support team' : 'You'} · {a.at.slice(0, 10)}</p>
                  <p>{a.text}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {dispute.resolution && (
          <div className="mt-5 rounded-md border border-success/30 bg-success/5 p-3">
            <p className="text-sm font-semibold text-success">Resolved</p>
            <p className="text-sm">{dispute.resolution.note}</p>
            {dispute.resolution.refundAmount != null && <p className="mt-1 text-sm">Refund: ₹{dispute.resolution.refundAmount}</p>}
          </div>
        )}

        {(dispute.status === 'open' || dispute.status === 'under_review') && (
          <Button
            variant="outline"
            className="mt-5 w-full"
            onClick={() => addEvidence(dispute.id, { id: `ev-${nanoid(5)}`, kind: 'image', name: `evidence-${dispute.evidence.length + 1}.jpg` })}
          >
            <Paperclip size={16} /> Add more evidence (mock)
          </Button>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Wire the routes in `src/app/router.tsx`**

Add imports:

```tsx
import { DisputesListScreen } from '../screens/jajman/comms/DisputesListScreen';
import { DisputeDetailScreen } from '../screens/jajman/comms/DisputeDetailScreen';
```

In the `AppPlainLayout` children array, add:

```tsx
      { path: '/app/disputes', element: <DisputesListScreen /> },
      { path: '/app/disputes/:disputeId', element: <DisputeDetailScreen /> },
```

- [ ] **Step 4: Write the test** — `src/screens/jajman/comms/DisputesListScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DisputesListScreen } from './DisputesListScreen';
import { useDisputeStore } from '../../../store/disputeStore';
import { seedDisputes } from '../../../mock/seed';

beforeEach(() => useDisputeStore.setState({ disputes: seedDisputes }));

describe('DisputesListScreen', () => {
  it('lists seeded disputes with reason + status', () => {
    render(<MemoryRouter><DisputesListScreen /></MemoryRouter>);
    expect(screen.getByText('Puja incomplete')).toBeInTheDocument();
    expect(screen.getByText('Payment issue')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- DisputesListScreen`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Disputes list + detail screens (stepper, evidence, activity, resolution)"
```

---

### Task 6: Raise dispute screen + Booking-detail entry

**Files:**
- Create: `src/screens/jajman/comms/RaiseDisputeScreen.tsx`
- Modify: `src/screens/jajman/booking/BookingDetailScreen.tsx` (add a "Raise dispute" action)
- Modify: `src/app/router.tsx` (`/app/booking/:bookingId/dispute/new`)
- Test: `src/screens/jajman/comms/RaiseDisputeScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Button`, `Chip`, `Card`; `disputeStore.createDispute`, `bookingStore.getBooking`, `dataStore.getPuja`; `REASON_LABEL`.
- Produces: `RaiseDisputeScreen`. Booking detail gains an entry to `/app/booking/:bookingId/dispute/new`.

- [ ] **Step 1: Create `src/screens/jajman/comms/RaiseDisputeScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { Image, FileText, X } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { Card } from '../../../components/ui/Card';
import { useDisputeStore } from '../../../store/disputeStore';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';
import { REASON_LABEL } from '../../../lib/disputeLabels';
import type { BookingAttachment, DisputeReason } from '../../../mock/types';

const REASONS: DisputeReason[] = ['pandit_no_show', 'puja_incomplete', 'quality_issue', 'payment_issue', 'other'];

export function RaiseDisputeScreen() {
  const navigate = useNavigate();
  const { bookingId = '' } = useParams();
  const booking = useBookingStore((s) => s.getBooking(bookingId));
  const puja = useDataStore((s) => s.getPuja(booking?.pujaId ?? ''));
  const createDispute = useDisputeStore((s) => s.createDispute);

  const [reason, setReason] = useState<DisputeReason | null>(null);
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<BookingAttachment[]>([]);

  const addEvidence = (kind: 'image' | 'doc') =>
    setEvidence((e) => [...e, { id: `ev-${nanoid(5)}`, kind, name: kind === 'image' ? `photo-${e.length + 1}.jpg` : `doc-${e.length + 1}.pdf` }]);

  const valid = reason !== null && description.trim().length > 0;

  const submit = () => {
    if (!valid || !booking) return;
    const d = createDispute({ bookingId: booking.id, reasonCode: reason, description: description.trim(), evidence }, new Date().toISOString());
    navigate(`/app/disputes/${d.id}`, { replace: true });
  };

  if (!booking) {
    return <><AppBar title="Raise Dispute" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Booking not found.</div></>;
  }

  return (
    <>
      <AppBar title="Raise Dispute" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="mb-4 p-3">
          <p className="text-sm font-medium">{puja?.name ?? 'Booking'}</p>
          <p className="text-xs text-muted">{booking.slotLabel} · {booking.id}</p>
        </Card>

        <h2 className="mb-2 text-sm font-semibold">What went wrong?</h2>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <Chip key={r} label={REASON_LABEL[r]} selected={reason === r} onClick={() => setReason(r)} />
          ))}
        </div>

        <h2 className="mb-2 mt-5 text-sm font-semibold">Describe the issue</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Description"
          rows={4}
          placeholder="Tell us what happened…"
          className="w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-primary"
        />

        <h2 className="mb-2 mt-5 text-sm font-semibold">Evidence (optional)</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => addEvidence('image')} className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border py-3 text-sm"><Image size={16} /> Add photo</button>
          <button type="button" onClick={() => addEvidence('doc')} className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border py-3 text-sm"><FileText size={16} /> Add document</button>
        </div>
        {evidence.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {evidence.map((a) => (
              <span key={a.id} className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs">
                {a.name}
                <button type="button" aria-label={`Remove ${a.name}`} onClick={() => setEvidence((e) => e.filter((x) => x.id !== a.id))}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={!valid} onClick={submit}>Submit dispute</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Add the "Raise dispute" entry to `src/screens/jajman/booking/BookingDetailScreen.tsx`**

First read the file to find where its action buttons / overflow render and how it reads the booking (`const booking = ...`). Add a "Raise dispute" affordance visible for bookings that are far enough along to dispute — `scheduled`, `in_progress`, `completed`, or `rated`. Add this button into the screen's action area (place it near the existing actions; if actions are in a footer/`border-t` block, add it there; otherwise add a bordered section before the closing fragment):

```tsx
{['scheduled', 'in_progress', 'completed', 'rated'].includes(booking.status) && (
  <button
    type="button"
    onClick={() => navigate(`/app/booking/${booking.id}/dispute/new`)}
    className="mt-3 w-full rounded-md border border-error/30 px-3 py-2 text-sm font-medium text-error"
  >
    Raise a dispute
  </button>
)}
```

Use the screen's existing `navigate` and `booking` bindings (the file already calls `useNavigate()` and resolves `booking`). Do not duplicate those declarations. If the file lacks a `navigate`, add `const navigate = useNavigate();` using the existing `react-router-dom` import.

- [ ] **Step 3: Wire the route in `src/app/router.tsx`**

Add the import:

```tsx
import { RaiseDisputeScreen } from '../screens/jajman/comms/RaiseDisputeScreen';
```

In the `AppPlainLayout` children array, add (place it near the other `/app/booking/:bookingId/*` routes):

```tsx
      { path: '/app/booking/:bookingId/dispute/new', element: <RaiseDisputeScreen /> },
```

- [ ] **Step 4: Write the test** — `src/screens/jajman/comms/RaiseDisputeScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RaiseDisputeScreen } from './RaiseDisputeScreen';
import { useBookingStore } from '../../../store/bookingStore';
import { useDisputeStore } from '../../../store/disputeStore';
import { useDataStore } from '../../../store/dataStore';
import { seedBookings, seedDisputes, seedCategories, seedPujas, seedPandits, seedReviews } from '../../../mock/seed';

beforeEach(() => {
  useBookingStore.setState({ bookings: seedBookings });
  useDisputeStore.setState({ disputes: seedDisputes });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/booking/:bookingId/dispute/new" element={<RaiseDisputeScreen />} />
        <Route path="/app/disputes/:disputeId" element={<div>Dispute detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RaiseDisputeScreen', () => {
  it('requires a reason + description, then creates a dispute', () => {
    renderAt('/app/booking/bkg-demo-1/dispute/new');
    const before = useDisputeStore.getState().disputes.length;
    fireEvent.click(screen.getByText('Puja incomplete'));
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Rituals were skipped.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit dispute' }));
    expect(useDisputeStore.getState().disputes.length).toBe(before + 1);
    expect(screen.getByText('Dispute detail')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- RaiseDisputeScreen`
Expected: PASS.

- [ ] **Step 6: Run the full suite (BookingDetail change is cross-cutting)**

Run: `npm test`
Expected: PASS — existing booking-detail tests still green with the added button.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Raise dispute screen + booking-detail entry"
```

---

### Task 7: Referral program screen + route

**Files:**
- Create: `src/screens/jajman/comms/ReferralScreen.tsx`
- Modify: `src/app/router.tsx` (`/app/referral`)
- Test: `src/screens/jajman/comms/ReferralScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Card`, `Button`, `SegmentedControl`, `ReferralHistoryRow`; `referralStore` (`code`, `getHistory`).
- Produces: `ReferralScreen`.

- [ ] **Step 1: Create `src/screens/jajman/comms/ReferralScreen.tsx`**

```tsx
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Gift, Copy, Check } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { ReferralHistoryRow } from '../../../components/comms/ReferralHistoryRow';
import { useReferralStore } from '../../../store/referralStore';
import type { ReferralType } from '../../../mock/types';

export function ReferralScreen() {
  const code = useReferralStore((s) => s.code);
  const history = useReferralStore(useShallow((s) => s.getHistory()));
  const [tab, setTab] = useState<ReferralType>('refer_jajman');
  const [copied, setCopied] = useState(false);

  const copy = () => {
    try { navigator.clipboard?.writeText(code); } catch { /* mock */ }
    setCopied(true);
  };

  return (
    <>
      <AppBar title="Refer & Earn" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-lg bg-secondary/10 p-4 text-center">
          <Gift size={28} className="mx-auto text-secondary" />
          <h2 className="mt-2 font-semibold">Invite friends, earn rewards</h2>
          <p className="text-sm text-muted">Share Pandit Seva with family and friends.</p>
        </div>

        <SegmentedControl<ReferralType>
          segments={[{ value: 'refer_jajman', label: 'Refer a Jajman' }, { value: 'refer_pandit', label: 'Refer a Pandit' }]}
          value={tab}
          onChange={setTab}
        />

        <h2 className="mb-1 mt-5 text-sm font-semibold">Your code</h2>
        <Card className="flex items-center justify-between p-3">
          <span className="font-mono text-lg font-semibold tracking-wide">{code}</span>
          <Button variant="outline" onClick={copy}>{copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}</Button>
        </Card>
        <p className="mt-2 text-xs text-muted">
          {tab === 'refer_pandit' ? 'Invite a pandit to offer their services.' : 'Invite a friend to book pujas.'}
        </p>

        <div className="mt-4 rounded-md border border-dashed border-border p-3 text-center text-xs text-muted">
          Rewards (wallet credit / cashback) — coming soon.
        </div>

        <h2 className="mb-1 mt-5 text-sm font-semibold">Your referrals</h2>
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No referrals yet.</p>
        ) : (
          <div className="rounded-md border border-border bg-surface px-3">
            {history.map((r) => <ReferralHistoryRow key={r.id} record={r} />)}
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
import { ReferralScreen } from '../screens/jajman/comms/ReferralScreen';
```

In the `AppPlainLayout` children array, add:

```tsx
      { path: '/app/referral', element: <ReferralScreen /> },
```

- [ ] **Step 3: Write the test** — `src/screens/jajman/comms/ReferralScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReferralScreen } from './ReferralScreen';
import { useReferralStore } from '../../../store/referralStore';
import { seedReferrals, referralCode } from '../../../mock/seed';

beforeEach(() => useReferralStore.setState({ code: referralCode, history: seedReferrals }));

describe('ReferralScreen', () => {
  it('shows the code and referral history, and copy gives feedback', () => {
    render(<MemoryRouter><ReferralScreen /></MemoryRouter>);
    expect(screen.getByText('SURAJ2026')).toBeInTheDocument();
    expect(screen.getByText('Ananya G.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Copy/ }));
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });
});
```

> The test environment's clipboard may be undefined; the screen's `try/catch` guard keeps copy working (feedback shows regardless).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- ReferralScreen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Referral (Refer & Earn) screen"
```

---

### Task 8: Help / Support screen + route

**Files:**
- Create: `src/screens/jajman/comms/HelpScreen.tsx`
- Modify: `src/app/router.tsx` (`/app/help`)
- Test: `src/screens/jajman/comms/HelpScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Button`, `BottomSheet`, `TextField`; `faqEntries`.
- Produces: `HelpScreen`.

- [ ] **Step 1: Create `src/screens/jajman/comms/HelpScreen.tsx`**

```tsx
import { useState } from 'react';
import { ChevronDown, Search, LifeBuoy } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { TextField } from '../../../components/ui/TextField';
import { faqEntries } from '../../../mock/faq';

export function HelpScreen() {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const q = query.trim().toLowerCase();
  const results = q ? faqEntries.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)) : faqEntries;

  return (
    <>
      <AppBar title="Help & support" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <label className="flex h-11 items-center gap-2 rounded-md bg-surface-2 px-3 text-sm">
          <Search size={18} className="text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search FAQs" placeholder="Search help…" className="w-full bg-transparent outline-none placeholder:text-muted" />
        </label>

        <div className="mt-4 overflow-hidden rounded-md border border-border bg-surface">
          {results.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted">No results — try contacting support below.</p>
          ) : (
            results.map((f) => (
              <div key={f.id} className="border-b border-border last:border-0">
                <button type="button" onClick={() => setOpenId(openId === f.id ? null : f.id)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium">
                  <span className="flex-1">{f.question}</span>
                  <ChevronDown size={16} className={`shrink-0 text-muted transition ${openId === f.id ? 'rotate-180' : ''}`} />
                </button>
                {openId === f.id && <p className="px-4 pb-3 text-sm text-muted">{f.answer}</p>}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 rounded-md bg-surface-2 p-4 text-center">
          <LifeBuoy size={24} className="mx-auto text-primary" />
          <p className="mt-1 text-sm font-medium">Still need help?</p>
          <Button className="mt-2" onClick={() => { setSubmitted(false); setTicketOpen(true); }}>Contact support</Button>
        </div>
      </div>

      <BottomSheet open={ticketOpen} onClose={() => setTicketOpen(false)} title="Contact support">
        {submitted ? (
          <div className="py-6 text-center">
            <p className="text-sm font-medium">Ticket #1234 created (demo)</p>
            <p className="mt-1 text-xs text-muted">Our team will get back to you shortly.</p>
            <Button className="mt-4" onClick={() => setTicketOpen(false)}>Done</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <TextField label="Subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <div>
              <span className="mb-1 block text-sm font-medium">Message</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Message" rows={4} className="w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-primary" />
            </div>
            <Button disabled={!subject.trim() || !message.trim()} onClick={() => setSubmitted(true)}>Submit ticket</Button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
```

- [ ] **Step 2: Wire the route in `src/app/router.tsx`**

Add the import:

```tsx
import { HelpScreen } from '../screens/jajman/comms/HelpScreen';
```

In the `AppPlainLayout` children array, add:

```tsx
      { path: '/app/help', element: <HelpScreen /> },
```

- [ ] **Step 3: Write the test** — `src/screens/jajman/comms/HelpScreen.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelpScreen } from './HelpScreen';

describe('HelpScreen', () => {
  it('filters FAQs by search', () => {
    render(<MemoryRouter><HelpScreen /></MemoryRouter>);
    expect(screen.getByText('How do I book a pandit?')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search FAQs'), { target: { value: 'refund' } });
    expect(screen.getByText('How do refunds work if I cancel?')).toBeInTheDocument();
    expect(screen.queryByText('How do I book a pandit?')).not.toBeInTheDocument();
  });

  it('submits a mock support ticket', () => {
    render(<MemoryRouter><HelpScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Contact support' }));
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Cannot pay' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Payment fails at the last step.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit ticket' }));
    expect(screen.getByText('Ticket #1234 created (demo)')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- HelpScreen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Help & support screen (FAQ search + mock ticket)"
```

---

### Task 9: Profile hub wiring (un-"Soon") + integration walkthrough + P2c gate

**Files:**
- Modify: `src/screens/jajman/ProfileScreen.tsx` (replace disabled rows with real routes; add Notifications row)
- Test: `src/app/comms-flow.test.tsx`

**Interfaces:**
- Consumes: every screen + route from Tasks 4–8.

- [ ] **Step 1: Update the Profile hub menu in `src/screens/jajman/ProfileScreen.tsx`**

In the `items` array, change the three disabled rows so they navigate, and add a Notifications row. Replace these entries:

```tsx
    { icon: Gift, label: 'Referral', badge: 'Soon', disabled: true },
    { icon: ShieldAlert, label: 'Disputes', badge: 'Soon', disabled: true },
    { icon: LifeBuoy, label: 'Help & Support', badge: 'Soon', disabled: true },
```

with:

```tsx
    { icon: Bell, label: 'Notifications', to: '/app/notifications' },
    { icon: Gift, label: 'Referral', to: '/app/referral' },
    { icon: ShieldAlert, label: 'Disputes', to: '/app/disputes' },
    { icon: LifeBuoy, label: 'Help & Support', to: '/app/help' },
```

Add `Bell` to the existing lucide-react import in this file (it already imports `Gift, ShieldAlert, LifeBuoy`, etc.):

```tsx
import { /* …existing… */ Bell } from 'lucide-react';
```

> The `badge`/`disabled` fields are optional on `MenuItem`, so omitting them is fine. No other change to the rendering loop is needed.

- [ ] **Step 2: Write the integration walkthrough** — `src/app/comms-flow.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { useNotificationStore } from '../store/notificationStore';
import { useDisputeStore } from '../store/disputeStore';
import { seedNotifications } from '../mock/seed';
import { seedDisputes } from '../mock/seed';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useNotificationStore.setState({ notifications: seedNotifications });
  useDisputeStore.setState({ disputes: seedDisputes });
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('comms flow (integration)', () => {
  it('Profile → Disputes shows the seeded disputes', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/profile'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByText('Disputes'));
    expect(screen.getByText('Puja incomplete')).toBeInTheDocument();
  });

  it('Notifications center marks all read', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/notifications'] });
    render(<RouterProvider router={router} />);
    expect(useNotificationStore.getState().unreadCount()).toBe(2);
    fireEvent.click(screen.getByText('Mark all read'));
    expect(useNotificationStore.getState().unreadCount()).toBe(0);
  });

  it('Profile → Referral shows the code', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/profile'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByText('Referral'));
    expect(screen.getByText('SURAJ2026')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the full suite + typecheck + build (P2c gate)**

Run: `npm test`
Expected: PASS — all suites green including the new `comms-components`, `notificationStore`, `disputeStore`, `referralStore`, `NotificationsScreen`, `DisputesListScreen`, `RaiseDisputeScreen`, `ReferralScreen`, `HelpScreen`, and `comms-flow`.

Run: `npm run typecheck && npm run build`
Expected: both PASS with no errors.

- [ ] **Step 4: Manual look check**

Run: `npm run dev`. Log in (any number → OTP `123456`). Verify:
- Home app bar shows a bell with an unread badge → opens Notifications; "Mark all read" clears the badge.
- Profile hub: Referral, Disputes, Help & Support, and Notifications are now real rows (no "Soon").
- Disputes: list shows seeded disputes; detail shows the stepper, evidence, activity, and a resolution panel (for the resolved one); "Add more evidence" works on open ones.
- A booking detail (scheduled/completed) shows "Raise a dispute" → reason + description + evidence → Submit → lands on the new dispute detail.
- Referral: code copies; history lists; Help: FAQ search filters and "Contact support" submits a mock ticket.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire Profile hub to Notifications/Disputes/Referral/Help (P2c complete)"
```

---

## Self-Review

**Spec coverage (P2c scope = §J Notifications center, §K Referral, §L Disputes, Appendix A Help/Support, + P2b cross-phase deferrals):**
- Notifications center (§J) → Task 4 (`NotificationsScreen`, global Home bell, mark-read / mark-all-read, deep links). ✔
- Referral program (§K) → Task 7 (`ReferralScreen`: hero, Jajman/Pandit segments, copy code, rewards "coming soon", history). ✔ (Share buttons render the segment copy; real share-sheet is a mock — no-op deferred.)
- Disputes list (§L) → Task 5 (`DisputesListScreen`). ✔
- Raise dispute (§L) → Task 6 (`RaiseDisputeScreen` with PRD reason set verbatim + evidence) + booking-detail entry. ✔
- Dispute detail (§L) → Task 5 (`DisputeDetailScreen`: stepper, linked booking, evidence gallery, activity thread, resolution panel, add-evidence). ✔
- Help/Support (Appendix A) → Task 8 (`HelpScreen`: FAQ search + accordion + mock ticket sheet). ✔ (Rendered at `/app/help`; the `/pandit/help` twin lands with the Pandit surface in P3.)
- P2b cross-phase wirings → Task 1 (`phoneShareDefault` → new chat threads; `getDefaultAddress()` → booking draft). ✔
- Profile hub un-"Soon" → Task 9. ✔

**Intentional deferrals (out of P2c scope):** dispute comment composer (activity is seeded/read-only; "Add more evidence" is the only open-state write); real share-sheet and reward fulfilment (visually present, flagged "coming soon" per spec); Today/Earlier grouping on Notifications (rendered newest-first flat with per-row dates to keep tests time-stable); the `/pandit/help` twin route (P3, Pandit surface). None block the P2c deliverables.

**Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". Every code step has complete, compilable code; every command states its expected result. "Coming soon" (rewards) and "(demo)"/"(mock)" labels are intentional product copy per the spec, not plan placeholders. Task 6 Step 2 instructs reading `BookingDetailScreen` before editing because the exact insertion point depends on that file's current action layout — the code to insert is given in full; only its placement is discovered.

**Type consistency:** `AppNotification`/`Dispute`/`ReferralRecord`/`FaqEntry` + their enums (Task 2) are consumed unchanged by the components (Task 3) and screens (Tasks 4–8). Store APIs match across tasks: `notificationStore.{getNotifications,unreadCount,markRead,markAllRead}`, `disputeStore.{getDisputes,getDispute,createDispute,addEvidence}`, `referralStore.{code,getHistory}`. `createDispute(input, nowISO)` is called with `new Date().toISOString()` from the screen (Task 6) and a literal ISO in the store test (Task 2). `REASON_LABEL`/`DISPUTE_STATUS_LABEL`/`DISPUTE_STATUS_TONE` (Task 3, `src/lib/disputeLabels.ts`) are consumed by `DisputeListItem`, `DisputeDetailScreen`, and `RaiseDisputeScreen`. Routes use `/app/*` in the `AppPlainLayout` group throughout; the `MenuItem.badge/disabled` fields (P2b) remain optional so Task 9's row edits typecheck.
