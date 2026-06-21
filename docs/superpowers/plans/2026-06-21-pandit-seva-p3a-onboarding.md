# Pandit Seva — Phase 3a (Pandit Onboarding + /pandit Surface Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Pandit (`/pandit/*`) surface foundation and the full onboarding wizard A1–A9 — a user becomes a pandit via a 5-step wizard (profile → service → pujas incl. custom → documents → availability), submits for admin approval (OQ1 pending), and — via a demo "simulate approval" affordance — reaches a gated Pandit dashboard shell.

**Architecture:** A new `/pandit/*` route group inside `RequireAuth`, with two layouts: `PanditOnboardingLayout` (no tabs; wizard chrome) and `PanditLayout` (with `PanditTabBar`: Dashboard · Requests · Calendar · Earnings · Profile). Onboarding state lives in a new `panditOnboardingStore` (a single in-memory draft + the submitted self-profile snapshot). Gating follows §0.6: the existing `sessionStore.panditStatus` (`none|pending|approved|rejected`) is the single gating source; a `RequirePanditApproved` guard sends pending/rejected pandits to `/pandit/pending-approval` / `/pandit/rejected`. The admin master catalog is the existing `dataStore` `seedPujas`/`seedCategories`. Mode-switch entry comes from the Jajman Profile "Become a Pandit" card (now → `/pandit/onboarding`).

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind 3, zustand 4 (`zustand/react/shallow`), react-router-dom 6, lucide-react, nanoid. Tests: Vitest + RTL + jsdom. No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-06-20-pandit-seva-mobile-ui-design.md` — §0.1 ROUTING (normative), §0.6 PANDIT ROLE ENTITLEMENT (normative), §"SCREEN INVENTORY — PANDIT" A1–A9 (~1501–1632), PanditProfile/SupportedPuja/CustomPuja (~2473), AvailabilitySlot (~2648), OQ1/OQ5.

**Working directory:** all paths relative to `pandit-seva-app/`.

## Global Constraints

- **Routing (§0.1, normative):** Pandit surface base is `/pandit/*`. Dashboard = `/pandit/dashboard` (NOT `/pandit`). Gating screens = `/pandit/pending-approval` and `/pandit/rejected` (NOT `/pandit/onboarding/pending`). Wizard steps = `/pandit/onboarding`, `/pandit/onboarding/profile`, `/service`, `/pujas`, `/pujas/custom`, `/documents`, `/availability`, `/submit`. All inside `RequireAuth`.
- **Gating (§0.6, normative):** onboarding submit adds `'pandit'` to `user.roles` immediately and sets `panditStatus='pending'`. While `panditStatus ∈ {pending,rejected}`, the gated tabs (`/pandit/dashboard`, `/pandit/requests`, `/pandit/calendar`, `/pandit/earnings`) redirect to `/pandit/pending-approval` or `/pandit/rejected`. Onboarding + gating + profile/settings/help screens are NOT gated.
- **Single gating source:** `sessionStore.panditStatus`. The onboarding store's submitted profile mirrors it for display only.
- **Master catalog:** reuse `dataStore` `seedPujas` (as PujaType master: id/name/categoryId/suggestedDurationMins/minAmount/maxAmount) and `seedCategories`. Do NOT create a new master.
- **Demo continuity:** since Admin/P4 doesn't exist, the pending screen carries a clearly-labeled "Simulate admin approval (demo)" button (and a "Simulate rejection (demo)") so the gated surface is reachable.
- **No new dependencies.** Reuse existing primitives: AppBar, BackButton, Button, TextField, Chip, SegmentedControl, Stepper, BottomSheet, Avatar, Card, Badge, AttachmentUploader-style mock adds.
- **Dates:** no `Date.now()`/`new Date()` in store/domain modules; `submit(nowISO)` takes the timestamp. `new Date()` in a screen handler is acceptable.
- **Tests:** strict TDD for the store; build-then-test for screens. Reset stores in `beforeEach`.
- **Commits:** one per task, local only.

---

### Task 1: Pandit onboarding data model + store

**Files:**
- Modify: `src/mock/types.ts` (onboarding + self-profile types)
- Modify: `src/store/sessionStore.ts` (add `setPanditStatus`)
- Create: `src/store/panditOnboardingStore.ts`
- Test: `src/store/panditOnboardingStore.test.ts`, `src/store/sessionStore.test.ts` (extend)

**Interfaces:**
- Produces types: `PanditVerifyState`, `OnboardingSupportedPuja`, `OnboardingCustomPuja`, `OnboardingDoc`, `OnboardingRecurring`, `OnboardingSlot`, `PanditOnboardingDraft`, `PanditSelfProfile`, `emptyOnboardingDraft`.
- `sessionStore.setPanditStatus(s: PanditStatus)`.
- `panditOnboardingStore`: `draft: PanditOnboardingDraft`, `profile: PanditSelfProfile | null`, `resetDraft()`, `patchProfile(p)`, `patchService(p)`, `setStep(n)`, `addSupportedPuja(sp)`, `removeSupportedPuja(pujaId)`, `addCustomPuja(input)`, `removeCustomPuja(id)`, `addDocument(label)`, `removeDocument(id)`, `setRecurring(rec[])`, `addSlot(date,start,end)`, `removeSlot(id)`, `submit(userId, nowISO): PanditSelfProfile`, `simulateApproval()`, `simulateRejection(reason)`.

- [ ] **Step 1: Add types to `src/mock/types.ts`**

```ts
// --- P3a: pandit onboarding ---
export type PanditVerifyState = 'incomplete' | 'pending' | 'approved' | 'rejected';

export interface OnboardingSupportedPuja { pujaId: string; charge: number; durationMins: number; notes?: string; }
export interface OnboardingCustomPuja {
  id: string; name: string; categoryId: string; description: string;
  charge: number; additionalCharge: number; durationMins: number; isCustom: true;
}
export interface OnboardingDoc { id: string; label: string; name: string; }
export interface OnboardingRecurring { weekday: number; start: string; end: string; } // weekday 0=Sun..6=Sat
export interface OnboardingSlot { id: string; date: string; start: string; end: string; }

export interface OnboardingProfile {
  name: string; about: string; experienceYears: number;
  languages: string[]; specializations: string[]; city: string;
}
export interface OnboardingService {
  radiusKm: number; travelPreference: 'within' | 'outside' | 'anywhere';
  chargeForTravel: boolean; baseTravelFee: number; perKmRate: number;
}
export interface PanditOnboardingDraft {
  step: number; // furthest step reached, 0-based across the 5 steps
  profile: OnboardingProfile;
  service: OnboardingService;
  supportedPujas: OnboardingSupportedPuja[];
  customPujas: OnboardingCustomPuja[];
  documents: OnboardingDoc[];
  availability: { recurring: OnboardingRecurring[]; slots: OnboardingSlot[] };
}
export interface PanditSelfProfile {
  userId: string;
  status: PanditVerifyState;
  submittedAt: string;
  rejectionReason?: string;
  profile: OnboardingProfile;
  service: OnboardingService;
  supportedPujas: OnboardingSupportedPuja[];
  customPujas: OnboardingCustomPuja[];
  documents: OnboardingDoc[];
  availability: { recurring: OnboardingRecurring[]; slots: OnboardingSlot[] };
}
```

- [ ] **Step 2: Write failing store tests**

`src/store/panditOnboardingStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { usePanditOnboardingStore } from './panditOnboardingStore';

beforeEach(() => usePanditOnboardingStore.setState(usePanditOnboardingStore.getInitialState()));

describe('panditOnboardingStore', () => {
  it('patchProfile and patchService merge into the draft', () => {
    usePanditOnboardingStore.getState().patchProfile({ name: 'Pandit Test', about: 'x', experienceYears: 5 });
    usePanditOnboardingStore.getState().patchService({ radiusKm: 12 });
    const d = usePanditOnboardingStore.getState().draft;
    expect(d.profile.name).toBe('Pandit Test');
    expect(d.service.radiusKm).toBe(12);
  });

  it('addSupportedPuja replaces an existing entry for the same pujaId (no dupes)', () => {
    const s = usePanditOnboardingStore.getState();
    s.addSupportedPuja({ pujaId: 'puja-ganesh', charge: 800, durationMins: 90 });
    s.addSupportedPuja({ pujaId: 'puja-ganesh', charge: 900, durationMins: 90 });
    const list = usePanditOnboardingStore.getState().draft.supportedPujas;
    expect(list).toHaveLength(1);
    expect(list[0].charge).toBe(900);
  });

  it('addCustomPuja flags isCustom and gets an id; removeCustomPuja drops it', () => {
    const c = usePanditOnboardingStore.getState().addCustomPuja({ name: 'Rudrabhishek', categoryId: 'cat-jaap', description: 'x', charge: 2100, additionalCharge: 500, durationMins: 120 });
    expect(c.isCustom).toBe(true);
    expect(usePanditOnboardingStore.getState().draft.customPujas).toHaveLength(1);
    usePanditOnboardingStore.getState().removeCustomPuja(c.id);
    expect(usePanditOnboardingStore.getState().draft.customPujas).toHaveLength(0);
  });

  it('addSlot/removeSlot manage specific-date slots', () => {
    const slot = usePanditOnboardingStore.getState().addSlot('2026-07-01', '09:00', '12:00');
    expect(usePanditOnboardingStore.getState().draft.availability.slots).toHaveLength(1);
    usePanditOnboardingStore.getState().removeSlot(slot.id);
    expect(usePanditOnboardingStore.getState().draft.availability.slots).toHaveLength(0);
  });

  it('submit produces a pending self-profile snapshot', () => {
    usePanditOnboardingStore.getState().patchProfile({ name: 'Pandit Test' });
    const p = usePanditOnboardingStore.getState().submit('user-1', '2026-06-21T09:00:00.000Z');
    expect(p.status).toBe('pending');
    expect(p.userId).toBe('user-1');
    expect(p.submittedAt).toBe('2026-06-21T09:00:00.000Z');
    expect(usePanditOnboardingStore.getState().profile?.status).toBe('pending');
  });

  it('simulateApproval / simulateRejection update the snapshot status', () => {
    usePanditOnboardingStore.getState().submit('user-1', '2026-06-21T09:00:00.000Z');
    usePanditOnboardingStore.getState().simulateApproval();
    expect(usePanditOnboardingStore.getState().profile?.status).toBe('approved');
    usePanditOnboardingStore.getState().simulateRejection('Incomplete documents');
    expect(usePanditOnboardingStore.getState().profile?.status).toBe('rejected');
    expect(usePanditOnboardingStore.getState().profile?.rejectionReason).toBe('Incomplete documents');
  });
});
```

Append to `src/store/sessionStore.test.ts`:

```ts
describe('setPanditStatus (P3a)', () => {
  beforeEach(() => {
    useSessionStore.setState(useSessionStore.getInitialState());
    useSessionStore.getState().setPendingPhone('9999999999');
    useSessionStore.getState().verifyOtp('123456');
  });
  it('updates panditStatus', () => {
    useSessionStore.getState().setPanditStatus('approved');
    expect(useSessionStore.getState().panditStatus).toBe('approved');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- panditOnboardingStore sessionStore`
Expected: FAIL — store module + `setPanditStatus` missing.

- [ ] **Step 4: Add `setPanditStatus` to `src/store/sessionStore.ts`**

Add to the `SessionState` interface:

```ts
  setPanditStatus: (status: PanditStatus) => void;
```

Add to the store body:

```ts
  setPanditStatus: (panditStatus) => set({ panditStatus }),
```

- [ ] **Step 5: Implement `src/store/panditOnboardingStore.ts`**

```ts
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  PanditOnboardingDraft, PanditSelfProfile, OnboardingProfile, OnboardingService,
  OnboardingSupportedPuja, OnboardingCustomPuja, OnboardingRecurring, OnboardingSlot,
} from '../mock/types';

export const emptyOnboardingDraft: PanditOnboardingDraft = {
  step: 0,
  profile: { name: '', about: '', experienceYears: 5, languages: [], specializations: [], city: '' },
  service: { radiusKm: 10, travelPreference: 'within', chargeForTravel: false, baseTravelFee: 0, perKmRate: 0 },
  supportedPujas: [],
  customPujas: [],
  documents: [],
  availability: { recurring: [], slots: [] },
};

interface CustomInput { name: string; categoryId: string; description: string; charge: number; additionalCharge: number; durationMins: number; }

interface State {
  draft: PanditOnboardingDraft;
  profile: PanditSelfProfile | null;
  resetDraft: () => void;
  patchProfile: (p: Partial<OnboardingProfile>) => void;
  patchService: (p: Partial<OnboardingService>) => void;
  setStep: (n: number) => void;
  addSupportedPuja: (sp: OnboardingSupportedPuja) => void;
  removeSupportedPuja: (pujaId: string) => void;
  addCustomPuja: (input: CustomInput) => OnboardingCustomPuja;
  removeCustomPuja: (id: string) => void;
  addDocument: (label: string) => void;
  removeDocument: (id: string) => void;
  setRecurring: (rec: OnboardingRecurring[]) => void;
  addSlot: (date: string, start: string, end: string) => OnboardingSlot;
  removeSlot: (id: string) => void;
  submit: (userId: string, nowISO: string) => PanditSelfProfile;
  simulateApproval: () => void;
  simulateRejection: (reason: string) => void;
}

// structuredClone-free deep default (avoids shared references across resets)
const freshDraft = (): PanditOnboardingDraft => ({
  step: 0,
  profile: { name: '', about: '', experienceYears: 5, languages: [], specializations: [], city: '' },
  service: { radiusKm: 10, travelPreference: 'within', chargeForTravel: false, baseTravelFee: 0, perKmRate: 0 },
  supportedPujas: [],
  customPujas: [],
  documents: [],
  availability: { recurring: [], slots: [] },
});

export const usePanditOnboardingStore = create<State>((set, get) => ({
  draft: freshDraft(),
  profile: null,
  resetDraft: () => set({ draft: freshDraft() }),
  patchProfile: (p) => set((s) => ({ draft: { ...s.draft, profile: { ...s.draft.profile, ...p } } })),
  patchService: (p) => set((s) => ({ draft: { ...s.draft, service: { ...s.draft.service, ...p } } })),
  setStep: (n) => set((s) => ({ draft: { ...s.draft, step: Math.max(s.draft.step, n) } })),
  addSupportedPuja: (sp) =>
    set((s) => ({
      draft: { ...s.draft, supportedPujas: [...s.draft.supportedPujas.filter((x) => x.pujaId !== sp.pujaId), sp] },
    })),
  removeSupportedPuja: (pujaId) =>
    set((s) => ({ draft: { ...s.draft, supportedPujas: s.draft.supportedPujas.filter((x) => x.pujaId !== pujaId) } })),
  addCustomPuja: (input) => {
    const c: OnboardingCustomPuja = { id: `cust-${nanoid(5)}`, isCustom: true, ...input };
    set((s) => ({ draft: { ...s.draft, customPujas: [...s.draft.customPujas, c] } }));
    return c;
  },
  removeCustomPuja: (id) =>
    set((s) => ({ draft: { ...s.draft, customPujas: s.draft.customPujas.filter((x) => x.id !== id) } })),
  addDocument: (label) =>
    set((s) => ({ draft: { ...s.draft, documents: [...s.draft.documents, { id: `doc-${nanoid(5)}`, label, name: `${label.toLowerCase().replace(/\s+/g, '-')}.pdf` }] } })),
  removeDocument: (id) =>
    set((s) => ({ draft: { ...s.draft, documents: s.draft.documents.filter((d) => d.id !== id) } })),
  setRecurring: (rec) => set((s) => ({ draft: { ...s.draft, availability: { ...s.draft.availability, recurring: rec } } })),
  addSlot: (date, start, end) => {
    const slot: OnboardingSlot = { id: `slot-${nanoid(5)}`, date, start, end };
    set((s) => ({ draft: { ...s.draft, availability: { ...s.draft.availability, slots: [...s.draft.availability.slots, slot] } } }));
    return slot;
  },
  removeSlot: (id) =>
    set((s) => ({ draft: { ...s.draft, availability: { ...s.draft.availability, slots: s.draft.availability.slots.filter((x) => x.id !== id) } } })),
  submit: (userId, nowISO) => {
    const d = get().draft;
    const profile: PanditSelfProfile = {
      userId, status: 'pending', submittedAt: nowISO,
      profile: d.profile, service: d.service, supportedPujas: d.supportedPujas,
      customPujas: d.customPujas, documents: d.documents, availability: d.availability,
    };
    set({ profile });
    return profile;
  },
  simulateApproval: () => set((s) => ({ profile: s.profile ? { ...s.profile, status: 'approved', rejectionReason: undefined } : s.profile })),
  simulateRejection: (reason) => set((s) => ({ profile: s.profile ? { ...s.profile, status: 'rejected', rejectionReason: reason } : s.profile })),
}));
```

> `emptyOnboardingDraft` is exported for any consumer that needs the default shape; the store uses `freshDraft()` internally so resets never share nested references.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- panditOnboardingStore sessionStore`
Expected: PASS.

- [ ] **Step 7: Typecheck + commit**

Run: `npm run typecheck` → PASS.

```bash
git add -A
git commit -m "feat: pandit onboarding data model + panditOnboardingStore + sessionStore.setPanditStatus"
```

---

### Task 2: /pandit layout shell — PanditTabBar, PanditLayout, gating guard, stub Dashboard, RootRedirect gating

**Files:**
- Create: `src/components/shell/PanditTabBar.tsx`
- Create: `src/components/shell/PanditLayout.tsx`
- Create: `src/app/panditGuards.tsx`
- Create: `src/screens/pandit/PanditDashboardScreen.tsx`
- Create: `src/screens/pandit/PendingApprovalScreen.tsx`
- Create: `src/screens/pandit/RejectedScreen.tsx`
- Modify: `src/app/RootRedirect.tsx` (gate pending/rejected per §0.6)
- Modify: `src/app/router.tsx` (add the `/pandit` route group)
- Test: `src/app/panditGuards.test.tsx`

**Interfaces:**
- Consumes: `sessionStore` (`activeRole`, `panditStatus`, `user`, `switchMode`), `panditOnboardingStore` (`profile`, `simulateApproval`, `simulateRejection`).
- Produces: `PanditTabBar`, `PanditLayout` (Outlet + tabs), `RequirePanditApproved` guard, `PanditDashboardScreen` (stub w/ gate banner), `PendingApprovalScreen`, `RejectedScreen`. New routes: `/pandit/dashboard`, `/pandit/pending-approval`, `/pandit/rejected` (+ a `/pandit/requests|calendar|earnings|profile` stub set behind the guard, rendering a "Coming soon" placeholder for now).

- [ ] **Step 1: Create `src/components/shell/PanditTabBar.tsx`**

```tsx
import { LayoutDashboard, Inbox, CalendarDays, Wallet, User, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';

interface Tab { to: string; label: string; icon: LucideIcon; }
export const panditTabs: Tab[] = [
  { to: '/pandit/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pandit/requests', label: 'Requests', icon: Inbox },
  { to: '/pandit/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/pandit/earnings', label: 'Earnings', icon: Wallet },
  { to: '/pandit/profile', label: 'Profile', icon: User },
];

export function PanditTabBar() {
  return (
    <nav aria-label="Pandit navigation" className="flex items-stretch border-t border-border bg-surface">
      {panditTabs.map((t) => {
        const Icon = t.icon;
        return (
          <NavLink key={t.to} to={t.to}
            className={({ isActive }) => cn('flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px]', isActive ? 'text-primary' : 'text-muted')}>
            <Icon size={20} />
            <span>{t.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Create `src/components/shell/PanditLayout.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import { PhoneFrame } from './PhoneFrame';
import { PanditTabBar } from './PanditTabBar';

/** Pandit surface layout: scrollable Outlet + pinned pandit tabs. */
export function PanditLayout() {
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Outlet />
      </div>
      <PanditTabBar />
    </PhoneFrame>
  );
}
```

- [ ] **Step 3: Create `src/app/panditGuards.tsx`** (§0.6)

```tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore';

/** §0.6 — gated pandit tabs require an approved pandit; pending/rejected redirect to the gating screen. */
export function RequirePanditApproved({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.panditStatus);
  if (status === 'approved') return <>{children}</>;
  if (status === 'rejected') return <Navigate to="/pandit/rejected" replace />;
  return <Navigate to="/pandit/pending-approval" replace />;
}
```

- [ ] **Step 4: Create `src/screens/pandit/PanditDashboardScreen.tsx`** (stub with gate banner; full dashboard is P3b)

```tsx
import { AppBar } from '../../components/ui/AppBar';
import { useSessionStore } from '../../store/sessionStore';

export function PanditDashboardScreen() {
  const name = useSessionStore((s) => s.user?.name ?? 'Pandit');
  return (
    <>
      <AppBar title={`Namaste, ${name}`} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-md border border-success/30 bg-success/5 p-4 text-center">
          <p className="font-semibold text-success">You're approved 🎉</p>
          <p className="text-sm text-muted">Your pandit dashboard arrives in the next build phase (P3b).</p>
        </div>
        <p className="mt-6 text-center text-sm text-muted">Dashboard widgets (today's bookings, requests, earnings, ratings) coming soon.</p>
      </div>
    </>
  );
}
```

- [ ] **Step 5: Create `src/screens/pandit/PendingApprovalScreen.tsx`** (A8 pending + demo affordances)

```tsx
import { useNavigate } from 'react-router-dom';
import { Hourglass } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { Button } from '../../components/ui/Button';
import { useSessionStore } from '../../store/sessionStore';
import { usePanditOnboardingStore } from '../../store/panditOnboardingStore';

export function PendingApprovalScreen() {
  const navigate = useNavigate();
  const profile = usePanditOnboardingStore((s) => s.profile);
  const simulateApproval = usePanditOnboardingStore((s) => s.simulateApproval);
  const simulateRejection = usePanditOnboardingStore((s) => s.simulateRejection);
  const setPanditStatus = useSessionStore((s) => s.setPanditStatus);

  const approve = () => { simulateApproval(); setPanditStatus('approved'); navigate('/pandit/dashboard', { replace: true }); };
  const reject = () => { simulateRejection('Please add a clearer ID document and complete your bio.'); setPanditStatus('rejected'); navigate('/pandit/rejected', { replace: true }); };

  return (
    <>
      <AppBar title="Application status" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <Hourglass size={44} className="text-warning" />
        <h1 className="text-lg font-semibold">Pending admin approval</h1>
        <p className="text-sm text-muted">Admin usually reviews within 24 hours.{profile?.submittedAt ? ` Submitted ${profile.submittedAt.slice(0, 10)}.` : ''}</p>
        <Button className="mt-2 w-full" onClick={() => navigate('/pandit/onboarding/profile')} variant="outline">Edit submission</Button>
        <div className="mt-6 w-full rounded-md border border-dashed border-border p-3">
          <p className="mb-2 text-xs text-muted">Demo controls (Admin surface lands in P4)</p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={approve}>Simulate approval</Button>
            <Button className="flex-1" variant="outline" onClick={reject}>Simulate rejection</Button>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 6: Create `src/screens/pandit/RejectedScreen.tsx`** (A9 rejected variant)

```tsx
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { usePanditOnboardingStore } from '../../store/panditOnboardingStore';

export function RejectedScreen() {
  const navigate = useNavigate();
  const profile = usePanditOnboardingStore((s) => s.profile);
  return (
    <>
      <AppBar title="Application status" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertTriangle size={44} className="text-error" />
        <h1 className="text-lg font-semibold">Application needs changes</h1>
        <Card className="w-full p-3 text-left">
          <p className="text-xs font-medium text-muted">Reason</p>
          <p className="text-sm">{profile?.rejectionReason ?? 'Please review your submission and resubmit.'}</p>
        </Card>
        <Button className="mt-2 w-full" onClick={() => navigate('/pandit/onboarding/profile')}>Edit & resubmit</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 7: Update `src/app/RootRedirect.tsx`** for §0.6 gating

Replace the pandit branch (`if (activeRole === 'pandit') return <Navigate to="/pandit/dashboard" replace />;`) with status-aware routing. Add a `panditStatus` selector and:

```tsx
  const panditStatus = useSessionStore((s) => s.panditStatus);
  // …existing authed/admin checks…
  if (activeRole === 'pandit') {
    if (panditStatus === 'approved') return <Navigate to="/pandit/dashboard" replace />;
    if (panditStatus === 'rejected') return <Navigate to="/pandit/rejected" replace />;
    return <Navigate to="/pandit/pending-approval" replace />;
  }
```

- [ ] **Step 8: Wire the `/pandit` route group in `src/app/router.tsx`**

Add imports:

```tsx
import { PanditLayout } from '../components/shell/PanditLayout';
import { RequirePanditApproved } from './panditGuards';
import { PanditDashboardScreen } from '../screens/pandit/PanditDashboardScreen';
import { PendingApprovalScreen } from '../screens/pandit/PendingApprovalScreen';
import { RejectedScreen } from '../screens/pandit/RejectedScreen';
import { NotFound } from '../screens/shared/NotFound';
```

> `NotFound` is already imported in router.tsx — do not duplicate. It's listed here only because the stub tabs reuse it.

Add a new route group AFTER the Jajman `AppPlainLayout` group and before the `*` catch-all. The gating screens render inside `PanditLayout` (tabs visible) but are NOT behind `RequirePanditApproved`; the gated tabs are wrapped per-tab:

```tsx
  {
    element: (
      <RequireAuth>
        <PanditLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/pandit/pending-approval', element: <PendingApprovalScreen /> },
      { path: '/pandit/rejected', element: <RejectedScreen /> },
      { path: '/pandit/dashboard', element: <RequirePanditApproved><PanditDashboardScreen /></RequirePanditApproved> },
      { path: '/pandit/requests', element: <RequirePanditApproved><PanditStub title="Requests" /></RequirePanditApproved> },
      { path: '/pandit/calendar', element: <RequirePanditApproved><PanditStub title="Calendar" /></RequirePanditApproved> },
      { path: '/pandit/earnings', element: <RequirePanditApproved><PanditStub title="Earnings" /></RequirePanditApproved> },
      { path: '/pandit/profile', element: <PanditStub title="Pandit profile" /> },
    ],
  },
```

Add a tiny local stub component at the bottom of `router.tsx` (above `export const router`):

```tsx
function PanditStub({ title }: { title: string }) {
  return (
    <>
      <AppBar title={title} />
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted">{title} arrives in a later P3 phase.</div>
    </>
  );
}
```

Add the `AppBar` import to router.tsx if not present:

```tsx
import { AppBar } from '../components/ui/AppBar';
```

- [ ] **Step 9: Write the guard test** — `src/app/panditGuards.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
  useSessionStore.getState().becomePandit(); // roles += pandit, status pending
  useSessionStore.getState().switchMode('pandit');
});

describe('pandit gating (§0.6)', () => {
  it('pending pandit visiting the dashboard is redirected to pending-approval', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/dashboard'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByText('Pending admin approval')).toBeInTheDocument();
  });

  it('approved pandit reaches the dashboard', () => {
    useSessionStore.getState().setPanditStatus('approved');
    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/dashboard'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByText(/You're approved/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Run the test, full suite, typecheck**

Run: `npm test -- panditGuards`
Expected: PASS.
Run: `npm test && npm run typecheck`
Expected: PASS (existing suites unaffected).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: /pandit layout shell (PanditTabBar, PanditLayout), §0.6 gating guard + RootRedirect, stub dashboard/pending/rejected"
```

---

### Task 3: Onboarding wizard chrome — A1 intro + OnboardingLayout + wizard routes + Jajman entry rewire

**Files:**
- Create: `src/components/shell/PanditOnboardingLayout.tsx`
- Create: `src/screens/pandit/onboarding/OnboardingIntroScreen.tsx`
- Modify: `src/screens/jajman/ProfileScreen.tsx` (mode-card "Become a Pandit" → `/pandit/onboarding`)
- Modify: `src/screens/jajman/comms/` — none. (the P2b `/app/become-pandit` screen stays but is no longer linked; note it.)
- Modify: `src/app/router.tsx` (onboarding routes under PanditOnboardingLayout)
- Test: `src/screens/pandit/onboarding/OnboardingIntroScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Button`, `Stepper`; `panditOnboardingStore` (`resetDraft`, `draft.step`).
- Produces: `PanditOnboardingLayout` (PhoneFrame + Outlet, NO tabs), `OnboardingIntroScreen`. Wizard routes nested under the layout.

- [ ] **Step 1: Create `src/components/shell/PanditOnboardingLayout.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import { PhoneFrame } from './PhoneFrame';

/** Onboarding wizard layout: no bottom tabs; children own the scroll + sticky footer. */
export function PanditOnboardingLayout() {
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </PhoneFrame>
  );
}
```

- [ ] **Step 2: Create `src/screens/pandit/onboarding/OnboardingIntroScreen.tsx`** (A1)

```tsx
import { useNavigate } from 'react-router-dom';
import { Inbox, IndianRupee, Wallet } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';

export function OnboardingIntroScreen() {
  const navigate = useNavigate();
  const resetDraft = usePanditOnboardingStore((s) => s.resetDraft);
  const start = () => { resetDraft(); navigate('/pandit/onboarding/profile'); };

  return (
    <>
      <AppBar title="Become a Pandit" left={<BackButton to="/app/profile" />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-lg bg-gradient-to-b from-[#f6c66b]/30 to-[#e8801a]/10 p-6 text-center">
          <div className="text-3xl">🪔</div>
          <h1 className="mt-2 text-lg font-bold">Offer your seva to families near you</h1>
        </div>
        <ul className="mt-4 flex flex-col gap-3">
          <li className="flex items-center gap-3 text-sm"><Inbox size={18} className="shrink-0 text-primary" /> Get booking requests from nearby jajmans</li>
          <li className="flex items-center gap-3 text-sm"><IndianRupee size={18} className="shrink-0 text-primary" /> Set your own charges per puja</li>
          <li className="flex items-center gap-3 text-sm"><Wallet size={18} className="shrink-0 text-primary" /> Withdraw your earnings anytime</li>
        </ul>
        <div className="mt-5 flex items-center justify-between rounded-md bg-surface-2 p-3 text-xs text-muted">
          <span>Profile</span><span>→</span><span>Pujas</span><span>→</span><span>Availability</span><span>→</span><span>Approval</span>
        </div>
        <p className="mt-3 text-center text-xs text-muted">Admin verifies every pandit before you go live.</p>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" onClick={start}>Get started</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Repoint the Jajman "Become a Pandit" entry in `src/screens/jajman/ProfileScreen.tsx`**

In the mode-switcher card, change the not-pandit branch button target from `/app/become-pandit` to `/pandit/onboarding`:

```tsx
            <Button variant="outline" onClick={() => navigate('/pandit/onboarding')}>Become a Pandit</Button>
```

> The P2b `/app/become-pandit` screen remains routed but is no longer linked from the Profile hub — it is superseded by the real wizard. Leave it in place (harmless); a future cleanup may remove it.

- [ ] **Step 4: Wire onboarding routes in `src/app/router.tsx`**

Add imports:

```tsx
import { PanditOnboardingLayout } from '../components/shell/PanditOnboardingLayout';
import { OnboardingIntroScreen } from '../screens/pandit/onboarding/OnboardingIntroScreen';
```

Add a route group (inside `RequireAuth`) — the intro + the wizard steps created in later tasks all nest here. For this task, register the layout with the intro; later tasks append sibling children:

```tsx
  {
    element: (
      <RequireAuth>
        <PanditOnboardingLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/pandit/onboarding', element: <OnboardingIntroScreen /> },
      // Task 4: /pandit/onboarding/profile, /service
      // Task 5: /pandit/onboarding/pujas, /pujas/custom
      // Task 6: /pandit/onboarding/documents, /availability
      // Task 7: /pandit/onboarding/submit
    ],
  },
```

- [ ] **Step 5: Write the test** — `src/screens/pandit/onboarding/OnboardingIntroScreen.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingIntroScreen } from './OnboardingIntroScreen';

describe('OnboardingIntroScreen', () => {
  it('shows the value props and a Get started CTA', () => {
    render(<MemoryRouter><OnboardingIntroScreen /></MemoryRouter>);
    expect(screen.getByText('Offer your seva to families near you')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get started' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test + full suite**

Run: `npm test -- OnboardingIntroScreen`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: pandit onboarding layout + A1 intro + Jajman 'Become a Pandit' entry rewire"
```

---

### Task 4: A2 Profile setup + A3 Service configuration

**Files:**
- Create: `src/screens/pandit/onboarding/OnbProfileScreen.tsx`
- Create: `src/screens/pandit/onboarding/OnbServiceScreen.tsx`
- Modify: `src/app/router.tsx` (2 routes)
- Test: `src/screens/pandit/onboarding/OnbProfileScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Button`, `TextField`, `Chip`, `Stepper`, `SegmentedControl`, `Avatar`; `panditOnboardingStore` (`draft`, `patchProfile`, `patchService`, `setStep`).
- Produces: `OnbProfileScreen`, `OnbServiceScreen`.

- [ ] **Step 1: Create `src/screens/pandit/onboarding/OnbProfileScreen.tsx`** (A2)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { Chip } from '../../../components/ui/Chip';
import { Stepper } from '../../../components/ui/Stepper';
import { Avatar } from '../../../components/ui/Avatar';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';

const LANGS = ['Hindi', 'Sanskrit', 'English', 'Marathi'];
const SPECS = ['Katha', 'Jaap', 'Marriage', 'Griha Pravesh', 'Festival Puja', 'Shradh', 'Temple Rituals'];

export function OnbProfileScreen() {
  const navigate = useNavigate();
  const draft = usePanditOnboardingStore((s) => s.draft);
  const patchProfile = usePanditOnboardingStore((s) => s.patchProfile);
  const setStep = usePanditOnboardingStore((s) => s.setStep);

  const [name, setName] = useState(draft.profile.name);
  const [about, setAbout] = useState(draft.profile.about);
  const [exp, setExp] = useState(draft.profile.experienceYears);
  const [langs, setLangs] = useState<string[]>(draft.profile.languages);
  const [specs, setSpecs] = useState<string[]>(draft.profile.specializations);
  const [city, setCity] = useState(draft.profile.city);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const valid = name.trim() && about.trim().length >= 10 && langs.length > 0 && specs.length > 0 && city.trim();

  const next = () => {
    patchProfile({ name: name.trim(), about: about.trim(), experienceYears: exp, languages: langs, specializations: specs, city: city.trim() });
    setStep(1);
    navigate('/pandit/onboarding/service');
  };

  return (
    <>
      <AppBar title="Your profile" left={<BackButton to="/pandit/onboarding" />} right={<Stepper total={5} current={0} />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex flex-col items-center gap-2">
          <Avatar name={name || 'Pandit'} size={72} />
          <button type="button" className="text-xs font-medium text-primary">Add a photo (mock)</button>
        </div>
        <div className="flex flex-col gap-3">
          <TextField label="Display name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <span className="mb-1 block text-sm font-medium">About you</span>
            <textarea value={about} onChange={(e) => setAbout(e.target.value)} aria-label="About" rows={3} maxLength={500}
              placeholder="Your experience, traditions you specialise in…" className="w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-primary" />
          </div>
          <TextField label="Years of experience" name="experience" inputMode="numeric" value={String(exp)} onChange={(e) => setExp(Number(e.target.value.replace(/\D/g, '')) || 0)} />
          <div>
            <span className="mb-1 block text-sm font-medium">Languages</span>
            <div className="flex flex-wrap gap-2">{LANGS.map((l) => <Chip key={l} label={l} selected={langs.includes(l)} onClick={() => toggle(langs, setLangs, l)} />)}</div>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium">Specializations</span>
            <div className="flex flex-wrap gap-2">{SPECS.map((s) => <Chip key={s} label={s} selected={specs.includes(s)} onClick={() => toggle(specs, setSpecs, s)} />)}</div>
          </div>
          <TextField label="City" name="city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={!valid} onClick={next}>Save & continue</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `src/screens/pandit/onboarding/OnbServiceScreen.tsx`** (A3)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { Stepper } from '../../../components/ui/Stepper';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { ToggleRow } from '../../../components/ui/ToggleRow';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';
import type { OnboardingService } from '../../../mock/types';

type Pref = OnboardingService['travelPreference'];

export function OnbServiceScreen() {
  const navigate = useNavigate();
  const draft = usePanditOnboardingStore((s) => s.draft);
  const patchService = usePanditOnboardingStore((s) => s.patchService);
  const setStep = usePanditOnboardingStore((s) => s.setStep);

  const [radius, setRadius] = useState(draft.service.radiusKm);
  const [pref, setPref] = useState<Pref>(draft.service.travelPreference);
  const [charge, setCharge] = useState(draft.service.chargeForTravel);
  const [baseFee, setBaseFee] = useState(draft.service.baseTravelFee);
  const [perKm, setPerKm] = useState(draft.service.perKmRate);

  const valid = radius > 0 && (!charge || (baseFee >= 0 && perKm >= 0));
  const next = () => {
    patchService({ radiusKm: radius, travelPreference: pref, chargeForTravel: charge, baseTravelFee: baseFee, perKmRate: perKm });
    setStep(2);
    navigate('/pandit/onboarding/pujas');
  };

  return (
    <>
      <AppBar title="Service area" left={<BackButton to="/pandit/onboarding/profile" />} right={<Stepper total={5} current={1} />} />
      <div className="flex-1 overflow-y-auto p-4">
        <label className="block text-sm font-medium">Service radius: <span className="text-primary">{radius} km</span></label>
        <input type="range" min={1} max={50} value={radius} onChange={(e) => setRadius(Number(e.target.value))} aria-label="Service radius" className="mt-2 w-full accent-[var(--color-primary)]" />
        <div className="mt-2 flex items-center justify-center rounded-md border border-dashed border-border bg-surface-2 py-8 text-xs text-muted">🗺️ Service area (mock)</div>

        <span className="mb-1 mt-5 block text-sm font-medium">Travel preference</span>
        <SegmentedControl<Pref>
          segments={[{ value: 'within', label: 'Within' }, { value: 'outside', label: 'Outside' }, { value: 'anywhere', label: 'Anywhere' }]}
          value={pref} onChange={setPref} />

        <div className="mt-5 rounded-md border border-border bg-surface px-3">
          <ToggleRow label="Charge for travel" checked={charge} onChange={setCharge} />
        </div>
        {charge && (
          <div className="mt-3 flex flex-col gap-3">
            <TextField label="Base travel fee (₹)" name="baseFee" inputMode="numeric" value={String(baseFee)} onChange={(e) => setBaseFee(Number(e.target.value.replace(/\D/g, '')) || 0)} />
            <TextField label="Per-km rate (₹)" name="perKm" inputMode="numeric" value={String(perKm)} onChange={(e) => setPerKm(Number(e.target.value.replace(/\D/g, '')) || 0)} />
            <p className="text-xs text-muted">Final travel charge is confirmed at booking acceptance.</p>
          </div>
        )}
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={!valid} onClick={next}>Save & continue</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Wire routes in `src/app/router.tsx`**

Add imports + insert into the `PanditOnboardingLayout` children (after the intro route):

```tsx
import { OnbProfileScreen } from '../screens/pandit/onboarding/OnbProfileScreen';
import { OnbServiceScreen } from '../screens/pandit/onboarding/OnbServiceScreen';
```
```tsx
      { path: '/pandit/onboarding/profile', element: <OnbProfileScreen /> },
      { path: '/pandit/onboarding/service', element: <OnbServiceScreen /> },
```

- [ ] **Step 4: Write the test** — `src/screens/pandit/onboarding/OnbProfileScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnbProfileScreen } from './OnbProfileScreen';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';

beforeEach(() => usePanditOnboardingStore.setState(usePanditOnboardingStore.getInitialState()));

describe('OnbProfileScreen', () => {
  it('disables continue until required fields are valid, then saves to the draft', () => {
    render(<MemoryRouter><OnbProfileScreen /></MemoryRouter>);
    const cta = screen.getByRole('button', { name: 'Save & continue' });
    expect(cta).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Pandit Ramesh' } });
    fireEvent.change(screen.getByLabelText('About'), { target: { value: 'Vedic scholar with experience.' } });
    fireEvent.click(screen.getByText('Hindi'));
    fireEvent.click(screen.getByText('Katha'));
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Pune' } });
    expect(cta).not.toBeDisabled();
    fireEvent.click(cta);
    expect(usePanditOnboardingStore.getState().draft.profile.name).toBe('Pandit Ramesh');
    expect(usePanditOnboardingStore.getState().draft.profile.languages).toContain('Hindi');
  });
});
```

- [ ] **Step 5: Run the test + full suite**

Run: `npm test -- OnbProfileScreen`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: pandit onboarding A2 profile + A3 service-area screens"
```

---

### Task 5: A4 Add supported pujas + A4a charge sheet + A5 custom puja

**Files:**
- Create: `src/screens/pandit/onboarding/OnbPujasScreen.tsx`
- Create: `src/screens/pandit/onboarding/PujaChargeSheet.tsx`
- Create: `src/screens/pandit/onboarding/OnbCustomPujaScreen.tsx`
- Modify: `src/app/router.tsx` (2 routes)
- Test: `src/screens/pandit/onboarding/OnbPujasScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Button`, `TextField`, `Badge`, `BottomSheet`, `Stepper`, `Card`; `dataStore` (`pujas`, `categories`, `getCategory`), `panditOnboardingStore` (`draft`, `addSupportedPuja`, `removeSupportedPuja`, `addCustomPuja`, `removeCustomPuja`, `setStep`).
- Produces: `OnbPujasScreen`, `PujaChargeSheet`, `OnbCustomPujaScreen`.

- [ ] **Step 1: Create `src/screens/pandit/onboarding/PujaChargeSheet.tsx`** (A4a)

```tsx
import { useState } from 'react';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import type { Puja } from '../../../mock/types';

export function PujaChargeSheet({ puja, open, onClose, onAdd }: { puja: Puja | null; open: boolean; onClose: () => void; onAdd: (charge: number, durationMins: number) => void }) {
  const [charge, setCharge] = useState('');
  const [duration, setDuration] = useState('');
  if (!puja) return null;
  const chargeNum = Number(charge) || 0;
  const out = chargeNum > 0 && (chargeNum < puja.minAmount || chargeNum > puja.maxAmount);
  return (
    <BottomSheet open={open} onClose={onClose} title={puja.name}>
      <p className="mb-3 text-xs text-muted">Suggested: {puja.suggestedDurationMins} min · ₹{puja.minAmount}–₹{puja.maxAmount}</p>
      <div className="flex flex-col gap-3">
        <TextField label="Your charge (₹)" name="charge" inputMode="numeric" value={charge} onChange={(e) => setCharge(e.target.value.replace(/\D/g, ''))} placeholder={String(puja.minAmount)} />
        {out && <p className="-mt-2 text-xs text-warning">Below/above suggested range — admin may review.</p>}
        <TextField label="Duration (min)" name="duration" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ''))} placeholder={String(puja.suggestedDurationMins)} />
        <Button disabled={chargeNum <= 0} onClick={() => onAdd(chargeNum, Number(duration) || puja.suggestedDurationMins)}>Add this puja</Button>
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Create `src/screens/pandit/onboarding/OnbPujasScreen.tsx`** (A4)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Plus, Check } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Stepper } from '../../../components/ui/Stepper';
import { PujaChargeSheet } from './PujaChargeSheet';
import { useDataStore } from '../../../store/dataStore';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';
import type { Puja } from '../../../mock/types';

export function OnbPujasScreen() {
  const navigate = useNavigate();
  const pujas = useDataStore((s) => s.pujas);
  const draft = usePanditOnboardingStore(useShallow((s) => s.draft));
  const addSupportedPuja = usePanditOnboardingStore((s) => s.addSupportedPuja);
  const removeSupportedPuja = usePanditOnboardingStore((s) => s.removeSupportedPuja);
  const removeCustomPuja = usePanditOnboardingStore((s) => s.removeCustomPuja);
  const setStep = usePanditOnboardingStore((s) => s.setStep);
  const [sheetPuja, setSheetPuja] = useState<Puja | null>(null);

  const isSelected = (id: string) => draft.supportedPujas.some((sp) => sp.pujaId === id);
  const totalSelected = draft.supportedPujas.length + draft.customPujas.length;

  const next = () => { setStep(3); navigate('/pandit/onboarding/documents'); };

  return (
    <>
      <AppBar title="Your pujas" left={<BackButton to="/pandit/onboarding/service" />} right={<Stepper total={5} current={2} />} />
      <div className="flex-1 overflow-y-auto p-4">
        {totalSelected > 0 && <Badge className="mb-3 bg-primary/10 text-primary">Selected ({totalSelected})</Badge>}

        <div className="flex flex-col gap-2">
          {pujas.map((p) => {
            const selected = isSelected(p.id);
            return (
              <Card key={p.id} className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted">{p.suggestedDurationMins} min · ₹{p.minAmount}–₹{p.maxAmount}</p>
                </div>
                {selected ? (
                  <Button variant="outline" onClick={() => removeSupportedPuja(p.id)}><Check size={16} /> Added</Button>
                ) : (
                  <Button variant="outline" onClick={() => setSheetPuja(p)}><Plus size={16} /> Add</Button>
                )}
              </Card>
            );
          })}

          {draft.customPujas.map((c) => (
            <Card key={c.id} className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate text-sm font-medium">{c.name} <Badge className="bg-secondary/10 text-secondary">Custom</Badge></p>
                <p className="text-xs text-muted">₹{c.charge}{c.additionalCharge ? ` + ₹${c.additionalCharge}` : ''} · {c.durationMins} min</p>
              </div>
              <Button variant="outline" onClick={() => removeCustomPuja(c.id)}>Remove</Button>
            </Card>
          ))}
        </div>

        <Button variant="outline" className="mt-4 w-full" onClick={() => navigate('/pandit/onboarding/pujas/custom')}><Plus size={16} /> Create custom puja</Button>
      </div>

      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={totalSelected === 0} onClick={next}>Save & continue</Button>
      </div>

      <PujaChargeSheet
        puja={sheetPuja}
        open={sheetPuja !== null}
        onClose={() => setSheetPuja(null)}
        onAdd={(charge, durationMins) => { if (sheetPuja) addSupportedPuja({ pujaId: sheetPuja.id, charge, durationMins }); setSheetPuja(null); }}
      />
    </>
  );
}
```

- [ ] **Step 3: Create `src/screens/pandit/onboarding/OnbCustomPujaScreen.tsx`** (A5)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { TextField } from '../../../components/ui/TextField';
import { useDataStore } from '../../../store/dataStore';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';

export function OnbCustomPujaScreen() {
  const navigate = useNavigate();
  const categories = useDataStore((s) => s.categories);
  const addCustomPuja = usePanditOnboardingStore((s) => s.addCustomPuja);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [charge, setCharge] = useState('');
  const [add, setAdd] = useState('');
  const [duration, setDuration] = useState('');

  const chargeNum = Number(charge) || 0;
  const valid = name.trim() && chargeNum > 0;
  const total = chargeNum + (Number(add) || 0);

  const submit = () => {
    addCustomPuja({ name: name.trim(), categoryId, description: description.trim(), charge: chargeNum, additionalCharge: Number(add) || 0, durationMins: Number(duration) || 60 });
    navigate('/pandit/onboarding/pujas');
  };

  return (
    <>
      <AppBar title="Create custom puja" left={<BackButton to="/pandit/onboarding/pujas" />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-md bg-secondary/10 p-3 text-center">
          <Badge className="bg-secondary/15 text-secondary">Custom puja</Badge>
          <p className="mt-1 text-xs text-muted">Additional charges apply and are shown to jajmans at booking.</p>
        </div>
        <div className="flex flex-col gap-3">
          <TextField label="Puja name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <span className="mb-1 block text-sm font-medium">Category</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category" className="h-12 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Description" rows={3} className="w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-primary" />
          </div>
          <TextField label="Base charge (₹)" name="charge" inputMode="numeric" value={charge} onChange={(e) => setCharge(e.target.value.replace(/\D/g, ''))} />
          <TextField label="Additional charge (₹)" name="add" inputMode="numeric" value={add} onChange={(e) => setAdd(e.target.value.replace(/\D/g, ''))} />
          <TextField label="Duration (min)" name="duration" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ''))} placeholder="60" />
          <p className="text-sm font-medium">Total quoted: ₹{total}</p>
        </div>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={!valid} onClick={submit}>Add custom puja</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Wire routes in `src/app/router.tsx`**

```tsx
import { OnbPujasScreen } from '../screens/pandit/onboarding/OnbPujasScreen';
import { OnbCustomPujaScreen } from '../screens/pandit/onboarding/OnbCustomPujaScreen';
```
```tsx
      { path: '/pandit/onboarding/pujas', element: <OnbPujasScreen /> },
      { path: '/pandit/onboarding/pujas/custom', element: <OnbCustomPujaScreen /> },
```

- [ ] **Step 5: Write the test** — `src/screens/pandit/onboarding/OnbPujasScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnbPujasScreen } from './OnbPujasScreen';
import { useDataStore } from '../../../store/dataStore';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';
import { seedCategories, seedPujas, seedPandits, seedReviews } from '../../../mock/seed';

beforeEach(() => {
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
  usePanditOnboardingStore.setState(usePanditOnboardingStore.getInitialState());
});

describe('OnbPujasScreen', () => {
  it('adds a puja via the charge sheet and enables continue', () => {
    render(<MemoryRouter><OnbPujasScreen /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Save & continue' })).toBeDisabled();
    fireEvent.click(screen.getAllByRole('button', { name: /Add/ })[0]); // open sheet for first puja
    fireEvent.change(screen.getByLabelText('Your charge (₹)'), { target: { value: '1500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add this puja' }));
    expect(usePanditOnboardingStore.getState().draft.supportedPujas).toHaveLength(1);
    expect(screen.getByText(/Selected \(1\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save & continue' })).not.toBeDisabled();
  });
});
```

- [ ] **Step 6: Run the test + full suite**

Run: `npm test -- OnbPujasScreen`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: pandit onboarding A4 pujas + A4a charge sheet + A5 custom puja"
```

---

### Task 6: A6 Documents + A7 Availability

**Files:**
- Create: `src/screens/pandit/onboarding/OnbDocumentsScreen.tsx`
- Create: `src/screens/pandit/onboarding/OnbAvailabilityScreen.tsx`
- Modify: `src/app/router.tsx` (2 routes)
- Test: `src/screens/pandit/onboarding/OnbAvailabilityScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Button`, `Stepper`, `Card`, `TextField`; `panditOnboardingStore` (`draft`, `addDocument`, `removeDocument`, `addSlot`, `removeSlot`, `setStep`).
- Produces: `OnbDocumentsScreen`, `OnbAvailabilityScreen`.

- [ ] **Step 1: Create `src/screens/pandit/onboarding/OnbDocumentsScreen.tsx`** (A6)

```tsx
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { FileText, X } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Stepper } from '../../../components/ui/Stepper';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';

const TILES = ['ID proof', 'Certificate', 'Other'];

export function OnbDocumentsScreen() {
  const navigate = useNavigate();
  const docs = usePanditOnboardingStore(useShallow((s) => s.draft.documents));
  const addDocument = usePanditOnboardingStore((s) => s.addDocument);
  const removeDocument = usePanditOnboardingStore((s) => s.removeDocument);
  const setStep = usePanditOnboardingStore((s) => s.setStep);
  const proceed = () => { setStep(4); navigate('/pandit/onboarding/availability'); };

  return (
    <>
      <AppBar title="Documents (optional)" left={<BackButton to="/pandit/onboarding/pujas" />} right={<Stepper total={5} current={3} />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-md bg-info/10 p-3 text-xs text-info">Optional — speeds up admin review but isn't required.</div>
        <div className="flex flex-col gap-2">
          {TILES.map((label) => (
            <button key={label} type="button" onClick={() => addDocument(label)} className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-sm">
              <FileText size={18} className="text-muted" /> Upload {label} (mock)
            </button>
          ))}
        </div>
        {docs.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm">
                <FileText size={16} /> <span className="flex-1">{d.label} — {d.name}</span>
                <button type="button" aria-label={`Remove ${d.label}`} onClick={() => removeDocument(d.id)}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-border p-3 flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={proceed}>Skip</Button>
        <Button className="flex-1" onClick={proceed}>Save & continue</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `src/screens/pandit/onboarding/OnbAvailabilityScreen.tsx`** (A7)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { X } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Stepper } from '../../../components/ui/Stepper';
import { TextField } from '../../../components/ui/TextField';
import { ToggleRow } from '../../../components/ui/ToggleRow';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';
import type { OnboardingRecurring } from '../../../mock/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function OnbAvailabilityScreen() {
  const navigate = useNavigate();
  const draft = usePanditOnboardingStore(useShallow((s) => s.draft.availability));
  const setRecurring = usePanditOnboardingStore((s) => s.setRecurring);
  const addSlot = usePanditOnboardingStore((s) => s.addSlot);
  const removeSlot = usePanditOnboardingStore((s) => s.removeSlot);
  const setStep = usePanditOnboardingStore((s) => s.setStep);

  const [date, setDate] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');

  const toggleDay = (weekday: number) => {
    const exists = draft.recurring.some((r) => r.weekday === weekday);
    const next: OnboardingRecurring[] = exists
      ? draft.recurring.filter((r) => r.weekday !== weekday)
      : [...draft.recurring, { weekday, start: '09:00', end: '17:00' }];
    setRecurring(next);
  };

  const review = () => { setStep(5); navigate('/pandit/onboarding/submit'); };
  const canAddSlot = date.trim() && end > start;

  return (
    <>
      <AppBar title="Availability" left={<BackButton to="/pandit/onboarding/documents" />} right={<Stepper total={5} current={4} />} />
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="mb-1 text-sm font-semibold">Recurring weekly</h2>
        <div className="rounded-md border border-border bg-surface px-3">
          {WEEKDAYS.map((label, i) => (
            <ToggleRow key={i} label={label} description={draft.recurring.some((r) => r.weekday === i) ? '09:00–17:00' : undefined}
              checked={draft.recurring.some((r) => r.weekday === i)} onChange={() => toggleDay(i)} />
          ))}
        </div>

        <h2 className="mb-1 mt-5 text-sm font-semibold">Specific dates</h2>
        <div className="flex items-end gap-2">
          <TextField label="Date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm" />
          <TextField label="From" name="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="text-sm" />
          <TextField label="To" name="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="text-sm" />
        </div>
        <Button variant="outline" className="mt-2 w-full" disabled={!canAddSlot} onClick={() => { addSlot(date, start, end); setDate(''); }}>+ Add slot</Button>
        {draft.slots.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {draft.slots.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm">
                <span className="flex-1">{s.date} · {s.start}–{s.end}</span>
                <button type="button" aria-label={`Remove slot ${s.date}`} onClick={() => removeSlot(s.id)}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted">You can change this anytime later.</p>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" onClick={review}>Review & submit</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Wire routes in `src/app/router.tsx`**

```tsx
import { OnbDocumentsScreen } from '../screens/pandit/onboarding/OnbDocumentsScreen';
import { OnbAvailabilityScreen } from '../screens/pandit/onboarding/OnbAvailabilityScreen';
```
```tsx
      { path: '/pandit/onboarding/documents', element: <OnbDocumentsScreen /> },
      { path: '/pandit/onboarding/availability', element: <OnbAvailabilityScreen /> },
```

- [ ] **Step 4: Write the test** — `src/screens/pandit/onboarding/OnbAvailabilityScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnbAvailabilityScreen } from './OnbAvailabilityScreen';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';

beforeEach(() => usePanditOnboardingStore.setState(usePanditOnboardingStore.getInitialState()));

describe('OnbAvailabilityScreen', () => {
  it('toggles a recurring weekday into the draft', () => {
    render(<MemoryRouter><OnbAvailabilityScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('switch', { name: 'Mon' }));
    expect(usePanditOnboardingStore.getState().draft.availability.recurring.some((r) => r.weekday === 1)).toBe(true);
  });
});
```

- [ ] **Step 5: Run the test + full suite**

Run: `npm test -- OnbAvailabilityScreen`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: pandit onboarding A6 documents + A7 availability"
```

---

### Task 7: A8 Review & Submit + onboarding integration walkthrough + full gate

**Files:**
- Create: `src/screens/pandit/onboarding/OnbSubmitScreen.tsx`
- Modify: `src/app/router.tsx` (1 route)
- Test: `src/app/pandit-onboarding-flow.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Button`, `Card`; `panditOnboardingStore` (`draft`, `submit`), `sessionStore` (`user`, `becomePandit`, `switchMode`).
- Produces: `OnbSubmitScreen`. On submit: `becomePandit()` (roles+pandit, status pending) → `switchMode('pandit')` → `submit(userId, now)` → navigate `/pandit/pending-approval`.

- [ ] **Step 1: Create `src/screens/pandit/onboarding/OnbSubmitScreen.tsx`** (A8 review)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';
import { useSessionStore } from '../../../store/sessionStore';

function Row({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <Card className="flex items-center justify-between gap-2 p-3">
      <div className="min-w-0"><p className="text-xs text-muted">{label}</p><p className="truncate text-sm font-medium">{value}</p></div>
      <button type="button" onClick={onEdit} className="text-xs font-medium text-primary">Edit</button>
    </Card>
  );
}

export function OnbSubmitScreen() {
  const navigate = useNavigate();
  const draft = usePanditOnboardingStore(useShallow((s) => s.draft));
  const submit = usePanditOnboardingStore((s) => s.submit);
  const userId = useSessionStore((s) => s.user?.id ?? 'user');
  const becomePandit = useSessionStore((s) => s.becomePandit);
  const switchMode = useSessionStore((s) => s.switchMode);
  const [agree, setAgree] = useState(false);

  const go = () => {
    becomePandit();
    switchMode('pandit');
    submit(userId, new Date().toISOString());
    navigate('/pandit/pending-approval', { replace: true });
  };

  const pujaCount = draft.supportedPujas.length + draft.customPujas.length;

  return (
    <>
      <AppBar title="Review & submit" left={<BackButton to="/pandit/onboarding/availability" />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          <Row label="Profile" value={`${draft.profile.name || '—'} · ${draft.profile.experienceYears}y`} onEdit={() => navigate('/pandit/onboarding/profile')} />
          <Row label="Service area" value={`${draft.service.radiusKm} km · ${draft.service.travelPreference}`} onEdit={() => navigate('/pandit/onboarding/service')} />
          <Row label="Pujas" value={`${pujaCount} selected${draft.customPujas.length ? ` (${draft.customPujas.length} custom)` : ''}`} onEdit={() => navigate('/pandit/onboarding/pujas')} />
          <Row label="Documents" value={`${draft.documents.length} uploaded`} onEdit={() => navigate('/pandit/onboarding/documents')} />
          <Row label="Availability" value={`${draft.availability.recurring.length} weekly · ${draft.availability.slots.length} dated`} onEdit={() => navigate('/pandit/onboarding/availability')} />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} aria-label="Information is accurate" className="h-4 w-4 accent-[var(--color-primary)]" />
          The information provided is accurate.
        </label>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={!agree} onClick={go}>Submit for approval</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Wire the route in `src/app/router.tsx`**

```tsx
import { OnbSubmitScreen } from '../screens/pandit/onboarding/OnbSubmitScreen';
```
```tsx
      { path: '/pandit/onboarding/submit', element: <OnbSubmitScreen /> },
```

- [ ] **Step 3: Write the integration walkthrough** — `src/app/pandit-onboarding-flow.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { usePanditOnboardingStore } from '../store/panditOnboardingStore';
import { useDataStore } from '../store/dataStore';
import { seedCategories, seedPujas, seedPandits, seedReviews } from '../mock/seed';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  usePanditOnboardingStore.setState(usePanditOnboardingStore.getInitialState());
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('pandit onboarding flow (integration)', () => {
  it('intro → submit (prefilled draft) → pending → simulate approval → dashboard', () => {
    // prefill the draft so we can jump to the review step
    const s = usePanditOnboardingStore.getState();
    s.patchProfile({ name: 'Pandit Test', about: 'Experienced vedic scholar', languages: ['Hindi'], specializations: ['Katha'], city: 'Pune' });
    s.addSupportedPuja({ pujaId: 'puja-ganesh', charge: 900, durationMins: 90 });

    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/onboarding/submit'] });
    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByLabelText('Information is accurate'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit for approval' }));
    expect(screen.getByText('Pending admin approval')).toBeInTheDocument();
    expect(useSessionStore.getState().panditStatus).toBe('pending');
    expect(useSessionStore.getState().user?.roles).toContain('pandit');

    fireEvent.click(screen.getByRole('button', { name: 'Simulate approval' }));
    expect(screen.getByText(/You're approved/)).toBeInTheDocument();
    expect(useSessionStore.getState().panditStatus).toBe('approved');
  });
});
```

- [ ] **Step 4: Run the full suite + typecheck + build (P3a gate)**

Run: `npm test`
Expected: PASS — all suites green incl. `panditOnboardingStore`, `panditGuards`, `OnboardingIntroScreen`, `OnbProfileScreen`, `OnbPujasScreen`, `OnbAvailabilityScreen`, `pandit-onboarding-flow`.

Run: `npm run typecheck && npm run build`
Expected: both PASS.

- [ ] **Step 5: Manual look check**

Run: `npm run dev`. Log in (OTP `123456`). Profile tab → "Become a Pandit" → wizard: profile → service → pujas (add one via the sheet; create a custom puja) → documents (skip) → availability (toggle a weekday) → review → submit → "Pending admin approval" → "Simulate approval" → gated Pandit dashboard. Confirm the pandit tab bar (Dashboard/Requests/Calendar/Earnings/Profile) shows; pending state blocks the dashboard until approved.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: pandit onboarding A8 review/submit + integration walkthrough (P3a complete)"
```

---

## Self-Review

**Spec coverage (P3a scope = §"SCREEN INVENTORY — PANDIT" A1–A9 + /pandit foundation + §0.6 gating):**
- A1 Become-a-Pandit Intro → Task 3 (`OnboardingIntroScreen`). ✔
- A2 Profile setup → Task 4 (`OnbProfileScreen`). ✔
- A3 Service configuration → Task 4 (`OnbServiceScreen`). ✔
- A4 Add supported pujas → Task 5 (`OnbPujasScreen`). ✔
- A4a Per-puja charge sheet → Task 5 (`PujaChargeSheet`). ✔
- A5 Create custom puja (OQ5) → Task 5 (`OnbCustomPujaScreen`, isCustom flag + additional charge). ✔
- A6 Documents (optional) → Task 6 (`OnbDocumentsScreen`). ✔
- A7 Availability → Task 6 (`OnbAvailabilityScreen`, recurring + specific). ✔
- A8 Review/Submit + Pending (OQ1) → Task 7 (`OnbSubmitScreen`) + Task 2 (`PendingApprovalScreen`). ✔
- A9 Approval result → Task 2 (`RejectedScreen`; approved → dashboard banner). ✔
- /pandit foundation (PanditTabBar, layouts, §0.6 guard, RootRedirect gating, routes) → Task 2 + Task 3. ✔
- Mode-switch entry from Jajman Profile → Task 3. ✔

**Intentional deferrals (out of P3a scope, land in P3b+):** the full Pandit Dashboard widgets, Requests/Calendar/Earnings/Profile tab contents (stubs now); avatar/document real uploads (mock adds); map preview + GPS (mock tile); city typeahead (plain field); overlap detection on slots; resume-draft banner on A1 (draft persists in-memory across the session, but no explicit resume UI); the real admin approve/reject queue (P4 — replaced by the demo "Simulate approval/rejection" controls). None block the onboarding flow end-to-end.

**Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". Every code step is complete and compilable; commands list expected results. "(mock)"/"(demo)"/"Coming soon"/"arrives in a later P3 phase" are intentional prototype copy, not plan placeholders. Task 2 Step 8 adds a small local `PanditStub` so the gated tabs resolve without inventing screens out of scope.

**Type consistency:** `PanditOnboardingDraft`/`PanditSelfProfile` + the onboarding sub-types (Task 1) are consumed by every wizard screen (Tasks 3–7) and the store. Store APIs match across tasks: `patchProfile/patchService/setStep/addSupportedPuja/removeSupportedPuja/addCustomPuja/removeCustomPuja/addDocument/removeDocument/setRecurring/addSlot/removeSlot/submit/simulateApproval/simulateRejection`. `submit(userId, nowISO)` is called with `new Date().toISOString()` from `OnbSubmitScreen` and literal ISO in tests. Gating uses `sessionStore.panditStatus` everywhere (`RequirePanditApproved`, `RootRedirect`, `PendingApprovalScreen` via `setPanditStatus`). Routes use the §0.1 normative `/pandit/*` paths (`/pandit/dashboard`, `/pandit/pending-approval`, `/pandit/rejected`, `/pandit/onboarding/*`). `dataStore.pujas`/`categories` are the master consumed by A4/A5. `Stepper({total,current})` and `SegmentedControl<T>`/`ToggleRow`/`Chip` signatures match their existing definitions.
