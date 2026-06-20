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
  addReview: (review: Review) => void;
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
  addReview: (review) => set((s) => ({ reviews: [review, ...s.reviews] })),
}));
