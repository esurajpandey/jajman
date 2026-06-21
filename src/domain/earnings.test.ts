import { describe, it, expect } from 'vitest';
import { settlementFor, walletSummary, earningsSeries, transactionsFrom, maskAccount } from './earnings';
import { seedPanditBookings, seedPanditWithdrawals } from '../mock/seed';
import type { Booking, Withdrawal } from '../mock/types';

const bk = (status: Booking['status'], subtotal: number): Booking => ({
  id: `t-${status}-${subtotal}`, panditId: 'pnd-self', pujaId: 'puja-ganesh', type: 'single', status,
  pujaStartISO: '2026-06-09T09:00:00.000Z', slotLabel: '', addressId: 'addr-home', attachments: [], notes: '',
  isEmergency: false, charges: { base: subtotal, travel: 0, emergencySurcharge: 0, subtotal },
  advanceAmount: 0, remainingAmount: 0, amountPaid: subtotal,
  createdAt: '2026-06-01T09:00:00.000Z', requestExpiresAt: '2026-06-02T09:00:00.000Z', isDisputed: false,
});

describe('settlementFor', () => {
  it('settled booking: net = gross − 12% commission', () => {
    expect(settlementFor(bk('completed', 1000))).toEqual({ gross: 1000, commission: 120, net: 880, status: 'settled' });
  });
  it('live booking is pending', () => { expect(settlementFor(bk('scheduled', 1000)).status).toBe('pending'); });
  it('requested booking contributes nothing', () => { expect(settlementFor(bk('requested', 1000)).status).toBe('none'); });
});

describe('walletSummary (over seeds)', () => {
  it('reconciles totals from bookings + withdrawals', () => {
    const s = walletSummary(seedPanditBookings, seedPanditWithdrawals);
    expect(s.total).toBe(8281);       // Σ net of 5 settled bookings
    expect(s.completedCount).toBe(5);
    expect(s.avgPerPuja).toBe(1656);
    expect(s.pending).toBe(1690);     // pbkg-1 scheduled
    expect(s.withdrawn).toBe(5000);   // wd-1 paid
    expect(s.available).toBe(3281);   // total − paid (failed wd-2 excluded)
  });
  it('a failed withdrawal does not reduce available', () => {
    const wds: Withdrawal[] = [{ id: 'w', amount: 999999, bankId: 'b', status: 'failed', createdAt: '2026-06-01T00:00:00.000Z', timeline: [] }];
    expect(walletSummary([bk('completed', 1000)], wds).available).toBe(880);
  });
});

describe('earningsSeries', () => {
  it('month range returns 6 buckets ending at now', () => {
    const series = earningsSeries(seedPanditBookings, 'month', '2026-06-21T00:00:00.000Z');
    expect(series).toHaveLength(6);
    expect(series[series.length - 1].label).toBe('Jun');
    expect(series[series.length - 1].value).toBe(1478); // pmoney-5
    expect(series[1].value).toBe(1690);                 // Feb pmoney-1
  });
  it('week range returns 7 buckets', () => {
    expect(earningsSeries(seedPanditBookings, 'week', '2026-06-21T00:00:00.000Z')).toHaveLength(7);
  });
});

describe('transactionsFrom', () => {
  it('emits earning + commission per settled booking and a withdrawal debit, newest first', () => {
    const txns = transactionsFrom(
      [bk('completed', 1000)],
      [{ id: 'w1', amount: 500, bankId: 'b', status: 'paid', createdAt: '2026-07-01T00:00:00.000Z', timeline: [] }],
    );
    expect(txns[0].type).toBe('withdrawal');     // 2026-07 is newest
    expect(txns[0].amount).toBe(-500);
    expect(txns.some((t) => t.type === 'earning' && t.amount === 1000)).toBe(true);
    expect(txns.some((t) => t.type === 'commission' && t.amount === -120)).toBe(true);
  });
});

describe('maskAccount', () => {
  it('masks all but the last 4 digits', () => { expect(maskAccount('1234567890123421')).toBe('••••3421'); });
});
