import { CancelInitiator, PricingConfig, defaultPricingConfig } from './types';

export interface RefundResult {
  refundAmount: number;
  platformCut: number;
}

/**
 * §0.3 — the cut is computed on the amount the jajman ACTUALLY PAID,
 * not the booking total. Pandit-initiated cancels refund in full.
 */
export function computeRefund(
  amountPaid: number,
  initiatedBy: CancelInitiator,
  cfg: PricingConfig = defaultPricingConfig,
): RefundResult {
  if (amountPaid <= 0) return { refundAmount: 0, platformCut: 0 };
  if (initiatedBy === 'pandit') return { refundAmount: amountPaid, platformCut: 0 };
  const platformCut = Math.round((cfg.cancellationCutPct / 100) * amountPaid);
  return { refundAmount: amountPaid - platformCut, platformCut };
}

/** §0.8 — advance is a percentage of the subtotal (estimate at request time). */
export function computeAdvance(
  subtotal: number,
  cfg: PricingConfig = defaultPricingConfig,
): number {
  return Math.round((cfg.advancePercent / 100) * subtotal);
}
