import { describe, it, expect, beforeEach } from 'vitest';
import { usePanditBookingStore } from './panditBookingStore';
import { seedPanditBookings } from '../mock/seed';

const now = '2026-06-21T09:00:00.000Z';
beforeEach(() => usePanditBookingStore.setState({ bookings: seedPanditBookings }));

describe('panditBookingStore', () => {
  it('getRequests excludes expired requests and sorts soonest-expiry first', () => {
    const reqs = usePanditBookingStore.getState().getRequests(now);
    expect(reqs.length).toBeGreaterThan(0);
    expect(reqs.every((r) => r.status === 'requested')).toBe(true);
    for (let i = 1; i < reqs.length; i++) expect(reqs[i - 1].requestExpiresAt <= reqs[i].requestExpiresAt).toBe(true);
  });
  it('accept recomputes charges and advances to accepted', () => {
    const reqs = usePanditBookingStore.getState().getRequests(now);
    const id = reqs[0].id;
    const base = reqs[0].charges.base;
    usePanditBookingStore.getState().accept(id, { travel: 100, additionalCharges: [{ label: 'Samagri', amount: 200 }] });
    const b = usePanditBookingStore.getState().getRequest(id)!;
    expect(b.status).toBe('accepted');
    expect(b.charges.travel).toBe(100);
    expect(b.charges.subtotal).toBe(base + 100 + 200 + b.charges.emergencySurcharge);
    expect(b.additionalCharges).toEqual([{ label: 'Samagri', amount: 200 }]);
  });
  it('reject sets rejected + reason', () => {
    const id = usePanditBookingStore.getState().getRequests(now)[0].id;
    usePanditBookingStore.getState().reject(id, 'Outside my service area');
    const b = usePanditBookingStore.getState().getRequest(id)!;
    expect(b.status).toBe('rejected');
    expect(b.rejectionReason).toBe('Outside my service area');
  });
});
