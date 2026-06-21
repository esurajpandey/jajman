# Pandit Seva — Phase 3d (Pandit Money: Earnings · Wallet · Withdraw · Bank · Settlements) Design

**Status:** Approved design — ready for implementation-plan authoring.
**Date:** 2026-06-21
**Reference spec:** `docs/superpowers/specs/2026-06-20-pandit-seva-mobile-ui-design.md` — §"SCREEN INVENTORY — PANDIT" → **M1–M6** (Earnings ~1794, Wallet ~1807, Withdraw ~1820, Withdrawal Status ~1833, Transactions ~1846, Bank Management ~1859); settlement chain ~2984; data model `BankAccount`/`SettlementRecord`/`CommissionRule` ~2762.

## Goal

Give an approved pandit a working **Money** surface: an Earnings overview (M1), Wallet (M2), Withdraw flow (M3) + Withdrawal status (M4), Transaction history (M5), and Bank-account management (M6) — replacing the `/pandit/earnings` stub and adding the `/pandit/wallet/*` sub-tree. Balances and history are **derived from the pandit's real bookings** plus seeded withdrawals, so the surface reconciles with what the rest of the app already shows.

## Resolved decisions (deltas from the master spec)

These four were decided during brainstorming and intentionally simplify the master spec:

1. **Commission = single global %.** A flat `platformCommissionPct: 12` lives on `defaultPricingConfig`. The master spec's `CommissionRule` hierarchy (global/category/pandit, most-specific wins) is **deferred to the Admin phase**; P3d uses one rate everywhere.
2. **Charts = no new dependencies.** A lightweight CSS/SVG `MiniBarChart` (the existing `DistributionBars` idiom), not recharts. Upholds the zero-new-deps rule held through P0–P3c.
3. **Withdrawal lifecycle = deterministic.** Created `requested`; advanced by explicit store actions → `processing` → `paid`; one seeded `failed` (reason + retry). No real timers, no `Date.now()`/`new Date()` inside the store (screens pass an ISO "now").
4. **Earnings source = derived from bookings.** Add completed/rated bookings to `seedPanditBookings`; derive per-booking settlements and earning transactions from them (single source of truth — no stored balance numbers that can drift). Withdrawals + bank accounts are the only *new* persisted state.

## Architecture

A pure, framework-free `domain/earnings.ts` (TDD) owns all money math: per-booking settlement, wallet summary, the earnings series for the chart, and the flattened transaction ledger. A new `panditWalletStore` (zustand) holds only the **non-derivable** state — saved bank accounts and withdrawal records — plus the bank/withdrawal mutations. Screens compose balances by calling `walletSummary(panditBookings, withdrawals, pct)` with data from `panditBookingStore` + `panditWalletStore`; the store never caches a balance. Six screens render inside `PanditLayout` (tab bar visible, like the P3c calendar sub-screens) behind `RequirePanditApproved`. New presentational components are no-dep and reuse the existing UI kit.

## Global constraints

- **Routing (master §0.1 + M-section):** `/pandit/earnings` (replaces the stub), `/pandit/wallet`, `/pandit/wallet/withdraw`, `/pandit/wallet/withdraw/:withdrawalId`, `/pandit/wallet/transactions`, `/pandit/wallet/banks`, `/pandit/wallet/banks/new`, `/pandit/wallet/banks/:bankId/edit`. All inside `RequireAuth > PanditLayout`, each wrapped in `RequirePanditApproved`.
- **No `Date.now()`/`new Date()` in store/domain** — date logic takes explicit ISO args; screens may use `new Date()` for "now"/"today".
- **No new dependencies.** Reuse `AppBar`, `BackButton`, `Card`, `Badge`, `Chip`, `Button`, `ToggleRow`, `TextField`, `SegmentedControl`, `BottomSheet`, `MoneyBreakdown`, `StatusStepper`.
- **Single source of truth:** balances are always `walletSummary(...)` over bookings + withdrawals; the Dashboard earnings mini switches from `seedPanditStats` to `walletSummary` (ratings mini keeps `seedPanditStats`).
- **Commission is platform↔pandit only** — the jajman-facing booking total is unchanged; nothing in the jajman surface changes.
- **Money formatting:** `₹{n.toLocaleString('en-IN')}` (matches Dashboard).
- **Tests:** strict TDD for domain + store; build-then-test for components/screens. Reset stores in `beforeEach`.
- **Commits:** one per task, local only (never pushed).

## Business rules — the money math

Let `pct = defaultPricingConfig.platformCommissionPct` (12).

**Per-booking settlement** (`settlementFor(b, pct)`):
- `gross = b.charges.subtotal` (base + travel + emergency surcharge + accepted add-ons — already folded into `subtotal` by `acceptCharges`).
- `commission = round(pct/100 × gross)`.
- `net = gross − commission`.
- `status`: `'settled'` when `b.status ∈ {completed, rated}`; `'pending'` when `b.status ∈ {advance_paid, scheduled, in_progress}`; otherwise the booking does not contribute (requested/accepted/rejected/expired/cancelled produce no earning).

**Wallet summary** (`walletSummary(bookings, withdrawals, pct)`) → fields named exactly as the `WalletSummary` interface below:
- `pending = Σ net` over **pending** bookings.
- `total = Σ net` over **settled** bookings (lifetime earned).
- `withdrawalsOut = Σ amount` over withdrawals with status ∈ `{requested, processing, paid}` (a `failed` withdrawal is excluded → its funds return automatically).
- `available = total − withdrawalsOut`.
- `withdrawn = Σ amount` over `paid` withdrawals.
- `completedCount = count` of settled bookings; `avgPerPuja = completedCount ? round(total / completedCount) : 0`.

**Earnings series** (`earningsSeries(bookings, range, nowISO, pct)`): buckets settled-booking net by period for the chart, ending at `nowISO` (passed by the screen — no `Date.now()` in domain). Buckets are explicit: `'week'` → last 7 **days** (daily bars), `'month'` → last 6 **calendar months** (monthly bars), `'year'` → last 5 **years** (yearly bars). Returns `SeriesBucket[]` (`{label, value}`) for `MiniBarChart`; a bucket with no settled bookings has `value: 0`.

**Transaction ledger** (`transactionsFrom(bookings, withdrawals, pct)`), newest-first:
- per **settled** booking → an `earning` (+gross) row and a `commission` (−commission) row (so both M5 filters and the M1 gross/commission/net breakdown have real entries that reconcile to net).
- per booking carrying a pandit-side `cancellation.refundAmount` → a `refund` row (optional; only if a seed scenario includes one).
- per **withdrawal** → a `withdrawal` row: `−amount` for `requested/processing/paid`; a `failed` withdrawal renders as a neutral/struck row (no balance effect).

## Data model — additions to `src/mock/types.ts`

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

Add to `PricingConfig` / `defaultPricingConfig` in `src/domain/types.ts`:
```ts
platformCommissionPct: number;   // = 12
```

## Domain API — new `src/domain/earnings.ts` (TDD)

```ts
export interface Settlement { gross: number; commission: number; net: number; status: 'settled' | 'pending' | 'none'; }
export interface WalletSummary { available: number; pending: number; total: number; withdrawn: number; completedCount: number; avgPerPuja: number; }
export interface SeriesBucket { label: string; value: number; }

export function settlementFor(b: Booking, pct?: number): Settlement;
export function walletSummary(bookings: Booking[], withdrawals: Withdrawal[], pct?: number): WalletSummary;
export function earningsSeries(bookings: Booking[], range: 'week' | 'month' | 'year', nowISO: string, pct?: number): SeriesBucket[];
export function transactionsFrom(bookings: Booking[], withdrawals: Withdrawal[], pct?: number): WalletTxn[];
export function maskAccount(accountNumber: string): string;   // '1234567890123421' -> '••••3421'
```
All default `pct` to `defaultPricingConfig.platformCommissionPct`. No `Date.now()`/`new Date()` in the domain — `earningsSeries` takes an explicit `nowISO` from the screen to anchor its window.

## Store API — new `src/store/panditWalletStore.ts`

```ts
interface State {
  banks: BankAccount[];
  withdrawals: Withdrawal[];
  addBank: (input: Omit<BankAccount, 'id'>) => BankAccount;
  updateBank: (id: string, patch: Partial<Omit<BankAccount, 'id'>>) => void;
  removeBank: (id: string) => void;
  setDefaultBank: (id: string) => void;                 // clears isDefault on the others
  getDefaultBank: () => BankAccount | undefined;
  requestWithdrawal: (amount: number, bankId: string, nowISO: string) => Withdrawal;  // status 'requested'
  advanceWithdrawal: (id: string, nowISO: string) => void;   // requested→processing→paid (one step per call)
  failWithdrawal: (id: string, reason: string, nowISO: string) => void;
  retryWithdrawal: (id: string, nowISO: string) => Withdrawal; // new 'requested' from a failed one
}
```
Seeded from `seedPanditBanks` / `seedPanditWithdrawals`. `requestWithdrawal` appends a `requested` record (validation — amount ≤ available, ≥ min, bank required — lives in the M3 screen, which has the `walletSummary`). `advanceWithdrawal` pushes the next status + a timeline entry. No balance is stored — `available` recomputes from the withdrawals list via `walletSummary`.

## Components — new in `src/components/pandit/` (no new deps)

- **`MiniBarChart`** — `{ data: SeriesBucket[] }`; renders proportional CSS/SVG bars + labels; max-height capped; horizontal-scroll wrapper if it overflows.
- **`KpiCard`** — `{ label, value, sub? }`; small stat card (wraps `Card`).
- **`BalanceHeroCard`** — `{ available, onWithdraw, disabled }`; large available-balance hero with a Withdraw CTA.
- **`TransactionRow`** — `{ txn: WalletTxn, pujaName? }`; type icon + label + related ref + signed amount (green credit / muted debit).
- **`BankCard`** — `{ bank, onEdit, onDelete }`; bank name, masked acct, Default chip.
- Reuse **`StatusStepper`** for M4 (Requested → Processing → Paid; Failed branch), **`Chip`** for M5 filters.

## Screens (M1–M6)

**M1 `EarningsScreen` → `/pandit/earnings`** (replaces stub). Period `SegmentedControl` (Week/Month/Year, UI-only); 2×2 `KpiCard`s (Total earnings, This-period, Completed pujas, Avg/puja); `MiniBarChart` of the series; a gross→commission→net breakdown row; shortcut `Card`s → Wallet / Withdraw / Transactions; recent earning rows (**display-only** — the `/pandit/bookings/:id` detail deep-link is deferred until that route exists in a later phase). Empty state for a new pandit ("No earnings yet").

**M2 `WalletScreen` → `/pandit/wallet`.** `BalanceHeroCard` (available + Withdraw CTA, disabled at 0 with hint); stat row (Pending, Total, Withdrawn); explainer note ("Pending clears after the booking completes & settles"); recent-transactions preview → M5; security note.

**M3 `WithdrawScreen` → `/pandit/wallet/withdraw`.** Available-balance reminder; amount `TextField` + "Withdraw all" `Chip`; bank selector (radio list of `banks`, or inline "Add a bank to withdraw" → M6 when empty); fee/ETA note; review summary; sticky "Confirm Withdrawal" → `requestWithdrawal` → navigate to M4. Validation: `0 < amount ≤ available`, bank required.

**M4 `WithdrawalStatusScreen` → `/pandit/wallet/withdraw/:withdrawalId`.** `StatusStepper` (Requested→Processing→Paid, or Failed branch); amount, destination bank (masked), per-step timestamps; on mount, deterministically advances a non-final, non-failed withdrawal one step (guarded — terminal states never advance); Failed → reason + "Retry" → `retryWithdrawal` → new M4; "Back to Wallet".

**M5 `TransactionsScreen` → `/pandit/wallet/transactions`.** Filter `Chip`s (All / Earnings / Withdrawals / Refunds / Commission); list from `transactionsFrom(...)` grouped by date; row tap → `BottomSheet` detail (full breakdown; a withdrawal row links → M4, a booking row is display-only since `/pandit/bookings/:id` is deferred). Per-filter empty states.

**M6 Bank management.** `BankAccountsScreen` → `/pandit/wallet/banks`: list of `BankCard` + "+" → add; empty state ("No bank accounts — add one to withdraw"); delete-confirm; set-default. `BankEditScreen` → `/pandit/wallet/banks/new` and `/banks/:bankId/edit`: fields — holder name, account number (+confirm match), IFSC (format check), bank name, "Set as default" toggle; "Save" → `addBank`/`updateBank` (stores **masked** acct via `maskAccount`) → back to list. Security: list shows masked only.

## Seed additions — `src/mock/seed.ts`

- Append ~4–5 **completed/rated** bookings to `seedPanditBookings` (`SELF_PANDIT_ID`, `amountPaid >= subtotal`, `pujaStartISO` spread across the last few months) so earnings, the chart, and history are populated and reconcile with `walletSummary`.
- `seedPanditBanks: BankAccount[]` — two accounts, one `isDefault: true`, numbers pre-masked.
- `seedPanditWithdrawals: Withdrawal[]` — one `paid` (full timeline), one `failed` (with `failReason`); optionally one `processing`.
- Keep `seedPanditStats` for the ratings mini; earnings numbers now come from `walletSummary`.

## Task breakdown (subagent-driven; one commit each)

1. **Domain + types + seed + store.** `platformCommissionPct` on PricingConfig; new money types; `domain/earnings.ts` (TDD: settlement, walletSummary, earningsSeries, transactionsFrom, maskAccount); seed completed bookings + banks + withdrawals; `panditWalletStore` (+ tests). *Commit:* `feat: pandit money domain (earnings/commission/wallet) + types + seeds + panditWalletStore`
2. **Money components.** MiniBarChart, KpiCard, BalanceHeroCard, TransactionRow, BankCard (+ tests). *Commit:* `feat: pandit money components (MiniBarChart, KpiCard, BalanceHeroCard, TransactionRow, BankCard)`
3. **M1 Earnings + M2 Wallet + routes + Dashboard mini.** Replace the `/pandit/earnings` stub; wire `/pandit/wallet`; switch the Dashboard earnings mini to `walletSummary`. *Commit:* `feat: Pandit Earnings (M1) + Wallet (M2) + dashboard earnings via walletSummary`
4. **M3 Withdraw + M4 Status + routes.** Deterministic advance/retry. *Commit:* `feat: Pandit Withdraw (M3) + Withdrawal status (M4) — deterministic lifecycle`
5. **M5 Transactions + M6 Bank management + routes.** Filters + detail sheet; bank list + add/edit form with masking. *Commit:* `feat: Pandit Transactions (M5) + Bank management (M6)`
6. **Integration + gate.** `pandit-money-flow.test.tsx` (earnings → wallet → withdraw → status; add-bank → withdraw enabled; transaction filters). Full `npm test` + `npm run typecheck` + `npm run build`; manual look. *Commit:* `feat: pandit money integration flow + P3d gate (P3d complete)`

## Testing

- **Domain (`earnings.test.ts`):** settlement classification per status; commission rounding; walletSummary available/pending/total/withdrawn incl. the failed-withdrawal-returns-funds case; series bucketing; transaction signs + ordering; `maskAccount`.
- **Store (`panditWalletStore.test.ts`):** add/update/remove/setDefault bank (single default invariant); requestWithdrawal appends `requested` & decrements available (via summary); advanceWithdrawal steps requested→processing→paid and stops at terminal; failWithdrawal + retryWithdrawal; reset in `beforeEach`.
- **Components:** MiniBarChart renders bars for data + empty; BankCard shows masked acct + Default chip; TransactionRow sign/label.
- **Screens:** Earnings KPIs + period switch; Wallet hero + Withdraw-disabled-at-0; Withdraw validation + confirm; Withdrawal status stepper + retry; Transactions filter narrows; Bank add validation (acct mismatch / IFSC).
- **Integration:** the end-to-end flow above through the real router with an approved-pandit session.

## Deliberate deferrals (out of P3d)

- **Admin** commission / settlements / withdrawals screens, and the **`CommissionRule` hierarchy** (single global % now — admin phase can introduce rule tiers).
- **Real-timer simulation engine** (deterministic store actions instead).
- **recharts** (no-dep `MiniBarChart` instead).
- **Ratings (J1/J2)** — separate `/pandit/ratings` surface, not money.
- **Pandit Profile** screen — separate stub, later phase.
- **PDF export / infinite-scroll pagination** on transactions — static mock list; download is a stubbed affordance only.
- Loading-skeleton/error states kept minimal (default + empty), matching prior phases.
