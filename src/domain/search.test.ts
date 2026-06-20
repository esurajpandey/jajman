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

  it('pujaId filter keeps only pandits offering that specific puja', () => {
    const r = searchPandits(seedPandits, seedPujas, '', { ...emptyFilters, pujaId: 'puja-ganesh' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.supportedPujas.some((sp) => sp.pujaId === 'puja-ganesh'))).toBe(true);
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
