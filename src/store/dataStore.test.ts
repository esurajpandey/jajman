import { describe, it, expect, beforeEach } from 'vitest';
import { useDataStore } from './dataStore';
import { seedCategories, seedPujas, seedPandits, seedReviews } from '../mock/seed';

beforeEach(() => {
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

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

  it('addReview prepends a review', () => {
    const before = useDataStore.getState().getReviewsForPandit('pnd-1').length;
    useDataStore.getState().addReview({ id: 'rev-new', panditId: 'pnd-1', jajmanName: 'Test', rating: 5, text: 'Great', date: '2026-06-20' });
    expect(useDataStore.getState().getReviewsForPandit('pnd-1').length).toBe(before + 1);
  });
});

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
