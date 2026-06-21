import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Dispute } from '../../mock/types';
import { REASON_LABEL, DISPUTE_STATUS_LABEL, DISPUTE_STATUS_TONE } from '../../lib/disputeLabels';

export function DisputeListItem({ dispute, bookingRef, onClick }: { dispute: Dispute; bookingRef: string; onClick: () => void }) {
  return (
    <Card onClick={onClick} className="flex cursor-pointer items-center justify-between gap-2 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{REASON_LABEL[dispute.reasonCode]}</p>
        <p className="truncate text-xs text-muted">{bookingRef} · {dispute.createdAt.slice(0, 10)}</p>
      </div>
      <Badge className={DISPUTE_STATUS_TONE[dispute.status]}>{DISPUTE_STATUS_LABEL[dispute.status]}</Badge>
    </Card>
  );
}
