import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { CountdownChip } from './CountdownChip';
import type { Booking, Puja } from '../../mock/types';

export function RequestCard({ request, puja, onClick, nowISO }: { request: Booking; puja?: Puja; onClick: () => void; nowISO: string }) {
  return (
    <Card onClick={onClick} className="flex cursor-pointer gap-3 p-3">
      <Avatar name={request.jajmanName ?? 'Jajman'} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">{request.jajmanName ?? 'Jajman'}</span>
          <CountdownChip deadlineISO={request.requestExpiresAt} nowISO={nowISO} />
        </div>
        <p className="flex items-center gap-1.5 truncate text-sm">
          {puja?.name ?? 'Puja'}
          {request.isEmergency && <Badge className="bg-error/10 text-error">Urgent</Badge>}
          {request.type === 'multi' && <Badge className="bg-info/10 text-info">Multi</Badge>}
        </p>
        <p className="text-xs text-muted">{request.slotLabel}</p>
        <p className="mt-1 text-sm"><span className="text-muted">Est. </span><span className="font-semibold">₹{request.charges.subtotal}</span></p>
      </div>
    </Card>
  );
}
