# Pandit Seva — Phase 2b (Jajman Profile, Account & Addresses) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 5th **Profile** bottom-tab live and build the Jajman account cluster behind it — Profile hub, Edit profile, Settings, Notification preferences, Language preference, Payment history, Receipt, My reviews, standalone Addresses CRUD (list / add / edit / delete / set-default), and the Become-a-Pandit entry — completing spec §M (Profile, Settings & Account) and §I (Addresses) for the Jajman surface.

**Architecture:** New screens render inside the existing layout routes — the Profile tab under `AppLayout` (tabs visible), every drill-down under `AppPlainLayout` (tab-less, back button). Account state extends the existing zustand stores rather than adding new ones: profile fields + notification prefs on `sessionStore`, phone-share default on `uiStore`, address default-flag + `setDefaultAddress` on `bookingStore`, my-reviews + delete on `dataStore`. One small framework-free domain module (`payments.ts`) flattens bookings into a payment ledger. All screens reuse the shipped DS components (AppBar, BackButton, Card, Button, TextField, Chip, Avatar, SegmentedControl, ToggleRow, MoneyBreakdown, StatusPill).

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind 3, zustand 4 (with `zustand/react/shallow`), react-router-dom 6, lucide-react, nanoid. Tests: Vitest + React Testing Library + jsdom. No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-06-20-pandit-seva-mobile-ui-design.md` — §M (lines ~1392–1481), §I (lines ~1266–1299), Appendix A "Receipt / Invoice detail" (lines ~3109–3120).

**Working directory:** all paths are relative to `pandit-seva-app/`.

## Global Constraints

- **Route prefix:** This prototype namespaces every authenticated Jajman route under `/app/*` (established in P1a — e.g. `/app/home`, `/app/recurring`, `/app/urgent`). The spec's bare paths (`/profile`, `/settings`, `/become-pandit`, `/profile/addresses`) therefore map to `/app/profile`, `/app/settings`, `/app/become-pandit`, `/app/profile/addresses` here. Use the `/app/*` forms.
- **Layout placement:** Tab screens (have bottom tabs) go in the `AppLayout` children group in `src/app/router.tsx`. Drill-down screens (back button, no tabs) go in the `AppPlainLayout` children group. All are inside `RequireAuth`.
- **No new dependencies.** Reuse existing components and stores.
- **Dates:** never call `Date.now()`/`new Date()` in store or domain modules (breaks determinism/tests). Display dates by slicing stored ISO strings (`iso.slice(0, 10)`). Creating `new Date()` inside a screen event handler is acceptable (the existing `RatePanditScreen` does this) but not required here.
- **Tests:** unit-test store/domain logic with strict TDD (failing test first). For presentational components/screens, build the component then add a test (the repo's established rhythm in P0/P1/P2a). Reset zustand stores in `beforeEach` via `setState(...)` or `getInitialState()`.
- **Commits:** one commit per task, local only (do not push).

---

### Task 1: Account data-model + store extensions

**Files:**
- Modify: `src/mock/types.ts` (add `Address.isDefault`, `Review.mine`)
- Modify: `src/mock/seed.ts` (default address + one seeded "mine" review)
- Modify: `src/store/sessionStore.ts` (profile fields, `updateProfile`, notification prefs)
- Modify: `src/store/uiStore.ts` (`phoneShareDefault`)
- Modify: `src/store/bookingStore.ts` (`setDefaultAddress`, default-aware add/update)
- Modify: `src/store/dataStore.ts` (`getMyReviews`, `deleteReview`)
- Modify: `src/screens/jajman/booking/RatePanditScreen.tsx` (tag authored reviews `mine: true`)
- Test: `src/store/bookingStore.test.ts`, `src/store/dataStore.test.ts`, `src/store/sessionStore.test.ts` (extend)

**Interfaces:**
- Produces: `Address.isDefault?: boolean`; `Review.mine?: boolean`; `sessionStore.updateProfile(patch: Partial<SessionUser>)`; `sessionStore.notificationPrefs: NotificationPrefs`; `sessionStore.setNotificationPref(key: keyof NotificationPrefs, value: boolean)`; `NotificationPrefs`, `defaultNotificationPrefs`; `uiStore.phoneShareDefault: boolean`; `uiStore.setPhoneShareDefault(b: boolean)`; `bookingStore.setDefaultAddress(id: string)`; `bookingStore.getDefaultAddress(): Address | undefined`; `dataStore.getMyReviews(): Review[]`; `dataStore.deleteReview(id: string)`.
- `SessionUser` gains optional `email?: string` and `about?: string`.

- [ ] **Step 1: Extend `Address` and `Review` in `src/mock/types.ts`**

Edit the `Address` interface (add `isDefault`):

```ts
export type AddressType = 'home' | 'parents' | 'relative' | 'temple' | 'custom';
export interface Address {
  id: string;
  label: string;
  type: AddressType;
  line: string;
  city: string;
  notes?: string;
  isDefault?: boolean; // P2b — the address pre-selected in booking + Home
}
```

Edit the `Review` interface (add `mine`):

```ts
export interface Review {
  id: string;
  panditId: string;
  jajmanName: string;
  rating: number; // 1..5
  text: string;
  date: string; // ISO (yyyy-mm-dd)
  mine?: boolean; // P2b — authored by the current jajman (drives "My reviews")
}
```

- [ ] **Step 2: Seed a default address + one "mine" review in `src/mock/seed.ts`**

In `seedAddresses`, mark the Home address default:

```ts
export const seedAddresses: Address[] = [
  { id: 'addr-home', label: 'Home', type: 'home', line: '12 Tulsi Apartments, Kothrud', city: 'Pune', notes: 'Ring the bell twice', isDefault: true },
  { id: 'addr-parents', label: "Parents' home", type: 'parents', line: '4 Shanti Nagar, Aundh', city: 'Pune' },
  { id: 'addr-temple', label: 'Community temple', type: 'temple', line: 'Ganesh Mandir, FC Road', city: 'Pune' },
];
```

Append one authored review to `seedReviews` (ties to the seeded `rated` booking `bkg-demo-4` on `pnd-6`) so "My reviews" is demoable:

```ts
  { id: 'rev-mine-1', panditId: 'pnd-6', jajmanName: 'You', rating: 5, text: 'Beautiful Ganesh puja at home — punctual and very smooth.', date: '2026-05-03', mine: true },
```

- [ ] **Step 3: Write failing store tests** — extend the three test files

Append to `src/store/bookingStore.test.ts`:

```ts
import { seedAddresses } from '../mock/seed';

describe('addresses — default flag (P2b)', () => {
  beforeEach(() => useBookingStore.setState({ addresses: seedAddresses }));

  it('setDefaultAddress makes exactly one address default', () => {
    useBookingStore.getState().setDefaultAddress('addr-temple');
    const addrs = useBookingStore.getState().addresses;
    expect(addrs.filter((a) => a.isDefault)).toHaveLength(1);
    expect(addrs.find((a) => a.id === 'addr-temple')!.isDefault).toBe(true);
    expect(addrs.find((a) => a.id === 'addr-home')!.isDefault).toBe(false);
  });

  it('adding an address with isDefault clears the previous default', () => {
    useBookingStore.getState().addAddress({ label: 'Office', type: 'custom', line: '1 MG Road', city: 'Pune', isDefault: true });
    const addrs = useBookingStore.getState().addresses;
    expect(addrs.filter((a) => a.isDefault)).toHaveLength(1);
    expect(addrs.find((a) => a.label === 'Office')!.isDefault).toBe(true);
  });

  it('getDefaultAddress returns the flagged default', () => {
    expect(useBookingStore.getState().getDefaultAddress()?.id).toBe('addr-home');
  });
});
```

> Note: `bookingStore.test.ts` already imports `useBookingStore`, `describe/it/expect/beforeEach`. If `seedAddresses` is already imported, do not duplicate the import.

Append to `src/store/dataStore.test.ts`:

```ts
describe('reviews — mine + delete (P2b)', () => {
  beforeEach(() => useDataStore.setState({ reviews: seedReviews }));

  it('getMyReviews returns only authored reviews', () => {
    const mine = useDataStore.getState().getMyReviews();
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((r) => r.mine)).toBe(true);
  });

  it('deleteReview removes a review by id', () => {
    const before = useDataStore.getState().reviews.length;
    useDataStore.getState().deleteReview('rev-mine-1');
    expect(useDataStore.getState().reviews).toHaveLength(before - 1);
    expect(useDataStore.getState().getMyReviews().find((r) => r.id === 'rev-mine-1')).toBeUndefined();
  });
});
```

> Note: ensure `seedReviews` is imported in `dataStore.test.ts` (it is used by the existing reset). If not present, add `import { seedReviews } from '../mock/seed';`.

Append to `src/store/sessionStore.test.ts`:

```ts
import { defaultNotificationPrefs } from './sessionStore';

describe('profile + notification prefs (P2b)', () => {
  beforeEach(() => {
    useSessionStore.setState(useSessionStore.getInitialState());
    useSessionStore.getState().setPendingPhone('9999999999');
    useSessionStore.getState().verifyOtp('123456');
  });

  it('updateProfile merges fields without clearing the session', () => {
    useSessionStore.getState().updateProfile({ name: 'Ravi', email: 'ravi@example.com' });
    expect(useSessionStore.getState().user?.name).toBe('Ravi');
    expect(useSessionStore.getState().user?.email).toBe('ravi@example.com');
    expect(useSessionStore.getState().authed).toBe(true);
  });

  it('setNotificationPref toggles a single preference', () => {
    expect(useSessionStore.getState().notificationPrefs.promotions).toBe(defaultNotificationPrefs.promotions);
    useSessionStore.getState().setNotificationPref('promotions', true);
    expect(useSessionStore.getState().notificationPrefs.promotions).toBe(true);
  });
});
```

> Note: `sessionStore.test.ts` already imports `useSessionStore`. Keep its existing imports; add only what's missing.

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test -- bookingStore dataStore sessionStore`
Expected: FAIL — `setDefaultAddress`/`getDefaultAddress`/`getMyReviews`/`deleteReview`/`updateProfile`/`setNotificationPref`/`defaultNotificationPrefs` are not defined.

- [ ] **Step 5: Extend `src/store/sessionStore.ts`**

Add to `SessionUser`:

```ts
export interface SessionUser {
  id: string;
  name: string;
  phone: string;
  email?: string; // P2b
  about?: string; // P2b
  roles: Role[];
  profileComplete: boolean;
}
```

Add the prefs type + default above the store:

```ts
export interface NotificationPrefs {
  sms: boolean;
  whatsapp: boolean;
  bookingUpdates: boolean;
  paymentReminders: boolean;
  promotions: boolean;
  referral: boolean;
  reviews: boolean;
}

export const defaultNotificationPrefs: NotificationPrefs = {
  sms: true,
  whatsapp: true,
  bookingUpdates: true,
  paymentReminders: true,
  promotions: false,
  referral: true,
  reviews: true,
};
```

Add to the `SessionState` interface:

```ts
  notificationPrefs: NotificationPrefs;
  updateProfile: (patch: Partial<SessionUser>) => void;
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void;
```

In the store body, add `notificationPrefs: defaultNotificationPrefs,` to the initial state, add the two actions, and reset prefs on logout:

```ts
  updateProfile: (patch) => set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),

  setNotificationPref: (key, value) =>
    set((s) => ({ notificationPrefs: { ...s.notificationPrefs, [key]: value } })),
```

In the existing `logout` action's `set({...})`, add `notificationPrefs: defaultNotificationPrefs,` so logout fully resets account state.

- [ ] **Step 6: Extend `src/store/uiStore.ts`**

Add to `UiState`:

```ts
  phoneShareDefault: boolean;
  setPhoneShareDefault: (b: boolean) => void;
```

Add to the store body (initial value + setter):

```ts
  phoneShareDefault: false,
  setPhoneShareDefault: (phoneShareDefault) => set({ phoneShareDefault }),
```

- [ ] **Step 7: Extend `src/store/bookingStore.ts`**

Add to the `BookingState` interface:

```ts
  setDefaultAddress: (id: string) => void;
  getDefaultAddress: () => Address | undefined;
```

Replace the existing `addAddress` and `updateAddress` implementations with default-aware versions, and add the two new methods:

```ts
  addAddress: (addr) => {
    const created: Address = { ...addr, id: `addr-${nanoid(6)}` };
    set((s) => ({
      addresses: created.isDefault
        ? [...s.addresses.map((a) => ({ ...a, isDefault: false })), created]
        : [...s.addresses, created],
    }));
    return created;
  },
  updateAddress: (id, patch) =>
    set((s) => ({
      addresses: s.addresses.map((a) =>
        a.id === id ? { ...a, ...patch } : patch.isDefault ? { ...a, isDefault: false } : a,
      ),
    })),
  deleteAddress: (id) => set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) })),

  setDefaultAddress: (id) =>
    set((s) => ({ addresses: s.addresses.map((a) => ({ ...a, isDefault: a.id === id })) })),
  getDefaultAddress: () => get().addresses.find((a) => a.isDefault) ?? get().addresses[0],
```

> `deleteAddress` is unchanged from the current file — shown here only for context since it sits between the edited methods.

- [ ] **Step 8: Extend `src/store/dataStore.ts`**

Add to the `DataState` interface:

```ts
  getMyReviews: () => Review[];
  deleteReview: (id: string) => void;
```

Add to the store body:

```ts
  getMyReviews: () => get().reviews.filter((r) => r.mine),
  deleteReview: (id) => set((s) => ({ reviews: s.reviews.filter((r) => r.id !== id) })),
```

- [ ] **Step 9: Tag authored reviews in `src/screens/jajman/booking/RatePanditScreen.tsx`**

In the `submit` function, add `mine: true` to the `addReview` call:

```ts
    addReview({ id: `rev-${nanoid(5)}`, panditId: pandit.id, jajmanName: userName, rating: stars, text: text.trim() || 'Great experience.', date: new Date().toISOString().slice(0, 10), mine: true });
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npm test -- bookingStore dataStore sessionStore`
Expected: PASS — all new assertions green, existing assertions still green.

- [ ] **Step 11: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add -A
git commit -m "feat: account data-model + store extensions (profile, prefs, default address, my-reviews)"
```

---

### Task 2: Account UI primitives — ToggleRow, MenuRow, AddressCard, ReviewRow

**Files:**
- Create: `src/components/ui/ToggleRow.tsx`
- Create: `src/components/profile/MenuRow.tsx`
- Create: `src/components/profile/AddressCard.tsx`
- Create: `src/components/profile/ReviewRow.tsx`
- Test: `src/components/profile/profile-components.test.tsx`

**Interfaces:**
- Consumes: `Card`, `Badge`, `RatingStars` (existing UI); `Address`, `Review` (`src/mock/types`).
- Produces: `ToggleRow({ label, description?, checked, onChange, disabled? })`; `MenuRow({ icon, label, value?, badge?, onClick?, disabled? })`; `AddressCard({ address, onEdit, onDelete, onSetDefault })`; `ReviewRow({ review, panditName, onOpen, onDelete })`.

- [ ] **Step 1: Create `src/components/ui/ToggleRow.tsx`**

```tsx
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-border py-3 last:border-0', disabled && 'opacity-50')}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{label}</p>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-primary' : 'border border-border bg-surface-2')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/profile/MenuRow.tsx`**

```tsx
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Badge } from '../ui/Badge';

export function MenuRow({
  icon: Icon,
  label,
  value,
  badge,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  badge?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-50"
    >
      <Icon size={20} className="shrink-0 text-muted" />
      <span className="flex-1 text-sm text-text">{label}</span>
      {value && <span className="text-xs text-muted">{value}</span>}
      {badge && <Badge>{badge}</Badge>}
      {!disabled && <ChevronRight size={18} className="text-muted" />}
    </button>
  );
}
```

- [ ] **Step 3: Create `src/components/profile/AddressCard.tsx`**

```tsx
import { Home, Users, Building2, Landmark, MapPin, type LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Address, AddressType } from '../../mock/types';

const ICONS: Record<AddressType, LucideIcon> = {
  home: Home,
  parents: Users,
  relative: Building2,
  temple: Landmark,
  custom: MapPin,
};

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const Icon = ICONS[address.type];
  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <Icon size={20} className="mt-0.5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{address.label}</span>
            {address.isDefault && <Badge className="bg-primary/10 text-primary">Default</Badge>}
          </div>
          <p className="text-sm text-muted">{address.line}</p>
          <p className="text-xs text-muted">{address.city}</p>
          {address.notes && <p className="mt-1 text-xs text-muted">📝 {address.notes}</p>}
        </div>
      </div>
      <div className="mt-2 flex gap-3 text-xs font-medium">
        <button type="button" onClick={onEdit} className="text-primary">Edit</button>
        {!address.isDefault && (
          <button type="button" onClick={onSetDefault} className="text-primary">Set default</button>
        )}
        <button type="button" onClick={onDelete} className="ml-auto text-error">Delete</button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Create `src/components/profile/ReviewRow.tsx`**

```tsx
import { Card } from '../ui/Card';
import { RatingStars } from '../ui/RatingStars';
import type { Review } from '../../mock/types';

export function ReviewRow({
  review,
  panditName,
  onOpen,
  onDelete,
}: {
  review: Review;
  panditName: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="p-3">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{panditName}</span>
          <RatingStars value={review.rating} />
        </div>
        <p className="mt-1 text-sm text-muted">{review.text}</p>
        <p className="mt-1 text-xs text-muted">{review.date}</p>
      </button>
      <div className="mt-2 flex">
        <button type="button" onClick={onDelete} className="ml-auto text-xs font-medium text-error">Delete</button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Write the test** — `src/components/profile/profile-components.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Home } from 'lucide-react';
import { ToggleRow } from '../ui/ToggleRow';
import { MenuRow } from './MenuRow';
import { AddressCard } from './AddressCard';
import type { Address } from '../../mock/types';

const addr: Address = { id: 'a1', label: 'Home', type: 'home', line: '12 Tulsi Apartments', city: 'Pune', isDefault: true };

describe('account primitives', () => {
  it('ToggleRow fires onChange with the flipped value', () => {
    const onChange = vi.fn();
    render(<ToggleRow label="Promotions" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Promotions' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('MenuRow renders its label and fires onClick', () => {
    const onClick = vi.fn();
    render(<MenuRow icon={Home} label="Addresses" onClick={onClick} />);
    fireEvent.click(screen.getByText('Addresses'));
    expect(onClick).toHaveBeenCalled();
  });

  it('AddressCard shows the default badge and hides "Set default" for the default address', () => {
    render(<AddressCard address={addr} onEdit={() => {}} onDelete={() => {}} onSetDefault={() => {}} />);
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.queryByText('Set default')).not.toBeInTheDocument();
  });

  it('AddressCard fires onSetDefault for a non-default address', () => {
    const onSetDefault = vi.fn();
    render(<AddressCard address={{ ...addr, isDefault: false }} onEdit={() => {}} onDelete={() => {}} onSetDefault={onSetDefault} />);
    fireEvent.click(screen.getByText('Set default'));
    expect(onSetDefault).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- profile-components`
Expected: PASS — 4 assertions green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: account ui primitives (ToggleRow, MenuRow, AddressCard, ReviewRow)"
```

---

### Task 3: Profile hub screen + Profile tab route

**Files:**
- Create: `src/screens/jajman/ProfileScreen.tsx`
- Modify: `src/app/router.tsx` (wire `/app/profile` in the `AppLayout` children group)
- Test: `src/screens/jajman/ProfileScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `Avatar`, `Card`, `Button`, `Badge`, `MenuRow`; `sessionStore` (`user`, `panditStatus`, `switchMode`, `logout`).
- Produces: `ProfileScreen` (default route component for the existing `/app/profile` tab in `BottomTabBar`).

- [ ] **Step 1: Create `src/screens/jajman/ProfileScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  CalendarCheck,
  Heart,
  MapPin,
  Receipt,
  Star,
  Bell,
  Languages,
  LifeBuoy,
  LogOut,
  Gift,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { MenuRow } from '../../components/profile/MenuRow';
import { useSessionStore } from '../../store/sessionStore';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  to?: string;
  badge?: string;
  disabled?: boolean;
}

export function ProfileScreen() {
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const panditStatus = useSessionStore((s) => s.panditStatus);
  const switchMode = useSessionStore((s) => s.switchMode);
  const logout = useSessionStore((s) => s.logout);
  const isPandit = (user?.roles ?? []).includes('pandit');

  const items: MenuItem[] = [
    { icon: CalendarCheck, label: 'My Bookings', to: '/app/bookings' },
    { icon: Heart, label: 'Favorites', to: '/app/favorites' },
    { icon: MapPin, label: 'Addresses', to: '/app/profile/addresses' },
    { icon: Receipt, label: 'Payment history', to: '/app/profile/payments' },
    { icon: Star, label: 'My reviews', to: '/app/profile/reviews' },
    { icon: Bell, label: 'Notification preferences', to: '/app/profile/notifications' },
    { icon: Languages, label: 'Language', to: '/app/profile/language' },
    { icon: Gift, label: 'Referral', badge: 'Soon', disabled: true },
    { icon: ShieldAlert, label: 'Disputes', badge: 'Soon', disabled: true },
    { icon: LifeBuoy, label: 'Help & Support', badge: 'Soon', disabled: true },
    { icon: SettingsIcon, label: 'Settings', to: '/app/settings' },
  ];

  return (
    <>
      <AppBar
        title="Profile"
        right={
          <button type="button" aria-label="Settings" onClick={() => navigate('/app/settings')} className="p-2 text-muted">
            <SettingsIcon size={18} />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto pb-4">
        <button type="button" onClick={() => navigate('/app/profile/edit')} className="flex w-full items-center gap-3 p-4 text-left">
          <Avatar name={user?.name ?? 'Devotee'} size={56} />
          <div className="min-w-0">
            <p className="font-semibold">{user?.name ?? 'Devotee'}</p>
            <p className="text-sm text-muted">{user?.phone || '—'}</p>
            <span className="text-xs font-medium text-primary">Edit profile</span>
          </div>
        </button>

        <Card className="mx-4 mb-2 flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">You're in Jajman mode</p>
            <p className="text-xs text-muted">{isPandit ? 'Switch to your pandit dashboard' : 'Offer pujas as a pandit'}</p>
          </div>
          {panditStatus === 'pending' ? (
            <Badge className="bg-warning/15 text-warning">Approval pending</Badge>
          ) : isPandit ? (
            <Button variant="outline" onClick={() => { switchMode('pandit'); navigate('/'); }}>Switch to Pandit</Button>
          ) : (
            <Button variant="outline" onClick={() => navigate('/app/become-pandit')}>Become a Pandit</Button>
          )}
        </Card>

        <div className="mt-1 divide-y divide-border border-y border-border">
          {items.map((it) => (
            <MenuRow
              key={it.label}
              icon={it.icon}
              label={it.label}
              badge={it.badge}
              disabled={it.disabled}
              onClick={it.to ? () => navigate(it.to as string) : undefined}
            />
          ))}
          <MenuRow icon={LogOut} label="Logout" onClick={() => { logout(); navigate('/', { replace: true }); }} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Wire `/app/profile` in `src/app/router.tsx`**

Add the import near the other jajman screen imports:

```tsx
import { ProfileScreen } from '../screens/jajman/ProfileScreen';
```

In the `AppLayout` children array (the group that already lists `/app/home`, `/app/search`, `/app/bookings`, `/app/favorites`), add:

```tsx
      { path: '/app/profile', element: <ProfileScreen /> },
```

- [ ] **Step 3: Write the test** — `src/screens/jajman/ProfileScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfileScreen } from './ProfileScreen';
import { useSessionStore } from '../../store/sessionStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp('123456');
});

describe('ProfileScreen', () => {
  it('renders the account menu rows', () => {
    render(<MemoryRouter><ProfileScreen /></MemoryRouter>);
    expect(screen.getByText('Addresses')).toBeInTheDocument();
    expect(screen.getByText('My reviews')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('shows "Become a Pandit" for a jajman-only account', () => {
    render(<MemoryRouter><ProfileScreen /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Become a Pandit' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- ProfileScreen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Profile hub screen + /app/profile tab route"
```

---

### Task 4: Addresses — list + add/edit screens (+ AddressForm default toggle)

**Files:**
- Modify: `src/components/booking/AddressForm.tsx` (add "Set as default" toggle)
- Create: `src/screens/jajman/profile/AddressesListScreen.tsx`
- Create: `src/screens/jajman/profile/AddressEditScreen.tsx`
- Modify: `src/app/router.tsx` (3 routes in the `AppPlainLayout` group)
- Test: `src/screens/jajman/profile/AddressesListScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Button`, `AddressForm`, `AddressCard`; `bookingStore` (`addresses`, `addAddress`, `updateAddress`, `deleteAddress`, `setDefaultAddress`, `getAddress`).
- Produces: `AddressesListScreen`, `AddressEditScreen` (one component serving both `/new` and `/:id/edit`).
- `AddressForm.onSave` payload now includes optional `isDefault: boolean`.

- [ ] **Step 1: Add a default toggle to `src/components/booking/AddressForm.tsx`**

Import `ToggleRow` at the top:

```tsx
import { ToggleRow } from '../ui/ToggleRow';
```

Add an `isDefault` state alongside the others:

```tsx
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
```

Add the toggle just above the `<Button>` (after the mock map pin div):

```tsx
      <ToggleRow label="Set as default address" checked={isDefault} onChange={setIsDefault} />
```

Include `isDefault` in the `onSave` payload:

```tsx
      <Button type="button" disabled={!valid} onClick={() => onSave({ label: label.trim(), type, line: line.trim(), city: city.trim(), notes: notes.trim() || undefined, isDefault })}>{submitLabel}</Button>
```

> The booking-flow `AddAddressSheet` reuses this form; the new toggle defaults to `false` there, so existing behavior is unchanged.

- [ ] **Step 2: Create `src/screens/jajman/profile/AddressesListScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Plus, MapPin } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { AddressCard } from '../../../components/profile/AddressCard';
import { useBookingStore } from '../../../store/bookingStore';

export function AddressesListScreen() {
  const navigate = useNavigate();
  const addresses = useBookingStore(useShallow((s) => s.addresses));
  const deleteAddress = useBookingStore((s) => s.deleteAddress);
  const setDefaultAddress = useBookingStore((s) => s.setDefaultAddress);

  return (
    <>
      <AppBar title="My Addresses" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        {addresses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <MapPin size={36} className="text-muted" />
            <p className="text-sm text-muted">Add your first address.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {addresses.map((a) => (
              <AddressCard
                key={a.id}
                address={a}
                onEdit={() => navigate(`/app/profile/addresses/${a.id}/edit`)}
                onDelete={() => deleteAddress(a.id)}
                onSetDefault={() => setDefaultAddress(a.id)}
              />
            ))}
          </div>
        )}
        <Button className="mt-4 w-full" onClick={() => navigate('/app/profile/addresses/new')}>
          <Plus size={18} /> Add new address
        </Button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Create `src/screens/jajman/profile/AddressEditScreen.tsx`**

```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { AddressForm } from '../../../components/booking/AddressForm';
import { useBookingStore } from '../../../store/bookingStore';

export function AddressEditScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const existing = useBookingStore((s) => (id ? s.getAddress(id) : undefined));
  const addAddress = useBookingStore((s) => s.addAddress);
  const updateAddress = useBookingStore((s) => s.updateAddress);
  const editing = Boolean(id);

  return (
    <>
      <AppBar title={editing ? 'Edit Address' : 'Add Address'} left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <AddressForm
          initial={existing}
          submitLabel={editing ? 'Save changes' : 'Add address'}
          onSave={(a) => {
            if (editing && id) updateAddress(id, a);
            else addAddress(a);
            navigate('/app/profile/addresses', { replace: true });
          }}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 4: Wire the 3 routes in `src/app/router.tsx`**

Add imports:

```tsx
import { AddressesListScreen } from '../screens/jajman/profile/AddressesListScreen';
import { AddressEditScreen } from '../screens/jajman/profile/AddressEditScreen';
```

In the `AppPlainLayout` children array, add (keep `new` before `:id/edit`):

```tsx
      { path: '/app/profile/addresses', element: <AddressesListScreen /> },
      { path: '/app/profile/addresses/new', element: <AddressEditScreen /> },
      { path: '/app/profile/addresses/:id/edit', element: <AddressEditScreen /> },
```

- [ ] **Step 5: Write the test** — `src/screens/jajman/profile/AddressesListScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AddressesListScreen } from './AddressesListScreen';
import { useBookingStore } from '../../../store/bookingStore';
import { seedAddresses } from '../../../mock/seed';

beforeEach(() => useBookingStore.setState({ addresses: seedAddresses }));

describe('AddressesListScreen', () => {
  it('lists seeded addresses and marks the default', () => {
    render(<MemoryRouter><AddressesListScreen /></MemoryRouter>);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Community temple')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('can delete an address', () => {
    render(<MemoryRouter><AddressesListScreen /></MemoryRouter>);
    const templeCard = screen.getByText('Community temple').closest('div');
    fireEvent.click(screen.getAllByText('Delete')[2]); // temple is the 3rd card
    expect(screen.queryByText('Community temple')).not.toBeInTheDocument();
    expect(templeCard).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- AddressesListScreen`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Addresses list + add/edit screens (default toggle, CRUD wiring)"
```

---

### Task 5: Edit profile + Settings screens

**Files:**
- Create: `src/screens/jajman/profile/EditProfileScreen.tsx`
- Create: `src/screens/jajman/profile/SettingsScreen.tsx`
- Modify: `src/app/router.tsx` (`/app/profile/edit`, `/app/settings` in `AppPlainLayout`)
- Test: `src/screens/jajman/profile/account-screens.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Avatar`, `Button`, `TextField`, `SegmentedControl`, `ToggleRow`; `sessionStore` (`user`, `updateProfile`, `logout`); `uiStore` (`theme`, `setTheme`, `phoneShareDefault`, `setPhoneShareDefault`).
- Produces: `EditProfileScreen`, `SettingsScreen`.

- [ ] **Step 1: Create `src/screens/jajman/profile/EditProfileScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { useSessionStore } from '../../../store/sessionStore';

export function EditProfileScreen() {
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const updateProfile = useSessionStore((s) => s.updateProfile);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [about, setAbout] = useState(user?.about ?? '');
  const valid = name.trim().length > 0;

  const save = () => {
    updateProfile({ name: name.trim(), email: email.trim() || undefined, about: about.trim() || undefined });
    navigate(-1);
  };

  return (
    <>
      <AppBar title="Edit Profile" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex flex-col items-center gap-2">
          <Avatar name={name || 'Devotee'} size={72} />
          <button type="button" className="text-xs font-medium text-primary">Change photo (mock)</button>
        </div>
        <div className="flex flex-col gap-3">
          <TextField label="Full name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Mobile" name="phone" value={user?.phone ?? ''} readOnly hint="Verified" />
          <TextField label="Email (optional)" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="About (optional)" name="about" value={about} onChange={(e) => setAbout(e.target.value)} />
        </div>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={!valid} onClick={save}>Save</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `src/screens/jajman/profile/SettingsScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { ToggleRow } from '../../../components/ui/ToggleRow';
import { Button } from '../../../components/ui/Button';
import { useUiStore, type ThemeMode } from '../../../store/uiStore';
import { useSessionStore } from '../../../store/sessionStore';

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-1 mt-4 px-1 text-xs font-semibold uppercase tracking-wide text-muted first:mt-0">{children}</h2>;
}

export function SettingsScreen() {
  const navigate = useNavigate();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const phoneShareDefault = useUiStore((s) => s.phoneShareDefault);
  const setPhoneShareDefault = useUiStore((s) => s.setPhoneShareDefault);
  const logout = useSessionStore((s) => s.logout);

  return (
    <>
      <AppBar title="Settings" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <SectionTitle>Appearance</SectionTitle>
        <SegmentedControl<ThemeMode>
          segments={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
          value={theme}
          onChange={setTheme}
        />

        <SectionTitle>Privacy</SectionTitle>
        <div className="rounded-md border border-border bg-surface px-3">
          <ToggleRow label="Share phone by default" description="Applied to new booking chats" checked={phoneShareDefault} onChange={setPhoneShareDefault} />
        </div>

        <SectionTitle>Security</SectionTitle>
        <button type="button" onClick={() => navigate('/auth/change-password')} className="flex w-full items-center rounded-md border border-border bg-surface px-3 py-3 text-sm">
          Change password <ChevronRight size={18} className="ml-auto text-muted" />
        </button>

        <SectionTitle>About</SectionTitle>
        <div className="rounded-md border border-border bg-surface px-3 py-3 text-sm text-muted">Pandit Seva · v0.0.0 (prototype)</div>

        <SectionTitle>Account</SectionTitle>
        <Button variant="outline" className="mt-1 w-full border-error text-error" onClick={() => { logout(); navigate('/', { replace: true }); }}>
          Logout
        </Button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Wire `/app/profile/edit` and `/app/settings` in `src/app/router.tsx`**

Add imports:

```tsx
import { EditProfileScreen } from '../screens/jajman/profile/EditProfileScreen';
import { SettingsScreen } from '../screens/jajman/profile/SettingsScreen';
```

In the `AppPlainLayout` children array, add:

```tsx
      { path: '/app/profile/edit', element: <EditProfileScreen /> },
      { path: '/app/settings', element: <SettingsScreen /> },
```

- [ ] **Step 4: Write the test** — `src/screens/jajman/profile/account-screens.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EditProfileScreen } from './EditProfileScreen';
import { SettingsScreen } from './SettingsScreen';
import { useSessionStore } from '../../../store/sessionStore';
import { useUiStore } from '../../../store/uiStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useUiStore.setState(useUiStore.getInitialState());
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp('123456');
});

describe('EditProfileScreen', () => {
  it('saves an updated name to the session store', () => {
    render(<MemoryRouter><EditProfileScreen /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ravi Kumar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(useSessionStore.getState().user?.name).toBe('Ravi Kumar');
  });
});

describe('SettingsScreen', () => {
  it('switches the theme to dark', () => {
    render(<MemoryRouter><SettingsScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('tab', { name: 'Dark' }));
    expect(useUiStore.getState().theme).toBe('dark');
  });

  it('logs out from the Account section', () => {
    render(<MemoryRouter><SettingsScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(useSessionStore.getState().authed).toBe(false);
  });
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- account-screens`
Expected: PASS — 3 assertions green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Edit profile + Settings screens (theme, phone-share default, logout)"
```

---

### Task 6: Notification preferences + Language preference screens

**Files:**
- Create: `src/screens/jajman/profile/NotificationPrefsScreen.tsx`
- Create: `src/screens/jajman/profile/LanguagePrefScreen.tsx`
- Modify: `src/app/router.tsx` (`/app/profile/notifications`, `/app/profile/language`)
- Test: `src/screens/jajman/profile/prefs-screens.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `ToggleRow`; `sessionStore` (`notificationPrefs`, `setNotificationPref`); `uiStore` (`language`, `setLanguage`).
- Produces: `NotificationPrefsScreen`, `LanguagePrefScreen`.

- [ ] **Step 1: Create `src/screens/jajman/profile/NotificationPrefsScreen.tsx`**

```tsx
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { ToggleRow } from '../../../components/ui/ToggleRow';
import { useSessionStore } from '../../../store/sessionStore';

export function NotificationPrefsScreen() {
  const prefs = useSessionStore((s) => s.notificationPrefs);
  const set = useSessionStore((s) => s.setNotificationPref);

  return (
    <>
      <AppBar title="Notification Preferences" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Channels</h2>
        <div className="rounded-md border border-border bg-surface px-3">
          <ToggleRow label="SMS" checked={prefs.sms} onChange={(v) => set('sms', v)} />
          <ToggleRow label="WhatsApp" checked={prefs.whatsapp} onChange={(v) => set('whatsapp', v)} />
          <ToggleRow label="Email / Push" description="Coming soon" checked={false} onChange={() => {}} disabled />
        </div>

        <h2 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Notify me about</h2>
        <div className="rounded-md border border-border bg-surface px-3">
          <ToggleRow label="Booking updates" checked={prefs.bookingUpdates} onChange={(v) => set('bookingUpdates', v)} />
          <ToggleRow label="Payment reminders" checked={prefs.paymentReminders} onChange={(v) => set('paymentReminders', v)} />
          <ToggleRow label="Promotions" checked={prefs.promotions} onChange={(v) => set('promotions', v)} />
          <ToggleRow label="Referral" checked={prefs.referral} onChange={(v) => set('referral', v)} />
          <ToggleRow label="Reviews" checked={prefs.reviews} onChange={(v) => set('reviews', v)} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `src/screens/jajman/profile/LanguagePrefScreen.tsx`**

```tsx
import { Check } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { useUiStore, type Language } from '../../../store/uiStore';

const LANGS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'sa', label: 'संस्कृत (Sanskrit)' },
];

export function LanguagePrefScreen() {
  const language = useUiStore((s) => s.language);
  const setLanguage = useUiStore((s) => s.setLanguage);

  return (
    <>
      <AppBar title="Language" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          {LANGS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLanguage(l.value)}
              aria-pressed={language === l.value}
              className="flex w-full items-center border-b border-border px-4 py-3 text-sm last:border-0"
            >
              <span className="flex-1 text-left">{l.label}</span>
              {language === l.value && <Check size={18} className="text-primary" />}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Hindi / Sanskrit are partially translated (preview).</p>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Wire the 2 routes in `src/app/router.tsx`**

Add imports:

```tsx
import { NotificationPrefsScreen } from '../screens/jajman/profile/NotificationPrefsScreen';
import { LanguagePrefScreen } from '../screens/jajman/profile/LanguagePrefScreen';
```

In the `AppPlainLayout` children array, add:

```tsx
      { path: '/app/profile/notifications', element: <NotificationPrefsScreen /> },
      { path: '/app/profile/language', element: <LanguagePrefScreen /> },
```

- [ ] **Step 4: Write the test** — `src/screens/jajman/profile/prefs-screens.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationPrefsScreen } from './NotificationPrefsScreen';
import { LanguagePrefScreen } from './LanguagePrefScreen';
import { useSessionStore } from '../../../store/sessionStore';
import { useUiStore } from '../../../store/uiStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useUiStore.setState(useUiStore.getInitialState());
});

describe('NotificationPrefsScreen', () => {
  it('toggles a preference in the session store', () => {
    render(<MemoryRouter><NotificationPrefsScreen /></MemoryRouter>);
    expect(useSessionStore.getState().notificationPrefs.promotions).toBe(false);
    fireEvent.click(screen.getByRole('switch', { name: 'Promotions' }));
    expect(useSessionStore.getState().notificationPrefs.promotions).toBe(true);
  });
});

describe('LanguagePrefScreen', () => {
  it('sets the app language to Hindi', () => {
    render(<MemoryRouter><LanguagePrefScreen /></MemoryRouter>);
    fireEvent.click(screen.getByText('हिन्दी (Hindi)'));
    expect(useUiStore.getState().language).toBe('hi');
  });
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- prefs-screens`
Expected: PASS — 2 assertions green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Notification preferences + Language preference screens"
```

---

### Task 7: Payment ledger + Payment history + Receipt

**Files:**
- Create: `src/domain/payments.ts`
- Create: `src/screens/jajman/profile/PaymentHistoryScreen.tsx`
- Create: `src/screens/jajman/profile/ReceiptScreen.tsx`
- Modify: `src/app/router.tsx` (`/app/profile/payments`, `/app/receipt/:bookingId`)
- Test: `src/domain/payments.test.ts`, `src/screens/jajman/profile/PaymentHistoryScreen.test.tsx`

**Interfaces:**
- Consumes: `Booking` (`src/mock/types`); `AppBar`, `BackButton`, `Card`, `Button`, `MoneyBreakdown`, `StatusPill`; `bookingStore` (`bookings`, `getBooking`); `dataStore` (`getPandit`, `getPuja`).
- Produces: `paymentEntries(bookings: Booking[]): PaymentEntry[]`, `PaymentEntry`, `PaymentKind`; `PaymentHistoryScreen`, `ReceiptScreen`.

- [ ] **Step 1: Write the failing test** — `src/domain/payments.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { paymentEntries } from './payments';
import { seedBookings } from '../mock/seed';

describe('paymentEntries (§M Payment history ledger)', () => {
  it('emits an advance row for a part-paid booking', () => {
    const b = seedBookings.find((x) => x.id === 'bkg-demo-1')!; // amountPaid == advance, not full
    const rows = paymentEntries([b]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ bookingId: 'bkg-demo-1', kind: 'advance', amount: b.advanceAmount });
  });

  it('emits advance + remaining rows for a fully-paid booking', () => {
    const b = seedBookings.find((x) => x.id === 'bkg-demo-4')!; // amountPaid == subtotal
    const rows = paymentEntries([b]);
    expect(rows.map((r) => r.kind).sort()).toEqual(['advance', 'remaining']);
    expect(rows.find((r) => r.kind === 'remaining')!.amount).toBe(b.charges.subtotal - b.advanceAmount);
  });

  it('emits a refund row when a booking was cancelled with a refund', () => {
    const b = seedBookings.find((x) => x.id === 'bkg-demo-1')!;
    const cancelled = { ...b, cancellation: { initiatedBy: 'jajman' as const, refundAmount: 274, platformCut: 14 } };
    const rows = paymentEntries([cancelled]);
    expect(rows.find((r) => r.kind === 'refund')!.amount).toBe(274);
  });

  it('skips unpaid bookings (amountPaid 0)', () => {
    const b = seedBookings.find((x) => x.id === 'bkg-demo-3')!; // requested, amountPaid 0
    expect(paymentEntries([b])).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- payments`
Expected: FAIL — cannot find module `./payments`.

- [ ] **Step 3: Implement `src/domain/payments.ts`**

```ts
import type { Booking } from '../mock/types';

export type PaymentKind = 'advance' | 'remaining' | 'refund';

export interface PaymentEntry {
  bookingId: string;
  kind: PaymentKind;
  amount: number;
  dateISO: string;
}

/**
 * Flatten bookings into a payment/refund ledger for the Payment History screen.
 * - advance: emitted once the advance has been paid (amountPaid >= advanceAmount).
 * - remaining: emitted once the booking is fully paid (amountPaid >= subtotal).
 * - refund: emitted when a cancellation produced a refund.
 * Newest first.
 */
export function paymentEntries(bookings: Booking[]): PaymentEntry[] {
  const entries: PaymentEntry[] = [];
  for (const b of bookings) {
    if (b.advanceAmount > 0 && b.amountPaid >= b.advanceAmount) {
      entries.push({ bookingId: b.id, kind: 'advance', amount: b.advanceAmount, dateISO: b.createdAt });
    }
    if (b.charges.subtotal > 0 && b.amountPaid >= b.charges.subtotal) {
      entries.push({ bookingId: b.id, kind: 'remaining', amount: b.charges.subtotal - b.advanceAmount, dateISO: b.pujaStartISO });
    }
    if (b.cancellation && b.cancellation.refundAmount > 0) {
      entries.push({ bookingId: b.id, kind: 'refund', amount: b.cancellation.refundAmount, dateISO: b.createdAt });
    }
  }
  return entries.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- payments`
Expected: PASS — 4 assertions green.

- [ ] **Step 5: Create `src/screens/jajman/profile/PaymentHistoryScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Receipt } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Card } from '../../../components/ui/Card';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';
import { paymentEntries } from '../../../domain/payments';

const KIND_LABEL = { advance: 'Advance', remaining: 'Remaining', refund: 'Refund' } as const;

export function PaymentHistoryScreen() {
  const navigate = useNavigate();
  const bookings = useBookingStore(useShallow((s) => s.bookings));
  const getPandit = useDataStore((s) => s.getPandit);
  const getPuja = useDataStore((s) => s.getPuja);
  const entries = paymentEntries(bookings);

  return (
    <>
      <AppBar title="Payment History" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Receipt size={36} className="text-muted" />
            <p className="text-sm text-muted">No payments yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((e, i) => {
              const b = bookings.find((x) => x.id === e.bookingId);
              const pandit = b ? getPandit(b.panditId) : undefined;
              const puja = b ? getPuja(b.pujaId) : undefined;
              return (
                <Card
                  key={`${e.bookingId}-${e.kind}-${i}`}
                  onClick={() => navigate(`/app/receipt/${e.bookingId}`)}
                  className="flex cursor-pointer items-center justify-between gap-2 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{puja?.name ?? 'Puja'}</p>
                    <p className="truncate text-xs text-muted">{pandit?.name ?? 'Pandit'} · {KIND_LABEL[e.kind]} · {e.dateISO.slice(0, 10)}</p>
                  </div>
                  <span className={e.kind === 'refund' ? 'shrink-0 font-semibold text-success' : 'shrink-0 font-semibold'}>
                    {e.kind === 'refund' ? '+' : ''}₹{e.amount}
                  </span>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 6: Create `src/screens/jajman/profile/ReceiptScreen.tsx`**

```tsx
import { useParams } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { MoneyBreakdown } from '../../../components/ui/MoneyBreakdown';
import { StatusPill } from '../../../components/ui/StatusPill';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';

export function ReceiptScreen() {
  const { bookingId = '' } = useParams();
  const booking = useBookingStore((s) => s.getBooking(bookingId));
  const pandit = useDataStore((s) => s.getPandit(booking?.panditId ?? ''));
  const puja = useDataStore((s) => s.getPuja(booking?.pujaId ?? ''));

  if (!booking) {
    return (
      <>
        <AppBar title="Receipt" left={<BackButton />} />
        <div className="flex-1 p-6 text-sm text-muted">Booking not found.</div>
      </>
    );
  }

  return (
    <>
      <AppBar title="Receipt" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold">{puja?.name ?? 'Puja'}</p>
            <p className="text-xs text-muted">{pandit?.name ?? 'Pandit'} · {booking.slotLabel}</p>
            <p className="text-xs text-muted">Booking {booking.id}</p>
          </div>
          <StatusPill status={booking.status} />
        </div>
        <MoneyBreakdown charges={booking.charges} advance={booking.advanceAmount} remaining={booking.remainingAmount} highlightAdvance={false} />
        <p className="mt-2 text-xs text-muted">
          Paid so far: ₹{booking.amountPaid}
          {booking.cancellation ? ` · Refund ₹${booking.cancellation.refundAmount} (platform cut ₹${booking.cancellation.platformCut})` : ''}
        </p>
        <Button variant="outline" className="mt-4 w-full">Download PDF (mock)</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 7: Wire the 2 routes in `src/app/router.tsx`**

Add imports:

```tsx
import { PaymentHistoryScreen } from '../screens/jajman/profile/PaymentHistoryScreen';
import { ReceiptScreen } from '../screens/jajman/profile/ReceiptScreen';
```

In the `AppPlainLayout` children array, add:

```tsx
      { path: '/app/profile/payments', element: <PaymentHistoryScreen /> },
      { path: '/app/receipt/:bookingId', element: <ReceiptScreen /> },
```

- [ ] **Step 8: Write the screen test** — `src/screens/jajman/profile/PaymentHistoryScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PaymentHistoryScreen } from './PaymentHistoryScreen';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';
import { seedBookings, seedCategories, seedPujas, seedPandits, seedReviews } from '../../../mock/seed';

beforeEach(() => {
  useBookingStore.setState({ bookings: seedBookings });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('PaymentHistoryScreen', () => {
  it('lists payment rows derived from seeded bookings', () => {
    render(<MemoryRouter><PaymentHistoryScreen /></MemoryRouter>);
    // bkg-demo-4 is fully paid → Advance + Remaining rows exist
    expect(screen.getAllByText(/Advance|Remaining/).length).toBeGreaterThan(0);
    expect(screen.getByText('Ganesh Puja')).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npm test -- payments PaymentHistoryScreen`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: payment ledger + Payment history + Receipt screens"
```

---

### Task 8: My reviews + Become-a-Pandit + integration walkthrough

**Files:**
- Create: `src/screens/jajman/profile/MyReviewsScreen.tsx`
- Create: `src/screens/jajman/profile/BecomePanditScreen.tsx`
- Modify: `src/app/router.tsx` (`/app/profile/reviews`, `/app/become-pandit`)
- Test: `src/screens/jajman/profile/MyReviewsScreen.test.tsx`, `src/app/profile-flow.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Button`, `ReviewRow`; `dataStore` (`getMyReviews`, `deleteReview`, `getPandit`); `sessionStore` (`panditStatus`, `becomePandit`).
- Produces: `MyReviewsScreen`, `BecomePanditScreen`.

- [ ] **Step 1: Create `src/screens/jajman/profile/MyReviewsScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Star } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { ReviewRow } from '../../../components/profile/ReviewRow';
import { useDataStore } from '../../../store/dataStore';

export function MyReviewsScreen() {
  const navigate = useNavigate();
  const reviews = useDataStore(useShallow((s) => s.getMyReviews()));
  const deleteReview = useDataStore((s) => s.deleteReview);
  const getPandit = useDataStore((s) => s.getPandit);

  return (
    <>
      <AppBar title="My Reviews" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Star size={36} className="text-muted" />
            <p className="text-sm text-muted">You haven't reviewed any puja yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <ReviewRow
                key={r.id}
                review={r}
                panditName={getPandit(r.panditId)?.name ?? 'Pandit'}
                onOpen={() => navigate(`/app/pandit/${r.panditId}`)}
                onDelete={() => deleteReview(r.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `src/screens/jajman/profile/BecomePanditScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { Sparkles, Wallet, Users, BadgeCheck } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { useSessionStore } from '../../../store/sessionStore';

export function BecomePanditScreen() {
  const navigate = useNavigate();
  const panditStatus = useSessionStore((s) => s.panditStatus);
  const becomePandit = useSessionStore((s) => s.becomePandit);

  if (panditStatus === 'pending') {
    return (
      <>
        <AppBar title="Become a Pandit" left={<BackButton />} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <BadgeCheck size={40} className="text-warning" />
          <p className="font-semibold">Awaiting admin approval</p>
          <p className="text-sm text-muted">Your pandit profile has been submitted. The full pandit dashboard arrives in a later build phase.</p>
          <Button onClick={() => navigate('/app/profile')}>Back to profile</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <AppBar title="Become a Pandit" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-lg bg-secondary/10 p-4 text-center">
          <Sparkles size={28} className="mx-auto text-secondary" />
          <h2 className="mt-2 font-semibold">Offer your services as a pandit</h2>
          <p className="text-sm text-muted">Earn, set your own charges, and reach devotees near you.</p>
        </div>
        <ul className="flex flex-col gap-3">
          <li className="flex items-center gap-3 text-sm"><Wallet size={18} className="shrink-0 text-primary" /> Set your own puja charges</li>
          <li className="flex items-center gap-3 text-sm"><Users size={18} className="shrink-0 text-primary" /> Reach devotees in your area</li>
          <li className="flex items-center gap-3 text-sm"><BadgeCheck size={18} className="shrink-0 text-primary" /> Steps: profile → pujas → availability → admin approval</li>
        </ul>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" onClick={() => { becomePandit(); navigate('/app/become-pandit', { replace: true }); }}>
          Start Pandit Onboarding
        </Button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Wire the 2 routes in `src/app/router.tsx`**

Add imports:

```tsx
import { MyReviewsScreen } from '../screens/jajman/profile/MyReviewsScreen';
import { BecomePanditScreen } from '../screens/jajman/profile/BecomePanditScreen';
```

In the `AppPlainLayout` children array, add:

```tsx
      { path: '/app/profile/reviews', element: <MyReviewsScreen /> },
      { path: '/app/become-pandit', element: <BecomePanditScreen /> },
```

- [ ] **Step 4: Write the screen test** — `src/screens/jajman/profile/MyReviewsScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MyReviewsScreen } from './MyReviewsScreen';
import { useDataStore } from '../../../store/dataStore';
import { seedCategories, seedPujas, seedPandits, seedReviews } from '../../../mock/seed';

beforeEach(() => {
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('MyReviewsScreen', () => {
  it('shows the seeded authored review and can delete it', () => {
    render(<MemoryRouter><MyReviewsScreen /></MemoryRouter>);
    // rev-mine-1 is authored for pnd-6 (Pandit Anil Shastri)
    expect(screen.getByText('Pandit Anil Shastri')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.queryByText('Pandit Anil Shastri')).not.toBeInTheDocument();
    expect(screen.getByText("You haven't reviewed any puja yet.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Write the integration walkthrough** — `src/app/profile-flow.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { useBookingStore } from '../store/bookingStore';
import { useDataStore } from '../store/dataStore';
import { seedAddresses } from '../mock/seed';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useBookingStore.setState({ addresses: seedAddresses });
  useDataStore.setState(useDataStore.getInitialState());
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('profile flow (integration)', () => {
  it('Profile tab → Addresses shows the saved addresses', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/profile'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByText('Addresses'));
    expect(screen.getByText('My Addresses')).toBeInTheDocument();
    expect(screen.getByText('Community temple')).toBeInTheDocument();
  });

  it('Become a Pandit → Start Onboarding moves the account to pending approval', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/become-pandit'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Pandit Onboarding' }));
    expect(screen.getByText('Awaiting admin approval')).toBeInTheDocument();
    expect(useSessionStore.getState().panditStatus).toBe('pending');
  });
});
```

- [ ] **Step 6: Run the full suite + typecheck + build (P2b gate)**

Run: `npm test`
Expected: PASS — all suites green, including the new `profile-components`, `ProfileScreen`, `AddressesListScreen`, `account-screens`, `prefs-screens`, `payments`, `PaymentHistoryScreen`, `MyReviewsScreen`, and `profile-flow`.

Run: `npm run typecheck && npm run build`
Expected: both PASS with no errors.

- [ ] **Step 7: Manual look check**

Run: `npm run dev`. Log in (any number → OTP `123456`). Tap the **Profile** tab and verify:
- Profile hub shows the header (tap → Edit profile), the mode-switcher card ("Become a Pandit"), and the menu list.
- Addresses: list shows the **Default** badge; add a new address (with "Set as default") → it becomes default; edit and delete work.
- Edit profile saves; Settings flips theme light↔dark and toggles phone-share default; Logout returns to splash/login.
- Notification preferences toggles persist; Language switches the radio selection.
- Payment history lists rows → tapping one opens the Receipt with a MoneyBreakdown.
- My reviews shows the seeded review and can delete it.
- "Become a Pandit" → "Start Pandit Onboarding" → "Awaiting admin approval".

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: My reviews + Become-a-Pandit entry + profile integration walkthrough (P2b complete)"
```

---

## Self-Review

**Spec coverage (P2b scope = §M Profile/Settings/Account + §I Addresses):**
- Profile view (§M) → Task 3 (`ProfileScreen`, `/app/profile` tab). ✔
- Edit profile (§M) → Task 5 (`EditProfileScreen`). ✔ (photo picker is a mock button; mobile read-only with "Verified" — OTP re-verify stub deferred.)
- Notification preferences (§M) → Task 6 (`NotificationPrefsScreen`, channel + type toggles, Email/Push disabled "Coming soon"). ✔
- Language preference (§M) → Task 6 (`LanguagePrefScreen`, EN/HI/SA radio with Devanagari labels). ✔
- Payment history (§M) → Task 7 (`PaymentHistoryScreen` over the `paymentEntries` ledger). ✔
- My reviews (§M) → Task 8 (`MyReviewsScreen`, view + delete; tap → Pandit detail). ✔ (review **edit** prefill deferred — see below.)
- Settings (§M) → Task 5 (`SettingsScreen`: Appearance theme, Privacy phone-visibility default, Security change-password link, About, Logout). ✔
- Become a Pandit entry (§M) → Task 8 (`BecomePanditScreen` + `becomePandit()` → pending). ✔
- Addresses list (§I) → Task 4 (`AddressesListScreen`, default badge, set-default, edit/delete, add). ✔
- Add/edit address (§I) → Task 4 (`AddressEditScreen` + `AddressForm` default toggle). ✔
- Receipt/Invoice (Appendix A) → Task 7 (`ReceiptScreen`, MoneyBreakdown + refund line + mock download). ✔
- Profile tab wiring (the dead `/app/profile` tab in `BottomTabBar`) → Task 3. ✔

**Deferred to later phases (correctly out of P2b scope, surfaced as disabled "Soon" rows on the Profile hub):** Referral (§K), Disputes (§L), Help/Support, Notifications center (§J) — these are P2c. Pandit surface (the target of "Switch to Pandit" / post-approval) is P3 — `BecomePanditScreen` deliberately ends at "Awaiting admin approval" instead of routing into the unbuilt pandit shell. Review **edit** (re-open the Rate screen prefilled) is deferred because the Rate flow is keyed by `bookingId`, not `reviewId`; My reviews supports view + delete now. Theme "System" option deferred (Settings offers Light/Dark over the existing two-mode token system). Map-pin/GPS autofill on the address form stays the existing decorative mock. None of these block the P2b deliverables.

**Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". Every code step contains complete, compilable code; every command lists its expected result. "Coming soon" on the Email/Push toggle and the disabled Profile rows are intentional product copy (matching the spec), not plan placeholders.

**Type consistency:** `Address.isDefault` and `Review.mine` (Task 1) are consumed unchanged by `AddressCard`/`AddressForm`/`AddressesListScreen` (Tasks 2,4) and `ReviewRow`/`MyReviewsScreen` (Tasks 2,8). `NotificationPrefs`/`defaultNotificationPrefs` + `setNotificationPref(key, value)` (Task 1) are consumed by `NotificationPrefsScreen` (Task 6). `updateProfile` (Task 1) → `EditProfileScreen` (Task 5). `uiStore.phoneShareDefault`/`setPhoneShareDefault` (Task 1) → `SettingsScreen` (Task 5). `bookingStore.setDefaultAddress`/`getDefaultAddress` (Task 1) → `AddressesListScreen` (Task 4). `dataStore.getMyReviews`/`deleteReview` (Task 1) → `MyReviewsScreen` (Task 8). `paymentEntries`/`PaymentEntry` (Task 7) → `PaymentHistoryScreen` (Task 7). Component prop names (`ToggleRow` `onChange`, `MenuRow` `onClick`, `AddressCard` `onSetDefault`, `ReviewRow` `onOpen/onDelete`) are used identically by their consumers. Route paths use the established `/app/*` prefix and the `AppLayout`/`AppPlainLayout` split consistently.
