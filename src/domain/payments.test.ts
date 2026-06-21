import { describe, it, expect } from 'vitest';
import { paymentEntries } from './payments';
import { seedBookings } from '../mock/seed';

describe('paymentEntries (§M Payment history ledger)', () => {
  it('emits an advance row for a part-paid booking', () => {
    const b = seedBookings.find((x) => x.id === 'bkg-demo-1')!; // amountPaid == advance, not full
    const rows = paymentEntries([b]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ bookingId: 'bkg-demo-1', kind: 'advance', amount: b.advanceAmount });
  });

  it('emits advance + remaining rows for a fully-paid booking', () => {
    const b = seedBookings.find((x) => x.id === 'bkg-demo-4')!; // amountPaid == subtotal
    const rows = paymentEntries([b]);
    expect(rows.map((r) => r.kind).sort()).toEqual(['advance', 'remaining']);
    expect(rows.find((r) => r.kind === 'remaining')!.amount).toBe(b.charges.subtotal - b.advanceAmount);
  });

  it('emits a refund row when a booking was cancelled with a refund', () => {
    const b = seedBookings.find((x) => x.id === 'bkg-demo-1')!;
    const cancelled = { ...b, cancellation: { initiatedBy: 'jajman' as const, refundAmount: 274, platformCut: 14 } };
    const rows = paymentEntries([cancelled]);
    expect(rows.find((r) => r.kind === 'refund')!.amount).toBe(274);
  });

  it('skips unpaid bookings (amountPaid 0)', () => {
    const b = seedBookings.find((x) => x.id === 'bkg-demo-3')!; // requested, amountPaid 0
    expect(paymentEntries([b])).toHaveLength(0);
  });
});
