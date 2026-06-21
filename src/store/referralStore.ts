import { create } from 'zustand';
import type { ReferralRecord } from '../mock/types';
import { seedReferrals, referralCode } from '../mock/seed';

interface ReferralState {
  code: string;
  history: ReferralRecord[];
  getHistory: () => ReferralRecord[];
}

export const useReferralStore = create<ReferralState>((_set, get) => ({
  code: referralCode,
  history: seedReferrals,
  getHistory: () => get().history,
}));
