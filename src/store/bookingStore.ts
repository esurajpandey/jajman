import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Address, Booking, BookingAttachment, BookingType, AssignmentMode } from '../mock/types';
import { seedAddresses, seedBookings, seedPandits, seedPujas } from './../mock/seed';
import { computeCharges, travelEstimate } from '../domain/charges';
import { computeRequestExpiry } from '../domain/booking';

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

  startDraft: (panditId, opts) =>
    set({
      draft: {
        panditId,
        pujaId: null,
        pujaStartISO: null,
        slotLabel: null,
        addressId: null,
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
}));
