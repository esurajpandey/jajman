import { describe, it, expect } from 'vitest';
import { nextRecurrence } from './recurrence';

describe('nextRecurrence', () => {
  it('monthly adds one month', () => {
    expect(nextRecurrence('2026-01-15T09:00:00.000Z', 'monthly')).toBe('2026-02-15T09:00:00.000Z');
  });
  it('quarterly adds three months', () => {
    expect(nextRecurrence('2026-01-15T09:00:00.000Z', 'quarterly')).toBe('2026-04-15T09:00:00.000Z');
  });
  it('annual adds one year', () => {
    expect(nextRecurrence('2026-01-15T09:00:00.000Z', 'annual')).toBe('2027-01-15T09:00:00.000Z');
  });
});
