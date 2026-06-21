import type { DisputeReason, DisputeStatus } from '../mock/types';

export const REASON_LABEL: Record<DisputeReason, string> = {
  pandit_no_show: "Pandit didn't arrive",
  puja_incomplete: 'Puja incomplete',
  quality_issue: 'Quality issue',
  payment_issue: 'Payment issue',
  other: 'Other',
};

export const DISPUTE_STATUS_LABEL: Record<DisputeStatus, string> = {
  open: 'Open',
  under_review: 'Under review',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

export const DISPUTE_STATUS_TONE: Record<DisputeStatus, string> = {
  open: 'bg-warning/15 text-warning',
  under_review: 'bg-info/10 text-info',
  resolved: 'bg-success/10 text-success',
  rejected: 'bg-error/10 text-error',
};
