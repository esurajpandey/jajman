import { describe, it, expect } from 'vitest';
import { countdownTone, isRequestExpired } from './requests';

const now = '2026-06-21T09:00:00.000Z';
describe('countdownTone (OQ6)', () => {
  it('normal when ≥6h remain', () => { expect(countdownTone('2026-06-21T20:00:00.000Z', now)).toBe('normal'); });
  it('amber when <6h remain', () => { expect(countdownTone('2026-06-21T12:00:00.000Z', now)).toBe('amber'); });
  it('red when <1h remains', () => { expect(countdownTone('2026-06-21T09:30:00.000Z', now)).toBe('red'); });
  it('expired at/after the deadline', () => { expect(countdownTone('2026-06-21T09:00:00.000Z', now)).toBe('expired'); });
});
describe('isRequestExpired', () => {
  it('true when now is past the deadline', () => { expect(isRequestExpired('2026-06-21T08:00:00.000Z', now)).toBe(true); });
  it('false when the deadline is ahead', () => { expect(isRequestExpired('2026-06-21T11:00:00.000Z', now)).toBe(false); });
});
