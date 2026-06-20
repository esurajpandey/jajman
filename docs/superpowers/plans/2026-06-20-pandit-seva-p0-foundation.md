# Pandit Seva — Phase 0 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Pandit Seva interactive-prototype skeleton — a themeable (light/dark) phone-frame React app with the "warm premium hybrid" design system, the mock-data store, the §0-normative logic utilities (refund / status / expiry), and ONE fully-styled sample screen (Jajman Home) for a look sign-off.

**Architecture:** Vite + React + TypeScript SPA. Styling via Tailwind CSS driven by CSS-variable design tokens (theme switch flips `data-theme` on `<html>`). State in zustand (`uiStore` for theme/lang, `dataStore` for seeded mock entities). Pure domain logic (refund, status→tab, request-expiry) lives in framework-free modules with unit tests. Routing via react-router; everything renders inside a `PhoneFrame` shell.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS 3, zustand 4, react-router-dom 6, lucide-react, dayjs, clsx + tailwind-merge. Tests: Vitest + React Testing Library + jsdom.

**Reference spec:** `docs/superpowers/specs/2026-06-20-pandit-seva-mobile-ui-design.md` (esp. §0 Conventions, §1 Design System, §1 Navigation).

**Working directory:** all paths are relative to `pandit-seva-app/` (the repo root that already contains `docs/`).

---

### Task 1: Scaffold the Vite + React + TS project

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `.gitignore`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/vite-env.d.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "pandit-seva-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "dayjs": "^1.11.13",
    "lucide-react": "^0.439.0",
    "nanoid": "^5.0.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "tailwind-merge": "^2.5.2",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.12",
    "typescript": "^5.5.4",
    "vite": "^5.4.6",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Pandit Seva</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `vite.config.ts`** (Vitest config is colocated here)

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules
dist
dist-ssr
*.local
.DS_Store
coverage
```

- [ ] **Step 7: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 8: Create a placeholder `src/App.tsx`** (replaced in Task 13)

```tsx
export default function App() {
  return <div>Pandit Seva — bootstrapping…</div>;
}
```

- [ ] **Step 9: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

> Note: `src/index.css` is created in Task 3. Do not run `dev` until after Task 3.

- [ ] **Step 10: Install dependencies**

Run: `npm install`
Expected: completes with `node_modules/` populated, no peer-dependency errors that abort the install.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS project"
```

---

### Task 2: Wire up the test runner

**Files:**
- Create: `src/test/setup.ts`
- Test: `src/test/smoke.test.ts`

- [ ] **Step 1: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 2: Write a failing smoke test** — `src/test/smoke.test.ts`

```ts
import { describe, it, expect } from 'vitest';

describe('test runner', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npm test`
Expected: PASS — 1 passed (the runner and jsdom env load without error).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: configure vitest + testing-library"
```

---

### Task 3: Design tokens + Tailwind (warm premium hybrid)

**Files:**
- Create: `postcss.config.js`
- Create: `tailwind.config.js`
- Create: `src/theme/tokens.css`
- Create: `src/index.css`

- [ ] **Step 1: Create `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 2: Create `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        text: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
        border: 'var(--color-border)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          600: 'var(--color-primary-600)',
          fg: 'var(--color-primary-fg)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          fg: 'var(--color-secondary-fg)',
        },
        accent: 'var(--color-accent)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
      },
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '24px' },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', '"Noto Sans Devanagari"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(42,35,32,0.06), 0 1px 2px rgba(42,35,32,0.04)',
        float: '0 8px 24px rgba(42,35,32,0.14)',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Create `src/theme/tokens.css`** (light + dark, from spec §1 Design System)

```css
:root {
  --color-bg: #fbf7f0;
  --color-surface: #ffffff;
  --color-surface-2: #f4eee3;
  --color-text: #2a2320;
  --color-text-muted: #7a6f66;
  --color-border: #e7decf;
  --color-primary: #e8801a;
  --color-primary-600: #c96a12;
  --color-primary-fg: #ffffff;
  --color-secondary: #7a1f2b;
  --color-secondary-fg: #ffffff;
  --color-accent: #c9a227;
  --color-success: #2e7d5b;
  --color-warning: #c9831a;
  --color-error: #c0392b;
  --color-info: #2d6cb5;
}

[data-theme='dark'] {
  --color-bg: #171311;
  --color-surface: #211b18;
  --color-surface-2: #2a2320;
  --color-text: #f3ece2;
  --color-text-muted: #b5a99d;
  --color-border: #3a312b;
  --color-primary: #f59b36;
  --color-primary-600: #e8801a;
  --color-primary-fg: #241a12;
  --color-secondary: #c75b68;
  --color-secondary-fg: #1b1012;
  --color-accent: #d9b84a;
  --color-success: #56b98c;
  --color-warning: #e0a84b;
  --color-error: #e07a6f;
  --color-info: #5e97d6;
}
```

- [ ] **Step 4: Create `src/index.css`** (token import MUST precede the Tailwind directives)

```css
@import './theme/tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body,
#root {
  height: 100%;
}

body {
  @apply bg-bg text-text font-sans antialiased;
}

/* hide horizontal scrollbars on chip rows */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

- [ ] **Step 5: Verify the dev build compiles**

Run: `npm run build`
Expected: `tsc -b` passes and `vite build` emits `dist/` with no Tailwind/PostCSS errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add design tokens + tailwind (warm premium hybrid)"
```

---

### Task 4: Domain types (shared, framework-free)

**Files:**
- Create: `src/domain/types.ts`

- [ ] **Step 1: Create `src/domain/types.ts`** (locks §0.2 status enum + §0.8 pricing config)

```ts
export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'advance_paid'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'rated'
  | 'rejected'
  | 'cancelled'
  | 'refund_initiated'
  | 'refund_completed'
  | 'expired';

export type JajmanBookingTab = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type PanditBookingTab = 'today' | 'upcoming' | 'completed';

export type CancelInitiator = 'jajman' | 'pandit';

export interface PricingConfig {
  advancePercent: number;
  cancellationCutPct: number;
  emergencySurchargePct: number;
  emergencyBufferMins: number;
  cancellationLeadMins: number;
}

export const defaultPricingConfig: PricingConfig = {
  advancePercent: 30,
  cancellationCutPct: 5,
  emergencySurchargePct: 20,
  emergencyBufferMins: 60,
  cancellationLeadMins: 120,
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add shared domain types + pricing config"
```

---

### Task 5: Money utilities — refund + advance (§0.3, §0.8)

**Files:**
- Create: `src/domain/money.ts`
- Test: `src/domain/money.test.ts`

- [ ] **Step 1: Write the failing test** — `src/domain/money.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { computeRefund, computeAdvance } from './money';

describe('computeRefund (§0.3 — 5% of amount PAID)', () => {
  it('jajman-initiated retains 5% of amount paid', () => {
    expect(computeRefund(1000, 'jajman')).toEqual({ refundAmount: 950, platformCut: 50 });
  });

  it('pandit-initiated refunds the full amount paid (no cut)', () => {
    expect(computeRefund(1000, 'pandit')).toEqual({ refundAmount: 1000, platformCut: 0 });
  });

  it('rounds the cut to the nearest rupee', () => {
    expect(computeRefund(999, 'jajman')).toEqual({ refundAmount: 949, platformCut: 50 });
  });

  it('handles zero paid', () => {
    expect(computeRefund(0, 'jajman')).toEqual({ refundAmount: 0, platformCut: 0 });
  });
});

describe('computeAdvance (§0.8 — default 30%)', () => {
  it('is 30% of subtotal by default', () => {
    expect(computeAdvance(1000)).toBe(300);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- money`
Expected: FAIL — cannot find module `./money` / functions not exported.

- [ ] **Step 3: Implement `src/domain/money.ts`**

```ts
import { CancelInitiator, PricingConfig, defaultPricingConfig } from './types';

export interface RefundResult {
  refundAmount: number;
  platformCut: number;
}

/**
 * §0.3 — the cut is computed on the amount the jajman ACTUALLY PAID,
 * not the booking total. Pandit-initiated cancels refund in full.
 */
export function computeRefund(
  amountPaid: number,
  initiatedBy: CancelInitiator,
  cfg: PricingConfig = defaultPricingConfig,
): RefundResult {
  if (amountPaid <= 0) return { refundAmount: 0, platformCut: 0 };
  if (initiatedBy === 'pandit') return { refundAmount: amountPaid, platformCut: 0 };
  const platformCut = Math.round((cfg.cancellationCutPct / 100) * amountPaid);
  return { refundAmount: amountPaid - platformCut, platformCut };
}

/** §0.8 — advance is a percentage of the subtotal (estimate at request time). */
export function computeAdvance(
  subtotal: number,
  cfg: PricingConfig = defaultPricingConfig,
): number {
  return Math.round((cfg.advancePercent / 100) * subtotal);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- money`
Expected: PASS — all 5 assertions green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: refund + advance money utilities (§0.3, §0.8)"
```

---

### Task 6: Booking utilities — status→tab + request expiry (§0.2, §0.7)

**Files:**
- Create: `src/domain/booking.ts`
- Test: `src/domain/booking.test.ts`

- [ ] **Step 1: Write the failing test** — `src/domain/booking.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { jajmanTab, panditTab, computeRequestExpiry, canCreateEmergency } from './booking';

describe('jajmanTab (§0.2 mapping)', () => {
  it('groups active statuses under upcoming', () => {
    expect(jajmanTab('requested')).toBe('upcoming');
    expect(jajmanTab('scheduled')).toBe('upcoming');
  });
  it('maps in_progress to ongoing', () => {
    expect(jajmanTab('in_progress')).toBe('ongoing');
  });
  it('maps completed/rated to completed', () => {
    expect(jajmanTab('completed')).toBe('completed');
    expect(jajmanTab('rated')).toBe('completed');
  });
  it('maps terminal/cancel states to cancelled', () => {
    expect(jajmanTab('cancelled')).toBe('cancelled');
    expect(jajmanTab('expired')).toBe('cancelled');
    expect(jajmanTab('refund_completed')).toBe('cancelled');
  });
});

describe('panditTab (§0.2)', () => {
  const now = '2026-06-20T09:00:00.000Z';
  it('today for a scheduled booking starting today', () => {
    expect(panditTab('scheduled', '2026-06-20T15:00:00.000Z', now)).toBe('today');
  });
  it('upcoming for a future-day booking', () => {
    expect(panditTab('accepted', '2026-06-25T15:00:00.000Z', now)).toBe('upcoming');
  });
  it('completed for completed/rated', () => {
    expect(panditTab('completed', '2026-06-10T15:00:00.000Z', now)).toBe('completed');
  });
  it('null (requests-history, not a booking tab) for expired/rejected', () => {
    expect(panditTab('expired', '2026-06-25T15:00:00.000Z', now)).toBeNull();
    expect(panditTab('rejected', '2026-06-25T15:00:00.000Z', now)).toBeNull();
  });
});

describe('computeRequestExpiry (§0.7)', () => {
  const now = '2026-06-20T09:00:00.000Z';
  it('non-emergency = now + 24h', () => {
    expect(computeRequestExpiry(now, '2026-07-01T00:00:00.000Z', false)).toBe('2026-06-21T09:00:00.000Z');
  });
  it('emergency caps at pujaStart - 60min when sooner than 24h', () => {
    // puja in 3h -> expiry = pujaStart - 60min = 11:00Z
    expect(computeRequestExpiry(now, '2026-06-20T12:00:00.000Z', true)).toBe('2026-06-20T11:00:00.000Z');
  });
  it('emergency far out still uses now + 24h', () => {
    expect(computeRequestExpiry(now, '2026-07-01T00:00:00.000Z', true)).toBe('2026-06-21T09:00:00.000Z');
  });
});

describe('canCreateEmergency (§0.7)', () => {
  const now = '2026-06-20T09:00:00.000Z';
  it('false when puja is within the buffer window', () => {
    expect(canCreateEmergency(now, '2026-06-20T09:30:00.000Z')).toBe(false);
  });
  it('true when puja is beyond the buffer window', () => {
    expect(canCreateEmergency(now, '2026-06-20T12:00:00.000Z')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- booking`
Expected: FAIL — cannot find module `./booking`.

- [ ] **Step 3: Implement `src/domain/booking.ts`**

```ts
import dayjs from 'dayjs';
import {
  BookingStatus,
  JajmanBookingTab,
  PanditBookingTab,
  PricingConfig,
  defaultPricingConfig,
} from './types';

/** §0.2 — Jajman bookings list tab for a given status. */
export function jajmanTab(status: BookingStatus): JajmanBookingTab {
  switch (status) {
    case 'requested':
    case 'accepted':
    case 'advance_paid':
    case 'scheduled':
      return 'upcoming';
    case 'in_progress':
      return 'ongoing';
    case 'completed':
    case 'rated':
      return 'completed';
    case 'rejected':
    case 'cancelled':
    case 'refund_initiated':
    case 'refund_completed':
    case 'expired':
      return 'cancelled';
  }
}

const LIVE_PANDIT_STATUSES: BookingStatus[] = ['accepted', 'advance_paid', 'scheduled', 'in_progress'];

/**
 * §0.2 — Pandit bookings tab. Returns null for statuses that belong in
 * Requests history (expired/rejected/etc.) rather than a live bookings tab.
 */
export function panditTab(
  status: BookingStatus,
  pujaStartISO: string,
  nowISO: string,
): PanditBookingTab | null {
  if (status === 'completed' || status === 'rated') return 'completed';
  if (LIVE_PANDIT_STATUSES.includes(status)) {
    const now = dayjs(nowISO);
    const start = dayjs(pujaStartISO);
    if (start.isSame(now, 'day')) return 'today';
    if (start.isAfter(now)) return 'upcoming';
    return 'today'; // past-but-not-completed still needs action today
  }
  return null;
}

/** §0.7 — request expiry; emergency caps at pujaStart - buffer. */
export function computeRequestExpiry(
  nowISO: string,
  pujaStartISO: string,
  isEmergency: boolean,
  cfg: PricingConfig = defaultPricingConfig,
): string {
  const plus24 = dayjs(nowISO).add(24, 'hour');
  if (!isEmergency) return plus24.toISOString();
  const cap = dayjs(pujaStartISO).subtract(cfg.emergencyBufferMins, 'minute');
  return (cap.isBefore(plus24) ? cap : plus24).toISOString();
}

/** §0.7 — an emergency booking is only valid if pujaStart - buffer is still in the future. */
export function canCreateEmergency(
  nowISO: string,
  pujaStartISO: string,
  cfg: PricingConfig = defaultPricingConfig,
): boolean {
  return dayjs(pujaStartISO).subtract(cfg.emergencyBufferMins, 'minute').isAfter(dayjs(nowISO));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- booking`
Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: booking status->tab + request-expiry utilities (§0.2, §0.7)"
```

---

### Task 7: UI store (theme / language / connectivity) + ThemeApplier

**Files:**
- Create: `src/store/uiStore.ts`
- Create: `src/theme/ThemeApplier.tsx`
- Test: `src/store/uiStore.test.ts`

- [ ] **Step 1: Write the failing test** — `src/store/uiStore.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ theme: 'light', language: 'en', connectivitySim: 'online' });
  });

  it('defaults to light/en/online', () => {
    const s = useUiStore.getState();
    expect(s.theme).toBe('light');
    expect(s.language).toBe('en');
    expect(s.connectivitySim).toBe('online');
  });

  it('toggleTheme flips light <-> dark', () => {
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe('dark');
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe('light');
  });

  it('setLanguage updates language', () => {
    useUiStore.getState().setLanguage('hi');
    expect(useUiStore.getState().language).toBe('hi');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- uiStore`
Expected: FAIL — cannot find module `./uiStore`.

- [ ] **Step 3: Implement `src/store/uiStore.ts`**

```ts
import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';
export type Language = 'en' | 'hi' | 'sa';
export type Connectivity = 'online' | 'offline';

interface UiState {
  theme: ThemeMode;
  language: Language;
  connectivitySim: Connectivity;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
  setLanguage: (l: Language) => void;
  setConnectivity: (c: Connectivity) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'light',
  language: 'en',
  connectivitySim: 'online',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  setConnectivity: (connectivitySim) => set({ connectivitySim }),
}));
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- uiStore`
Expected: PASS.

- [ ] **Step 5: Implement `src/theme/ThemeApplier.tsx`** (syncs store → `<html data-theme>`)

```tsx
import { useEffect } from 'react';
import { useUiStore } from '../store/uiStore';

/** Side-effect-only component: mirrors the theme store onto <html data-theme>. */
export function ThemeApplier() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return null;
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: ui store (theme/lang/connectivity) + ThemeApplier"
```

---

### Task 8: i18n stub (English dict + translate helper)

**Files:**
- Create: `src/i18n/en.ts`
- Create: `src/i18n/index.ts`
- Test: `src/i18n/i18n.test.ts`

- [ ] **Step 1: Write the failing test** — `src/i18n/i18n.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { translate } from './index';

describe('translate', () => {
  it('returns the English string for a known key', () => {
    expect(translate('home.featured', 'en')).toBe('Featured Pandits');
  });

  it('falls back to English when the language lacks the key', () => {
    expect(translate('home.featured', 'hi')).toBe('Featured Pandits');
  });

  it('falls back to the key itself when unknown everywhere', () => {
    expect(translate('does.not.exist', 'en')).toBe('does.not.exist');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- i18n`
Expected: FAIL — cannot find module `./index`.

- [ ] **Step 3: Create `src/i18n/en.ts`**

```ts
const en: Record<string, string> = {
  'home.greeting': 'Namaste 🙏',
  'home.bookingFor': 'Booking for Home',
  'home.searchPlaceholder': 'Search pandits, pujas…',
  'home.featured': 'Featured Pandits',
  'home.seeAll': 'See all',
  'common.from': 'From',
  'nav.home': 'Home',
  'nav.explore': 'Explore',
  'nav.bookings': 'Bookings',
  'nav.favorites': 'Favorites',
  'nav.profile': 'Profile',
};

export default en;
```

- [ ] **Step 4: Create `src/i18n/index.ts`**

```ts
import type { Language } from '../store/uiStore';
import en from './en';

const dicts: Record<Language, Record<string, string>> = {
  en,
  hi: {}, // stub — Hindi keys added later
  sa: {}, // stub — Sanskrit keys added later
};

export function translate(key: string, lang: Language): string {
  return dicts[lang]?.[key] ?? dicts.en[key] ?? key;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- i18n`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: i18n stub with English dictionary + fallback"
```

---

### Task 9: Mock entity types, seed data, and data store

**Files:**
- Create: `src/mock/types.ts`
- Create: `src/mock/seed.ts`
- Create: `src/store/dataStore.ts`
- Test: `src/store/dataStore.test.ts`

- [ ] **Step 1: Create `src/mock/types.ts`** (P0 subset of the spec data model)

```ts
export interface Category {
  id: string;
  name: string;
  icon: string; // emoji glyph (no external assets in the prototype)
}

export interface Puja {
  id: string;
  categoryId: string;
  name: string;
  suggestedDurationMins: number;
  minAmount: number;
  maxAmount: number;
}

export type PanditStatus = 'pending' | 'approved' | 'rejected';

export interface PanditSummary {
  id: string;
  name: string;
  city: string;
  distanceKm: number;
  experienceYears: number;
  rating: number;
  ratingCount: number;
  pujasCompleted: number;
  languages: string[];
  specializations: string[];
  startingPrice: number;
  responseRatePct: number;
  responseTimeMins: number;
  status: PanditStatus;
  favorite: boolean;
}
```

- [ ] **Step 2: Create `src/mock/seed.ts`** (7 categories per spec §7; 8 pandits, one `pending` to exercise the filter)

```ts
import type { Category, Puja, PanditSummary } from './types';

export const seedCategories: Category[] = [
  { id: 'cat-katha', name: 'Katha', icon: '📿' },
  { id: 'cat-jaap', name: 'Jaap', icon: '🕉️' },
  { id: 'cat-marriage', name: 'Marriage', icon: '💍' },
  { id: 'cat-griha', name: 'Griha Pravesh', icon: '🏠' },
  { id: 'cat-festival', name: 'Festival Puja', icon: '🪔' },
  { id: 'cat-shradh', name: 'Shradh', icon: '🌸' },
  { id: 'cat-temple', name: 'Temple Rituals', icon: '🛕' },
];

export const seedPujas: Puja[] = [
  { id: 'puja-satyanarayan', categoryId: 'cat-katha', name: 'Satyanarayan Katha', suggestedDurationMins: 150, minAmount: 1100, maxAmount: 5100 },
  { id: 'puja-ganesh', categoryId: 'cat-festival', name: 'Ganesh Puja', suggestedDurationMins: 90, minAmount: 800, maxAmount: 3100 },
  { id: 'puja-mahamrityunjaya', categoryId: 'cat-jaap', name: 'Maha Mrityunjaya Jaap', suggestedDurationMins: 180, minAmount: 2100, maxAmount: 11000 },
  { id: 'puja-griha', categoryId: 'cat-griha', name: 'Griha Pravesh', suggestedDurationMins: 180, minAmount: 2500, maxAmount: 11000 },
];

export const seedPandits: PanditSummary[] = [
  { id: 'pnd-1', name: 'Pandit Ramesh Sharma', city: 'Pune', distanceKm: 2.4, experienceYears: 18, rating: 4.9, ratingCount: 212, pujasCompleted: 540, languages: ['Hindi', 'Sanskrit'], specializations: ['Satyanarayan Katha', 'Griha Pravesh'], startingPrice: 1100, responseRatePct: 98, responseTimeMins: 12, status: 'approved', favorite: true },
  { id: 'pnd-2', name: 'Pandit Suresh Joshi', city: 'Pune', distanceKm: 3.8, experienceYears: 12, rating: 4.7, ratingCount: 154, pujasCompleted: 320, languages: ['Hindi', 'Marathi'], specializations: ['Ganesh Puja', 'Festival Puja'], startingPrice: 800, responseRatePct: 95, responseTimeMins: 20, status: 'approved', favorite: false },
  { id: 'pnd-3', name: 'Acharya Vinod Dubey', city: 'Mumbai', distanceKm: 5.1, experienceYears: 25, rating: 5.0, ratingCount: 301, pujasCompleted: 880, languages: ['Hindi', 'Sanskrit', 'English'], specializations: ['Maha Mrityunjaya Jaap', 'Yagna'], startingPrice: 2100, responseRatePct: 99, responseTimeMins: 8, status: 'approved', favorite: false },
  { id: 'pnd-4', name: 'Pandit Mohan Tiwari', city: 'Pune', distanceKm: 1.2, experienceYears: 9, rating: 4.5, ratingCount: 88, pujasCompleted: 160, languages: ['Hindi'], specializations: ['Shradh', 'Katha'], startingPrice: 900, responseRatePct: 90, responseTimeMins: 30, status: 'approved', favorite: false },
  { id: 'pnd-5', name: 'Pandit Gopal Mishra', city: 'Nashik', distanceKm: 8.6, experienceYears: 15, rating: 4.8, ratingCount: 176, pujasCompleted: 410, languages: ['Hindi', 'Sanskrit'], specializations: ['Marriage', 'Griha Pravesh'], startingPrice: 2500, responseRatePct: 96, responseTimeMins: 15, status: 'approved', favorite: false },
  { id: 'pnd-6', name: 'Pandit Anil Shastri', city: 'Pune', distanceKm: 4.3, experienceYears: 21, rating: 4.9, ratingCount: 198, pujasCompleted: 600, languages: ['Hindi', 'Sanskrit'], specializations: ['Temple Rituals', 'Jaap'], startingPrice: 1500, responseRatePct: 97, responseTimeMins: 10, status: 'approved', favorite: true },
  { id: 'pnd-7', name: 'Pandit Deepak Vyas', city: 'Mumbai', distanceKm: 6.7, experienceYears: 7, rating: 4.4, ratingCount: 52, pujasCompleted: 95, languages: ['Hindi', 'English'], specializations: ['Festival Puja'], startingPrice: 700, responseRatePct: 88, responseTimeMins: 40, status: 'approved', favorite: false },
  { id: 'pnd-8', name: 'Pandit Naveen Pandey', city: 'Pune', distanceKm: 3.0, experienceYears: 5, rating: 0, ratingCount: 0, pujasCompleted: 0, languages: ['Hindi'], specializations: ['Katha'], startingPrice: 600, responseRatePct: 0, responseTimeMins: 0, status: 'pending', favorite: false },
];
```

- [ ] **Step 3: Write the failing test** — `src/store/dataStore.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { useDataStore } from './dataStore';

describe('dataStore', () => {
  it('seeds the 7 PRD categories', () => {
    expect(useDataStore.getState().categories).toHaveLength(7);
  });

  it('getApprovedPandits returns only approved pandits', () => {
    const approved = useDataStore.getState().getApprovedPandits();
    expect(approved.length).toBeGreaterThan(0);
    expect(approved.every((p) => p.status === 'approved')).toBe(true);
    // the seeded 'pending' pandit is excluded
    expect(approved.find((p) => p.id === 'pnd-8')).toBeUndefined();
  });

  it('getFeaturedPandits caps the list', () => {
    expect(useDataStore.getState().getFeaturedPandits(3)).toHaveLength(3);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- dataStore`
Expected: FAIL — cannot find module `./dataStore`.

- [ ] **Step 5: Implement `src/store/dataStore.ts`**

```ts
import { create } from 'zustand';
import type { Category, Puja, PanditSummary } from '../mock/types';
import { seedCategories, seedPujas, seedPandits } from '../mock/seed';

interface DataState {
  categories: Category[];
  pujas: Puja[];
  pandits: PanditSummary[];
  getApprovedPandits: () => PanditSummary[];
  getFeaturedPandits: (limit?: number) => PanditSummary[];
}

export const useDataStore = create<DataState>((_set, get) => ({
  categories: seedCategories,
  pujas: seedPujas,
  pandits: seedPandits,
  getApprovedPandits: () => get().pandits.filter((p) => p.status === 'approved'),
  getFeaturedPandits: (limit = 5) =>
    get()
      .pandits.filter((p) => p.status === 'approved')
      .slice(0, limit),
}));
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- dataStore`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: mock entity types, seed data, and data store"
```

---

### Task 10: `cn` helper + PhoneFrame shell

**Files:**
- Create: `src/lib/cn.ts`
- Create: `src/components/shell/PhoneFrame.tsx`
- Test: `src/components/shell/PhoneFrame.test.tsx`

- [ ] **Step 1: Create `src/lib/cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
```

- [ ] **Step 2: Write the failing test** — `src/components/shell/PhoneFrame.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhoneFrame } from './PhoneFrame';

describe('PhoneFrame', () => {
  it('renders its children inside the device frame', () => {
    render(
      <PhoneFrame>
        <div>hello inside</div>
      </PhoneFrame>,
    );
    expect(screen.getByText('hello inside')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- PhoneFrame`
Expected: FAIL — cannot find module `./PhoneFrame`.

- [ ] **Step 4: Implement `src/components/shell/PhoneFrame.tsx`**

```tsx
import type { ReactNode } from 'react';

/**
 * Centered device frame on desktop (~390x844 with a bezel); full-viewport on mobile.
 * Only the inner column scrolls (children own the scroll region + bottom bar).
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#f3e3cc] to-[#ebd6bc] dark:from-[#0e0b0a] dark:to-[#1b1512] md:py-8">
      <div
        className="relative flex w-full flex-col overflow-hidden bg-bg text-text md:h-[844px] md:max-h-[92vh] md:w-[390px] md:rounded-[42px] md:border-[10px] md:border-[#15100e] md:shadow-float"
        style={{ height: '100dvh' }}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- PhoneFrame`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: cn helper + PhoneFrame shell"
```

---

### Task 11: Base primitives — Button, Card, Badge, Avatar, RatingStars

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/Avatar.tsx`
- Create: `src/components/ui/RatingStars.tsx`
- Test: `src/components/ui/ui.test.tsx`

- [ ] **Step 1: Create `src/components/ui/Button.tsx`**

```tsx
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-600',
  secondary: 'bg-secondary text-secondary-fg',
  ghost: 'bg-transparent text-text hover:bg-surface-2',
  outline: 'border border-border text-text hover:bg-surface-2',
};

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-[44px] h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Create `src/components/ui/Card.tsx`**

```tsx
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-surface shadow-card', className)}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Create `src/components/ui/Badge.tsx`**

```tsx
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted',
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Create `src/components/ui/Avatar.tsx`** (initials — no external images)

```tsx
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .replace(/^(Pandit|Acharya)\s+/i, '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-fg"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/ui/RatingStars.tsx`**

```tsx
import { Star } from 'lucide-react';

export function RatingStars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star size={14} className="fill-accent text-accent" />
      <span className="font-medium">{value.toFixed(1)}</span>
      {count != null && <span className="text-muted">({count})</span>}
    </span>
  );
}
```

- [ ] **Step 6: Write the test** — `src/components/ui/ui.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';
import { Avatar } from './Avatar';
import { RatingStars } from './RatingStars';

describe('ui primitives', () => {
  it('Button renders its label', () => {
    render(<Button>Book now</Button>);
    expect(screen.getByRole('button', { name: 'Book now' })).toBeInTheDocument();
  });

  it('Avatar derives initials from the name (stripping honorifics)', () => {
    render(<Avatar name="Pandit Ramesh Sharma" />);
    expect(screen.getByText('RS')).toBeInTheDocument();
  });

  it('RatingStars shows the value and count', () => {
    render(<RatingStars value={4.9} count={212} />);
    expect(screen.getByText('4.9')).toBeInTheDocument();
    expect(screen.getByText('(212)')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test -- ui`
Expected: PASS — 3 assertions green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: base ui primitives (Button, Card, Badge, Avatar, RatingStars)"
```

---

### Task 12: Composite components — AppBar, SearchBar, CategoryChip, SectionHeader, PanditCard, BottomTabBar

**Files:**
- Create: `src/components/ui/AppBar.tsx`
- Create: `src/components/ui/SearchBar.tsx`
- Create: `src/components/ui/CategoryChip.tsx`
- Create: `src/components/ui/SectionHeader.tsx`
- Create: `src/components/ui/PanditCard.tsx`
- Create: `src/components/shell/BottomTabBar.tsx`
- Test: `src/components/ui/PanditCard.test.tsx`

- [ ] **Step 1: Create `src/components/ui/AppBar.tsx`**

```tsx
import type { ReactNode } from 'react';

export function AppBar({
  title,
  left,
  right,
}: {
  title?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-surface/80 px-4 backdrop-blur">
      {left}
      <div className="min-w-0 flex-1 truncate text-base font-semibold">{title}</div>
      {right}
    </header>
  );
}
```

- [ ] **Step 2: Create `src/components/ui/SearchBar.tsx`**

```tsx
import { Search } from 'lucide-react';

export function SearchBar({
  placeholder = 'Search pandits, pujas…',
  onClick,
}: {
  placeholder?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center gap-2 rounded-md bg-surface-2 px-3 text-sm text-muted"
    >
      <Search size={18} />
      <span>{placeholder}</span>
    </button>
  );
}
```

- [ ] **Step 3: Create `src/components/ui/CategoryChip.tsx`**

```tsx
export function CategoryChip({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-16 shrink-0 flex-col items-center gap-1">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-2xl">
        {icon}
      </span>
      <span className="text-center text-xs leading-tight text-text">{label}</span>
    </button>
  );
}
```

- [ ] **Step 4: Create `src/components/ui/SectionHeader.tsx`**

```tsx
import type { ReactNode } from 'react';

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between px-4">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {action}
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/ui/PanditCard.tsx`**

```tsx
import type { PanditSummary } from '../../mock/types';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { RatingStars } from './RatingStars';

export function PanditCard({ p, onClick }: { p: PanditSummary; onClick?: () => void }) {
  return (
    <Card
      onClick={onClick}
      className="flex cursor-pointer gap-3 p-3 transition active:scale-[0.99]"
    >
      <Avatar name={p.name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-semibold">{p.name}</h3>
          <RatingStars value={p.rating} count={p.ratingCount} />
        </div>
        <p className="truncate text-xs text-muted">{p.specializations.join(' • ')}</p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          <span>{p.city}</span>
          <span>•</span>
          <span>{p.distanceKm} km</span>
          <span>•</span>
          <span>{p.experienceYears}y exp</span>
        </div>
        <div className="mt-1 text-sm">
          <span className="text-muted">From </span>
          <span className="font-semibold text-text">₹{p.startingPrice}</span>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 6: Create `src/components/shell/BottomTabBar.tsx`**

```tsx
import { NavLink } from 'react-router-dom';
import { Home, Search, CalendarCheck, Heart, User, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface TabItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const jajmanTabs: TabItem[] = [
  { to: '/app/home', label: 'Home', icon: Home },
  { to: '/app/search', label: 'Explore', icon: Search },
  { to: '/app/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/app/favorites', label: 'Favorites', icon: Heart },
  { to: '/app/profile', label: 'Profile', icon: User },
];

export function BottomTabBar({ tabs = jajmanTabs }: { tabs?: TabItem[] }) {
  return (
    <nav className="flex items-stretch border-t border-border bg-surface">
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px]',
                isActive ? 'text-primary' : 'text-muted',
              )
            }
          >
            <Icon size={20} />
            <span>{t.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 7: Write the test** — `src/components/ui/PanditCard.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PanditCard } from './PanditCard';
import { seedPandits } from '../../mock/seed';

describe('PanditCard', () => {
  it('renders the pandit name, distance, and starting price', () => {
    render(<PanditCard p={seedPandits[0]} />);
    expect(screen.getByText('Pandit Ramesh Sharma')).toBeInTheDocument();
    expect(screen.getByText('2.4 km')).toBeInTheDocument();
    expect(screen.getByText('₹1100')).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- PanditCard`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: composite components (AppBar, SearchBar, chips, PanditCard, BottomTabBar)"
```

---

### Task 13: Router + Jajman Home sample screen + App wiring

**Files:**
- Create: `src/screens/jajman/HomeScreen.tsx`
- Create: `src/screens/shared/NotFound.tsx`
- Create: `src/app/router.tsx`
- Modify: `src/App.tsx`
- Test: `src/screens/jajman/HomeScreen.test.tsx`

- [ ] **Step 1: Create `src/screens/shared/NotFound.tsx`** (P0 "coming soon" fallback)

```tsx
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-5xl">🪔</div>
      <h1 className="text-lg font-semibold">Coming soon</h1>
      <p className="text-sm text-muted">This screen arrives in a later build phase.</p>
      <Button onClick={() => navigate('/app/home')}>Go home</Button>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/screens/jajman/HomeScreen.tsx`** (the sample screen for look sign-off)

```tsx
import { Moon, Sun } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { SearchBar } from '../../components/ui/SearchBar';
import { CategoryChip } from '../../components/ui/CategoryChip';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { PanditCard } from '../../components/ui/PanditCard';
import { BottomTabBar } from '../../components/shell/BottomTabBar';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';

export function HomeScreen() {
  const categories = useDataStore((s) => s.categories);
  const pandits = useDataStore((s) => s.getApprovedPandits());
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  return (
    <>
      <AppBar
        left={<span className="text-lg font-bold text-primary">ॐ</span>}
        title={
          <div className="leading-tight">
            <div className="text-[11px] font-normal text-muted">Namaste 🙏</div>
            <div className="text-sm">Booking for Home</div>
          </div>
        }
        right={
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 text-muted"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="px-4 pt-3">
          <SearchBar />
        </div>

        <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto px-4">
          {categories.map((c) => (
            <CategoryChip key={c.id} label={c.name} icon={c.icon} />
          ))}
        </div>

        <SectionHeader
          title="Featured Pandits"
          action={<button className="text-xs font-medium text-primary">See all</button>}
        />
        <div className="flex flex-col gap-3 px-4">
          {pandits.map((p) => (
            <PanditCard key={p.id} p={p} />
          ))}
        </div>
      </div>

      <BottomTabBar />
    </>
  );
}
```

- [ ] **Step 3: Create `src/app/router.tsx`**

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PhoneFrame } from '../components/shell/PhoneFrame';
import { HomeScreen } from '../screens/jajman/HomeScreen';
import { NotFound } from '../screens/shared/NotFound';

// P0: auth/guards arrive in Phase 1; for now the root sends straight to Home.
function RootRedirect() {
  return <Navigate to="/app/home" replace />;
}

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  {
    path: '/app/home',
    element: (
      <PhoneFrame>
        <HomeScreen />
      </PhoneFrame>
    ),
  },
  {
    path: '*',
    element: (
      <PhoneFrame>
        <NotFound />
      </PhoneFrame>
    ),
  },
]);
```

- [ ] **Step 4: Replace `src/App.tsx`**

```tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { ThemeApplier } from './theme/ThemeApplier';

export default function App() {
  return (
    <>
      <ThemeApplier />
      <RouterProvider router={router} />
    </>
  );
}
```

- [ ] **Step 5: Write the test** — `src/screens/jajman/HomeScreen.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeScreen } from './HomeScreen';

function renderHome() {
  return render(
    <MemoryRouter>
      <HomeScreen />
    </MemoryRouter>,
  );
}

describe('HomeScreen', () => {
  it('shows the Featured Pandits section', () => {
    renderHome();
    expect(screen.getByText('Featured Pandits')).toBeInTheDocument();
  });

  it('renders a seeded category and at least one approved pandit', () => {
    renderHome();
    expect(screen.getByText('Katha')).toBeInTheDocument();
    expect(screen.getByText('Pandit Ramesh Sharma')).toBeInTheDocument();
  });

  it('does not show the pending (unapproved) pandit', () => {
    renderHome();
    expect(screen.queryByText('Pandit Naveen Pandey')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: PASS — all suites (money, booking, uiStore, i18n, dataStore, PhoneFrame, ui, PanditCard, HomeScreen, smoke) green.

- [ ] **Step 7: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both PASS with no errors.

- [ ] **Step 8: Manual look check (the P0 sign-off gate)**

Run: `npm run dev`
Open the printed localhost URL. Verify:
- The app loads at `/` and redirects to `/app/home` inside a centered phone frame.
- Warm premium hybrid styling renders (saffron header accent, cream surfaces, pandit cards with ratings, category chips).
- The theme toggle (top-right) flips light ↔ dark cleanly.
- The bottom tab bar shows 5 tabs; non-Home tabs route to the "Coming soon" screen.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: router + Jajman Home sample screen + app wiring (P0 complete)"
```

---

## Self-Review

**Spec coverage (P0 scope = scaffold + design system + app shell + sample screen):**
- Tech stack (Vite/React/TS/Tailwind/zustand/react-router/lucide/dayjs) → Tasks 1, 3, 7, 9, 13. ✔
- Design tokens, light + dark (spec §1 Design System) → Task 3 + Task 7 (`ThemeApplier`). ✔
- Phone-frame shell (spec §1 Architecture) → Task 10. ✔
- Component catalog primitives (spec §0.4) → Tasks 11–12 (`BottomTabBar` single component per §0.4). ✔
- §0.2 status→tab, §0.3 refund base, §0.7 expiry, §0.8 pricing config → Tasks 4–6 with tests. ✔
- Mock data store + seed (spec Cross-Cutting) → Task 9. ✔
- i18n stub English-first (spec §0.5 / Cross-Cutting) → Task 8. ✔
- Sample screen for look sign-off (spec phasing P0) → Task 13 (Jajman Home). ✔
- Routing + 404 (spec §0.1, Appendix A NotFound) → Task 13. ✔

**Deferred to later phases (correctly out of P0 scope):** auth/onboarding flows + route guards (P1), full Jajman/Pandit/Admin inventories (P1–P4), real mutation flows, all empty/error states beyond what the sample needs (P5). Route bases used here (`/app/home`, etc.) follow §0.1 so later phases slot in without renames.

**Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N" — every step contains complete code or an exact command + expected output. The `NotFound` "Coming soon" copy is an intentional P0 placeholder screen (replaced/extended by the real surfaces in later phases), not a plan placeholder.

**Type consistency:** `PanditSummary`, `Category`, `Puja` (Task 9) are consumed unchanged in Tasks 11–13. `PricingConfig`/`BookingStatus`/tab unions (Task 4) are consumed by Tasks 5–6. `TabItem`/`jajmanTabs` (Task 12) used by `BottomTabBar`. Store hook names (`useUiStore`, `useDataStore`) and selector names (`getApprovedPandits`, `getFeaturedPandits`) are consistent across Tasks 7, 9, 13.
