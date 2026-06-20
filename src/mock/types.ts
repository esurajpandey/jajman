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
  date: string; // ISO
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
