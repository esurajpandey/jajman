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
