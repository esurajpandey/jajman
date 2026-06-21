import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Address, Booking, BookingAttachment, BookingType, AssignmentMode, RecurInterval, RecurringSeries } from '../mock/types';
import { seedAddresses, seedBookings, seedPandits, seedPujas, seedRecurring } from './../mock/seed';
import { computeCharges, travelEstimate } from '../domain/charges';
import { computeRequestExpiry } from '../domain/booking';
import { computeRefund } from '../domain/money';
import { nextRecurrence } from '../domain/recurrence';

export interface BookingDraft {
  panditId: string;
  pujaId: string | null;
  pujaStartISO: string | null;
  slotLabel: string | null;
  addressId: string | null;
  attachments: BookingAttachment[];
  notes: string;
  isEmergency: boolean;
  type: BookingType;
  assignmentMode?: AssignmentMode;
  teamPanditIds: string[];
}

interface BookingState {
  bookings: Booking[];
  addresses: Address[];
  draft: BookingDraft | null;
  startDraft: (panditId: string, opts?: Partial<BookingDraft>) => void;
  patchDraft: (p: Partial<BookingDraft>) => void;
  clearDraft: () => void;
  createBookingFromDraft: (nowISO: string) => Booking;
  simulateAccept: (bookingId: string) => void;
  payAdvance: (bookingId: string) => void;
  payRemaining: (bookingId: string) => void;
  getBooking: (id: string) => Booking | undefined;
  getAddress: (id: string) => Address | undefined;
  recurring: RecurringSeries[];
  addAddress: (addr: Omit<Address, 'id'>) => Address;
  updateAddress: (id: string, patch: Partial<Omit<Address, 'id'>>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  getDefaultAddress: () => Address | undefined;
  cancelBooking: (id: string, initiatedBy: 'jajman' | 'pandit', reason?: string) => void;
  rateBooking: (id: string) => void;
  createRecurring: (panditId: string, pujaId: string, interval: RecurInterval, fromISO: string) => RecurringSeries;
  pauseRecurring: (id: string) => void;
  resumeRecurring: (id: string) => void;
  cancelRecurring: (id: string) => void;
  getRecurring: () => RecurringSeries[];
}

function baseCharge(panditId: string, pujaId: string | null): number {
  const pandit = seedPandits.find((p) => p.id === panditId);
  const sp = pandit?.supportedPujas.find((s) => s.pujaId === pujaId);
  if (sp) return sp.charge;
  const puja = seedPujas.find((p) => p.id === pujaId);
  return puja?.minAmount ?? 1100;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: seedBookings,
  addresses: seedAddresses,
  draft: null,
  recurring: seedRecurring,

  startDraft: (panditId, opts) =>
    set({
      draft: {
        panditId,
        pujaId: null,
        pujaStartISO: null,
        slotLabel: null,
        addressId: get().getDefaultAddress()?.id ?? null,
        attachments: [],
        notes: '',
        isEmergency: false,
        type: 'single',
        teamPanditIds: [],
        ...opts,
      },
    }),

  patchDraft: (p) => set((s) => (s.draft ? { draft: { ...s.draft, ...p } } : s)),
  clearDraft: () => set({ draft: null }),

  createBookingFromDraft: (nowISO) => {
    const d = get().draft;
    if (!d) throw new Error('no draft');
    const pandit = seedPandits.find((p) => p.id === d.panditId);
    const base = baseCharge(d.panditId, d.pujaId);
    const travel = travelEstimate(pandit?.distanceKm ?? 0);
    const c = computeCharges(base, travel, d.isEmergency);
    const booking: Booking = {
      id: `bkg-${nanoid(6)}`,
      panditId: d.panditId,
      pujaId: d.pujaId ?? '',
      type: d.type,
      assignmentMode: d.assignmentMode,
      teamPanditIds: d.teamPanditIds.length ? d.teamPanditIds : undefined,
      status: 'requested',
      pujaStartISO: d.pujaStartISO ?? nowISO,
      slotLabel: d.slotLabel ?? '',
      addressId: d.addressId ?? '',
      attachments: d.attachments,
      notes: d.notes,
      isEmergency: d.isEmergency,
      charges: { base: c.base, travel: c.travel, emergencySurcharge: c.emergencySurcharge, subtotal: c.subtotal },
      advanceAmount: c.advance,
      remainingAmount: c.remaining,
      amountPaid: 0,
      createdAt: nowISO,
      requestExpiresAt: computeRequestExpiry(nowISO, d.pujaStartISO ?? nowISO, d.isEmergency),
      isDisputed: false,
    };
    set((s) => ({ bookings: [booking, ...s.bookings], draft: null }));
    return booking;
  },

  simulateAccept: (bookingId) =>
    set((s) => ({
      bookings: s.bookings.map((b) => (b.id === bookingId && b.status === 'requested' ? { ...b, status: 'accepted' } : b)),
    })),

  payAdvance: (bookingId) =>
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === bookingId && (b.status === 'accepted' || b.status === 'advance_paid')
          ? { ...b, status: 'scheduled', amountPaid: b.advanceAmount }
          : b,
      ),
    })),

  payRemaining: (bookingId) =>
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === bookingId ? { ...b, amountPaid: b.charges.subtotal, remainingAmount: 0 } : b,
      ),
    })),

  getBooking: (id) => get().bookings.find((b) => b.id === id),
  getAddress: (id) => get().addresses.find((a) => a.id === id),

  addAddress: (addr) => {
    const created: Address = { ...addr, id: `addr-${nanoid(6)}` };
    set((s) => ({
      addresses: created.isDefault
        ? [...s.addresses.map((a) => ({ ...a, isDefault: false })), created]
        : [...s.addresses, created],
    }));
    return created;
  },
  updateAddress: (id, patch) =>
    set((s) => ({
      addresses: s.addresses.map((a) =>
        a.id === id ? { ...a, ...patch } : patch.isDefault ? { ...a, isDefault: false } : a,
      ),
    })),
  deleteAddress: (id) => set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) })),

  setDefaultAddress: (id) =>
    set((s) => ({ addresses: s.addresses.map((a) => ({ ...a, isDefault: a.id === id })) })),
  getDefaultAddress: () => get().addresses.find((a) => a.isDefault) ?? get().addresses[0],

  cancelBooking: (id, initiatedBy, reason) =>
    set((s) => ({
      bookings: s.bookings.map((b) => {
        if (b.id !== id) return b;
        const { refundAmount, platformCut } = computeRefund(b.amountPaid, initiatedBy);
        return { ...b, status: 'cancelled', cancellation: { initiatedBy, refundAmount, platformCut, reason } };
      }),
    })),

  rateBooking: (id) =>
    set((s) => ({ bookings: s.bookings.map((b) => (b.id === id && b.status === 'completed' ? { ...b, status: 'rated' } : b)) })),

  createRecurring: (panditId, pujaId, interval, fromISO) => {
    const series: RecurringSeries = {
      id: `rec-${nanoid(6)}`, panditId, pujaId, interval,
      nextDate: nextRecurrence(fromISO, interval), status: 'active', generatedBookingIds: [], createdAt: fromISO,
    };
    set((s) => ({ recurring: [series, ...s.recurring] }));
    return series;
  },

  pauseRecurring: (id) => set((s) => ({ recurring: s.recurring.map((r) => (r.id === id ? { ...r, status: 'paused' } : r)) })),
  resumeRecurring: (id) => set((s) => ({ recurring: s.recurring.map((r) => (r.id === id ? { ...r, status: 'active' } : r)) })),
  cancelRecurring: (id) => set((s) => ({ recurring: s.recurring.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)) })),
  getRecurring: () => get().recurring,
}));
