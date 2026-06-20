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
