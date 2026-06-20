import dayjs from 'dayjs';
import {
  BookingStatus,
  JajmanBookingTab,
  PanditBookingTab,
  PricingConfig,
  defaultPricingConfig,
} from './types';

/** §0.2 — Jajman bookings list tab for a given status. */
export function jajmanTab(status: BookingStatus): JajmanBookingTab {
  switch (status) {
    case 'requested':
    case 'accepted':
    case 'advance_paid':
    case 'scheduled':
      return 'upcoming';
    case 'in_progress':
      return 'ongoing';
    case 'completed':
    case 'rated':
      return 'completed';
    case 'rejected':
    case 'cancelled':
    case 'refund_initiated':
    case 'refund_completed':
    case 'expired':
      return 'cancelled';
  }
}

const LIVE_PANDIT_STATUSES: BookingStatus[] = ['accepted', 'advance_paid', 'scheduled', 'in_progress'];

/**
 * §0.2 — Pandit bookings tab. Returns null for statuses that belong in
 * Requests history (expired/rejected/etc.) rather than a live bookings tab.
 */
export function panditTab(
  status: BookingStatus,
  pujaStartISO: string,
  nowISO: string,
): PanditBookingTab | null {
  if (status === 'completed' || status === 'rated') return 'completed';
  if (LIVE_PANDIT_STATUSES.includes(status)) {
    const now = dayjs(nowISO);
    const start = dayjs(pujaStartISO);
    if (start.isSame(now, 'day')) return 'today';
    if (start.isAfter(now)) return 'upcoming';
    return 'today'; // past-but-not-completed still needs action today
  }
  return null;
}

/** §0.7 — request expiry; emergency caps at pujaStart - buffer. */
export function computeRequestExpiry(
  nowISO: string,
  pujaStartISO: string,
  isEmergency: boolean,
  cfg: PricingConfig = defaultPricingConfig,
): string {
  const plus24 = dayjs(nowISO).add(24, 'hour');
  if (!isEmergency) return plus24.toISOString();
  const cap = dayjs(pujaStartISO).subtract(cfg.emergencyBufferMins, 'minute');
  return (cap.isBefore(plus24) ? cap : plus24).toISOString();
}

/** §0.7 — an emergency booking is only valid if pujaStart - buffer is still in the future. */
export function canCreateEmergency(
  nowISO: string,
  pujaStartISO: string,
  cfg: PricingConfig = defaultPricingConfig,
): boolean {
  return dayjs(pujaStartISO).subtract(cfg.emergencyBufferMins, 'minute').isAfter(dayjs(nowISO));
}
