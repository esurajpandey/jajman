# Pandit Seva — Phase 3d (Pandit Money: Earnings · Wallet · Withdraw · Bank · Settlements) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give an approved pandit a working Money surface — Earnings overview (M1), Wallet (M2), Withdraw (M3) + Withdrawal status (M4), Transaction history (M5), and Bank-account management (M6) — replacing the `/pandit/earnings` stub and adding the `/pandit/wallet/*` sub-tree, with balances **derived from real bookings**.

**Architecture:** A pure, framework-free `domain/earnings.ts` owns all money math (per-booking settlement at a single flat commission %, wallet summary, earnings series, transaction ledger, account masking). A new `panditWalletStore` holds only the non-derivable state — saved bank accounts and withdrawal records — plus bank/withdrawal mutations; balances are never stored, they recompute via `walletSummary(panditBookings, withdrawals)`. Six screens render inside `PanditLayout` (tab bar visible) behind `RequirePanditApproved`, composing data from `panditBookingStore` + `panditWalletStore`. New presentational components are no-dep and reuse the existing UI kit.

**Tech Stack:** Vite 5, React 18, TS 5, Tailwind 3, zustand 4 (`zustand/react/shallow`), react-router-dom 6, lucide-react, nanoid, dayjs. Tests: Vitest + RTL + jsdom. **No new dependencies.**

**Reference spec:** `docs/superpowers/specs/2026-06-21-pandit-seva-p3d-money-design.md` (approved design); master UI spec `docs/superpowers/specs/2026-06-20-pandit-seva-mobile-ui-design.md` §"SCREEN INVENTORY — PANDIT" → M1–M6 (~1794–1868).

**Working directory:** all paths relative to `pandit-seva-app/`. Branch: `p3d-money`.

## Global Constraints

- **Routing:** `/pandit/earnings` (replaces the stub), `/pandit/wallet`, `/pandit/wallet/withdraw`, `/pandit/wallet/withdraw/:withdrawalId`, `/pandit/wallet/transactions`, `/pandit/wallet/banks`, `/pandit/wallet/banks/new`, `/pandit/wallet/banks/:bankId/edit`. All inside `RequireAuth > PanditLayout`, each element wrapped in `RequirePanditApproved`.
- **Commission:** a single flat `platformCommissionPct: 12` on `defaultPricingConfig`. `commission = round(pct/100 × gross)`, `net = gross − commission`, `gross = booking.charges.subtotal`. The CommissionRule hierarchy is deferred to the Admin phase.
- **Derived balances:** `pending` = Σ net of live bookings (`advance_paid`/`scheduled`/`in_progress`); `total` = Σ net of settled (`completed`/`rated`); `available` = `total` − Σ amount of withdrawals in `{requested,processing,paid}` (a `failed` withdrawal is excluded → funds return); `withdrawn` = Σ `paid`. No balance is ever stored.
- **No `Date.now()`/`new Date()` in store/domain modules** — date logic takes explicit ISO args; screens may use `new Date()` for "now".
- **No new dependencies.** Reuse `AppBar`, `BackButton`, `Card`, `Badge`, `Chip`, `Button`, `ToggleRow`, `TextField`, `SegmentedControl`, `BottomSheet`.
- **Single source of truth:** balances are always `walletSummary(...)`; the Dashboard earnings mini switches from `seedPanditStats` to `walletSummary` (the ratings mini keeps `seedPanditStats`).
- **Money formatting:** `₹{n.toLocaleString('en-IN')}`. Negative/credit signs use `+` and `−` (U+2212).
- **Tests:** strict TDD for domain + store; build-then-test for components/screens. Reset stores in `beforeEach` via `setState`.
- **Commits:** one per task, local only (never pushed).

---

### Task 1: Money domain + types + `platformCommissionPct` + seeds + `panditWalletStore`

**Files:**
- Modify: `src/domain/types.ts` (`PricingConfig.platformCommissionPct`, `defaultPricingConfig`)
- Modify: `src/mock/types.ts` (`TxnType`, `WalletTxn`, `WithdrawalStatus`, `Withdrawal`, `BankAccount`)
- Create: `src/domain/earnings.ts`
- Modify: `src/mock/seed.ts` (settled bookings + `seedPanditBanks` + `seedPanditWithdrawals`)
- Create: `src/store/panditWalletStore.ts`
- Test: `src/domain/earnings.test.ts`, `src/store/panditWalletStore.test.ts`

**Interfaces:**
- Produces types: `TxnType='earning'|'commission'|'withdrawal'|'refund'`; `WalletTxn{id;type:TxnType;amount:number;bookingId?;withdrawalId?;note:string;createdAt:string}`; `WithdrawalStatus='requested'|'processing'|'paid'|'failed'`; `Withdrawal{id;amount;bankId;status:WithdrawalStatus;createdAt;timeline:{status;at}[];failReason?}`; `BankAccount{id;holderName;accountNumberMasked;ifsc;bankName;isDefault:boolean}`.
- Domain: `settlementFor(b,pct?)→{gross,commission,net,status:'settled'|'pending'|'none'}`; `walletSummary(bookings,withdrawals,pct?)→{available,pending,total,withdrawn,completedCount,avgPerPuja}`; `earningsSeries(bookings,range,nowISO,pct?)→{label,value}[]`; `transactionsFrom(bookings,withdrawals,pct?)→WalletTxn[]`; `maskAccount(acct)→string`.
- Store `panditWalletStore`: `banks`, `withdrawals`, `addBank`, `updateBank`, `removeBank`, `setDefaultBank`, `getDefaultBank`, `requestWithdrawal(amount,bankId,nowISO)→Withdrawal`, `advanceWithdrawal(id,nowISO)`, `failWithdrawal(id,reason,nowISO)`, `retryWithdrawal(id,nowISO)→Withdrawal`.
- Seeds: `seedPanditBanks: BankAccount[]`, `seedPanditWithdrawals: Withdrawal[]`; new settled bookings appended to `seedPanditBookings`.

- [ ] **Step 1: Add `platformCommissionPct` to `src/domain/types.ts`**

In the `PricingConfig` interface add the field, and in `defaultPricingConfig` add the value:

```ts
export interface PricingConfig {
  advancePercent: number;
  cancellationCutPct: number;
  emergencySurchargePct: number;
  emergencyBufferMins: number;
  cancellationLeadMins: number;
  platformCommissionPct: number;
}

export const defaultPricingConfig: PricingConfig = {
  advancePercent: 30,
  cancellationCutPct: 5,
  emergencySurchargePct: 20,
  emergencyBufferMins: 60,
  cancellationLeadMins: 120,
  platformCommissionPct: 12,
};
```

- [ ] **Step 2: Add money types to `src/mock/types.ts`**

Append at the end of the file:

```ts
// --- P3d: pandit money ---
export type TxnType = 'earning' | 'commission' | 'withdrawal' | 'refund';
export interface WalletTxn {
  id: string;
  type: TxnType;
  amount: number;        // signed: + credit to pandit, − debit
  bookingId?: string;
  withdrawalId?: string;
  note: string;
  createdAt: string;     // ISO
}

export type WithdrawalStatus = 'requested' | 'processing' | 'paid' | 'failed';
export interface Withdrawal {
  id: string;
  amount: number;
  bankId: string;
  status: WithdrawalStatus;
  createdAt: string;     // ISO
  timeline: { status: WithdrawalStatus; at: string }[];
  failReason?: string;
}

export interface BankAccount {
  id: string;
  holderName: string;
  accountNumberMasked: string;  // '••••3421'
  ifsc: string;
  bankName: string;
  isDefault: boolean;
}
```

- [ ] **Step 3: Write failing domain tests** — `src/domain/earnings.test.ts`

```ts
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
```

- [ ] **Step 4: Run the domain tests to verify they fail**

Run: `npm test -- earnings`
Expected: FAIL — `./earnings` module not found (and seed exports missing).

- [ ] **Step 5: Implement `src/domain/earnings.ts`**

```ts
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
```

- [ ] **Step 6: Add seeds to `src/mock/seed.ts`**

(a) Add `BankAccount, Withdrawal` to the `./types` type import at the top of the file.

(b) Append these five settled bookings **inside** the `seedPanditBookings` array (before its closing `];`):

```ts
  { id: 'pmoney-1', panditId: SELF_PANDIT_ID, pujaId: 'puja-ganesh', type: 'single', status: 'completed',
    pujaStartISO: '2026-02-12T09:00:00.000Z', slotLabel: '12 Feb · 09:00 AM', addressId: 'addr-home',
    attachments: [], notes: '', isEmergency: false,
    charges: { base: 1800, travel: 120, emergencySurcharge: 0, subtotal: 1920 },
    advanceAmount: 576, remainingAmount: 1344, amountPaid: 1920,
    createdAt: '2026-02-01T09:00:00.000Z', requestExpiresAt: '2026-02-02T09:00:00.000Z', isDisputed: false, jajmanName: 'Anita Kulkarni' },
  { id: 'pmoney-2', panditId: SELF_PANDIT_ID, pujaId: 'puja-satyanarayan', type: 'single', status: 'rated',
    pujaStartISO: '2026-03-08T10:00:00.000Z', slotLabel: '8 Mar · 10:00 AM', addressId: 'addr-temple',
    attachments: [], notes: '', isEmergency: false,
    charges: { base: 1500, travel: 80, emergencySurcharge: 0, subtotal: 1580 },
    advanceAmount: 474, remainingAmount: 1106, amountPaid: 1580,
    createdAt: '2026-02-26T09:00:00.000Z', requestExpiresAt: '2026-02-27T09:00:00.000Z', isDisputed: false, jajmanName: 'Rohit Deshpande' },
  { id: 'pmoney-3', panditId: SELF_PANDIT_ID, pujaId: 'puja-mahamrityunjaya', type: 'single', status: 'completed',
    pujaStartISO: '2026-04-19T07:00:00.000Z', slotLabel: '19 Apr · 07:00 AM', addressId: 'addr-home',
    attachments: [], notes: '', isEmergency: false,
    charges: { base: 2100, travel: 210, emergencySurcharge: 0, subtotal: 2310 },
    advanceAmount: 693, remainingAmount: 1617, amountPaid: 2310,
    createdAt: '2026-04-05T09:00:00.000Z', requestExpiresAt: '2026-04-06T09:00:00.000Z', isDisputed: false, jajmanName: 'Lakshmi Iyer' },
  { id: 'pmoney-4', panditId: SELF_PANDIT_ID, pujaId: 'puja-ganesh', type: 'single', status: 'rated',
    pujaStartISO: '2026-05-22T16:00:00.000Z', slotLabel: '22 May · 04:00 PM', addressId: 'addr-home',
    attachments: [], notes: '', isEmergency: false,
    charges: { base: 1800, travel: 120, emergencySurcharge: 0, subtotal: 1920 },
    advanceAmount: 576, remainingAmount: 1344, amountPaid: 1920,
    createdAt: '2026-05-08T09:00:00.000Z', requestExpiresAt: '2026-05-09T09:00:00.000Z', isDisputed: false, jajmanName: 'Vikram Sethi' },
  { id: 'pmoney-5', panditId: SELF_PANDIT_ID, pujaId: 'puja-satyanarayan', type: 'single', status: 'completed',
    pujaStartISO: '2026-06-09T09:00:00.000Z', slotLabel: '9 Jun · 09:00 AM', addressId: 'addr-temple',
    attachments: [], notes: '', isEmergency: false,
    charges: { base: 1600, travel: 80, emergencySurcharge: 0, subtotal: 1680 },
    advanceAmount: 504, remainingAmount: 1176, amountPaid: 1680,
    createdAt: '2026-05-26T09:00:00.000Z', requestExpiresAt: '2026-05-27T09:00:00.000Z', isDisputed: false, jajmanName: 'Priya Nair' },
```

(c) Append after `seedPanditStats` (top-level exports):

```ts
export const seedPanditBanks: BankAccount[] = [
  { id: 'bank-1', holderName: 'Ramesh Sharma', accountNumberMasked: '••••3421', ifsc: 'HDFC0001234', bankName: 'HDFC Bank', isDefault: true },
  { id: 'bank-2', holderName: 'Ramesh Sharma', accountNumberMasked: '••••8890', ifsc: 'SBIN0005678', bankName: 'State Bank of India', isDefault: false },
];

export const seedPanditWithdrawals: Withdrawal[] = [
  { id: 'wd-1', amount: 5000, bankId: 'bank-1', status: 'paid', createdAt: '2026-05-15T09:00:00.000Z',
    timeline: [
      { status: 'requested', at: '2026-05-15T09:00:00.000Z' },
      { status: 'processing', at: '2026-05-15T11:00:00.000Z' },
      { status: 'paid', at: '2026-05-16T10:00:00.000Z' },
    ] },
  { id: 'wd-2', amount: 2000, bankId: 'bank-1', status: 'failed', createdAt: '2026-06-02T09:00:00.000Z',
    failReason: 'Bank account verification failed — please re-check your IFSC.',
    timeline: [
      { status: 'requested', at: '2026-06-02T09:00:00.000Z' },
      { status: 'processing', at: '2026-06-02T11:00:00.000Z' },
      { status: 'failed', at: '2026-06-03T10:00:00.000Z' },
    ] },
];
```

- [ ] **Step 7: Write failing store tests** — `src/store/panditWalletStore.test.ts`

```ts
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
```

- [ ] **Step 8: Run the store tests to verify they fail**

Run: `npm test -- panditWalletStore`
Expected: FAIL — store module not found.

- [ ] **Step 9: Implement `src/store/panditWalletStore.ts`**

```ts
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
```

- [ ] **Step 10: Run domain + store tests to verify they pass**

Run: `npm test -- earnings panditWalletStore`
Expected: PASS (all cases).

- [ ] **Step 11: Typecheck + commit**

Run: `npm run typecheck` → PASS.

```bash
git add -A
git commit -m "feat: pandit money domain (earnings/commission/wallet) + types + seeds + panditWalletStore"
```

---

### Task 2: Money components

**Files:**
- Create: `src/components/pandit/MiniBarChart.tsx`, `KpiCard.tsx`, `BalanceHeroCard.tsx`, `TransactionRow.tsx`, `BankCard.tsx`, `WithdrawalStepper.tsx`
- Test: `src/components/pandit/money-components.test.tsx`

**Interfaces:**
- Consumes: `Card`, `Button`, `Badge`, `cn`; `SeriesBucket` (from `domain/earnings`); `WalletTxn`, `BankAccount`, `WithdrawalStatus` (from `mock/types`); lucide icons.
- Produces: `MiniBarChart({data})`, `KpiCard({label,value,sub?})`, `BalanceHeroCard({available,onWithdraw,disabled?})`, `TransactionRow({txn,pujaName?})`, `BankCard({bank,onEdit,onDelete})`, `WithdrawalStepper({status})`.

- [ ] **Step 1: Create `src/components/pandit/MiniBarChart.tsx`**

```tsx
import type { SeriesBucket } from '../../domain/earnings';

export function MiniBarChart({ data }: { data: SeriesBucket[] }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted">No earnings yet.</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-36 items-end gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <div
            className="w-full rounded-t bg-primary"
            style={{ height: `${Math.max(2, Math.round((d.value / max) * 100))}%` }}
            aria-label={`${d.label}: ₹${d.value}`}
          />
          <span className="text-[10px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/pandit/KpiCard.tsx`**

```tsx
import { Card } from '../ui/Card';

export function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </Card>
  );
}
```

- [ ] **Step 3: Create `src/components/pandit/BalanceHeroCard.tsx`**

```tsx
import { Wallet } from 'lucide-react';
import { Button } from '../ui/Button';

export function BalanceHeroCard({ available, onWithdraw, disabled = false }: { available: number; onWithdraw: () => void; disabled?: boolean }) {
  return (
    <div className="rounded-lg bg-gradient-to-br from-primary to-primary-600 p-4 text-primary-fg">
      <div className="flex items-center gap-2 text-sm opacity-90"><Wallet size={16} /> Available balance</div>
      <p className="mt-1 text-3xl font-bold">₹{available.toLocaleString('en-IN')}</p>
      <Button variant="ghost" className="mt-3 w-full bg-surface text-primary hover:bg-surface" onClick={onWithdraw} disabled={disabled}>Withdraw</Button>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/pandit/TransactionRow.tsx`**

```tsx
import { ArrowDownLeft, ArrowUpRight, Percent, Receipt } from 'lucide-react';
import type { WalletTxn } from '../../mock/types';
import { cn } from '../../lib/cn';

const META: Record<WalletTxn['type'], { icon: typeof Receipt; label: string }> = {
  earning: { icon: ArrowDownLeft, label: 'Earning' },
  commission: { icon: Percent, label: 'Commission' },
  withdrawal: { icon: ArrowUpRight, label: 'Withdrawal' },
  refund: { icon: Receipt, label: 'Refund' },
};

export function TransactionRow({ txn, pujaName }: { txn: WalletTxn; pujaName?: string }) {
  const { icon: Icon, label } = META[txn.type];
  const credit = txn.amount > 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"><Icon size={16} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}{pujaName ? ` · ${pujaName}` : ''}</p>
        <p className="truncate text-xs text-muted">{txn.note} · {txn.createdAt.slice(0, 10)}</p>
      </div>
      <span className={cn('shrink-0 text-sm font-semibold', credit ? 'text-success' : txn.amount === 0 ? 'text-muted line-through' : 'text-text')}>
        {credit ? '+' : txn.amount < 0 ? '−' : ''}₹{Math.abs(txn.amount).toLocaleString('en-IN')}
      </span>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/pandit/BankCard.tsx`**

```tsx
import { Pencil, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { BankAccount } from '../../mock/types';

export function BankCard({ bank, onEdit, onDelete }: { bank: BankAccount; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">{bank.bankName}{bank.isDefault && <Badge className="bg-primary/10 text-primary">Default</Badge>}</p>
        <p className="text-xs text-muted">{bank.accountNumberMasked} · {bank.ifsc}</p>
        <p className="text-xs text-muted">{bank.holderName}</p>
      </div>
      <button type="button" aria-label={`Edit ${bank.bankName}`} onClick={onEdit} className="p-1 text-muted"><Pencil size={16} /></button>
      <button type="button" aria-label={`Delete ${bank.bankName}`} onClick={onDelete} className="p-1 text-muted"><Trash2 size={16} /></button>
    </Card>
  );
}
```

- [ ] **Step 6: Create `src/components/pandit/WithdrawalStepper.tsx`**

```tsx
import { Check, X } from 'lucide-react';
import type { WithdrawalStatus } from '../../mock/types';
import { cn } from '../../lib/cn';

const STEPS: { key: WithdrawalStatus; label: string }[] = [
  { key: 'requested', label: 'Requested' },
  { key: 'processing', label: 'Processing' },
  { key: 'paid', label: 'Paid' },
];
const ORDER = STEPS.map((s) => s.key);

export function WithdrawalStepper({ status }: { status: WithdrawalStatus }) {
  if (status === 'failed') {
    return (
      <div className="flex items-center gap-2 rounded-md bg-error/10 px-3 py-2 text-sm font-medium text-error">
        <X size={16} /> Failed
      </div>
    );
  }
  const currentIdx = ORDER.indexOf(status);
  const reached = (i: number) => i <= currentIdx;
  return (
    <ol className="flex flex-col gap-0">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[10px]', reached(i) ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-muted')}>
              {reached(i) ? <Check size={12} /> : i + 1}
            </span>
            {i < STEPS.length - 1 && <span className={cn('h-5 w-0.5', reached(i + 1) ? 'bg-primary' : 'bg-border')} />}
          </div>
          <span className={cn('text-sm', reached(i) ? 'font-medium text-text' : 'text-muted')}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 7: Write the component test** — `src/components/pandit/money-components.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MiniBarChart } from './MiniBarChart';
import { BankCard } from './BankCard';
import { TransactionRow } from './TransactionRow';
import { WithdrawalStepper } from './WithdrawalStepper';
import type { BankAccount, WalletTxn } from '../../mock/types';

describe('MiniBarChart', () => {
  it('renders a labelled bar per bucket', () => {
    render(<MiniBarChart data={[{ label: 'May', value: 1000 }, { label: 'Jun', value: 500 }]} />);
    expect(screen.getByText('May')).toBeInTheDocument();
    expect(screen.getByLabelText('Jun: ₹500')).toBeInTheDocument();
  });
});

describe('BankCard', () => {
  const bank: BankAccount = { id: 'bank-1', holderName: 'Ramesh', accountNumberMasked: '••••3421', ifsc: 'HDFC0001234', bankName: 'HDFC Bank', isDefault: true };
  it('shows masked account, Default chip, and fires edit', () => {
    const onEdit = vi.fn();
    render(<BankCard bank={bank} onEdit={onEdit} onDelete={() => {}} />);
    expect(screen.getByText('••••3421')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Edit HDFC Bank'));
    expect(onEdit).toHaveBeenCalled();
  });
});

describe('TransactionRow', () => {
  it('shows a + credit for earnings and a − debit for withdrawals', () => {
    const earn: WalletTxn = { id: 'e', type: 'earning', amount: 1690, note: 'Booking earning', createdAt: '2026-06-09T00:00:00.000Z' };
    const { rerender } = render(<TransactionRow txn={earn} />);
    expect(screen.getByText('+₹1,690')).toBeInTheDocument();
    const wd: WalletTxn = { id: 'w', type: 'withdrawal', amount: -5000, note: 'Withdrawal', createdAt: '2026-05-15T00:00:00.000Z' };
    rerender(<TransactionRow txn={wd} />);
    expect(screen.getByText('−₹5,000')).toBeInTheDocument();
  });
});

describe('WithdrawalStepper', () => {
  it('shows the Failed state', () => {
    render(<WithdrawalStepper status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
  it('shows steps when in progress', () => {
    render(<WithdrawalStepper status="processing" />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run the component test to verify it passes**

Run: `npm test -- money-components`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: pandit money components (MiniBarChart, KpiCard, BalanceHeroCard, TransactionRow, BankCard, WithdrawalStepper)"
```

---

### Task 3: M1 Earnings + M2 Wallet + routes + Dashboard mini

**Files:**
- Create: `src/screens/pandit/EarningsScreen.tsx`, `src/screens/pandit/WalletScreen.tsx`
- Modify: `src/app/router.tsx` (replace `/pandit/earnings` stub; add `/pandit/wallet`)
- Modify: `src/screens/pandit/PanditDashboardScreen.tsx` (earnings mini → `walletSummary`)
- Modify: `src/mock/seed.ts` (trim now-unused `seedPanditStats` balance fields)
- Modify: `src/screens/pandit/PanditDashboardScreen.test.tsx` (reset wallet store)
- Test: `src/screens/pandit/EarningsScreen.test.tsx`, `src/screens/pandit/WalletScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Card`, `SegmentedControl`; `KpiCard`, `MiniBarChart`, `BalanceHeroCard`, `TransactionRow`; `walletSummary`, `earningsSeries`, `transactionsFrom`, `settlementFor`; `panditBookingStore.bookings`, `panditWalletStore.withdrawals`, `dataStore.getPuja`.
- Produces: `EarningsScreen` (`/pandit/earnings`), `WalletScreen` (`/pandit/wallet`).

- [ ] **Step 1: Create `src/screens/pandit/EarningsScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Wallet, ArrowDownToLine, ListOrdered } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { Card } from '../../components/ui/Card';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { KpiCard } from '../../components/pandit/KpiCard';
import { MiniBarChart } from '../../components/pandit/MiniBarChart';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { useDataStore } from '../../store/dataStore';
import { walletSummary, earningsSeries, transactionsFrom, settlementFor } from '../../domain/earnings';

type Range = 'week' | 'month' | 'year';

export function EarningsScreen() {
  const navigate = useNavigate();
  const nowISO = new Date().toISOString();
  const [range, setRange] = useState<Range>('month');
  const bookings = usePanditBookingStore(useShallow((s) => s.bookings));
  const withdrawals = usePanditWalletStore(useShallow((s) => s.withdrawals));
  const getPuja = useDataStore((s) => s.getPuja);

  const summary = walletSummary(bookings, withdrawals);
  const series = earningsSeries(bookings, range, nowISO);
  const periodTotal = series.reduce((sum, b) => sum + b.value, 0);
  const grossTotal = bookings.reduce((sum, b) => (settlementFor(b).status === 'settled' ? sum + settlementFor(b).gross : sum), 0);
  const commissionTotal = grossTotal - summary.total;
  const recent = transactionsFrom(bookings, withdrawals).filter((t) => t.type === 'earning').slice(0, 4);

  return (
    <>
      <AppBar title="Earnings" />
      <div className="flex-1 overflow-y-auto p-4">
        <SegmentedControl<Range> segments={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} value={range} onChange={setRange} />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <KpiCard label="Total earnings" value={`₹${summary.total.toLocaleString('en-IN')}`} />
          <KpiCard label="This period" value={`₹${periodTotal.toLocaleString('en-IN')}`} />
          <KpiCard label="Completed pujas" value={`${summary.completedCount}`} />
          <KpiCard label="Avg per puja" value={`₹${summary.avgPerPuja.toLocaleString('en-IN')}`} />
        </div>

        <Card className="mt-4 p-3">
          <p className="mb-2 text-sm font-medium">Earnings ({range})</p>
          <MiniBarChart data={series} />
        </Card>

        <Card className="mt-4 p-3 text-sm">
          <div className="flex justify-between py-0.5"><span className="text-muted">Gross</span><span>₹{grossTotal.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between py-0.5"><span className="text-muted">Commission</span><span>−₹{commissionTotal.toLocaleString('en-IN')}</span></div>
          <div className="mt-1 flex justify-between border-t border-border py-1 font-semibold"><span>Net</span><span>₹{summary.total.toLocaleString('en-IN')}</span></div>
        </Card>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Card onClick={() => navigate('/pandit/wallet')} className="flex cursor-pointer flex-col items-center gap-1 p-3 text-center"><Wallet size={18} className="text-primary" /><span className="text-xs">Wallet</span></Card>
          <Card onClick={() => navigate('/pandit/wallet/withdraw')} className="flex cursor-pointer flex-col items-center gap-1 p-3 text-center"><ArrowDownToLine size={18} className="text-primary" /><span className="text-xs">Withdraw</span></Card>
          <Card onClick={() => navigate('/pandit/wallet/transactions')} className="flex cursor-pointer flex-col items-center gap-1 p-3 text-center"><ListOrdered size={18} className="text-primary" /><span className="text-xs">Transactions</span></Card>
        </div>

        <h2 className="mb-2 mt-5 text-sm font-semibold">Recent earnings</h2>
        {recent.length === 0 ? (
          <p className="rounded-md bg-surface-2 p-3 text-sm text-muted">No earnings yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-sm">
                <span className="truncate">{getPuja(bookings.find((b) => b.id === t.bookingId)?.pujaId ?? '')?.name ?? 'Puja'}</span>
                <span className="font-medium text-success">+₹{t.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `src/screens/pandit/WalletScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { BalanceHeroCard } from '../../components/pandit/BalanceHeroCard';
import { TransactionRow } from '../../components/pandit/TransactionRow';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { useDataStore } from '../../store/dataStore';
import { walletSummary, transactionsFrom } from '../../domain/earnings';

export function WalletScreen() {
  const navigate = useNavigate();
  const bookings = usePanditBookingStore(useShallow((s) => s.bookings));
  const withdrawals = usePanditWalletStore(useShallow((s) => s.withdrawals));
  const getPuja = useDataStore((s) => s.getPuja);
  const summary = walletSummary(bookings, withdrawals);
  const recent = transactionsFrom(bookings, withdrawals).slice(0, 5);

  return (
    <>
      <AppBar title="Wallet" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <BalanceHeroCard available={summary.available} disabled={summary.available <= 0} onWithdraw={() => navigate('/pandit/wallet/withdraw')} />
        {summary.available <= 0 && <p className="mt-2 text-center text-xs text-muted">No funds available to withdraw yet.</p>}

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-muted">Pending</p><p className="text-sm font-semibold">₹{summary.pending.toLocaleString('en-IN')}</p></div>
          <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-muted">Total</p><p className="text-sm font-semibold">₹{summary.total.toLocaleString('en-IN')}</p></div>
          <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-muted">Withdrawn</p><p className="text-sm font-semibold">₹{summary.withdrawn.toLocaleString('en-IN')}</p></div>
        </div>

        <p className="mt-3 rounded-md bg-surface-2 p-3 text-xs text-muted">Pending balance clears after each booking is completed and settled.</p>

        <div className="mt-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent transactions</h2>
          <button type="button" onClick={() => navigate('/pandit/wallet/transactions')} className="text-xs text-primary">View all</button>
        </div>
        <div className="mt-1 divide-y divide-border">
          {recent.map((t) => (
            <TransactionRow key={t.id} txn={t} pujaName={t.bookingId ? getPuja(bookings.find((b) => b.id === t.bookingId)?.pujaId ?? '')?.name : undefined} />
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Wire routes in `src/app/router.tsx`**

Add imports:

```tsx
import { EarningsScreen } from '../screens/pandit/EarningsScreen';
import { WalletScreen } from '../screens/pandit/WalletScreen';
```

Replace the earnings stub line:

```tsx
      { path: '/pandit/earnings', element: <RequirePanditApproved><PanditStub title="Earnings" /></RequirePanditApproved> },
```

with:

```tsx
      { path: '/pandit/earnings', element: <RequirePanditApproved><EarningsScreen /></RequirePanditApproved> },
      { path: '/pandit/wallet', element: <RequirePanditApproved><WalletScreen /></RequirePanditApproved> },
```

- [ ] **Step 4: Switch the Dashboard earnings mini to `walletSummary` in `src/screens/pandit/PanditDashboardScreen.tsx`**

Add imports near the top:

```tsx
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { walletSummary } from '../../domain/earnings';
```

Inside the component, after the existing store reads, add:

```tsx
  const allBookings = usePanditBookingStore(useShallow((s) => s.bookings));
  const withdrawals = usePanditWalletStore(useShallow((s) => s.withdrawals));
  const summary = walletSummary(allBookings, withdrawals);
```

Replace the two earnings `<p>` lines in the Available card:

```tsx
            <p className="text-lg font-semibold">₹{seedPanditStats.availableBalance.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-muted">This month ₹{seedPanditStats.monthEarnings.toLocaleString('en-IN')}</p>
```

with:

```tsx
            <p className="text-lg font-semibold">₹{summary.available.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-muted">Pending ₹{summary.pending.toLocaleString('en-IN')}</p>
```

(The ratings card keeps using `seedPanditStats.ratingAvg`/`ratingCount`; the `seedPanditStats` import stays.)

- [ ] **Step 5: Trim now-unused balance fields from `seedPanditStats` in `src/mock/seed.ts`**

```ts
export const seedPanditStats = {
  ratingAvg: 4.8,
  ratingCount: 64,
};
```

(Removes `availableBalance`/`pendingBalance`/`monthEarnings` — no longer referenced after Step 4.)

- [ ] **Step 6: Reset the wallet store in the Dashboard test — `src/screens/pandit/PanditDashboardScreen.test.tsx`**

Add to the seed import: `seedPanditBanks, seedPanditWithdrawals`. Add this line inside `beforeEach` (after the `usePanditBookingStore.setState(...)` line):

```tsx
  usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals });
```

And add the import at the top:

```tsx
import { usePanditWalletStore } from '../../store/panditWalletStore';
```

- [ ] **Step 7: Write the screen tests** — `src/screens/pandit/EarningsScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EarningsScreen } from './EarningsScreen';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { useDataStore } from '../../store/dataStore';
import { seedPanditBookings, seedPanditBanks, seedPanditWithdrawals, seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => {
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('EarningsScreen', () => {
  it('shows KPI totals and switches range', () => {
    render(<MemoryRouter><EarningsScreen /></MemoryRouter>);
    expect(screen.getByText('Total earnings')).toBeInTheDocument();
    expect(screen.getByText('₹1,656')).toBeInTheDocument();   // avg per puja (unique)
    fireEvent.click(screen.getByRole('tab', { name: 'Week' }));
    expect(screen.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'true');
  });
});
```

And `src/screens/pandit/WalletScreen.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WalletScreen } from './WalletScreen';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { useDataStore } from '../../store/dataStore';
import { seedPanditBookings, seedPanditBanks, seedPanditWithdrawals, seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => {
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('WalletScreen', () => {
  it('shows the available-balance hero and an enabled Withdraw CTA', () => {
    render(<MemoryRouter><WalletScreen /></MemoryRouter>);
    expect(screen.getByText('Available balance')).toBeInTheDocument();
    expect(screen.getByText('₹3,281')).toBeInTheDocument();   // available (unique)
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeEnabled();
  });
});
```

- [ ] **Step 8: Run the tests + typecheck**

Run: `npm test -- EarningsScreen WalletScreen PanditDashboardScreen`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS (no dangling `availableBalance`/`monthEarnings` references).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: Pandit Earnings (M1) + Wallet (M2) + dashboard earnings via walletSummary"
```

---

### Task 4: M3 Withdraw + M4 Withdrawal Status + routes

**Files:**
- Create: `src/screens/pandit/WithdrawScreen.tsx`, `src/screens/pandit/WithdrawalStatusScreen.tsx`
- Modify: `src/app/router.tsx` (`/pandit/wallet/withdraw`, `/pandit/wallet/withdraw/:withdrawalId`)
- Test: `src/screens/pandit/WithdrawScreen.test.tsx`, `src/screens/pandit/WithdrawalStatusScreen.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Button`, `TextField`, `Chip`, `WithdrawalStepper`; `walletSummary`; `panditWalletStore` (`banks`, `withdrawals`, `requestWithdrawal`, `advanceWithdrawal`, `retryWithdrawal`); `panditBookingStore.bookings`.
- Produces: `WithdrawScreen` (`/pandit/wallet/withdraw`), `WithdrawalStatusScreen` (`/pandit/wallet/withdraw/:withdrawalId`).

- [ ] **Step 1: Create `src/screens/pandit/WithdrawScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { Chip } from '../../components/ui/Chip';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { walletSummary } from '../../domain/earnings';

export function WithdrawScreen() {
  const navigate = useNavigate();
  const bookings = usePanditBookingStore(useShallow((s) => s.bookings));
  const withdrawals = usePanditWalletStore(useShallow((s) => s.withdrawals));
  const banks = usePanditWalletStore(useShallow((s) => s.banks));
  const requestWithdrawal = usePanditWalletStore((s) => s.requestWithdrawal);
  const { available } = walletSummary(bookings, withdrawals);

  const [amount, setAmount] = useState('');
  const [bankId, setBankId] = useState(banks.find((b) => b.isDefault)?.id ?? banks[0]?.id ?? '');
  const [err, setErr] = useState('');

  const n = Number(amount);
  const confirm = () => {
    setErr('');
    if (!bankId) { setErr('Select a bank account.'); return; }
    if (!(n > 0)) { setErr('Enter an amount to withdraw.'); return; }
    if (n > available) { setErr('Amount exceeds your available balance.'); return; }
    const w = requestWithdrawal(n, bankId, new Date().toISOString());
    navigate(`/pandit/wallet/withdraw/${w.id}`);
  };

  return (
    <>
      <AppBar title="Withdraw" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <p className="rounded-md bg-surface-2 p-3 text-sm">Available to withdraw: <span className="font-semibold">₹{available.toLocaleString('en-IN')}</span></p>

        {banks.length === 0 ? (
          <div className="mt-4 rounded-md border border-border p-4 text-center text-sm text-muted">
            Add a bank account to withdraw.
            <Button variant="outline" className="mt-2 w-full" onClick={() => navigate('/pandit/wallet/banks/new')}>+ Add bank account</Button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-end gap-2">
              <TextField label="Amount (₹)" name="amount" type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-sm" />
              <Chip label="Withdraw all" onClick={() => setAmount(String(available))} />
            </div>
            {err && <p className="mt-1 text-xs text-error">{err}</p>}

            <h2 className="mb-2 mt-4 text-sm font-semibold">To bank</h2>
            <div className="flex flex-col gap-2">
              {banks.map((b) => (
                <label key={b.id} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <input type="radio" name="bank" checked={bankId === b.id} onChange={() => setBankId(b.id)} aria-label={b.bankName} />
                  <span>{b.bankName} · {b.accountNumberMasked}</span>
                </label>
              ))}
            </div>

            <p className="mt-3 text-xs text-muted">Withdrawals are processed in 1–2 business days (mock).</p>
            <Button className="mt-4 w-full" disabled={!amount} onClick={confirm}>Confirm withdrawal</Button>
          </>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `src/screens/pandit/WithdrawalStatusScreen.tsx`**

```tsx
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { WithdrawalStepper } from '../../components/pandit/WithdrawalStepper';
import { usePanditWalletStore } from '../../store/panditWalletStore';

export function WithdrawalStatusScreen() {
  const { withdrawalId = '' } = useParams();
  const navigate = useNavigate();
  const withdrawal = usePanditWalletStore(useShallow((s) => s.withdrawals.find((w) => w.id === withdrawalId)));
  const banks = usePanditWalletStore(useShallow((s) => s.banks));
  const advanceWithdrawal = usePanditWalletStore((s) => s.advanceWithdrawal);
  const retryWithdrawal = usePanditWalletStore((s) => s.retryWithdrawal);

  // Deterministic demo advance: step a non-terminal withdrawal forward (requested→processing→paid).
  useEffect(() => {
    if (withdrawal && (withdrawal.status === 'requested' || withdrawal.status === 'processing')) {
      advanceWithdrawal(withdrawal.id, new Date().toISOString());
    }
  }, [withdrawal?.id, withdrawal?.status, advanceWithdrawal, withdrawal]);

  if (!withdrawal) {
    return (
      <>
        <AppBar title="Withdrawal" left={<BackButton />} />
        <div className="flex-1 p-6 text-sm text-muted">Withdrawal not found.</div>
      </>
    );
  }
  const bank = banks.find((b) => b.id === withdrawal.bankId);

  return (
    <>
      <AppBar title="Withdrawal" left={<BackButton to="/pandit/wallet" />} />
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-2xl font-bold">₹{withdrawal.amount.toLocaleString('en-IN')}</p>
        <p className="text-xs text-muted">To {bank?.bankName ?? 'bank'} · {bank?.accountNumberMasked ?? ''}</p>

        <div className="mt-4"><WithdrawalStepper status={withdrawal.status} /></div>

        {withdrawal.status === 'failed' && (
          <div className="mt-4 rounded-md bg-error/10 p-3 text-sm text-error">
            {withdrawal.failReason ?? 'The withdrawal failed.'}
            <Button variant="outline" className="mt-2 w-full" onClick={() => { const w = retryWithdrawal(withdrawal.id, new Date().toISOString()); navigate(`/pandit/wallet/withdraw/${w.id}`); }}>Retry withdrawal</Button>
          </div>
        )}

        <Button variant="ghost" className="mt-4 w-full" onClick={() => navigate('/pandit/wallet')}>Back to wallet</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Wire routes in `src/app/router.tsx`**

Add imports:

```tsx
import { WithdrawScreen } from '../screens/pandit/WithdrawScreen';
import { WithdrawalStatusScreen } from '../screens/pandit/WithdrawalStatusScreen';
```

Add after the `/pandit/wallet` route:

```tsx
      { path: '/pandit/wallet/withdraw', element: <RequirePanditApproved><WithdrawScreen /></RequirePanditApproved> },
      { path: '/pandit/wallet/withdraw/:withdrawalId', element: <RequirePanditApproved><WithdrawalStatusScreen /></RequirePanditApproved> },
```

- [ ] **Step 4: Write the tests** — `src/screens/pandit/WithdrawScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WithdrawScreen } from './WithdrawScreen';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { seedPanditBookings, seedPanditBanks, seedPanditWithdrawals } from '../../mock/seed';

beforeEach(() => {
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals });
});

describe('WithdrawScreen', () => {
  it('rejects an amount over the available balance', () => {
    render(<MemoryRouter><WithdrawScreen /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '99999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm withdrawal' }));
    expect(screen.getByText(/exceeds your available balance/)).toBeInTheDocument();
  });
  it('"Withdraw all" fills the available amount', () => {
    render(<MemoryRouter><WithdrawScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw all' }));
    expect((screen.getByLabelText('Amount (₹)') as HTMLInputElement).value).toBe('3281');
  });
});
```

And `src/screens/pandit/WithdrawalStatusScreen.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WithdrawalStatusScreen } from './WithdrawalStatusScreen';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { seedPanditBanks, seedPanditWithdrawals } from '../../mock/seed';

beforeEach(() => usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals }));

function renderAt(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/pandit/wallet/withdraw/${id}`]}>
      <Routes><Route path="/pandit/wallet/withdraw/:withdrawalId" element={<WithdrawalStatusScreen />} /></Routes>
    </MemoryRouter>,
  );
}

describe('WithdrawalStatusScreen', () => {
  it('renders the paid stepper for a settled withdrawal', () => {
    renderAt('wd-1');
    expect(screen.getByText('₹5,000')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });
  it('shows the failure reason and a retry for a failed withdrawal', () => {
    renderAt('wd-2');
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry withdrawal' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the tests + typecheck**

Run: `npm test -- WithdrawScreen WithdrawalStatusScreen`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Pandit Withdraw (M3) + Withdrawal status (M4) — deterministic lifecycle"
```

---

### Task 5: M5 Transactions + M6 Bank management + routes

**Files:**
- Create: `src/screens/pandit/TransactionsScreen.tsx`, `src/screens/pandit/BankAccountsScreen.tsx`, `src/screens/pandit/BankEditScreen.tsx`
- Modify: `src/app/router.tsx` (`/pandit/wallet/transactions`, `/pandit/wallet/banks`, `/banks/new`, `/banks/:bankId/edit`)
- Test: `src/screens/pandit/TransactionsScreen.test.tsx`, `src/screens/pandit/bank-screens.test.tsx`

**Interfaces:**
- Consumes: `AppBar`, `BackButton`, `Button`, `TextField`, `ToggleRow`, `Chip`, `BottomSheet`; `TransactionRow`, `BankCard`; `transactionsFrom`; `panditWalletStore` (`banks`, `withdrawals`, `addBank`, `updateBank`, `removeBank`); `panditBookingStore.bookings`, `dataStore.getPuja`; `TxnType`, `WalletTxn` from `mock/types`.
- Produces: `TransactionsScreen`, `BankAccountsScreen`, `BankEditScreen`.

- [ ] **Step 1: Create `src/screens/pandit/TransactionsScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { TransactionRow } from '../../components/pandit/TransactionRow';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { useDataStore } from '../../store/dataStore';
import { transactionsFrom } from '../../domain/earnings';
import type { TxnType, WalletTxn } from '../../mock/types';

type Filter = 'all' | TxnType;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'earning', label: 'Earnings' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'refund', label: 'Refunds' },
  { value: 'commission', label: 'Commission' },
];

export function TransactionsScreen() {
  const navigate = useNavigate();
  const bookings = usePanditBookingStore(useShallow((s) => s.bookings));
  const withdrawals = usePanditWalletStore(useShallow((s) => s.withdrawals));
  const getPuja = useDataStore((s) => s.getPuja);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<WalletTxn | null>(null);

  const all = transactionsFrom(bookings, withdrawals);
  const txns = filter === 'all' ? all : all.filter((t) => t.type === filter);
  const pujaFor = (t: WalletTxn) => (t.bookingId ? getPuja(bookings.find((b) => b.id === t.bookingId)?.pujaId ?? '')?.name : undefined);

  return (
    <>
      <AppBar title="Transactions" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => <Chip key={f.value} label={f.label} selected={filter === f.value} onClick={() => setFilter(f.value)} />)}
        </div>
        {txns.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No transactions.</p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {txns.map((t) => (
              <button key={t.id} type="button" className="w-full text-left" onClick={() => setSelected(t)}>
                <TransactionRow txn={t} pujaName={pujaFor(t)} />
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title="Transaction">
        {selected && (
          <div className="text-sm">
            <div className="flex justify-between py-1"><span className="text-muted">Type</span><span className="capitalize">{selected.type}</span></div>
            <div className="flex justify-between py-1"><span className="text-muted">Amount</span><span>{selected.amount < 0 ? '−' : selected.amount > 0 ? '+' : ''}₹{Math.abs(selected.amount).toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between py-1"><span className="text-muted">Date</span><span>{selected.createdAt.slice(0, 10)}</span></div>
            <p className="mt-1 text-muted">{selected.note}</p>
            {selected.withdrawalId && (
              <Button variant="outline" className="mt-3 w-full" onClick={() => { const id = selected.withdrawalId!; setSelected(null); navigate(`/pandit/wallet/withdraw/${id}`); }}>View withdrawal</Button>
            )}
          </div>
        )}
      </BottomSheet>
    </>
  );
}
```

- [ ] **Step 2: Create `src/screens/pandit/BankAccountsScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Plus } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { BankCard } from '../../components/pandit/BankCard';
import { usePanditWalletStore } from '../../store/panditWalletStore';

export function BankAccountsScreen() {
  const navigate = useNavigate();
  const banks = usePanditWalletStore(useShallow((s) => s.banks));
  const removeBank = usePanditWalletStore((s) => s.removeBank);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <>
      <AppBar
        title="Bank accounts"
        left={<BackButton />}
        right={<button type="button" aria-label="Add bank" onClick={() => navigate('/pandit/wallet/banks/new')} className="p-2 text-primary"><Plus size={20} /></button>}
      />
      <div className="flex-1 overflow-y-auto p-4">
        {banks.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No bank accounts — add one to withdraw.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {banks.map((b) => (
              <BankCard key={b.id} bank={b} onEdit={() => navigate(`/pandit/wallet/banks/${b.id}/edit`)} onDelete={() => setConfirmId(b.id)} />
            ))}
          </div>
        )}
      </div>

      <BottomSheet open={!!confirmId} onClose={() => setConfirmId(null)} title="Remove bank account?">
        <p className="text-sm text-muted">This bank account will be removed.</p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setConfirmId(null)}>Cancel</Button>
          <Button className="flex-1" onClick={() => { if (confirmId) removeBank(confirmId); setConfirmId(null); }}>Remove</Button>
        </div>
      </BottomSheet>
    </>
  );
}
```

- [ ] **Step 3: Create `src/screens/pandit/BankEditScreen.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { ToggleRow } from '../../components/ui/ToggleRow';
import { usePanditWalletStore } from '../../store/panditWalletStore';

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function BankEditScreen() {
  const navigate = useNavigate();
  const { bankId } = useParams();
  const existing = usePanditWalletStore((s) => (bankId ? s.banks.find((b) => b.id === bankId) : undefined));
  const addBank = usePanditWalletStore((s) => s.addBank);
  const updateBank = usePanditWalletStore((s) => s.updateBank);

  const [holderName, setHolderName] = useState(existing?.holderName ?? '');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmNumber, setConfirmNumber] = useState('');
  const [ifsc, setIfsc] = useState(existing?.ifsc ?? '');
  const [bankName, setBankName] = useState(existing?.bankName ?? '');
  const [isDefault, setIsDefault] = useState(existing?.isDefault ?? false);
  const [err, setErr] = useState('');

  const save = () => {
    setErr('');
    if (!holderName || !bankName) { setErr('Enter the account holder and bank name.'); return; }
    if (!IFSC_RE.test(ifsc)) { setErr('Enter a valid IFSC (e.g. HDFC0001234).'); return; }
    if (existing) {
      updateBank(existing.id, { holderName, ifsc, bankName, isDefault, ...(accountNumber ? { accountNumber } : {}) });
    } else {
      if (accountNumber.length < 4) { setErr('Enter a valid account number.'); return; }
      if (accountNumber !== confirmNumber) { setErr('Account numbers do not match.'); return; }
      addBank({ holderName, accountNumber, ifsc, bankName, isDefault });
    }
    navigate('/pandit/wallet/banks');
  };

  return (
    <>
      <AppBar title={existing ? 'Edit bank account' : 'Add bank account'} left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          <TextField label="Account holder name" name="holder" value={holderName} onChange={(e) => setHolderName(e.target.value)} />
          {!existing && <TextField label="Account number" name="acct" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />}
          {!existing && <TextField label="Confirm account number" name="acct2" inputMode="numeric" value={confirmNumber} onChange={(e) => setConfirmNumber(e.target.value)} />}
          {existing && <p className="text-xs text-muted">Account on file: {existing.accountNumberMasked}</p>}
          <TextField label="IFSC" name="ifsc" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} />
          <TextField label="Bank name" name="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          <div className="rounded-md border border-border px-3"><ToggleRow label="Set as default" checked={isDefault} onChange={setIsDefault} /></div>
        </div>
        {err && <p className="mt-2 text-xs text-error">{err}</p>}
        <Button className="mt-4 w-full" onClick={save}>Save</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Wire routes in `src/app/router.tsx`**

Add imports:

```tsx
import { TransactionsScreen } from '../screens/pandit/TransactionsScreen';
import { BankAccountsScreen } from '../screens/pandit/BankAccountsScreen';
import { BankEditScreen } from '../screens/pandit/BankEditScreen';
```

Add after the withdrawal-status route:

```tsx
      { path: '/pandit/wallet/transactions', element: <RequirePanditApproved><TransactionsScreen /></RequirePanditApproved> },
      { path: '/pandit/wallet/banks', element: <RequirePanditApproved><BankAccountsScreen /></RequirePanditApproved> },
      { path: '/pandit/wallet/banks/new', element: <RequirePanditApproved><BankEditScreen /></RequirePanditApproved> },
      { path: '/pandit/wallet/banks/:bankId/edit', element: <RequirePanditApproved><BankEditScreen /></RequirePanditApproved> },
```

- [ ] **Step 5: Write the tests** — `src/screens/pandit/TransactionsScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TransactionsScreen } from './TransactionsScreen';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { useDataStore } from '../../store/dataStore';
import { seedPanditBookings, seedPanditBanks, seedPanditWithdrawals, seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => {
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('TransactionsScreen', () => {
  it('filters to withdrawals only', () => {
    render(<MemoryRouter><TransactionsScreen /></MemoryRouter>);
    expect(screen.getByText('+₹2,310')).toBeInTheDocument();   // an earning credit (gross)
    fireEvent.click(screen.getByRole('button', { name: 'Withdrawals' }));
    expect(screen.queryByText('+₹2,310')).toBeNull();
    expect(screen.getByText('−₹5,000')).toBeInTheDocument();   // wd-1 paid debit
  });
});
```

And `src/screens/pandit/bank-screens.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BankAccountsScreen } from './BankAccountsScreen';
import { BankEditScreen } from './BankEditScreen';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { seedPanditBanks, seedPanditWithdrawals } from '../../mock/seed';

beforeEach(() => usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals }));

describe('BankAccountsScreen', () => {
  it('lists seeded banks with masked numbers', () => {
    render(<MemoryRouter><BankAccountsScreen /></MemoryRouter>);
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
    expect(screen.getByText('••••3421')).toBeInTheDocument();
  });
});

describe('BankEditScreen (add)', () => {
  it('rejects mismatched account numbers, then adds on valid input', () => {
    render(
      <MemoryRouter initialEntries={['/pandit/wallet/banks/new']}>
        <Routes>
          <Route path="/pandit/wallet/banks/new" element={<BankEditScreen />} />
          <Route path="/pandit/wallet/banks" element={<div>Bank list</div>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Account holder name'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText('Account number'), { target: { value: '1111222233334444' } });
    fireEvent.change(screen.getByLabelText('Confirm account number'), { target: { value: '9999' } });
    fireEvent.change(screen.getByLabelText('IFSC'), { target: { value: 'HDFC0001234' } });
    fireEvent.change(screen.getByLabelText('Bank name'), { target: { value: 'HDFC' } });
    const before = usePanditWalletStore.getState().banks.length;
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText(/do not match/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Confirm account number'), { target: { value: '1111222233334444' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(usePanditWalletStore.getState().banks.length).toBe(before + 1);
  });
});
```

- [ ] **Step 6: Run the tests + typecheck**

Run: `npm test -- TransactionsScreen bank-screens`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Pandit Transactions (M5) + Bank management (M6)"
```

---

### Task 6: Integration flow + P3d gate

**Files:**
- Test: `src/app/pandit-money-flow.test.tsx`

**Interfaces:**
- Consumes: `routes` (real router), `sessionStore`, `panditBookingStore`, `panditWalletStore`, `dataStore`, seeds.

- [ ] **Step 1: Write the integration walkthrough** — `src/app/pandit-money-flow.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { usePanditBookingStore } from '../store/panditBookingStore';
import { usePanditWalletStore } from '../store/panditWalletStore';
import { useDataStore } from '../store/dataStore';
import { seedPanditBookings, seedPanditBanks, seedPanditWithdrawals, seedCategories, seedPujas, seedPandits, seedReviews } from '../mock/seed';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
  useSessionStore.getState().becomePandit();
  useSessionStore.getState().switchMode('pandit');
  useSessionStore.getState().setPanditStatus('approved');
});

describe('pandit money flow (integration)', () => {
  it('earnings → wallet → withdraw → confirm advances a new withdrawal past "requested"', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/earnings'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByText('Total earnings')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Wallet'));                       // earnings shortcut card
    expect(screen.getByText('Available balance')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' })); // hero CTA
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm withdrawal' }));
    const latest = usePanditWalletStore.getState().withdrawals[0];
    expect(latest.amount).toBe(1000);
    expect(latest.status).not.toBe('requested');   // deterministic advance fired on the status screen
  });

  it('transactions filter narrows to withdrawals', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/wallet/transactions'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByText('+₹2,310')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Withdrawals' }));
    expect(screen.queryByText('+₹2,310')).toBeNull();
  });

  it('add a bank account from the bank-management screen', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/wallet/banks/new'] });
    render(<RouterProvider router={router} />);
    const before = usePanditWalletStore.getState().banks.length;
    fireEvent.change(screen.getByLabelText('Account holder name'), { target: { value: 'New Holder' } });
    fireEvent.change(screen.getByLabelText('Account number'), { target: { value: '5555666677778888' } });
    fireEvent.change(screen.getByLabelText('Confirm account number'), { target: { value: '5555666677778888' } });
    fireEvent.change(screen.getByLabelText('IFSC'), { target: { value: 'ICIC0004321' } });
    fireEvent.change(screen.getByLabelText('Bank name'), { target: { value: 'ICICI Bank' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(usePanditWalletStore.getState().banks.length).toBe(before + 1);
  });
});
```

- [ ] **Step 2: Run the integration test**

Run: `npm test -- pandit-money-flow`
Expected: PASS.

- [ ] **Step 3: Run the full suite + typecheck + build (P3d gate)**

Run: `npm test`
Expected: PASS — all suites incl. `earnings`, `panditWalletStore`, `money-components`, `EarningsScreen`, `WalletScreen`, `WithdrawScreen`, `WithdrawalStatusScreen`, `TransactionsScreen`, `bank-screens`, `pandit-money-flow`, and the existing `PanditDashboardScreen`.

Run: `npm run typecheck && npm run build`
Expected: both PASS.

- [ ] **Step 4: Manual look check**

Run: `npm run dev`. Log in (OTP `123456`) → become a pandit → onboarding → simulate approval → **Earnings** tab. Verify: KPIs (Total ₹8,281 / Completed 5 / Avg ₹1,656); the bar chart shows Feb–Jun bars; gross/commission/net breakdown; shortcut cards. Wallet shows Available ₹3,281, Pending ₹1,690, Withdrawn ₹5,000 + recent transactions. Withdraw: "Withdraw all" fills 3281; over-amount errors; confirm → status stepper auto-advances to Paid. Open the seeded failed withdrawal → Failed + Retry. Transactions: filter chips narrow; tap a row → detail sheet; withdrawal row → "View withdrawal". Bank accounts: list with masked numbers + Default; add (acct mismatch + IFSC validation); set default; delete-confirm. Dashboard earnings mini now shows Available ₹3,281 / Pending ₹1,690.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pandit money integration flow + P3d gate (P3d complete)"
```

---

## Self-Review

**Spec coverage (P3d = design §M1–M6):**
- M1 Earnings → Task 3 (`EarningsScreen`): period selector, 4 KPIs, `MiniBarChart`, gross/commission/net breakdown, Wallet/Withdraw/Transactions shortcuts, recent earnings. ✔
- M2 Wallet → Task 3 (`WalletScreen`): `BalanceHeroCard` + disabled-at-0, pending/total/withdrawn stat row, explainer, recent-transactions preview. ✔
- M3 Withdraw → Task 4 (`WithdrawScreen`): available reminder, amount + "Withdraw all", bank radio (or add-bank when empty), validation (>0, ≤ available, bank required), confirm → M4. ✔
- M4 Withdrawal status → Task 4 (`WithdrawalStatusScreen`): `WithdrawalStepper`, masked bank, deterministic advance, Failed + Retry. ✔
- M5 Transactions → Task 5 (`TransactionsScreen`): All/Earnings/Withdrawals/Refunds/Commission filters, list, detail sheet (withdrawal → M4). ✔
- M6 Bank management → Task 5 (`BankAccountsScreen` + `BankEditScreen`): list with masked numbers + Default, add/edit form with acct-match + IFSC validation, set-default, delete-confirm. ✔
- Money math (settlement, walletSummary, series, ledger, mask) → Task 1 domain (TDD). Single global commission % on `defaultPricingConfig`. ✔
- Dashboard earnings mini → `walletSummary` (single source of truth); `seedPanditStats` trimmed to ratings → Task 3. ✔
- Earnings derived from seeded completed/rated bookings + seeded banks/withdrawals → Task 1 seeds. ✔

**Deviations from the design doc (justified by reading the code):**
- Design said "reuse `StatusStepper`" for M4; the actual `StatusStepper` hardcodes booking statuses, so Task 2 adds a dedicated `WithdrawalStepper` (Requested→Processing→Paid + Failed branch). 
- Withdraw confirm button is enabled whenever an amount is entered and validates on click (so the over-balance error is reachable), rather than being disabled on invalid input.

**Placeholder scan:** No "TBD"/"add validation"/"similar to Task N". Every step shows complete code; every test step shows real assertions; every run step states the expected result.

**Type consistency:** `platformCommissionPct` added to `PricingConfig` + default (Task 1) and read by `settlementFor` default arg. `WalletTxn`/`Withdrawal`/`BankAccount`/`WithdrawalStatus`/`TxnType` (Task 1) consumed by domain, store, components (Task 2), and screens (Tasks 3–5). Domain signatures (`settlementFor`, `walletSummary`, `earningsSeries(…,nowISO,…)`, `transactionsFrom`, `maskAccount`) match across the store, screens, and tests. Store API (`addBank`/`updateBank`/`removeBank`/`setDefaultBank`/`getDefaultBank`/`requestWithdrawal`/`advanceWithdrawal`/`failWithdrawal`/`retryWithdrawal`) consumed by Tasks 4–5 exactly as defined in Task 1. `BankInput` (raw `accountNumber`) → store masks via `maskAccount`; screens never store raw numbers. Routes under `/pandit/earnings` + `/pandit/wallet*` all wrapped in `RequirePanditApproved` inside `PanditLayout`. Seed exports `seedPanditBanks`/`seedPanditWithdrawals` + appended `pmoney-*` bookings consumed by every store/screen/flow test. Numbers reconcile: 5 settled bookings → total net 8281, avg 1656; pending 1690 (pbkg-1); paid withdrawal 5000 → available 3281.

**Intentional deferrals (out of P3d):** Admin commission/settlement/withdrawal screens + CommissionRule hierarchy; real-timer simulation; recharts; Ratings (J1/J2); Pandit Profile; PDF export / infinite scroll; loading-skeleton/error states beyond empty. The `/pandit/bookings/:id` deep-link from earning rows / transaction detail is deferred (display-only) until that route exists.
