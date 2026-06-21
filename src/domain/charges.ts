import { PricingConfig, defaultPricingConfig } from './types';
import { computeAdvance } from './money';

export interface ComputedCharges {
  base: number;
  travel: number;
  emergencySurcharge: number;
  subtotal: number;
  advance: number;
  remaining: number;
}

/** Mock travel estimate: ₹20/km, rounded. */
export function travelEstimate(distanceKm: number): number {
  return Math.round(Math.max(0, distanceKm) * 20);
}

/** B4 — pandit acceptance total: base + travel + emergency surcharge (urgent) + additional line items. */
export function acceptCharges(
  base: number,
  travel: number,
  additionalTotal: number,
  isEmergency: boolean,
  cfg: PricingConfig = defaultPricingConfig,
): ComputedCharges & { additionalTotal: number } {
  const emergencySurcharge = isEmergency ? Math.round((cfg.emergencySurchargePct / 100) * base) : 0;
  const subtotal = base + travel + emergencySurcharge + Math.max(0, additionalTotal);
  const advance = computeAdvance(subtotal, cfg);
  return { base, travel, emergencySurcharge, additionalTotal: Math.max(0, additionalTotal), subtotal, advance, remaining: subtotal - advance };
}

/**
 * §0.8 — subtotal = base + travel + emergency surcharge; emergency surcharge = pct of base.
 * The advance shown at request time is an ESTIMATE (30% of subtotal).
 */
export function computeCharges(
  base: number,
  travel: number,
  isEmergency: boolean,
  cfg: PricingConfig = defaultPricingConfig,
): ComputedCharges {
  const emergencySurcharge = isEmergency ? Math.round((cfg.emergencySurchargePct / 100) * base) : 0;
  const subtotal = base + travel + emergencySurcharge;
  const advance = computeAdvance(subtotal, cfg);
  return { base, travel, emergencySurcharge, subtotal, advance, remaining: subtotal - advance };
}
