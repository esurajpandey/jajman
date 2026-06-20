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
  it('today for a live booking whose start is in the past but not yet completed', () => {
    expect(panditTab('in_progress', '2026-06-19T15:00:00.000Z', now)).toBe('today');
  });
  it("in_progress always maps to today, even with a future-day start", () => {
    expect(panditTab('in_progress', '2026-06-25T15:00:00.000Z', '2026-06-20T09:00:00.000Z')).toBe('today');
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
