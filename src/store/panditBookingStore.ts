import { create } from 'zustand';
import dayjs from 'dayjs';
import type { Booking } from '../mock/types';
import { seedPanditBookings } from '../mock/seed';
import { acceptCharges } from '../domain/charges';
import { isRequestExpired } from '../domain/requests';

const LIVE: Booking['status'][] = ['accepted', 'advance_paid', 'scheduled', 'in_progress'];

interface AcceptOpts { travel: number; additionalCharges: { label: string; amount: number }[] }

interface State {
  bookings: Booking[];
  getRequests: (nowISO: string) => Booking[];
  getRequest: (id: string) => Booking | undefined;
  getToday: (nowISO: string) => Booking[];
  getUpcoming: (nowISO: string) => Booking[];
  accept: (id: string, opts: AcceptOpts) => void;
  reject: (id: string, reason: string) => void;
}

export const usePanditBookingStore = create<State>((set, get) => ({
  bookings: seedPanditBookings,
  getRequests: (nowISO) =>
    get().bookings
      .filter((b) => b.status === 'requested' && !isRequestExpired(b.requestExpiresAt, nowISO))
      .sort((a, b) => (a.requestExpiresAt < b.requestExpiresAt ? -1 : 1)),
  getRequest: (id) => get().bookings.find((b) => b.id === id),
  getToday: (nowISO) =>
    get().bookings.filter((b) => LIVE.includes(b.status) && dayjs(b.pujaStartISO).isSame(dayjs(nowISO), 'day')),
  getUpcoming: (nowISO) =>
    get().bookings
      .filter((b) => LIVE.includes(b.status) && dayjs(b.pujaStartISO).isAfter(dayjs(nowISO), 'day'))
      .sort((a, b) => (a.pujaStartISO < b.pujaStartISO ? -1 : 1)),
  accept: (id, { travel, additionalCharges }) =>
    set((s) => ({
      bookings: s.bookings.map((b) => {
        if (b.id !== id) return b;
        const additionalTotal = additionalCharges.reduce((sum, x) => sum + x.amount, 0);
        const c = acceptCharges(b.charges.base, travel, additionalTotal, b.isEmergency);
        return {
          ...b,
          status: 'accepted',
          charges: { base: c.base, travel: c.travel, emergencySurcharge: c.emergencySurcharge, subtotal: c.subtotal },
          additionalCharges,
          advanceAmount: c.advance,
          remainingAmount: c.remaining,
        };
      }),
    })),
  reject: (id, reason) =>
    set((s) => ({ bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: 'rejected', rejectionReason: reason } : b)) })),
}));
