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
