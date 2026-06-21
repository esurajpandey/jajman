import type { BookingStatus } from '../domain/types';

export interface Category {
  id: string;
  name: string;
  icon: string; // emoji glyph (no external assets in the prototype)
}

export interface Puja {
  id: string;
  categoryId: string;
  name: string;
  suggestedDurationMins: number;
  minAmount: number;
  maxAmount: number;
}

export type PanditStatus = 'pending' | 'approved' | 'rejected';

export interface SupportedPuja {
  pujaId: string;
  charge: number;
  durationMins: number;
}

export interface Review {
  id: string;
  panditId: string;
  jajmanName: string;
  rating: number; // 1..5
  text: string;
  date: string; // ISO (yyyy-mm-dd)
  mine?: boolean; // P2b — authored by the current jajman (drives "My reviews")
}

export type TravelPreference = 'within' | 'outside' | 'anywhere';

export interface PanditSummary {
  id: string;
  name: string;
  city: string;
  distanceKm: number;
  experienceYears: number;
  rating: number;
  ratingCount: number;
  pujasCompleted: number;
  languages: string[];
  specializations: string[];
  startingPrice: number;
  responseRatePct: number;
  responseTimeMins: number;
  status: PanditStatus;
  favorite: boolean;
  about: string;
  supportedPujas: SupportedPuja[];
  serviceRadiusKm: number;
  travelPreference: TravelPreference;
}

export type AddressType = 'home' | 'parents' | 'relative' | 'temple' | 'custom';
export interface Address {
  id: string;
  label: string;
  type: AddressType;
  line: string;
  city: string;
  notes?: string;
  isDefault?: boolean; // P2b — the address pre-selected in booking + Home
}

export type AttachmentKind = 'image' | 'doc' | 'note';
export interface BookingAttachment {
  id: string;
  kind: AttachmentKind;
  name: string;
}

export interface BookingCharges {
  base: number;
  travel: number;
  emergencySurcharge: number;
  subtotal: number;
}

export type BookingType = 'single' | 'multi';
export type AssignmentMode = 'build' | 'lead';

export interface Booking {
  id: string;
  panditId: string; // single: the pandit; multi: the lead
  pujaId: string;
  type: BookingType;
  assignmentMode?: AssignmentMode;
  teamPanditIds?: string[];
  status: BookingStatus;
  pujaStartISO: string;
  slotLabel: string;
  addressId: string;
  attachments: BookingAttachment[];
  notes: string;
  isEmergency: boolean;
  charges: BookingCharges;
  advanceAmount: number;
  remainingAmount: number;
  amountPaid: number;
  createdAt: string;
  requestExpiresAt: string;
  isDisputed: boolean;
  cancellation?: {
    initiatedBy: 'jajman' | 'pandit';
    refundAmount: number;
    platformCut: number;
    reason?: string;
  };
}

export interface ChatMessage {
  id: string;
  senderId: string; // 'me' for the jajman, or the pandit's id
  text: string;
  sentAt: string; // ISO
  attachmentName?: string;
}
export interface ChatThread {
  id: string;
  bookingId: string;
  panditId: string;
  phoneShared: boolean; // §0.9 per-booking override
  messages: ChatMessage[];
}

export type RecurInterval = 'monthly' | 'quarterly' | 'annual';
export interface RecurringSeries {
  id: string;
  panditId: string;
  pujaId: string;
  interval: RecurInterval;
  nextDate: string; // ISO
  status: 'active' | 'paused' | 'cancelled';
  generatedBookingIds: string[];
  createdAt: string;
}

// --- P2c: notifications ---
export type NotifType = 'booking' | 'payment' | 'request' | 'dispute' | 'system' | 'referral' | 'review';
export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string; // ISO
  link?: string; // in-app route to deep-link to
}

// --- P2c: disputes ---
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected';
export type DisputeReason = 'pandit_no_show' | 'puja_incomplete' | 'quality_issue' | 'payment_issue' | 'other';
export type DisputeResolutionType = 'refund_full' | 'refund_partial' | 'redo' | 'declined';
export interface DisputeActivity {
  from: 'you' | 'admin';
  text: string;
  at: string; // ISO
}
export interface Dispute {
  id: string;
  bookingId: string;
  reasonCode: DisputeReason;
  description: string;
  status: DisputeStatus;
  evidence: BookingAttachment[];
  activity: DisputeActivity[];
  timeline: { status: DisputeStatus; at: string }[];
  resolution?: { type: DisputeResolutionType; note: string; refundAmount?: number; resolvedAt: string };
  createdAt: string;
}

// --- P2c: referral ---
export type ReferralType = 'refer_jajman' | 'refer_pandit';
export type ReferralStatus = 'invited' | 'joined' | 'rewarded';
export interface ReferralRecord {
  id: string;
  type: ReferralType;
  inviteeName: string;
  status: ReferralStatus;
  rewardNote?: string;
  createdAt: string; // ISO
}

// --- P2c: FAQ (static) ---
export interface FaqEntry {
  id: string;
  topic: string;
  question: string;
  answer: string;
}
