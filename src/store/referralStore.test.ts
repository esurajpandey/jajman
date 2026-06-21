import { describe, it, expect, beforeEach } from 'vitest';
import { useReferralStore } from './referralStore';
import { seedReferrals, referralCode } from '../mock/seed';

beforeEach(() => useReferralStore.setState({ code: referralCode, history: seedReferrals }));

describe('referralStore', () => {
  it('exposes the referral code', () => {
    expect(useReferralStore.getState().code).toBe('SURAJ2026');
  });
  it('getHistory returns the referral records', () => {
    expect(useReferralStore.getState().getHistory()).toHaveLength(3);
  });
});
