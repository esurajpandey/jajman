import type { Booking } from '../mock/types';

export type PaymentKind = 'advance' | 'remaining' | 'refund';

export interface PaymentEntry {
  bookingId: string;
  kind: PaymentKind;
  amount: number;
  dateISO: string;
}

/**
 * Flatten bookings into a payment/refund ledger for the Payment History screen.
 * - advance: emitted once the advance has been paid (amountPaid >= advanceAmount).
 * - remaining: emitted once the booking is fully paid (amountPaid >= subtotal).
 * - refund: emitted when a cancellation produced a refund.
 * Newest first.
 */
export function paymentEntries(bookings: Booking[]): PaymentEntry[] {
  const entries: PaymentEntry[] = [];
  for (const b of bookings) {
    if (b.advanceAmount > 0 && b.amountPaid >= b.advanceAmount) {
      entries.push({ bookingId: b.id, kind: 'advance', amount: b.advanceAmount, dateISO: b.createdAt });
    }
    if (b.charges.subtotal > 0 && b.amountPaid >= b.charges.subtotal) {
      entries.push({ bookingId: b.id, kind: 'remaining', amount: b.charges.subtotal - b.advanceAmount, dateISO: b.pujaStartISO });
    }
    if (b.cancellation && b.cancellation.refundAmount > 0) {
      entries.push({ bookingId: b.id, kind: 'refund', amount: b.cancellation.refundAmount, dateISO: b.createdAt });
    }
  }
  return entries.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
}
