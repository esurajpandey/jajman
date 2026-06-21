import { describe, it, expect } from 'vitest';
import { computeCharges, travelEstimate, acceptCharges } from './charges';

describe('computeCharges', () => {
  it('no emergency: subtotal = base + travel, advance 30%', () => {
    expect(computeCharges(1000, 200, false)).toEqual({
      base: 1000, travel: 200, emergencySurcharge: 0, subtotal: 1200, advance: 360, remaining: 840,
    });
  });

  it('emergency adds 20% of base as surcharge', () => {
    expect(computeCharges(1000, 200, true)).toEqual({
      base: 1000, travel: 200, emergencySurcharge: 200, subtotal: 1400, advance: 420, remaining: 980,
    });
  });

  it('advance + remaining always equals subtotal', () => {
    const c = computeCharges(1111, 333, false);
    expect(c.advance + c.remaining).toBe(c.subtotal);
  });
});

describe('travelEstimate', () => {
  it('is a non-negative rounded function of distance', () => {
    expect(travelEstimate(0)).toBe(0);
    expect(travelEstimate(5)).toBeGreaterThan(0);
    expect(Number.isInteger(travelEstimate(7.3))).toBe(true);
  });
});

describe('acceptCharges (B4 — base + travel + surcharge + additional)', () => {
  it('sums travel and additional into the subtotal; advance is 30%', () => {
    const c = acceptCharges(1000, 200, 300, false);
    expect(c.subtotal).toBe(1500);
    expect(c.additionalTotal).toBe(300);
    expect(c.advance).toBe(450);
    expect(c.remaining).toBe(1050);
  });
  it('adds a 20% emergency surcharge on base when urgent', () => {
    const c = acceptCharges(1000, 0, 0, true);
    expect(c.emergencySurcharge).toBe(200);
    expect(c.subtotal).toBe(1200);
  });
});
