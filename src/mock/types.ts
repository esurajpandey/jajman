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
