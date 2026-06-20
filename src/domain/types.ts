export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'advance_paid'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'rated'
  | 'rejected'
  | 'cancelled'
  | 'refund_initiated'
  | 'refund_completed'
  | 'expired';

export type JajmanBookingTab = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type PanditBookingTab = 'today' | 'upcoming' | 'completed';

export type CancelInitiator = 'jajman' | 'pandit';

export interface PricingConfig {
  advancePercent: number;
  cancellationCutPct: number;
  emergencySurchargePct: number;
  emergencyBufferMins: number;
  cancellationLeadMins: number;
}

export const defaultPricingConfig: PricingConfig = {
  advancePercent: 30,
  cancellationCutPct: 5,
  emergencySurchargePct: 20,
  emergencyBufferMins: 60,
  cancellationLeadMins: 120,
};
