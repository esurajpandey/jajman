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
