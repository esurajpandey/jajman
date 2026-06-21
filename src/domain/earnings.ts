import dayjs from 'dayjs';
import type { Booking, Withdrawal, WalletTxn } from '../mock/types';
import { defaultPricingConfig } from './types';

const SETTLED: Booking['status'][] = ['completed', 'rated'];
const PENDING: Booking['status'][] = ['advance_paid', 'scheduled', 'in_progress'];
const OUT: Withdrawal['status'][] = ['requested', 'processing', 'paid'];

export interface Settlement { gross: number; commission: number; net: number; status: 'settled' | 'pending' | 'none'; }
export interface WalletSummary { available: number; pending: number; total: number; withdrawn: number; completedCount: number; avgPerPuja: number; }
export interface SeriesBucket { label: string; value: number; }

export function settlementFor(b: Booking, pct = defaultPricingConfig.platformCommissionPct): Settlement {
  const gross = b.charges.subtotal;
  const commission = Math.round((pct / 100) * gross);
  const net = gross - commission;
  const status = SETTLED.includes(b.status) ? 'settled' : PENDING.includes(b.status) ? 'pending' : 'none';
  return { gross, commission, net, status };
}

export function walletSummary(bookings: Booking[], withdrawals: Withdrawal[], pct = defaultPricingConfig.platformCommissionPct): WalletSummary {
  let total = 0, pending = 0, completedCount = 0;
  for (const b of bookings) {
    const s = settlementFor(b, pct);
    if (s.status === 'settled') { total += s.net; completedCount += 1; }
    else if (s.status === 'pending') { pending += s.net; }
  }
  const withdrawalsOut = withdrawals.filter((w) => OUT.includes(w.status)).reduce((sum, w) => sum + w.amount, 0);
  const withdrawn = withdrawals.filter((w) => w.status === 'paid').reduce((sum, w) => sum + w.amount, 0);
  const available = total - withdrawalsOut;
  const avgPerPuja = completedCount ? Math.round(total / completedCount) : 0;
  return { available, pending, total, withdrawn, completedCount, avgPerPuja };
}

export function earningsSeries(bookings: Booking[], range: 'week' | 'month' | 'year', nowISO: string, pct = defaultPricingConfig.platformCommissionPct): SeriesBucket[] {
  const now = dayjs(nowISO);
  const settled = bookings.filter((b) => settlementFor(b, pct).status === 'settled');
  const spec = range === 'week'
    ? { count: 7, unit: 'day' as const, fmt: 'dd', key: 'YYYY-MM-DD' }
    : range === 'month'
    ? { count: 6, unit: 'month' as const, fmt: 'MMM', key: 'YYYY-MM' }
    : { count: 5, unit: 'year' as const, fmt: 'YYYY', key: 'YYYY' };
  const buckets: SeriesBucket[] = [];
  for (let i = spec.count - 1; i >= 0; i--) {
    const d = now.subtract(i, spec.unit);
    const key = d.format(spec.key);
    const value = settled
      .filter((b) => dayjs(b.pujaStartISO).format(spec.key) === key)
      .reduce((sum, b) => sum + settlementFor(b, pct).net, 0);
    buckets.push({ label: d.format(spec.fmt), value });
  }
  return buckets;
}

export function transactionsFrom(bookings: Booking[], withdrawals: Withdrawal[], pct = defaultPricingConfig.platformCommissionPct): WalletTxn[] {
  const txns: WalletTxn[] = [];
  for (const b of bookings) {
    const s = settlementFor(b, pct);
    if (s.status !== 'settled') continue;
    txns.push({ id: `txn-earn-${b.id}`, type: 'earning', amount: s.gross, bookingId: b.id, note: 'Booking earning', createdAt: b.pujaStartISO });
    txns.push({ id: `txn-comm-${b.id}`, type: 'commission', amount: -s.commission, bookingId: b.id, note: `Platform commission (${pct}%)`, createdAt: b.pujaStartISO });
    if (b.cancellation && b.cancellation.refundAmount > 0) {
      txns.push({ id: `txn-refund-${b.id}`, type: 'refund', amount: -b.cancellation.refundAmount, bookingId: b.id, note: 'Refund', createdAt: b.createdAt });
    }
  }
  for (const w of withdrawals) {
    const amount = w.status === 'failed' ? 0 : -w.amount;
    txns.push({ id: `txn-wd-${w.id}`, type: 'withdrawal', amount, withdrawalId: w.id, note: w.status === 'failed' ? 'Withdrawal failed' : 'Withdrawal', createdAt: w.createdAt });
  }
  return txns.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function maskAccount(accountNumber: string): string {
  return `••••${accountNumber.slice(-4)}`;
}
