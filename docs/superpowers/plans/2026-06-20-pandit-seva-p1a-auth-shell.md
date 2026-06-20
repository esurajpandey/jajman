# Pandit Seva — Phase 1a (Auth, Onboarding & App Shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the prototype walkable from cold start through authentication into the role home: Splash → Language → Welcome → Login (OTP or password) → (Register → Role → Permissions → Profile setup) → Jajman Home; plus Admin login → Admin home stub. Replace the P0 placeholder routing with a real `<Outlet>` layout shell, a mock session/auth store, and route guards per spec §0.1/§0.6.

**Architecture:** A `sessionStore` (zustand) holds auth state, the current user, and the active role. `RootRedirect` and guard wrappers (`RequireAuth`, `RequireGuest`) gate routes. Each surface is an `<Outlet>` layout route rendered once inside one `PhoneFrame` (no more per-route remount). Auth is fully mocked (fixed OTP `123456`, in-memory user); no real SMS/backend.

**Tech Stack:** Existing — React 18 + TS + Tailwind + zustand + react-router-dom 6 + lucide-react. Tests: Vitest + RTL.

**Builds on:** P0 foundation (already on `main`). Reuse existing primitives: `Button`, `Card`, `Badge`, `Avatar`, `AppBar`, `BottomTabBar`, `PhoneFrame`, `cn`, `useUiStore`, `useDataStore`, `translate`. Reference the spec's §0.1 routing and §1 auth-screen specs: `docs/superpowers/specs/2026-06-20-pandit-seva-mobile-ui-design.md`.

**Working directory:** all paths relative to `pandit-seva-app/` (branch `p1-auth-shell`).

**Carry-forward fixes folded in:** (a) `HomeScreen` consumes the store's `getApprovedPandits` helper via `useShallow` instead of an inline filter; (b) router becomes a layout route with `<Outlet/>` inside one `PhoneFrame`; (c) `panditTab` returns `'today'` for `in_progress` regardless of day.

---

### Task 1: Carry-forward fixes from P0 review

**Files:**
- Modify: `src/domain/booking.ts`
- Modify: `src/domain/booking.test.ts`
- Modify: `src/store/dataStore.ts`
- Modify: `src/screens/jajman/HomeScreen.tsx`
- Test: `src/screens/jajman/HomeScreen.test.tsx` (already passing — must keep passing)

- [ ] **Step 1: Tighten `panditTab` for `in_progress`** — in `src/domain/booking.ts`, change the body of `panditTab` so `in_progress` always maps to `'today'`. Replace the function with:

```ts
export function panditTab(
  status: BookingStatus,
  pujaStartISO: string,
  nowISO: string,
): PanditBookingTab | null {
  if (status === 'completed' || status === 'rated') return 'completed';
  if (status === 'in_progress') return 'today';
  if (status === 'accepted' || status === 'advance_paid' || status === 'scheduled') {
    const now = dayjs(nowISO);
    const start = dayjs(pujaStartISO);
    if (start.isSame(now, 'day')) return 'today';
    if (start.isAfter(now)) return 'upcoming';
    return 'today'; // past-but-not-started edge: surface for action today
  }
  return null;
}
```

(Remove the now-unused `LIVE_PANDIT_STATUSES` constant if present.)

- [ ] **Step 2: Add a regression test** — in `src/domain/booking.test.ts`, inside the `describe('panditTab ...')` block add:

```ts
  it("in_progress always maps to today, even with a future-day start", () => {
    expect(panditTab('in_progress', '2026-06-25T15:00:00.000Z', '2026-06-20T09:00:00.000Z')).toBe('today');
  });
```

- [ ] **Step 3: Run domain tests**

Run: `npm test -- domain`
Expected: PASS (all prior domain tests + the new one).

- [ ] **Step 4: Make `getApprovedPandits`/`getFeaturedPandits` the single source of truth in HomeScreen** — in `src/screens/jajman/HomeScreen.tsx`, replace the data-selector lines with the store helper consumed via `useShallow` (stable result, no infinite-loop risk):

```tsx
import { useShallow } from 'zustand/react/shallow';
// ...
  const categories = useDataStore((s) => s.categories);
  const pandits = useDataStore(useShallow((s) => s.getApprovedPandits()));
```

(Leave the rest of HomeScreen unchanged. `useShallow` does a shallow array compare so a fresh-but-equal array does not re-render.)

- [ ] **Step 5: Run the Home test + full suite**

Run: `npm test`
Expected: PASS — HomeScreen test still green (shows Featured Pandits, Katha, Pandit Ramesh Sharma; pending pandit absent), all 44 tests pass.

- [ ] **Step 6: Typecheck + commit**

Run: `npm run typecheck`
Expected: clean.

```bash
git add -A
git commit -m "refactor: tighten panditTab(in_progress); HomeScreen uses store helper via useShallow"
```

---

### Task 2: Session / auth store (mock)

**Files:**
- Create: `src/store/sessionStore.ts`
- Test: `src/store/sessionStore.test.ts`

- [ ] **Step 1: Write the failing test** — `src/store/sessionStore.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore, MOCK_OTP } from './sessionStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
});

describe('sessionStore', () => {
  it('starts unauthenticated as a guest jajman', () => {
    const s = useSessionStore.getState();
    expect(s.authed).toBe(false);
    expect(s.user).toBeNull();
    expect(s.activeRole).toBe('jajman');
  });

  it('verifyOtp succeeds with the mock code and authenticates a jajman', () => {
    const s = useSessionStore.getState();
    s.setPendingPhone('9876543210');
    const ok = useSessionStore.getState().verifyOtp(MOCK_OTP);
    expect(ok).toBe(true);
    const after = useSessionStore.getState();
    expect(after.authed).toBe(true);
    expect(after.user?.phone).toBe('9876543210');
    expect(after.user?.roles).toContain('jajman');
  });

  it('verifyOtp fails with a wrong code and stays unauthenticated', () => {
    useSessionStore.getState().setPendingPhone('9876543210');
    expect(useSessionStore.getState().verifyOtp('000000')).toBe(false);
    expect(useSessionStore.getState().authed).toBe(false);
  });

  it('loginAdmin authenticates with admin role + isAdmin', () => {
    useSessionStore.getState().loginAdmin();
    const s = useSessionStore.getState();
    expect(s.authed).toBe(true);
    expect(s.isAdmin).toBe(true);
    expect(s.activeRole).toBe('admin');
  });

  it('becomePandit adds the pandit role with pending status and switchMode works', () => {
    useSessionStore.getState().setPendingPhone('9876543210');
    useSessionStore.getState().verifyOtp(MOCK_OTP);
    useSessionStore.getState().becomePandit();
    expect(useSessionStore.getState().user?.roles).toContain('pandit');
    expect(useSessionStore.getState().panditStatus).toBe('pending');
    useSessionStore.getState().switchMode('pandit');
    expect(useSessionStore.getState().activeRole).toBe('pandit');
  });

  it('logout resets to guest', () => {
    useSessionStore.getState().loginAdmin();
    useSessionStore.getState().logout();
    expect(useSessionStore.getState().authed).toBe(false);
    expect(useSessionStore.getState().isAdmin).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- sessionStore`
Expected: FAIL — cannot find module `./sessionStore`.

- [ ] **Step 3: Implement `src/store/sessionStore.ts`**

```ts
import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type Role = 'jajman' | 'pandit' | 'admin';
export type PanditStatus = 'none' | 'pending' | 'approved' | 'rejected';

/** Mock OTP — any login uses this fixed code (no real SMS in the prototype). */
export const MOCK_OTP = '123456';

export interface SessionUser {
  id: string;
  name: string;
  phone: string;
  roles: Role[];
  profileComplete: boolean;
}

interface SessionState {
  authed: boolean;
  user: SessionUser | null;
  activeRole: Exclude<Role, 'admin'> | 'admin';
  isAdmin: boolean;
  panditStatus: PanditStatus;
  pendingPhone: string | null;
  pendingName: string | null; // set during register before OTP
  setPendingPhone: (phone: string | null) => void;
  setPendingName: (name: string | null) => void;
  verifyOtp: (code: string) => boolean;
  loginWithPassword: (phone: string, password: string) => boolean;
  loginAdmin: () => void;
  becomePandit: () => void;
  switchMode: (role: 'jajman' | 'pandit') => void;
  completeProfile: (patch?: Partial<SessionUser>) => void;
  logout: () => void;
}

function makeUser(phone: string, name: string): SessionUser {
  return { id: nanoid(8), name: name || 'Devotee', phone, roles: ['jajman'], profileComplete: false };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  authed: false,
  user: null,
  activeRole: 'jajman',
  isAdmin: false,
  panditStatus: 'none',
  pendingPhone: null,
  pendingName: null,

  setPendingPhone: (pendingPhone) => set({ pendingPhone }),
  setPendingName: (pendingName) => set({ pendingName }),

  verifyOtp: (code) => {
    if (code !== MOCK_OTP) return false;
    const phone = get().pendingPhone ?? '0000000000';
    const name = get().pendingName ?? 'Devotee';
    set({
      authed: true,
      user: makeUser(phone, name),
      activeRole: 'jajman',
      isAdmin: false,
      pendingPhone: null,
      pendingName: null,
    });
    return true;
  },

  loginWithPassword: (phone, password) => {
    if (!phone || password.length < 4) return false;
    set({ authed: true, user: makeUser(phone, 'Devotee'), activeRole: 'jajman', isAdmin: false });
    return true;
  },

  loginAdmin: () =>
    set({
      authed: true,
      user: { id: 'admin', name: 'Administrator', phone: '', roles: ['admin'], profileComplete: true },
      activeRole: 'admin',
      isAdmin: true,
    }),

  becomePandit: () =>
    set((s) => ({
      panditStatus: 'pending',
      user: s.user ? { ...s.user, roles: Array.from(new Set([...s.user.roles, 'pandit' as Role])) } : s.user,
    })),

  switchMode: (role) => set({ activeRole: role }),

  completeProfile: (patch) =>
    set((s) => ({ user: s.user ? { ...s.user, ...patch, profileComplete: true } : s.user })),

  logout: () =>
    set({
      authed: false,
      user: null,
      activeRole: 'jajman',
      isAdmin: false,
      panditStatus: 'none',
      pendingPhone: null,
      pendingName: null,
    }),
}));
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- sessionStore`
Expected: PASS — all 6 tests green. (`getInitialState()` is a built-in zustand store method usable to reset between tests.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: mock session/auth store (OTP, password, admin, become-pandit, mode switch)"
```

---

### Task 3: Auth form primitives (TextField, OtpInput, SegmentedControl, Stepper)

**Files:**
- Create: `src/components/ui/TextField.tsx`
- Create: `src/components/ui/OtpInput.tsx`
- Create: `src/components/ui/SegmentedControl.tsx`
- Create: `src/components/ui/Stepper.tsx`
- Test: `src/components/ui/forms.test.tsx`

- [ ] **Step 1: Create `src/components/ui/TextField.tsx`**

```tsx
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leading?: ReactNode;
}

export function TextField({ label, hint, error, leading, className, id, ...props }: TextFieldProps) {
  const inputId = id ?? props.name ?? label;
  return (
    <label htmlFor={inputId} className="block">
      {label && <span className="mb-1 block text-sm font-medium text-text">{label}</span>}
      <span
        className={cn(
          'flex h-12 items-center gap-2 rounded-md border bg-surface px-3',
          error ? 'border-error' : 'border-border focus-within:border-primary',
        )}
      >
        {leading && <span className="text-muted">{leading}</span>}
        <input
          id={inputId}
          className={cn('h-full w-full bg-transparent text-text outline-none placeholder:text-muted', className)}
          {...props}
        />
      </span>
      {error ? (
        <span className="mt-1 block text-xs text-error">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}
```

- [ ] **Step 2: Create `src/components/ui/OtpInput.tsx`** (6 boxes; controlled by a single string value)

```tsx
import { useRef } from 'react';
import { cn } from '../../lib/cn';

export function OtpInput({
  value,
  onChange,
  length = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setChar = (i: number, ch: string) => {
    const digits = value.split('');
    digits[i] = ch;
    const next = digits.join('').slice(0, length);
    onChange(next);
    if (ch && i < length - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div className="flex justify-between gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          value={value[i] ?? ''}
          onChange={(e) => setChar(i, e.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          className={cn(
            'h-12 w-11 rounded-md border border-border bg-surface text-center text-lg font-semibold text-text outline-none focus:border-primary',
          )}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/ui/SegmentedControl.tsx`**

```tsx
import { cn } from '../../lib/cn';

export interface Segment<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="flex rounded-md bg-surface-2 p-1">
      {segments.map((s) => (
        <button
          key={s.value}
          role="tab"
          type="button"
          aria-selected={value === s.value}
          onClick={() => onChange(s.value)}
          className={cn(
            'flex-1 rounded-[8px] py-2 text-sm font-medium transition',
            value === s.value ? 'bg-surface text-text shadow-card' : 'text-muted',
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/ui/Stepper.tsx`** (onboarding progress dots)

```tsx
import { cn } from '../../lib/cn';

export function Stepper({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn('h-1.5 rounded-full transition-all', i === current ? 'w-6 bg-primary' : 'w-1.5 bg-border')}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Write the test** — `src/components/ui/forms.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextField } from './TextField';
import { OtpInput } from './OtpInput';
import { SegmentedControl } from './SegmentedControl';

describe('auth form primitives', () => {
  it('TextField renders label and shows error over hint', () => {
    render(<TextField label="Mobile number" hint="10 digits" error="Required" name="mobile" />);
    expect(screen.getByText('Mobile number')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.queryByText('10 digits')).not.toBeInTheDocument();
  });

  it('OtpInput reports typed digits', () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Digit 1'), { target: { value: '1' } });
    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('SegmentedControl marks the selected segment and reports changes', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        segments={[{ value: 'otp', label: 'OTP' }, { value: 'pwd', label: 'Password' }]}
        value="otp"
        onChange={onChange}
      />,
    );
    const pwd = screen.getByRole('tab', { name: 'Password' });
    expect(pwd).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(pwd);
    expect(onChange).toHaveBeenCalledWith('pwd');
  });
});
```

- [ ] **Step 6: Run the test**

Run: `npm test -- forms`
Expected: PASS — 3 assertions green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: auth form primitives (TextField, OtpInput, SegmentedControl, Stepper)"
```

---

### Task 4: App-shell layout routes + guards + real RootRedirect

**Files:**
- Create: `src/components/shell/AppLayout.tsx`
- Create: `src/components/shell/AuthLayout.tsx`
- Create: `src/app/guards.tsx`
- Create: `src/app/RootRedirect.tsx`
- Modify: `src/app/router.tsx`
- Test: `src/app/guards.test.tsx`

- [ ] **Step 1: Create `src/components/shell/AppLayout.tsx`** (Jajman surface: Outlet body + bottom tabs, inside one PhoneFrame)

```tsx
import { Outlet } from 'react-router-dom';
import { PhoneFrame } from './PhoneFrame';
import { BottomTabBar } from './BottomTabBar';

/** Jajman surface layout: scrollable Outlet body + pinned bottom tabs. */
export function AppLayout() {
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Outlet />
      </div>
      <BottomTabBar />
    </PhoneFrame>
  );
}
```

- [ ] **Step 2: Create `src/components/shell/AuthLayout.tsx`** (auth/onboarding: Outlet only, no tab bar)

```tsx
import { Outlet } from 'react-router-dom';
import { PhoneFrame } from './PhoneFrame';

export function AuthLayout() {
  return (
    <PhoneFrame>
      <Outlet />
    </PhoneFrame>
  );
}
```

- [ ] **Step 3: Create `src/app/guards.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore';

/** Redirect to login if not authenticated. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const authed = useSessionStore((s) => s.authed);
  return authed ? <>{children}</> : <Navigate to="/auth/login" replace />;
}

/** Redirect authenticated users away from guest-only (auth) screens. */
export function RequireGuest({ children }: { children: ReactNode }) {
  const authed = useSessionStore((s) => s.authed);
  const isAdmin = useSessionStore((s) => s.isAdmin);
  if (authed) return <Navigate to={isAdmin ? '/admin/dashboard' : '/app/home'} replace />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Create `src/app/RootRedirect.tsx`** (spec §0.1)

```tsx
import { Navigate } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore';
import { useUiStore } from '../store/uiStore';

/** Splash target resolver: language → auth → role home. */
export function RootRedirect() {
  const authed = useSessionStore((s) => s.authed);
  const isAdmin = useSessionStore((s) => s.isAdmin);
  const activeRole = useSessionStore((s) => s.activeRole);
  const languageChosen = useUiStore((s) => s.languageChosen);

  if (!authed) return <Navigate to={languageChosen ? '/auth/welcome' : '/auth/language'} replace />;
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
  if (activeRole === 'pandit') return <Navigate to="/pandit/dashboard" replace />;
  return <Navigate to="/app/home" replace />;
}
```

> Note: this references `useUiStore.languageChosen`, added in Task 5 Step 1. Implement Task 5 Step 1 before running the app, or the selector returns `undefined` (falsy → routes to `/auth/language`, still valid).

- [ ] **Step 5: Write the failing test** — `src/app/guards.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth, RequireGuest } from './guards';
import { useSessionStore } from '../store/sessionStore';

beforeEach(() => useSessionStore.setState(useSessionStore.getInitialState()));

function harness(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/auth/login" element={<div>LOGIN</div>} />
        <Route path="/app/home" element={<div>HOME</div>} />
        <Route path="/protected" element={<RequireAuth><div>SECRET</div></RequireAuth>} />
        <Route path="/guest" element={<RequireGuest><div>GUESTONLY</div></RequireGuest>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('guards', () => {
  it('RequireAuth redirects a guest to login', () => {
    harness('/protected');
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('RequireAuth renders children when authed', () => {
    useSessionStore.getState().setPendingPhone('9');
    useSessionStore.getState().verifyOtp('123456');
    harness('/protected');
    expect(screen.getByText('SECRET')).toBeInTheDocument();
  });

  it('RequireGuest redirects an authed user to home', () => {
    useSessionStore.getState().setPendingPhone('9');
    useSessionStore.getState().verifyOtp('123456');
    harness('/guest');
    expect(screen.getByText('HOME')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npm test -- guards`
Expected: FAIL — cannot find module `./guards`.

- [ ] **Step 7: Rewrite `src/app/router.tsx`** to use layout routes + guards. The auth/app screens referenced here are created in Tasks 5–9; import them all now (the file won't typecheck until those exist — that's expected; Task 10 wires the final run).

```tsx
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/shell/AppLayout';
import { AuthLayout } from '../components/shell/AuthLayout';
import { RequireAuth, RequireGuest } from './guards';
import { RootRedirect } from './RootRedirect';
import { NotFound } from '../screens/shared/NotFound';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { LanguageScreen } from '../screens/auth/LanguageScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';
import { PasswordLoginScreen } from '../screens/auth/PasswordLoginScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ChangePasswordScreen } from '../screens/auth/ChangePasswordScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { RoleSelectScreen } from '../screens/auth/RoleSelectScreen';
import { PermissionsScreen } from '../screens/auth/PermissionsScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { AdminLoginScreen } from '../screens/admin/AdminLoginScreen';
import { HomeScreen } from '../screens/jajman/HomeScreen';

export const router = createBrowserRouter([
  { path: '/', element: <SplashScreen /> },
  { path: '/start', element: <RootRedirect /> },
  {
    element: (
      <RequireGuest>
        <AuthLayout />
      </RequireGuest>
    ),
    children: [
      { path: '/auth/language', element: <LanguageScreen /> },
      { path: '/auth/welcome', element: <WelcomeScreen /> },
      { path: '/auth/login', element: <LoginScreen /> },
      { path: '/auth/otp', element: <OtpScreen /> },
      { path: '/auth/password', element: <PasswordLoginScreen /> },
      { path: '/auth/forgot', element: <ForgotPasswordScreen /> },
      { path: '/auth/register', element: <RegisterScreen /> },
      { path: '/admin/login', element: <AdminLoginScreen /> },
    ],
  },
  // Onboarding steps require an authenticated (but maybe incomplete) account:
  {
    element: (
      <RequireAuth>
        <AuthLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/auth/role', element: <RoleSelectScreen /> },
      { path: '/auth/permissions', element: <PermissionsScreen /> },
      { path: '/auth/profile-setup', element: <ProfileSetupScreen /> },
      { path: '/auth/change-password', element: <ChangePasswordScreen /> },
    ],
  },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [{ path: '/app/home', element: <HomeScreen /> }],
  },
  { path: '*', element: <AuthLayout />, children: [{ path: '*', element: <NotFound /> }] },
]);
```

- [ ] **Step 8: Run the guards test (after Tasks 5–9 create screens, or temporarily) — for now verify guards module in isolation**

Run: `npm test -- guards`
Expected: PASS (the guards test does not import router.tsx, so it passes once `guards.tsx` exists).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: app/auth layout routes, RequireAuth/RequireGuest guards, RootRedirect"
```

---

### Task 5: Splash, Language, Welcome screens

**Files:**
- Modify: `src/store/uiStore.ts` (add `languageChosen`)
- Create: `src/screens/auth/SplashScreen.tsx`
- Create: `src/screens/auth/LanguageScreen.tsx`
- Create: `src/screens/auth/WelcomeScreen.tsx`

- [ ] **Step 1: Add `languageChosen` to `src/store/uiStore.ts`** — add the field + setter:
  - In `UiState`, add: `languageChosen: boolean;` and `chooseLanguage: (l: Language) => void;`
  - In the initial state add `languageChosen: false,`
  - Add the action: `chooseLanguage: (language) => set({ language, languageChosen: true }),`

- [ ] **Step 2: Create `src/screens/auth/SplashScreen.tsx`**

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../store/sessionStore';
import { useUiStore } from '../../store/uiStore';

export function SplashScreen() {
  const navigate = useNavigate();
  const authed = useSessionStore((s) => s.authed);
  const isAdmin = useSessionStore((s) => s.isAdmin);
  const activeRole = useSessionStore((s) => s.activeRole);
  const languageChosen = useUiStore((s) => s.languageChosen);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!authed) navigate(languageChosen ? '/auth/welcome' : '/auth/language', { replace: true });
      else if (isAdmin) navigate('/admin/dashboard', { replace: true });
      else if (activeRole === 'pandit') navigate('/pandit/dashboard', { replace: true });
      else navigate('/app/home', { replace: true });
    }, 1100);
    return () => clearTimeout(t);
  }, [authed, isAdmin, activeRole, languageChosen, navigate]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-gradient-to-b from-primary/15 to-bg">
      <div className="text-6xl" aria-hidden="true">ॐ</div>
      <h1 className="text-2xl font-bold text-primary">Pandit Seva</h1>
      <p className="text-sm text-muted">Book trusted pandits for every occasion</p>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/screens/auth/LanguageScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useUiStore, type Language } from '../../store/uiStore';
import { cn } from '../../lib/cn';

const LANGS: { value: Language; label: string; native: string }[] = [
  { value: 'en', label: 'English', native: 'English' },
  { value: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { value: 'sa', label: 'Sanskrit', native: 'संस्कृतम्' },
];

export function LanguageScreen() {
  const navigate = useNavigate();
  const language = useUiStore((s) => s.language);
  const chooseLanguage = useUiStore((s) => s.chooseLanguage);

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-xl font-bold">Choose your language</h1>
      <p className="mt-1 text-sm text-muted">You can change this later in settings.</p>
      <div className="mt-6 flex flex-col gap-3">
        {LANGS.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => chooseLanguage(l.value)}
            className={cn(
              'flex items-center justify-between rounded-md border p-4 text-left',
              language === l.value ? 'border-primary bg-primary/5' : 'border-border bg-surface',
            )}
          >
            <span>
              <span className="block font-medium">{l.native}</span>
              <span className="block text-xs text-muted">{l.label}</span>
            </span>
            {language === l.value && <Check size={18} className="text-primary" />}
          </button>
        ))}
      </div>
      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={() => navigate('/auth/welcome')}
          className="h-12 w-full rounded-md bg-primary font-medium text-primary-fg"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/screens/auth/WelcomeScreen.tsx`** (simple value-prop carousel via state index)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper } from '../../components/ui/Stepper';

const SLIDES = [
  { icon: '🔍', title: 'Find trusted pandits', body: 'Search nearby verified pandits by puja, language, and price.' },
  { icon: '📅', title: 'Book in a few taps', body: 'Pick a slot, share details, pay an advance — all in the app.' },
  { icon: '🙏', title: 'Celebrate with peace', body: 'Chat, coordinate, rate. Rebook your favourites anytime.' },
];

export function WelcomeScreen() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="flex justify-end">
        <button type="button" onClick={() => navigate('/auth/login')} className="text-sm text-muted">
          Skip
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="text-7xl" aria-hidden="true">{slide.icon}</div>
        <h1 className="mt-6 text-2xl font-bold">{slide.title}</h1>
        <p className="mt-2 max-w-xs text-muted">{slide.body}</p>
      </div>
      <div className="flex items-center justify-center pb-6">
        <Stepper total={SLIDES.length} current={i} />
      </div>
      <button
        type="button"
        onClick={() => (last ? navigate('/auth/login') : setI(i + 1))}
        className="h-12 w-full rounded-md bg-primary font-medium text-primary-fg"
      >
        {last ? 'Get started' : 'Next'}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck + commit** (these screens are not yet routable until Task 4's router compiles with all screens; commit anyway)

Run: `npm run typecheck`
Expected: errors only for not-yet-created auth screens imported by router.tsx (Tasks 6–9). The three screens in this task themselves compile.

```bash
git add -A
git commit -m "feat: splash, language select, welcome carousel screens + uiStore.languageChosen"
```

---

### Task 6: Mobile login + OTP verify

**Files:**
- Create: `src/screens/auth/LoginScreen.tsx`
- Create: `src/screens/auth/OtpScreen.tsx`

- [ ] **Step 1: Create `src/screens/auth/LoginScreen.tsx`** (mobile number → OTP, with a tab to password + register link + admin link)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useSessionStore } from '../../store/sessionStore';

export function LoginScreen() {
  const navigate = useNavigate();
  const setPendingPhone = useSessionStore((s) => s.setPendingPhone);
  const [phone, setPhone] = useState('');
  const valid = /^\d{10}$/.test(phone);

  const sendOtp = () => {
    if (!valid) return;
    setPendingPhone(phone);
    navigate('/auth/otp');
  };

  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="text-3xl" aria-hidden="true">🙏</div>
      <h1 className="mt-3 text-xl font-bold">Login or sign up</h1>
      <p className="mt-1 text-sm text-muted">We'll send a one-time code to your mobile.</p>

      <div className="mt-6">
        <TextField
          label="Mobile number"
          name="mobile"
          inputMode="numeric"
          maxLength={10}
          placeholder="10-digit number"
          leading={<Phone size={16} />}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      <Button className="mt-5 w-full" disabled={!valid} onClick={sendOtp}>
        Send OTP
      </Button>

      <button type="button" onClick={() => navigate('/auth/password')} className="mt-4 text-sm text-primary">
        Use password instead
      </button>

      <div className="mt-auto flex flex-col items-center gap-2 pt-6 text-sm">
        <button type="button" onClick={() => navigate('/auth/register')} className="text-muted">
          New here? <span className="font-medium text-primary">Create an account</span>
        </button>
        <button type="button" onClick={() => navigate('/admin/login')} className="text-xs text-muted underline">
          Admin login
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/screens/auth/OtpScreen.tsx`** (uses OtpInput + MOCK_OTP; success → onboarding or home)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { OtpInput } from '../../components/ui/OtpInput';
import { Button } from '../../components/ui/Button';
import { useSessionStore, MOCK_OTP } from '../../store/sessionStore';

export function OtpScreen() {
  const navigate = useNavigate();
  const pendingPhone = useSessionStore((s) => s.pendingPhone);
  const verifyOtp = useSessionStore((s) => s.verifyOtp);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (verifyOtp(code)) navigate('/auth/role', { replace: true });
    else setError('Incorrect code. Try the demo code below.');
  };

  return (
    <div className="flex flex-1 flex-col p-6">
      <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="text-muted">
        <ArrowLeft size={20} />
      </button>
      <h1 className="mt-4 text-xl font-bold">Verify your number</h1>
      <p className="mt-1 text-sm text-muted">
        Enter the 6-digit code sent to {pendingPhone ?? 'your phone'}.
      </p>

      <div className="mt-6">
        <OtpInput value={code} onChange={(v) => { setCode(v); setError(''); }} />
        {error && <p className="mt-2 text-xs text-error">{error}</p>}
      </div>

      <div className="mt-3 rounded-md bg-surface-2 p-3 text-xs text-muted">
        Demo: use code <span className="font-semibold text-text">{MOCK_OTP}</span> (no real SMS is sent).
      </div>

      <Button className="mt-5 w-full" disabled={code.length !== 6} onClick={submit}>
        Verify & continue
      </Button>
      <button type="button" className="mt-4 text-center text-sm text-muted">Resend code</button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: mobile login + OTP verification screens (mock OTP)"
```

---

### Task 7: Password login, Forgot password, Change password

**Files:**
- Create: `src/screens/auth/PasswordLoginScreen.tsx`
- Create: `src/screens/auth/ForgotPasswordScreen.tsx`
- Create: `src/screens/auth/ChangePasswordScreen.tsx`

- [ ] **Step 1: Create `src/screens/auth/PasswordLoginScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Lock } from 'lucide-react';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useSessionStore } from '../../store/sessionStore';

export function PasswordLoginScreen() {
  const navigate = useNavigate();
  const loginWithPassword = useSessionStore((s) => s.loginWithPassword);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (loginWithPassword(phone, password)) navigate('/app/home', { replace: true });
    else setError('Enter a valid number and a password of at least 4 characters.');
  };

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-xl font-bold">Login with password</h1>
      <div className="mt-6 flex flex-col gap-4">
        <TextField label="Mobile number" name="phone" inputMode="numeric" maxLength={10}
          leading={<Phone size={16} />} value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
        <TextField label="Password" name="password" type="password" leading={<Lock size={16} />}
          value={password} onChange={(e) => setPassword(e.target.value)} error={error || undefined} />
      </div>
      <button type="button" onClick={() => navigate('/auth/forgot')} className="mt-3 self-start text-sm text-primary">
        Forgot password?
      </button>
      <Button className="mt-5 w-full" onClick={submit}>Login</Button>
      <button type="button" onClick={() => navigate('/auth/login')} className="mt-4 text-center text-sm text-primary">
        Use OTP instead
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/screens/auth/ForgotPasswordScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone } from 'lucide-react';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <div className="flex flex-1 flex-col p-6">
      <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="text-muted">
        <ArrowLeft size={20} />
      </button>
      <h1 className="mt-4 text-xl font-bold">Reset your password</h1>
      <p className="mt-1 text-sm text-muted">We'll send a reset link to your registered mobile.</p>
      <div className="mt-6">
        <TextField label="Mobile number" name="phone" inputMode="numeric" maxLength={10}
          leading={<Phone size={16} />} value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
      </div>
      {sent ? (
        <p className="mt-5 rounded-md bg-success/10 p-3 text-sm text-success">
          Reset link sent (demo). Check your messages.
        </p>
      ) : (
        <Button className="mt-5 w-full" disabled={!/^\d{10}$/.test(phone)} onClick={() => setSent(true)}>
          Send reset link
        </Button>
      )}
      <button type="button" onClick={() => navigate('/auth/login')} className="mt-4 text-center text-sm text-primary">
        Back to login
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/screens/auth/ChangePasswordScreen.tsx`** (reached from Settings later; reset-mode supported)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';

export function ChangePasswordScreen() {
  const navigate = useNavigate();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const mismatch = confirm.length > 0 && next !== confirm;

  return (
    <div className="flex flex-1 flex-col p-6">
      <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="text-muted">
        <ArrowLeft size={20} />
      </button>
      <h1 className="mt-4 text-xl font-bold">Change password</h1>
      <div className="mt-6 flex flex-col gap-4">
        <TextField label="New password" name="new" type="password" leading={<Lock size={16} />}
          value={next} onChange={(e) => setNext(e.target.value)} hint="At least 4 characters" />
        <TextField label="Confirm password" name="confirm" type="password" leading={<Lock size={16} />}
          value={confirm} onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? 'Passwords do not match' : undefined} />
      </div>
      {done && <p className="mt-4 text-sm text-success">Password updated (demo).</p>}
      <Button className="mt-5 w-full" disabled={next.length < 4 || mismatch} onClick={() => setDone(true)}>
        Update password
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: password login, forgot-password, change-password screens"
```

---

### Task 8: Register + Role select

**Files:**
- Create: `src/screens/auth/RegisterScreen.tsx`
- Create: `src/screens/auth/RoleSelectScreen.tsx`

- [ ] **Step 1: Create `src/screens/auth/RegisterScreen.tsx`** (name + mobile → OTP)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone } from 'lucide-react';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useSessionStore } from '../../store/sessionStore';

export function RegisterScreen() {
  const navigate = useNavigate();
  const setPendingPhone = useSessionStore((s) => s.setPendingPhone);
  const setPendingName = useSessionStore((s) => s.setPendingName);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const valid = name.trim().length > 1 && /^\d{10}$/.test(phone);

  const next = () => {
    if (!valid) return;
    setPendingName(name.trim());
    setPendingPhone(phone);
    navigate('/auth/otp');
  };

  return (
    <div className="flex flex-1 flex-col p-6">
      <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="text-muted">
        <ArrowLeft size={20} />
      </button>
      <h1 className="mt-4 text-xl font-bold">Create your account</h1>
      <div className="mt-6 flex flex-col gap-4">
        <TextField label="Full name" name="name" leading={<User size={16} />}
          value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Mobile number" name="phone" inputMode="numeric" maxLength={10}
          leading={<Phone size={16} />} value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
      </div>
      <Button className="mt-5 w-full" disabled={!valid} onClick={next}>Continue</Button>
      <button type="button" onClick={() => navigate('/auth/login')} className="mt-4 text-center text-sm text-primary">
        I already have an account
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/screens/auth/RoleSelectScreen.tsx`** ("How will you use the app?" — spec §3 single-account model)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartHandshake, Flame } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useSessionStore } from '../../store/sessionStore';
import { cn } from '../../lib/cn';

type Choice = 'jajman' | 'both';

export function RoleSelectScreen() {
  const navigate = useNavigate();
  const becomePandit = useSessionStore((s) => s.becomePandit);
  const [choice, setChoice] = useState<Choice>('jajman');

  const cont = () => {
    if (choice === 'both') becomePandit(); // adds pandit role (pending); pandit onboarding lives in P3
    navigate('/auth/permissions');
  };

  const opt = (value: Choice, icon: React.ReactNode, title: string, body: string) => (
    <button
      type="button"
      onClick={() => setChoice(value)}
      className={cn(
        'flex items-start gap-3 rounded-md border p-4 text-left',
        choice === value ? 'border-primary bg-primary/5' : 'border-border bg-surface',
      )}
    >
      <span className="text-primary">{icon}</span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted">{body}</span>
      </span>
    </button>
  );

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-xl font-bold">How will you use Pandit Seva?</h1>
      <p className="mt-1 text-sm text-muted">You can switch modes anytime later.</p>
      <div className="mt-6 flex flex-col gap-3">
        {opt('jajman', <HeartHandshake size={22} />, 'Book pandits (Jajman)', 'Find and book pandits for your pujas and ceremonies.')}
        {opt('both', <Flame size={22} />, 'I am also a Pandit', 'Offer your services too — set up your pandit profile next (admin approval needed).')}
      </div>
      <Button className="mt-auto w-full" onClick={cont}>Continue</Button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: register + role-select (single-account model) screens"
```

---

### Task 9: Permissions priming + Profile setup

**Files:**
- Create: `src/screens/auth/PermissionsScreen.tsx`
- Create: `src/screens/auth/ProfileSetupScreen.tsx`

- [ ] **Step 1: Create `src/screens/auth/PermissionsScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { MapPin, Bell } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function PermissionsScreen() {
  const navigate = useNavigate();
  const row = (icon: React.ReactNode, title: string, body: string) => (
    <div className="flex items-start gap-3 rounded-md border border-border bg-surface p-4">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted">{body}</p>
      </div>
    </div>
  );
  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-xl font-bold">A couple of permissions</h1>
      <p className="mt-1 text-sm text-muted">These help us match nearby pandits and keep you updated.</p>
      <div className="mt-6 flex flex-col gap-3">
        {row(<MapPin size={20} />, 'Location', 'Find pandits near your address and show travel distance.')}
        {row(<Bell size={20} />, 'Notifications', 'Booking updates, pandit responses, and reminders.')}
      </div>
      <div className="mt-auto flex flex-col gap-2 pt-6">
        <Button className="w-full" onClick={() => navigate('/auth/profile-setup')}>Allow & continue</Button>
        <button type="button" onClick={() => navigate('/auth/profile-setup')} className="text-center text-sm text-muted">
          Not now
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/screens/auth/ProfileSetupScreen.tsx`** (completes onboarding → Home)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/ui/Avatar';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useSessionStore } from '../../store/sessionStore';

export function ProfileSetupScreen() {
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const completeProfile = useSessionStore((s) => s.completeProfile);
  const [name, setName] = useState(user?.name ?? '');

  const finish = () => {
    completeProfile({ name: name.trim() || 'Devotee' });
    navigate('/app/home', { replace: true });
  };

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-xl font-bold">Set up your profile</h1>
      <p className="mt-1 text-sm text-muted">This is how pandits will see you.</p>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Avatar name={name || 'You'} size={84} />
        <button type="button" className="text-sm text-primary">Add a photo</button>
      </div>

      <div className="mt-6">
        <TextField label="Full name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <Button className="mt-auto w-full" onClick={finish}>Finish</Button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: permissions priming + profile setup screens"
```

---

### Task 10: Admin login + wire-up + end-to-end walkthrough test

**Files:**
- Create: `src/screens/admin/AdminLoginScreen.tsx`
- Test: `src/app/auth-flow.test.tsx`

- [ ] **Step 1: Create `src/screens/admin/AdminLoginScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useSessionStore } from '../../store/sessionStore';

export function AdminLoginScreen() {
  const navigate = useNavigate();
  const loginAdmin = useSessionStore((s) => s.loginAdmin);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgot, setForgot] = useState(false);

  const submit = () => {
    loginAdmin(); // mock: any non-empty credentials
    navigate('/admin/dashboard', { replace: true });
  };

  return (
    <div className="flex flex-1 flex-col p-6">
      <button type="button" onClick={() => navigate('/auth/login')} aria-label="Back" className="text-muted">
        <ArrowLeft size={20} />
      </button>
      <h1 className="mt-4 text-xl font-bold">Admin console</h1>
      <p className="mt-1 text-sm text-muted">Restricted access.</p>
      <div className="mt-6 flex flex-col gap-4">
        <TextField label="Email" name="email" type="email" leading={<Mail size={16} />}
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" name="password" type="password" leading={<Lock size={16} />}
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button type="button" onClick={() => setForgot(true)} className="mt-3 self-start text-sm text-primary">
        Forgot password?
      </button>
      {forgot && <p className="mt-1 text-xs text-muted">Reset link sent to super-admin (demo).</p>}
      <Button className="mt-5 w-full" disabled={!email || !password} onClick={submit}>Sign in</Button>
    </div>
  );
}
```

> Note: `/admin/dashboard` is built in Phase 4. Until then, navigating there hits the `*` NotFound ("Coming soon") — acceptable for P1a. The walkthrough test below stops at the redirect intent, not the dashboard.

- [ ] **Step 2: Write the end-to-end walkthrough test** — `src/app/auth-flow.test.tsx` (drives the real router through OTP login to Home)

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore';
import { useUiStore } from '../store/uiStore';

// Rebuild the route tree against a memory router for testing.
import { routes } from './routes';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useUiStore.setState({ ...useUiStore.getState(), languageChosen: true, language: 'en' });
});

describe('auth flow', () => {
  it('logs in via OTP and lands on Home', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/auth/login'] });
    render(<RouterProvider router={router} />);

    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));

    // OTP screen
    await screen.findByText(/Verify your number/);
    for (let i = 0; i < 6; i++) {
      fireEvent.change(screen.getByLabelText(`Digit ${i + 1}`), { target: { value: '1' } });
    }
    // value is now 111111 -> wrong; fix by typing the mock code 123456
    '123456'.split('').forEach((d, i) => {
      fireEvent.change(screen.getByLabelText(`Digit ${i + 1}`), { target: { value: d } });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify & continue' }));

    // Role select -> continue -> permissions -> profile setup -> home
    await screen.findByText(/How will you use Pandit Seva/);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByText(/A couple of permissions/);
    fireEvent.click(screen.getByRole('button', { name: 'Allow & continue' }));
    await screen.findByText(/Set up your profile/);
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    await waitFor(() => expect(screen.getByText('Featured Pandits')).toBeInTheDocument());
    expect(useSessionStore.getState().authed).toBe(true);
  });
});
```

- [ ] **Step 3: Extract the route array so it is testable** — refactor `src/app/router.tsx` to export the `routes` array and build the browser router from it:

In `src/app/router.tsx`, change the end from `export const router = createBrowserRouter([ ... ]);` to:

```tsx
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
// ...imports unchanged...

export const routes: RouteObject[] = [
  // ...exact same array contents as before...
];

export const router = createBrowserRouter(routes);
```

(Move the array literal into `routes`, then pass it to `createBrowserRouter`. The `auth-flow.test.tsx` imports `{ routes }`.)

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — sessionStore, guards, forms, auth-flow, plus all P0 suites. (If the OTP test's digit-fill ordering is flaky, ensure the second loop sets the final value to `123456`.)

- [ ] **Step 5: Typecheck + build + dev smoke**

Run: `npm run typecheck && npm run build`
Expected: both PASS.

Run: boot `npm run dev` in the background, curl `http://localhost:5173/` → 200, then stop it.
Expected: serves OK; the app opens on Splash and redirects to Language/Welcome.

- [ ] **Step 6: Confirm git hygiene + commit**

Run: `git status --porcelain` (clean) and `git ls-files | grep -E 'tsbuildinfo|vite\.config\.(js|d\.ts)'` (empty).

```bash
git add -A
git commit -m "feat: admin login + testable route array + auth-flow walkthrough test (P1a complete)"
```

---

## Self-Review

**Spec coverage (P1a = auth/onboarding + shell + guards):**
- §0.1 routing (auth `/auth/*`, jajman `/app/*`, admin login `/admin/login`) → Task 4 router. ✔
- RootRedirect role logic (§0.1) → Tasks 4 + 5 (Splash mirrors it). ✔
- Auth screens (splash, language, welcome, mobile login, OTP, password, forgot, change-password, register, role select, permissions, profile setup) + admin login → Tasks 5–10. ✔
- Single-account model / become-pandit (§0.6, role added at choice with `pending` status) → Task 2 + Task 8. ✔
- Mock OTP `123456` (spec out-of-scope: no real SMS) → Task 2 + Task 6. ✔
- Layout-route refactor + guards (P0 carry-forward) → Tasks 1, 4. ✔
- HomeScreen store-helper consolidation + `panditTab` tighten (P0 carry-forward) → Task 1. ✔

**Deferred (correct for P1a):** full pandit onboarding wizard + approval gate UI (P3); admin dashboard target of admin login (P4) — until then admin login redirect hits the "Coming soon" NotFound, documented in Task 10 Step 1. i18n strings remain English-literal in these screens; a later i18n pass (P5) swaps to `translate()` keys.

**Placeholder scan:** No "TBD"/"add validation later" — every screen and step has complete code or an exact command + expected output. The "Coming soon" NotFound and "(demo)" copy are intentional prototype affordances, not plan placeholders.

**Type consistency:** `Role`/`SessionUser`/`MOCK_OTP` (Task 2) are used by guards (Task 4), screens (Tasks 6–10), and tests. `Language`/`languageChosen`/`chooseLanguage` (Task 5 Step 1) used by RootRedirect/Splash/Language. `TextField`/`OtpInput`/`SegmentedControl`/`Stepper` (Task 3) consumed across Tasks 5–10. The `routes` export (Task 10 Step 3) is consumed by `auth-flow.test.tsx`. Existing P0 exports (`Button`, `Avatar`, `PhoneFrame`, `BottomTabBar`, `useUiStore`, `useDataStore`) are reused unchanged.
