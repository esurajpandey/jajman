import { describe, it, expect, beforeEach } from 'vitest';
import { usePanditWalletStore } from './panditWalletStore';
import { seedPanditBanks, seedPanditWithdrawals } from '../mock/seed';

beforeEach(() => usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals }));

describe('panditWalletStore', () => {
  it('addBank masks the account number and sets default (clearing others)', () => {
    const before = usePanditWalletStore.getState().banks.length;
    const bank = usePanditWalletStore.getState().addBank({ holderName: 'A', accountNumber: '9988776655443322', ifsc: 'HDFC0001234', bankName: 'HDFC', isDefault: true });
    const banks = usePanditWalletStore.getState().banks;
    expect(banks.length).toBe(before + 1);
    expect(bank.accountNumberMasked).toBe('••••3322');
    expect(banks.filter((b) => b.isDefault)).toHaveLength(1);
    expect(banks.find((b) => b.isDefault)!.id).toBe(bank.id);
  });
  it('setDefaultBank moves the default', () => {
    usePanditWalletStore.getState().setDefaultBank('bank-2');
    const banks = usePanditWalletStore.getState().banks;
    expect(banks.find((b) => b.id === 'bank-2')!.isDefault).toBe(true);
    expect(banks.find((b) => b.id === 'bank-1')!.isDefault).toBe(false);
  });
  it('removeBank deletes it', () => {
    usePanditWalletStore.getState().removeBank('bank-2');
    expect(usePanditWalletStore.getState().banks.find((b) => b.id === 'bank-2')).toBeUndefined();
  });
  it('requestWithdrawal appends a requested record (newest first)', () => {
    const w = usePanditWalletStore.getState().requestWithdrawal(1000, 'bank-1', '2026-06-21T00:00:00.000Z');
    expect(w.status).toBe('requested');
    expect(usePanditWalletStore.getState().withdrawals[0].id).toBe(w.id);
  });
  it('advanceWithdrawal steps requested→processing→paid then stops', () => {
    const w = usePanditWalletStore.getState().requestWithdrawal(1000, 'bank-1', '2026-06-21T00:00:00.000Z');
    const status = () => usePanditWalletStore.getState().withdrawals.find((x) => x.id === w.id)!.status;
    usePanditWalletStore.getState().advanceWithdrawal(w.id, '2026-06-21T01:00:00.000Z'); expect(status()).toBe('processing');
    usePanditWalletStore.getState().advanceWithdrawal(w.id, '2026-06-21T02:00:00.000Z'); expect(status()).toBe('paid');
    usePanditWalletStore.getState().advanceWithdrawal(w.id, '2026-06-21T03:00:00.000Z'); expect(status()).toBe('paid');
  });
  it('failWithdrawal + retryWithdrawal creates a fresh requested withdrawal', () => {
    const w = usePanditWalletStore.getState().requestWithdrawal(1000, 'bank-1', '2026-06-21T00:00:00.000Z');
    usePanditWalletStore.getState().failWithdrawal(w.id, 'bad ifsc', '2026-06-21T02:00:00.000Z');
    expect(usePanditWalletStore.getState().withdrawals.find((x) => x.id === w.id)!.status).toBe('failed');
    const retry = usePanditWalletStore.getState().retryWithdrawal(w.id, '2026-06-21T03:00:00.000Z');
    expect(retry.status).toBe('requested');
    expect(retry.amount).toBe(1000);
  });
});
