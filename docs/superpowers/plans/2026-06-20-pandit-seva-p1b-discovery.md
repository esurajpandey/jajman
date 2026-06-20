# Pandit Seva — Phase 1b (Jajman Discovery) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax. **Git: commit locally only — NEVER run `git push`, `git remote`, `git branch -M`, or `git checkout` to another branch.** Work stays on `p1b-jajman-discovery`.

**Goal:** Let a Jajman discover pandits — search by text, filter (category/puja/date/price/rating/city/distance), browse a results list and a mock map, drill into categories and pujas, open a full pandit profile with reviews, and see alternate suggestions when nothing matches. All on the approved warm-premium-hybrid look, with mock data.

**Architecture:** Pure, tested `searchPandits`/`sortPandits` over the mock store. A small `discoveryStore` (zustand) holds query + filters + sort so they persist across the Search screen, the Filters bottom sheet, and the Map. New reusable components (BottomSheet, Chip, MockMap, RatingSummary, DistributionBars, ReviewItem, FiltersSheet, AppPlainLayout). Browsing screens live under the tabbed `AppLayout`; drill-down/detail screens live under a new tab-less `AppPlainLayout` with a back button.

**Tech Stack:** existing (React 18 + TS + Tailwind + zustand + react-router-dom 6 + lucide-react + dayjs). Tests: Vitest + RTL.

**Builds on:** P0 + P1a (on `main`). Reuse: `PanditCard`, `Card`, `Button`, `Badge`, `Avatar`, `RatingStars`, `AppBar`, `SearchBar`, `CategoryChip`, `SectionHeader`, `BottomTabBar`, `AppLayout`, `cn`, `useDataStore`, `useUiStore`. Reference spec §0.1 (routes), §0.10 (city vs GPS), and the Jajman discovery screen specs.

**Working directory:** paths relative to `pandit-seva-app/` (branch `p1b-jajman-discovery`).

---

### Task 1: Discovery data model + search/sort logic

**Files:**
- Modify: `src/mock/types.ts`
- Modify: `src/mock/seed.ts`
- Modify: `src/store/dataStore.ts`
- Modify: `src/store/dataStore.test.ts`
- Create: `src/store/discoveryStore.ts`
- Create: `src/domain/search.ts`
- Test: `src/domain/search.test.ts`

- [ ] **Step 1: Extend `src/mock/types.ts`** — add review + supported-puja types and richer pandit fields. Append/extend:

```ts
export interface SupportedPuja {
  pujaId: string;
  charge: number;
  durationMins: number;
}

export interface Review {
  id: string;
  panditId: string;
  jajmanName: string;
  rating: number; // 1..5
  text: string;
  date: string; // ISO
}

export type TravelPreference = 'within' | 'outside' | 'anywhere';
```

And add these fields to the existing `PanditSummary` interface (place after `specializations`):

```ts
  about: string;
  supportedPujas: SupportedPuja[];
  serviceRadiusKm: number;
  travelPreference: TravelPreference;
```

- [ ] **Step 2: Update `src/mock/seed.ts`** — add the new fields to each of the 8 pandits and add a `seedReviews` array. Add at the top of each pandit object (after `specializations`) realistic values, e.g. for `pnd-1`:

```ts
    about: 'Vedic scholar with two decades of experience performing Satyanarayan Katha and Griha Pravesh across Maharashtra. Known for clear explanations and punctuality.',
    supportedPujas: [
      { pujaId: 'puja-satyanarayan', charge: 1100, durationMins: 150 },
      { pujaId: 'puja-griha', charge: 2500, durationMins: 180 },
    ],
    serviceRadiusKm: 15,
    travelPreference: 'within',
```

Give every pandit an `about` (1-2 sentences), a `supportedPujas` array of 1-3 entries drawn from the existing `seedPujas` ids (`puja-satyanarayan`, `puja-ganesh`, `puja-mahamrityunjaya`, `puja-griha`) with sensible charges/durations, a `serviceRadiusKm` (5-25), and a `travelPreference`. The pending pandit `pnd-8` gets an empty `supportedPujas: []` and a short about. Ensure `startingPrice` equals the minimum of that pandit's `supportedPujas[].charge` (where they have any).

Then append a `seedReviews` export with ~10 reviews spread across approved pandits:

```ts
export const seedReviews: Review[] = [
  { id: 'rev-1', panditId: 'pnd-1', jajmanName: 'Anita Kulkarni', rating: 5, text: 'Pandit ji performed the katha beautifully and on time. Highly recommended.', date: '2026-05-12' },
  { id: 'rev-2', panditId: 'pnd-1', jajmanName: 'Rohit Deshpande', rating: 5, text: 'Very knowledgeable and patient with all the rituals.', date: '2026-04-28' },
  { id: 'rev-3', panditId: 'pnd-1', jajmanName: 'Meera Shah', rating: 4, text: 'Good experience overall, arrived slightly late.', date: '2026-03-15' },
  { id: 'rev-4', panditId: 'pnd-2', jajmanName: 'Sandeep Rao', rating: 5, text: 'Ganesh puja was wonderful, family loved it.', date: '2026-05-02' },
  { id: 'rev-5', panditId: 'pnd-2', jajmanName: 'Priya Nair', rating: 4, text: 'Smooth booking and a calm, clear ceremony.', date: '2026-04-10' },
  { id: 'rev-6', panditId: 'pnd-3', jajmanName: 'Vikram Sethi', rating: 5, text: 'Acharya ji is exceptional. The jaap was deeply moving.', date: '2026-05-20' },
  { id: 'rev-7', panditId: 'pnd-3', jajmanName: 'Lakshmi Iyer', rating: 5, text: 'Best pandit we have ever booked. Worth every rupee.', date: '2026-04-30' },
  { id: 'rev-8', panditId: 'pnd-5', jajmanName: 'Arjun Mehta', rating: 5, text: 'Conducted our marriage ceremony flawlessly.', date: '2026-05-18' },
  { id: 'rev-9', panditId: 'pnd-6', jajmanName: 'Kavya Reddy', rating: 4, text: 'Very devotional temple rituals, would book again.', date: '2026-04-05' },
  { id: 'rev-10', panditId: 'pnd-4', jajmanName: 'Naveen Kumar', rating: 4, text: 'Did the shradh respectfully and explained each step.', date: '2026-03-22' },
];
```

- [ ] **Step 3: Update `src/store/dataStore.ts`** — add reviews + new selectors + favorite toggle. Replace the store with:

```ts
import { create } from 'zustand';
import type { Category, Puja, PanditSummary, Review } from '../mock/types';
import { seedCategories, seedPujas, seedPandits, seedReviews } from '../mock/seed';

interface DataState {
  categories: Category[];
  pujas: Puja[];
  pandits: PanditSummary[];
  reviews: Review[];
  getApprovedPandits: () => PanditSummary[];
  getFeaturedPandits: (limit?: number) => PanditSummary[];
  getPandit: (id: string) => PanditSummary | undefined;
  getReviewsForPandit: (panditId: string) => Review[];
  getCategory: (id: string) => Category | undefined;
  getPuja: (id: string) => Puja | undefined;
  getPujasForCategory: (categoryId: string) => Puja[];
  getPanditsForCategory: (categoryId: string) => PanditSummary[];
  getPanditsForPuja: (pujaId: string) => PanditSummary[];
  getFavorites: () => PanditSummary[];
  toggleFavorite: (panditId: string) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  categories: seedCategories,
  pujas: seedPujas,
  pandits: seedPandits,
  reviews: seedReviews,
  getApprovedPandits: () => get().pandits.filter((p) => p.status === 'approved'),
  getFeaturedPandits: (limit = 5) => get().getApprovedPandits().slice(0, limit),
  getPandit: (id) => get().pandits.find((p) => p.id === id),
  getReviewsForPandit: (panditId) => get().reviews.filter((r) => r.panditId === panditId),
  getCategory: (id) => get().categories.find((c) => c.id === id),
  getPuja: (id) => get().pujas.find((p) => p.id === id),
  getPujasForCategory: (categoryId) => get().pujas.filter((p) => p.categoryId === categoryId),
  getPanditsForCategory: (categoryId) => {
    const pujaIds = new Set(get().getPujasForCategory(categoryId).map((p) => p.id));
    return get().getApprovedPandits().filter((p) => p.supportedPujas.some((sp) => pujaIds.has(sp.pujaId)));
  },
  getPanditsForPuja: (pujaId) =>
    get().getApprovedPandits().filter((p) => p.supportedPujas.some((sp) => sp.pujaId === pujaId)),
  getFavorites: () => get().getApprovedPandits().filter((p) => p.favorite),
  toggleFavorite: (panditId) =>
    set((s) => ({
      pandits: s.pandits.map((p) => (p.id === panditId ? { ...p, favorite: !p.favorite } : p)),
    })),
}));
```

- [ ] **Step 4: Update `src/store/dataStore.test.ts`** — add the seed import (`seedReviews`) to the `beforeEach` reset and add tests for the new selectors:

```ts
// in beforeEach setState, add: reviews: seedReviews
// (import seedReviews alongside the others)

  it('getPandit / getReviewsForPandit work', () => {
    const s = useDataStore.getState();
    expect(s.getPandit('pnd-1')?.name).toContain('Ramesh');
    expect(s.getReviewsForPandit('pnd-1').length).toBeGreaterThan(0);
  });

  it('getPanditsForCategory returns approved pandits offering a puja in that category', () => {
    const s = useDataStore.getState();
    const list = s.getPanditsForCategory('cat-katha');
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((p) => p.status === 'approved')).toBe(true);
  });

  it('toggleFavorite flips the favorite flag', () => {
    const before = useDataStore.getState().getPandit('pnd-2')!.favorite;
    useDataStore.getState().toggleFavorite('pnd-2');
    expect(useDataStore.getState().getPandit('pnd-2')!.favorite).toBe(!before);
  });
```

- [ ] **Step 5: Create `src/store/discoveryStore.ts`**

```ts
import { create } from 'zustand';

export type SortKey = 'relevance' | 'rating' | 'distance' | 'price';

export interface DiscoveryFilters {
  categoryId: string | null;
  pujaId: string | null;
  date: string | null;
  priceMax: number | null;
  minRating: number | null;
  city: string | null;
  maxDistanceKm: number | null;
}

export const emptyFilters: DiscoveryFilters = {
  categoryId: null,
  pujaId: null,
  date: null,
  priceMax: null,
  minRating: null,
  city: null,
  maxDistanceKm: null,
};

interface DiscoveryState {
  query: string;
  filters: DiscoveryFilters;
  sort: SortKey;
  setQuery: (q: string) => void;
  setFilters: (f: DiscoveryFilters) => void;
  patchFilters: (p: Partial<DiscoveryFilters>) => void;
  resetFilters: () => void;
  setSort: (s: SortKey) => void;
  activeFilterCount: () => number;
}

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  query: '',
  filters: { ...emptyFilters },
  sort: 'relevance',
  setQuery: (query) => set({ query }),
  setFilters: (filters) => set({ filters }),
  patchFilters: (p) => set((s) => ({ filters: { ...s.filters, ...p } })),
  resetFilters: () => set({ filters: { ...emptyFilters } }),
  setSort: (sort) => set({ sort }),
  activeFilterCount: () =>
    Object.values(get().filters).filter((v) => v !== null && v !== '').length,
}));
```

- [ ] **Step 6: Write the failing test** — `src/domain/search.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { searchPandits, sortPandits } from './search';
import { seedPandits, seedPujas } from '../mock/seed';
import { emptyFilters } from '../store/discoveryStore';

const approved = seedPandits.filter((p) => p.status === 'approved');

describe('searchPandits', () => {
  it('returns only approved pandits with no query/filters', () => {
    const r = searchPandits(seedPandits, seedPujas, '', emptyFilters);
    expect(r.length).toBe(approved.length);
    expect(r.every((p) => p.status === 'approved')).toBe(true);
  });

  it('text query matches name (case-insensitive)', () => {
    const r = searchPandits(seedPandits, seedPujas, 'ramesh', emptyFilters);
    expect(r.some((p) => p.id === 'pnd-1')).toBe(true);
    expect(r.every((p) => /ramesh/i.test(p.name) || p.specializations.some((s) => /ramesh/i.test(s)))).toBe(true);
  });

  it('minRating filter excludes lower-rated pandits', () => {
    const r = searchPandits(seedPandits, seedPujas, '', { ...emptyFilters, minRating: 4.9 });
    expect(r.every((p) => p.rating >= 4.9)).toBe(true);
  });

  it('priceMax filter excludes pricier pandits', () => {
    const r = searchPandits(seedPandits, seedPujas, '', { ...emptyFilters, priceMax: 1000 });
    expect(r.every((p) => p.startingPrice <= 1000)).toBe(true);
  });

  it('category filter keeps only pandits offering a puja in that category', () => {
    const r = searchPandits(seedPandits, seedPujas, '', { ...emptyFilters, categoryId: 'cat-katha' });
    const kathaPujaIds = seedPujas.filter((p) => p.categoryId === 'cat-katha').map((p) => p.id);
    expect(r.every((p) => p.supportedPujas.some((sp) => kathaPujaIds.includes(sp.pujaId)))).toBe(true);
  });

  it('city filter overrides distance (§0.10) — only that city remains', () => {
    const r = searchPandits(seedPandits, seedPujas, '', { ...emptyFilters, city: 'Mumbai' });
    expect(r.every((p) => p.city === 'Mumbai')).toBe(true);
  });
});

describe('sortPandits', () => {
  it('rating sorts descending', () => {
    const r = sortPandits(approved, 'rating');
    for (let i = 1; i < r.length; i++) expect(r[i - 1].rating).toBeGreaterThanOrEqual(r[i].rating);
  });
  it('price sorts ascending by startingPrice', () => {
    const r = sortPandits(approved, 'price');
    for (let i = 1; i < r.length; i++) expect(r[i - 1].startingPrice).toBeLessThanOrEqual(r[i].startingPrice);
  });
  it('distance sorts ascending', () => {
    const r = sortPandits(approved, 'distance');
    for (let i = 1; i < r.length; i++) expect(r[i - 1].distanceKm).toBeLessThanOrEqual(r[i].distanceKm);
  });
  it('relevance preserves input order', () => {
    expect(sortPandits(approved, 'relevance')).toEqual(approved);
  });
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `npm test -- search`
Expected: FAIL — cannot find module `./search`.

- [ ] **Step 8: Implement `src/domain/search.ts`**

```ts
import type { PanditSummary, Puja } from '../mock/types';
import type { DiscoveryFilters, SortKey } from '../store/discoveryStore';

function matchesQuery(p: PanditSummary, pujas: Puja[], q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const supportedNames = p.supportedPujas
    .map((sp) => pujas.find((pj) => pj.id === sp.pujaId)?.name ?? '')
    .join(' ');
  const haystack = [p.name, p.city, p.specializations.join(' '), supportedNames].join(' ').toLowerCase();
  return haystack.includes(needle);
}

/**
 * Filters approved pandits by free-text query + the active filters.
 * §0.10: when a `city` is set it overrides distance — distance filter is ignored.
 * `date` is a placeholder in this phase (availability matching arrives with booking).
 */
export function searchPandits(
  pandits: PanditSummary[],
  pujas: Puja[],
  query: string,
  filters: DiscoveryFilters,
): PanditSummary[] {
  const categoryPujaIds = filters.categoryId
    ? new Set(pujas.filter((pj) => pj.categoryId === filters.categoryId).map((pj) => pj.id))
    : null;

  return pandits
    .filter((p) => p.status === 'approved')
    .filter((p) => matchesQuery(p, pujas, query))
    .filter((p) => (categoryPujaIds ? p.supportedPujas.some((sp) => categoryPujaIds.has(sp.pujaId)) : true))
    .filter((p) => (filters.pujaId ? p.supportedPujas.some((sp) => sp.pujaId === filters.pujaId) : true))
    .filter((p) => (filters.minRating != null ? p.rating >= filters.minRating : true))
    .filter((p) => (filters.priceMax != null ? p.startingPrice <= filters.priceMax : true))
    .filter((p) => (filters.city ? p.city === filters.city : true))
    .filter((p) =>
      filters.maxDistanceKm != null && !filters.city ? p.distanceKm <= filters.maxDistanceKm : true,
    );
}

export function sortPandits(pandits: PanditSummary[], sort: SortKey): PanditSummary[] {
  const list = [...pandits];
  switch (sort) {
    case 'rating':
      return list.sort((a, b) => b.rating - a.rating);
    case 'price':
      return list.sort((a, b) => a.startingPrice - b.startingPrice);
    case 'distance':
      return list.sort((a, b) => a.distanceKm - b.distanceKm);
    case 'relevance':
    default:
      return list;
  }
}
```

- [ ] **Step 9: Run all tests**

Run: `npm test`
Expected: PASS — new search + dataStore tests green, all prior suites green.

- [ ] **Step 10: Typecheck + commit**

Run: `npm run typecheck` (clean), then:

```bash
git add -A
git commit -m "feat: discovery data model (reviews, supported pujas), dataStore selectors, discoveryStore, search/sort logic"
```

> Reminder: do NOT push. Commit only.

---

### Task 2: Discovery components

**Files:**
- Create: `src/components/ui/BottomSheet.tsx`
- Create: `src/components/ui/Chip.tsx`
- Create: `src/components/ui/RatingSummary.tsx`
- Create: `src/components/ui/DistributionBars.tsx`
- Create: `src/components/ui/ReviewItem.tsx`
- Create: `src/components/ui/MockMap.tsx`
- Test: `src/components/ui/discovery-components.test.tsx`

- [ ] **Step 1: Create `src/components/ui/BottomSheet.tsx`**

```tsx
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative max-h-[85%] overflow-y-auto rounded-t-xl bg-surface">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer && <div className="sticky bottom-0 border-t border-border bg-surface p-4">{footer}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/ui/Chip.tsx`** (selectable filter chip)

```tsx
import { cn } from '../../lib/cn';

export function Chip({
  label,
  selected = false,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm transition',
        selected ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-text',
      )}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 3: Create `src/components/ui/RatingSummary.tsx`**

```tsx
import { Star } from 'lucide-react';

export function RatingSummary({ value, count }: { value: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-3xl font-bold">{value.toFixed(1)}</span>
      <div>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={14} className={n <= Math.round(value) ? 'fill-accent text-accent' : 'text-border'} />
          ))}
        </div>
        <span className="text-xs text-muted">{count} reviews</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/ui/DistributionBars.tsx`**

```tsx
import type { Review } from '../../mock/types';

export function DistributionBars({ reviews }: { reviews: Review[] }) {
  const total = reviews.length || 1;
  return (
    <div className="flex flex-col gap-1">
      {[5, 4, 3, 2, 1].map((star) => {
        const n = reviews.filter((r) => Math.round(r.rating) === star).length;
        const pct = Math.round((n / total) * 100);
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-muted">{star}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-7 text-right text-muted">{n}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/ui/ReviewItem.tsx`**

```tsx
import dayjs from 'dayjs';
import { Star } from 'lucide-react';
import type { Review } from '../../mock/types';
import { Avatar } from './Avatar';

export function ReviewItem({ review }: { review: Review }) {
  return (
    <div className="flex gap-3 border-b border-border py-3 last:border-b-0">
      <Avatar name={review.jajmanName} size={36} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{review.jajmanName}</span>
          <span className="text-xs text-muted">{dayjs(review.date).format('MMM YYYY')}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={12} className={n <= review.rating ? 'fill-accent text-accent' : 'text-border'} />
          ))}
        </div>
        <p className="mt-1 text-sm text-text">{review.text}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create `src/components/ui/MockMap.tsx`** (no external map — stylized backdrop + deterministic pins)

```tsx
import { MapPin } from 'lucide-react';
import type { PanditSummary } from '../../mock/types';

/** A purely decorative mock map: a soft grid backdrop with pins placed deterministically by index. */
export function MockMap({
  pandits,
  selectedId,
  onSelect,
}: {
  pandits: PanditSummary[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-surface-2">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {pandits.map((p, i) => {
        const left = 12 + ((i * 37) % 76);
        const top = 14 + ((i * 53) % 68);
        const active = p.id === selectedId;
        return (
          <button
            key={p.id}
            type="button"
            aria-label={`Pandit ${p.name}`}
            onClick={() => onSelect?.(p.id)}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <MapPin
              size={active ? 34 : 26}
              className={active ? 'fill-primary text-primary' : 'fill-secondary text-secondary'}
            />
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 7: Write the test** — `src/components/ui/discovery-components.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomSheet } from './BottomSheet';
import { Chip } from './Chip';
import { RatingSummary } from './RatingSummary';

describe('discovery components', () => {
  it('BottomSheet renders children when open and calls onClose on the close button', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Filters">
        <div>sheet body</div>
      </BottomSheet>,
    );
    expect(screen.getByText('sheet body')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('BottomSheet renders nothing when closed', () => {
    const { container } = render(
      <BottomSheet open={false} onClose={() => {}}>
        <div>hidden</div>
      </BottomSheet>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('Chip reflects selected state and reports clicks', () => {
    const onClick = vi.fn();
    render(<Chip label="Katha" selected onClick={onClick} />);
    const chip = screen.getByRole('button', { name: 'Katha' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalled();
  });

  it('RatingSummary shows value and review count', () => {
    render(<RatingSummary value={4.9} count={212} />);
    expect(screen.getByText('4.9')).toBeInTheDocument();
    expect(screen.getByText('212 reviews')).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run the test**

Run: `npm test -- discovery-components`
Expected: PASS — 4 assertions green.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: discovery components (BottomSheet, Chip, RatingSummary, DistributionBars, ReviewItem, MockMap)"
```

---

### Task 3: Search screen + Filters sheet

**Files:**
- Create: `src/components/discovery/FiltersSheet.tsx`
- Create: `src/screens/jajman/SearchScreen.tsx`
- Test: `src/screens/jajman/SearchScreen.test.tsx`

- [ ] **Step 1: Create `src/components/discovery/FiltersSheet.tsx`**

```tsx
import { useState } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { Chip } from '../ui/Chip';
import { Button } from '../ui/Button';
import { useDataStore } from '../../store/dataStore';
import { useDiscoveryStore, emptyFilters, type DiscoveryFilters } from '../../store/discoveryStore';

const PRICE_OPTIONS = [1000, 2000, 5000];
const RATING_OPTIONS = [4.0, 4.5, 4.8];

export function FiltersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useDataStore((s) => s.categories);
  const pujas = useDataStore((s) => s.pujas);
  const cities = Array.from(new Set(useDataStore((s) => s.pandits).map((p) => p.city)));
  const committed = useDiscoveryStore((s) => s.filters);
  const setFilters = useDiscoveryStore((s) => s.setFilters);
  const [draft, setDraft] = useState<DiscoveryFilters>(committed);

  // re-sync the draft whenever the sheet (re)opens
  const patch = (p: Partial<DiscoveryFilters>) => setDraft((d) => ({ ...d, ...p }));
  const toggle = <K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) =>
    patch({ [key]: draft[key] === value ? null : value } as Partial<DiscoveryFilters>);

  const apply = () => {
    setFilters(draft);
    onClose();
  };
  const reset = () => setDraft({ ...emptyFilters });

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={reset}>Reset</Button>
          <Button className="flex-1" onClick={apply}>Apply</Button>
        </div>
      }
    >
      <Section title="Category">
        {categories.map((c) => (
          <Chip key={c.id} label={c.name} selected={draft.categoryId === c.id} onClick={() => toggle('categoryId', c.id)} />
        ))}
      </Section>
      <Section title="Puja">
        {pujas.map((p) => (
          <Chip key={p.id} label={p.name} selected={draft.pujaId === p.id} onClick={() => toggle('pujaId', p.id)} />
        ))}
      </Section>
      <Section title="Max price">
        {PRICE_OPTIONS.map((v) => (
          <Chip key={v} label={`₹${v}`} selected={draft.priceMax === v} onClick={() => toggle('priceMax', v)} />
        ))}
      </Section>
      <Section title="Minimum rating">
        {RATING_OPTIONS.map((v) => (
          <Chip key={v} label={`${v}+`} selected={draft.minRating === v} onClick={() => toggle('minRating', v)} />
        ))}
      </Section>
      <Section title="City">
        {cities.map((c) => (
          <Chip key={c} label={c} selected={draft.city === c} onClick={() => toggle('city', c)} />
        ))}
      </Section>
      <Section title="Max distance">
        {[5, 10, 25].map((v) => (
          <Chip key={v} label={`${v} km`} selected={draft.maxDistanceKm === v} onClick={() => toggle('maxDistanceKm', v)} />
        ))}
      </Section>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Create `src/screens/jajman/SearchScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Search, SlidersHorizontal, Map, X } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { PanditCard } from '../../components/ui/PanditCard';
import { Chip } from '../../components/ui/Chip';
import { FiltersSheet } from '../../components/discovery/FiltersSheet';
import { useDataStore } from '../../store/dataStore';
import { useDiscoveryStore, type SortKey } from '../../store/discoveryStore';
import { searchPandits, sortPandits } from '../../domain/search';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'rating', label: 'Top rated' },
  { key: 'distance', label: 'Nearest' },
  { key: 'price', label: 'Lowest price' },
];

export function SearchScreen() {
  const navigate = useNavigate();
  const pandits = useDataStore(useShallow((s) => s.pandits));
  const pujas = useDataStore(useShallow((s) => s.pujas));
  const { query, setQuery, filters, sort, setSort, resetFilters, activeFilterCount } = useDiscoveryStore();
  const [sheetOpen, setSheetOpen] = useState(false);

  const results = sortPandits(searchPandits(pandits, pujas, query, filters), sort);
  const activeCount = activeFilterCount();

  return (
    <>
      <AppBar title="Explore pandits" />
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2 rounded-md bg-surface-2 px-3">
          <Search size={18} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pandits, pujas, city…"
            aria-label="Search"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search" className="text-muted">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm"
          >
            <SlidersHorizontal size={14} />
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/map')}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm"
          >
            <Map size={14} />
            Map
          </button>
          {activeCount > 0 && (
            <button onClick={resetFilters} className="ml-auto text-xs text-primary">Clear all</button>
          )}
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {SORTS.map((s) => (
            <Chip key={s.key} label={s.label} selected={sort === s.key} onClick={() => setSort(s.key)} />
          ))}
        </div>
      </div>

      <div className="flex-1 p-4">
        <p className="mb-3 text-xs text-muted">{results.length} pandit{results.length === 1 ? '' : 's'} found</p>
        {results.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="text-4xl">🔍</div>
            <p className="text-sm text-muted">No pandits match your search.</p>
            <button onClick={() => navigate('/app/alternate')} className="text-sm font-medium text-primary">
              See alternate suggestions
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {results.map((p) => (
              <PanditCard key={p.id} p={p} onClick={() => navigate(`/app/pandit/${p.id}`)} />
            ))}
          </div>
        )}
      </div>

      <FiltersSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
```

> Note: this screen lives under `AppLayout` (the Explore tab), which provides the scroll container + bottom tabs. The `flex-1 p-4` content scrolls within it.

- [ ] **Step 3: Write the test** — `src/screens/jajman/SearchScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SearchScreen } from './SearchScreen';
import { useDiscoveryStore, emptyFilters } from '../../store/discoveryStore';

beforeEach(() => useDiscoveryStore.setState({ query: '', filters: { ...emptyFilters }, sort: 'relevance' }));

function renderSearch() {
  return render(<MemoryRouter><SearchScreen /></MemoryRouter>);
}

describe('SearchScreen', () => {
  it('lists approved pandits by default', () => {
    renderSearch();
    expect(screen.getByText('Pandit Ramesh Sharma')).toBeInTheDocument();
    expect(screen.queryByText('Pandit Naveen Pandey')).not.toBeInTheDocument(); // pending excluded
  });

  it('typing a query filters the list', () => {
    renderSearch();
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'acharya' } });
    expect(screen.getByText('Acharya Vinod Dubey')).toBeInTheDocument();
    expect(screen.queryByText('Pandit Ramesh Sharma')).not.toBeInTheDocument();
  });

  it('shows the alternate-suggestions link when nothing matches', () => {
    renderSearch();
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'zzzznomatch' } });
    expect(screen.getByText('See alternate suggestions')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test**

Run: `npm test -- SearchScreen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Search (Explore) screen + Filters bottom sheet"
```

---

### Task 4: Map view + category/puja browse + plain layout

**Files:**
- Create: `src/components/shell/AppPlainLayout.tsx`
- Create: `src/screens/jajman/MapScreen.tsx`
- Create: `src/screens/jajman/CategoryBrowseScreen.tsx`
- Create: `src/screens/jajman/PujaBrowseScreen.tsx`
- Test: `src/screens/jajman/CategoryBrowseScreen.test.tsx`

- [ ] **Step 1: Create `src/components/shell/AppPlainLayout.tsx`** (drill-down layout: no bottom tabs)

```tsx
import { Outlet } from 'react-router-dom';
import { PhoneFrame } from './PhoneFrame';

/** Drill-down/detail layout for the Jajman surface: scrollable Outlet, no bottom tab bar. */
export function AppPlainLayout() {
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Outlet />
      </div>
    </PhoneFrame>
  );
}
```

- [ ] **Step 2: Create `src/screens/jajman/MapScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { MockMap } from '../../components/ui/MockMap';
import { PanditCard } from '../../components/ui/PanditCard';
import { useDataStore } from '../../store/dataStore';

export function MapScreen() {
  const navigate = useNavigate();
  const pandits = useDataStore((s) => s.getApprovedPandits());
  const [selectedId, setSelectedId] = useState<string | null>(pandits[0]?.id ?? null);
  const selected = pandits.find((p) => p.id === selectedId) ?? null;

  return (
    <>
      <AppBar
        title="Nearby pandits"
        left={
          <button onClick={() => navigate(-1)} aria-label="Back" className="text-muted">
            <ArrowLeft size={20} />
          </button>
        }
      />
      <div className="relative flex-1">
        <MockMap pandits={pandits} selectedId={selectedId} onSelect={setSelectedId} />
        {selected && (
          <div className="absolute inset-x-0 bottom-0 p-3">
            <PanditCard p={selected} onClick={() => navigate(`/app/pandit/${selected.id}`)} />
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Create `src/screens/jajman/CategoryBrowseScreen.tsx`**

```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { PanditCard } from '../../components/ui/PanditCard';
import { useDataStore } from '../../store/dataStore';

export function CategoryBrowseScreen() {
  const navigate = useNavigate();
  const { categoryId = '' } = useParams();
  const category = useDataStore((s) => s.getCategory(categoryId));
  const pujas = useDataStore((s) => s.getPujasForCategory(categoryId));
  const pandits = useDataStore((s) => s.getPanditsForCategory(categoryId));

  return (
    <>
      <AppBar
        title={category ? `${category.icon} ${category.name}` : 'Category'}
        left={
          <button onClick={() => navigate(-1)} aria-label="Back" className="text-muted">
            <ArrowLeft size={20} />
          </button>
        }
      />
      <div className="flex-1 pb-6">
        <SectionHeader title="Pujas in this category" />
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
          {pujas.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/app/puja/${p.id}`)}
              className="shrink-0 rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              {p.name}
            </button>
          ))}
        </div>
        <SectionHeader title={`${pandits.length} pandits available`} />
        <div className="flex flex-col gap-3 px-4">
          {pandits.length === 0 ? (
            <p className="text-sm text-muted">No pandits in this category yet.</p>
          ) : (
            pandits.map((p) => <PanditCard key={p.id} p={p} onClick={() => navigate(`/app/pandit/${p.id}`)} />)
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Create `src/screens/jajman/PujaBrowseScreen.tsx`**

```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { PanditCard } from '../../components/ui/PanditCard';
import { useDataStore } from '../../store/dataStore';

export function PujaBrowseScreen() {
  const navigate = useNavigate();
  const { pujaId = '' } = useParams();
  const puja = useDataStore((s) => s.getPuja(pujaId));
  const pandits = useDataStore((s) => s.getPanditsForPuja(pujaId));

  return (
    <>
      <AppBar
        title={puja?.name ?? 'Puja'}
        left={
          <button onClick={() => navigate(-1)} aria-label="Back" className="text-muted">
            <ArrowLeft size={20} />
          </button>
        }
      />
      <div className="flex-1 pb-6">
        {puja && (
          <p className="px-4 pt-3 text-sm text-muted">
            Suggested duration {puja.suggestedDurationMins} min · ₹{puja.minAmount}–₹{puja.maxAmount}
          </p>
        )}
        <SectionHeader title={`${pandits.length} pandits offer this puja`} />
        <div className="flex flex-col gap-3 px-4">
          {pandits.length === 0 ? (
            <p className="text-sm text-muted">No pandits offer this puja yet.</p>
          ) : (
            pandits.map((p) => <PanditCard key={p.id} p={p} onClick={() => navigate(`/app/pandit/${p.id}`)} />)
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 5: Write the test** — `src/screens/jajman/CategoryBrowseScreen.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CategoryBrowseScreen } from './CategoryBrowseScreen';

describe('CategoryBrowseScreen', () => {
  it('shows pandits for the routed category', () => {
    render(
      <MemoryRouter initialEntries={['/app/category/cat-katha']}>
        <Routes>
          <Route path="/app/category/:categoryId" element={<CategoryBrowseScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/Katha/)).toBeInTheDocument();
    expect(screen.getByText(/pandits available/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test**

Run: `npm test -- CategoryBrowseScreen`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: map view + category/puja browse + AppPlainLayout (tab-less drill-down)"
```

---

### Task 5: Pandit detail + reviews + alternate suggestions + route integration

**Files:**
- Create: `src/screens/jajman/PanditDetailScreen.tsx`
- Create: `src/screens/jajman/ReviewsScreen.tsx`
- Create: `src/screens/jajman/AlternateSuggestionsScreen.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/screens/jajman/HomeScreen.tsx`
- Test: `src/app/discovery-flow.test.tsx`

- [ ] **Step 1: Create `src/screens/jajman/PanditDetailScreen.tsx`**

```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, MapPin, Clock, Languages } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { RatingSummary } from '../../components/ui/RatingSummary';
import { ReviewItem } from '../../components/ui/ReviewItem';
import { useDataStore } from '../../store/dataStore';
import { cn } from '../../lib/cn';

export function PanditDetailScreen() {
  const navigate = useNavigate();
  const { panditId = '' } = useParams();
  const pandit = useDataStore((s) => s.getPandit(panditId));
  const pujas = useDataStore((s) => s.pujas);
  const reviews = useDataStore((s) => s.getReviewsForPandit(panditId));
  const toggleFavorite = useDataStore((s) => s.toggleFavorite);

  if (!pandit) {
    return (
      <>
        <AppBar title="Pandit" left={<button onClick={() => navigate(-1)} aria-label="Back" className="text-muted"><ArrowLeft size={20} /></button>} />
        <div className="flex flex-1 items-center justify-center text-sm text-muted">Pandit not found.</div>
      </>
    );
  }

  return (
    <>
      <AppBar
        title={pandit.name}
        left={<button onClick={() => navigate(-1)} aria-label="Back" className="text-muted"><ArrowLeft size={20} /></button>}
        right={
          <button onClick={() => toggleFavorite(pandit.id)} aria-label="Toggle favorite" aria-pressed={pandit.favorite} className="p-2">
            <Heart size={20} className={cn(pandit.favorite ? 'fill-error text-error' : 'text-muted')} />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 p-4">
          <Avatar name={pandit.name} size={64} />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">{pandit.name}</h1>
            <p className="text-sm text-muted">{pandit.specializations.join(' · ')}</p>
            <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted">
              <span className="flex items-center gap-1"><MapPin size={12} />{pandit.city} · {pandit.distanceKm} km</span>
              <span>· {pandit.experienceYears}y exp</span>
              <span>· {pandit.pujasCompleted} pujas</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 px-4">
          {[
            { label: 'Response', value: `${pandit.responseRatePct}%`, icon: <MessageCircle size={14} /> },
            { label: 'Replies in', value: `${pandit.responseTimeMins}m`, icon: <Clock size={14} /> },
            { label: 'Languages', value: `${pandit.languages.length}`, icon: <Languages size={14} /> },
          ].map((m) => (
            <div key={m.label} className="rounded-md bg-surface-2 p-2 text-center">
              <div className="flex justify-center text-primary">{m.icon}</div>
              <div className="text-sm font-semibold">{m.value}</div>
              <div className="text-[10px] text-muted">{m.label}</div>
            </div>
          ))}
        </div>

        <Section title="About">
          <p className="text-sm leading-relaxed text-text">{pandit.about}</p>
        </Section>

        <Section title="Languages">
          <div className="flex flex-wrap gap-2">{pandit.languages.map((l) => <Badge key={l}>{l}</Badge>)}</div>
        </Section>

        <Section title="Pujas offered">
          <div className="flex flex-col gap-2">
            {pandit.supportedPujas.map((sp) => {
              const puja = pujas.find((p) => p.id === sp.pujaId);
              return (
                <button
                  key={sp.pujaId}
                  onClick={() => navigate(`/app/puja/${sp.pujaId}`)}
                  className="flex items-center justify-between rounded-md border border-border bg-surface p-3 text-left"
                >
                  <span>
                    <span className="block text-sm font-medium">{puja?.name ?? sp.pujaId}</span>
                    <span className="block text-xs text-muted">{sp.durationMins} min</span>
                  </span>
                  <span className="text-sm font-semibold">₹{sp.charge}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Ratings & reviews">
          <RatingSummary value={pandit.rating} count={pandit.ratingCount} />
          <div className="mt-2">
            {reviews.slice(0, 2).map((r) => <ReviewItem key={r.id} review={r} />)}
          </div>
          {reviews.length > 2 && (
            <button onClick={() => navigate(`/app/pandit/${pandit.id}/reviews`)} className="mt-2 text-sm font-medium text-primary">
              See all {reviews.length} reviews
            </button>
          )}
        </Section>

        <div className="h-24" />
      </div>

      <div className="flex items-center gap-3 border-t border-border bg-surface p-3">
        <Button variant="outline" aria-label="Chat" onClick={() => navigate(`/app/chat/${pandit.id}`)} className="px-4">
          <MessageCircle size={18} />
        </Button>
        <Button className="flex-1" onClick={() => navigate(`/app/book/${pandit.id}`)}>
          <span>From ₹{pandit.startingPrice} · Book</span>
        </Button>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border p-4">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}
```

> The Chat (`/app/chat/:id`) and Book (`/app/book/:id`) targets land on the "Coming soon" NotFound until P2/P1c — acceptable.

- [ ] **Step 2: Create `src/screens/jajman/ReviewsScreen.tsx`**

```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { RatingSummary } from '../../components/ui/RatingSummary';
import { DistributionBars } from '../../components/ui/DistributionBars';
import { ReviewItem } from '../../components/ui/ReviewItem';
import { useDataStore } from '../../store/dataStore';

export function ReviewsScreen() {
  const navigate = useNavigate();
  const { panditId = '' } = useParams();
  const pandit = useDataStore((s) => s.getPandit(panditId));
  const reviews = useDataStore((s) => s.getReviewsForPandit(panditId));

  return (
    <>
      <AppBar
        title="Reviews"
        left={<button onClick={() => navigate(-1)} aria-label="Back" className="text-muted"><ArrowLeft size={20} /></button>}
      />
      <div className="flex-1 overflow-y-auto p-4">
        {pandit && (
          <div className="mb-4 flex items-center justify-between gap-4">
            <RatingSummary value={pandit.rating} count={pandit.ratingCount} />
            <div className="flex-1"><DistributionBars reviews={reviews} /></div>
          </div>
        )}
        {reviews.length === 0 ? (
          <p className="text-sm text-muted">No reviews yet.</p>
        ) : (
          reviews.map((r) => <ReviewItem key={r.id} review={r} />)
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Create `src/screens/jajman/AlternateSuggestionsScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { PanditCard } from '../../components/ui/PanditCard';
import { useDataStore } from '../../store/dataStore';
import { sortPandits } from '../../domain/search';

export function AlternateSuggestionsScreen() {
  const navigate = useNavigate();
  const approved = useDataStore((s) => s.getApprovedPandits());

  const sections: { title: string; list: ReturnType<typeof sortPandits> }[] = [
    { title: 'Top rated nearby', list: sortPandits(approved, 'rating').slice(0, 3) },
    { title: 'Closest to you', list: sortPandits(approved, 'distance').slice(0, 3) },
    { title: 'Budget friendly', list: sortPandits(approved, 'price').slice(0, 3) },
  ];

  return (
    <>
      <AppBar
        title="Suggestions for you"
        left={<button onClick={() => navigate(-1)} aria-label="Back" className="text-muted"><ArrowLeft size={20} /></button>}
      />
      <div className="flex-1 pb-6">
        <p className="px-4 pt-3 text-sm text-muted">No exact match — here are pandits you might like.</p>
        {sections.map((s) => (
          <div key={s.title}>
            <SectionHeader title={s.title} />
            <div className="flex flex-col gap-3 px-4">
              {s.list.map((p) => (
                <PanditCard key={p.id} p={p} onClick={() => navigate(`/app/pandit/${p.id}`)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Wire routes in `src/app/router.tsx`** — import the new screens + `AppPlainLayout`, add `/app/search` to the existing `AppLayout` (RequireAuth) children, and add a new `RequireAuth` + `AppPlainLayout` group for the drill-down screens. Add these imports:

```tsx
import { AppPlainLayout } from '../components/shell/AppPlainLayout';
import { SearchScreen } from '../screens/jajman/SearchScreen';
import { MapScreen } from '../screens/jajman/MapScreen';
import { CategoryBrowseScreen } from '../screens/jajman/CategoryBrowseScreen';
import { PujaBrowseScreen } from '../screens/jajman/PujaBrowseScreen';
import { PanditDetailScreen } from '../screens/jajman/PanditDetailScreen';
import { ReviewsScreen } from '../screens/jajman/ReviewsScreen';
import { AlternateSuggestionsScreen } from '../screens/jajman/AlternateSuggestionsScreen';
```

In the existing `RequireAuth` + `AppLayout` group, add `{ path: '/app/search', element: <SearchScreen /> }` next to `/app/home`. Then add a new top-level entry to the `routes` array (before the `*` catch-all):

```tsx
  {
    element: (
      <RequireAuth>
        <AppPlainLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/app/map', element: <MapScreen /> },
      { path: '/app/category/:categoryId', element: <CategoryBrowseScreen /> },
      { path: '/app/puja/:pujaId', element: <PujaBrowseScreen /> },
      { path: '/app/pandit/:panditId', element: <PanditDetailScreen /> },
      { path: '/app/pandit/:panditId/reviews', element: <ReviewsScreen /> },
      { path: '/app/alternate', element: <AlternateSuggestionsScreen /> },
    ],
  },
```

- [ ] **Step 5: Make Home navigate into discovery** — in `src/screens/jajman/HomeScreen.tsx`:
  - Make the `SearchBar` open search: pass `onClick={() => navigate('/app/search')}` (import `useNavigate`).
  - Make each `CategoryChip` navigate: `onClick={() => navigate('/app/category/' + c.id)}`.
  - Make each `PanditCard` navigate: `onClick={() => navigate('/app/pandit/' + p.id)}`.
  - Make "See all" navigate to `/app/search`.
  (Add `const navigate = useNavigate();` from `react-router-dom`.)

- [ ] **Step 6: Write the integration test** — `src/app/discovery-flow.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { useDiscoveryStore, emptyFilters } from '../store/discoveryStore';
import { useDataStore } from '../store/dataStore';
import { seedCategories, seedPujas, seedPandits, seedReviews } from '../mock/seed';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useDiscoveryStore.setState({ query: '', filters: { ...emptyFilters }, sort: 'relevance' });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
  // authenticate directly
  useSessionStore.getState().setPendingPhone('9876543210');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('discovery flow', () => {
  it('Home → Explore → open a pandit detail → see reviews', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/home'] });
    render(<RouterProvider router={router} />);

    // Home shows featured; tap the first pandit card
    fireEvent.click(await screen.findByText('Pandit Ramesh Sharma'));

    // Pandit detail
    expect(await screen.findByText('About')).toBeInTheDocument();
    expect(screen.getByText('Pujas offered')).toBeInTheDocument();

    // Go to all reviews
    fireEvent.click(screen.getByText(/See all .* reviews/));
    expect(await screen.findByText('Reviews')).toBeInTheDocument();
  });

  it('favorite toggle on detail flips the store flag', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/pandit/pnd-2'] });
    render(<RouterProvider router={router} />);
    const before = useDataStore.getState().getPandit('pnd-2')!.favorite;
    fireEvent.click(await screen.findByLabelText('Toggle favorite'));
    expect(useDataStore.getState().getPandit('pnd-2')!.favorite).toBe(!before);
  });
});
```

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS — discovery-flow + SearchScreen + CategoryBrowse + discovery-components + search + all prior suites.

- [ ] **Step 8: Typecheck + build + dev smoke**

Run: `npm run typecheck && npm run build`
Expected: both PASS.

Run: boot `npm run dev` in the background, curl `http://localhost:5173/` → 200, then stop it.

- [ ] **Step 9: Commit** (commit only — do NOT push)

```bash
git add -A
git commit -m "feat: pandit detail + reviews + alternate suggestions; wire discovery routes + Home navigation (P1b complete)"
```

---

## Self-Review

**Spec coverage (P1b = Jajman discovery):**
- Search (text) → Task 3 SearchScreen. ✔
- Filters sheet (category/puja/date/price/rating/city/distance) → Task 3 FiltersSheet (date is a documented stub this phase). ✔
- Results list → Task 3; Map → Task 4 MapScreen + MockMap. ✔
- Category browse + Puja browse → Task 4. ✔
- Pandit detail (about, experience, languages, specializations, supported pujas + charges, ratings, reviews, city/distance, response rate/time, favorite, Book/Chat CTAs) → Task 5 PanditDetailScreen. ✔
- Reviews (all) + distribution → Task 5 ReviewsScreen. ✔
- Alternate suggestions (similar/nearby/same-price) → Task 5 AlternateSuggestionsScreen + Search empty state. ✔
- §0.10 city overrides distance → encoded in `searchPandits` + tested. ✔
- §0.1 routes (`/app/search`, `/app/map`, `/app/category/:id`, `/app/puja/:id`, `/app/pandit/:id`, `/app/pandit/:id/reviews`, `/app/alternate`) → Task 5 router. ✔

**Deferred (correct):** Book (`/app/book/:id`) → P1c; Chat (`/app/chat/:id`), Favorites/Bookings/Profile tabs → P2; date/availability filtering is a stub until the booking/slot work; i18n strings hardcoded (P5).

**Placeholder scan:** every step has complete code or an exact command + expected output. The "Coming soon" targets for Book/Chat are intentional cross-phase stubs, not plan gaps. The unicode escapes (`₹` = ₹, etc.) in code blocks are literal characters to type.

**Type consistency:** `SupportedPuja`/`Review`/`TravelPreference` (Task 1) used by store + screens. `DiscoveryFilters`/`SortKey`/`emptyFilters` (discoveryStore) consumed by `searchPandits`/`sortPandits` (Task 1) and SearchScreen/FiltersSheet (Task 3). New dataStore selectors (`getPandit`, `getReviewsForPandit`, `getPanditsForCategory`, `getPanditsForPuja`, `toggleFavorite`) used across Tasks 4-5. `BottomSheet`/`Chip`/`RatingSummary`/`DistributionBars`/`ReviewItem`/`MockMap` (Task 2) consumed by Tasks 3-5. `AppPlainLayout` (Task 4) used by the Task 5 router group. `routes` export consumed by `discovery-flow.test.tsx`.
