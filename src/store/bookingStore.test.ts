import { describe, it, expect, beforeEach } from 'vitest';
import { useBookingStore } from './bookingStore';
import { seedAddresses } from '../mock/seed';

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

  it('cancelBooking (jajman) refunds amount paid minus 5%', () => {
    // bkg-demo-1: amountPaid 288 → cut 14, refund 274
    useBookingStore.getState().cancelBooking('bkg-demo-1', 'jajman', 'changed plans');
    const b = useBookingStore.getState().getBooking('bkg-demo-1')!;
    expect(b.status).toBe('cancelled');
    expect(b.cancellation).toEqual({ initiatedBy: 'jajman', refundAmount: 274, platformCut: 14, reason: 'changed plans' });
  });

  it('cancelBooking (pandit) refunds in full', () => {
    useBookingStore.getState().cancelBooking('bkg-demo-1', 'pandit');
    expect(useBookingStore.getState().getBooking('bkg-demo-1')!.cancellation).toMatchObject({ refundAmount: 288, platformCut: 0 });
  });

  it('addAddress / updateAddress / deleteAddress mutate the address list', () => {
    const created = useBookingStore.getState().addAddress({ label: 'Office', type: 'custom', line: '5 MG Rd', city: 'Pune' });
    expect(useBookingStore.getState().getAddress(created.id)?.label).toBe('Office');
    useBookingStore.getState().updateAddress(created.id, { label: 'Work' });
    expect(useBookingStore.getState().getAddress(created.id)?.label).toBe('Work');
    useBookingStore.getState().deleteAddress(created.id);
    expect(useBookingStore.getState().getAddress(created.id)).toBeUndefined();
  });

  it('createRecurring computes the next date and pause/resume/cancel work', () => {
    const r = useBookingStore.getState().createRecurring('pnd-1', 'puja-satyanarayan', 'monthly', '2026-06-15T09:00:00.000Z');
    expect(r.nextDate).toBe('2026-07-15T09:00:00.000Z');
    useBookingStore.getState().pauseRecurring(r.id);
    expect(useBookingStore.getState().getRecurring().find((x) => x.id === r.id)?.status).toBe('paused');
    useBookingStore.getState().cancelRecurring(r.id);
    expect(useBookingStore.getState().getRecurring().find((x) => x.id === r.id)?.status).toBe('cancelled');
  });
});

describe('addresses — default flag (P2b)', () => {
  beforeEach(() => useBookingStore.setState({ addresses: seedAddresses }));

  it('setDefaultAddress makes exactly one address default', () => {
    useBookingStore.getState().setDefaultAddress('addr-temple');
    const addrs = useBookingStore.getState().addresses;
    expect(addrs.filter((a) => a.isDefault)).toHaveLength(1);
    expect(addrs.find((a) => a.id === 'addr-temple')!.isDefault).toBe(true);
    expect(addrs.find((a) => a.id === 'addr-home')!.isDefault).toBe(false);
  });

  it('adding an address with isDefault clears the previous default', () => {
    useBookingStore.getState().addAddress({ label: 'Office', type: 'custom', line: '1 MG Road', city: 'Pune', isDefault: true });
    const addrs = useBookingStore.getState().addresses;
    expect(addrs.filter((a) => a.isDefault)).toHaveLength(1);
    expect(addrs.find((a) => a.label === 'Office')!.isDefault).toBe(true);
  });

  it('getDefaultAddress returns the flagged default', () => {
    expect(useBookingStore.getState().getDefaultAddress()?.id).toBe('addr-home');
  });
});

describe('startDraft pre-selects the default address (P2c wiring)', () => {
  beforeEach(() => useBookingStore.setState({ addresses: seedAddresses, draft: null }));

  it('uses the default address id when no override is given', () => {
    useBookingStore.getState().startDraft('pnd-1');
    expect(useBookingStore.getState().draft?.addressId).toBe('addr-home');
  });

  it('an explicit addressId override still wins', () => {
    useBookingStore.getState().startDraft('pnd-1', { addressId: 'addr-temple' });
    expect(useBookingStore.getState().draft?.addressId).toBe('addr-temple');
  });
});
