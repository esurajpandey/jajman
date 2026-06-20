import { describe, it, expect, beforeEach } from 'vitest';
import { useBookingStore } from './bookingStore';

const NOW = '2026-06-20T09:00:00.000Z';

beforeEach(() => useBookingStore.setState(useBookingStore.getInitialState()));

describe('bookingStore', () => {
  it('seeds addresses and the demo booking', () => {
    const s = useBookingStore.getState();
    expect(s.addresses.length).toBeGreaterThan(0);
    expect(s.getBooking('bkg-demo-1')?.status).toBe('completed');
  });

  it('startDraft → patchDraft → createBookingFromDraft creates a requested booking', () => {
    const s = useBookingStore.getState();
    s.startDraft('pnd-1');
    s.patchDraft({ pujaId: 'puja-satyanarayan', pujaStartISO: '2026-07-01T09:00:00.000Z', slotLabel: '1 Jul · 09:00 AM', addressId: 'addr-home' });
    const booking = useBookingStore.getState().createBookingFromDraft(NOW);
    expect(booking.status).toBe('requested');
    expect(booking.panditId).toBe('pnd-1');
    expect(booking.charges.subtotal).toBeGreaterThan(0);
    expect(booking.advanceAmount + booking.remainingAmount).toBe(booking.charges.subtotal);
    expect(useBookingStore.getState().getBooking(booking.id)).toBeTruthy();
  });

  it('non-emergency request expires in 24h', () => {
    const s = useBookingStore.getState();
    s.startDraft('pnd-1');
    s.patchDraft({ pujaId: 'puja-satyanarayan', pujaStartISO: '2026-07-01T09:00:00.000Z', slotLabel: 'x', addressId: 'addr-home' });
    const b = useBookingStore.getState().createBookingFromDraft(NOW);
    expect(b.requestExpiresAt).toBe('2026-06-21T09:00:00.000Z');
  });

  it('simulateAccept → payAdvance advances status and records payment', () => {
    const s = useBookingStore.getState();
    s.startDraft('pnd-1');
    s.patchDraft({ pujaId: 'puja-satyanarayan', pujaStartISO: '2026-07-01T09:00:00.000Z', slotLabel: 'x', addressId: 'addr-home' });
    const b = useBookingStore.getState().createBookingFromDraft(NOW);
    useBookingStore.getState().simulateAccept(b.id);
    expect(useBookingStore.getState().getBooking(b.id)?.status).toBe('accepted');
    useBookingStore.getState().payAdvance(b.id);
    const paid = useBookingStore.getState().getBooking(b.id)!;
    expect(paid.status).toBe('scheduled');
    expect(paid.amountPaid).toBe(paid.advanceAmount);
  });

  it('payRemaining on a completed booking records the rest', () => {
    useBookingStore.getState().payRemaining('bkg-demo-1');
    const b = useBookingStore.getState().getBooking('bkg-demo-1')!;
    expect(b.amountPaid).toBe(b.charges.subtotal);
  });
});
