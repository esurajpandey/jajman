import { Badge } from '../ui/Badge';
import type { ReferralRecord, ReferralStatus } from '../../mock/types';

const STATUS_LABEL: Record<ReferralStatus, string> = { invited: 'Invited', joined: 'Joined', rewarded: 'Rewarded' };
const STATUS_TONE: Record<ReferralStatus, string> = {
  invited: 'bg-surface-2 text-muted',
  joined: 'bg-info/10 text-info',
  rewarded: 'bg-success/10 text-success',
};

export function ReferralHistoryRow({ record }: { record: ReferralRecord }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{record.inviteeName}</p>
        <p className="text-xs text-muted">{record.type === 'refer_pandit' ? 'Pandit' : 'Jajman'}{record.rewardNote ? ` · ${record.rewardNote}` : ''}</p>
      </div>
      <Badge className={STATUS_TONE[record.status]}>{STATUS_LABEL[record.status]}</Badge>
    </div>
  );
}
