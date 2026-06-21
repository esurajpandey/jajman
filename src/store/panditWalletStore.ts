import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { BankAccount, Withdrawal, WithdrawalStatus } from '../mock/types';
import { seedPanditBanks, seedPanditWithdrawals } from '../mock/seed';
import { maskAccount } from '../domain/earnings';

const NEXT: Record<WithdrawalStatus, WithdrawalStatus | null> = {
  requested: 'processing', processing: 'paid', paid: null, failed: null,
};

interface BankInput { holderName: string; accountNumber: string; ifsc: string; bankName: string; isDefault: boolean; }

interface State {
  banks: BankAccount[];
  withdrawals: Withdrawal[];
  addBank: (input: BankInput) => BankAccount;
  updateBank: (id: string, patch: Partial<BankInput>) => void;
  removeBank: (id: string) => void;
  setDefaultBank: (id: string) => void;
  getDefaultBank: () => BankAccount | undefined;
  requestWithdrawal: (amount: number, bankId: string, nowISO: string) => Withdrawal;
  advanceWithdrawal: (id: string, nowISO: string) => void;
  failWithdrawal: (id: string, reason: string, nowISO: string) => void;
  retryWithdrawal: (id: string, nowISO: string) => Withdrawal;
}

export const usePanditWalletStore = create<State>((set, get) => ({
  banks: seedPanditBanks,
  withdrawals: seedPanditWithdrawals,
  addBank: (input) => {
    const bank: BankAccount = {
      id: `bank-${nanoid(5)}`,
      holderName: input.holderName,
      accountNumberMasked: maskAccount(input.accountNumber),
      ifsc: input.ifsc,
      bankName: input.bankName,
      isDefault: input.isDefault,
    };
    set((s) => ({
      banks: input.isDefault
        ? [...s.banks.map((b) => ({ ...b, isDefault: false })), bank]
        : [...s.banks, bank],
    }));
    return bank;
  },
  updateBank: (id, patch) =>
    set((s) => ({
      banks: s.banks.map((b) => {
        if (b.id !== id) return patch.isDefault ? { ...b, isDefault: false } : b;
        return {
          ...b,
          ...(patch.holderName !== undefined ? { holderName: patch.holderName } : {}),
          ...(patch.accountNumber !== undefined ? { accountNumberMasked: maskAccount(patch.accountNumber) } : {}),
          ...(patch.ifsc !== undefined ? { ifsc: patch.ifsc } : {}),
          ...(patch.bankName !== undefined ? { bankName: patch.bankName } : {}),
          ...(patch.isDefault !== undefined ? { isDefault: patch.isDefault } : {}),
        };
      }),
    })),
  removeBank: (id) => set((s) => ({ banks: s.banks.filter((b) => b.id !== id) })),
  setDefaultBank: (id) => set((s) => ({ banks: s.banks.map((b) => ({ ...b, isDefault: b.id === id })) })),
  getDefaultBank: () => get().banks.find((b) => b.isDefault),
  requestWithdrawal: (amount, bankId, nowISO) => {
    const w: Withdrawal = { id: `wd-${nanoid(5)}`, amount, bankId, status: 'requested', createdAt: nowISO, timeline: [{ status: 'requested', at: nowISO }] };
    set((s) => ({ withdrawals: [w, ...s.withdrawals] }));
    return w;
  },
  advanceWithdrawal: (id, nowISO) =>
    set((s) => ({
      withdrawals: s.withdrawals.map((w) => {
        if (w.id !== id) return w;
        const next = NEXT[w.status];
        if (!next) return w;
        return { ...w, status: next, timeline: [...w.timeline, { status: next, at: nowISO }] };
      }),
    })),
  failWithdrawal: (id, reason, nowISO) =>
    set((s) => ({
      withdrawals: s.withdrawals.map((w) =>
        w.id === id ? { ...w, status: 'failed', failReason: reason, timeline: [...w.timeline, { status: 'failed', at: nowISO }] } : w,
      ),
    })),
  retryWithdrawal: (id, nowISO) => {
    const prev = get().withdrawals.find((w) => w.id === id);
    const w: Withdrawal = { id: `wd-${nanoid(5)}`, amount: prev?.amount ?? 0, bankId: prev?.bankId ?? '', status: 'requested', createdAt: nowISO, timeline: [{ status: 'requested', at: nowISO }] };
    set((s) => ({ withdrawals: [w, ...s.withdrawals] }));
    return w;
  },
}));
