import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Phone, MessageCircle } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { CountdownChip } from '../../components/pandit/CountdownChip';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';
import { useBookingStore } from '../../store/bookingStore';

export function RequestDetailScreen() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [, setSearch] = useSearchParams();
  const nowISO = new Date().toISOString();
  const request = usePanditBookingStore((s) => s.getRequest(id));
  const puja = useDataStore((s) => s.getPuja(request?.pujaId ?? ''));
  const address = useBookingStore((s) => s.getAddress(request?.addressId ?? ''));

  if (!request) {
    return <><AppBar title="Request" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Request not found.</div></>;
  }
  const decided = request.status !== 'requested';

  return (
    <>
      <AppBar title="Request" left={<BackButton />} right={<CountdownChip deadlineISO={request.requestExpiresAt} nowISO={nowISO} />} />
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="mb-3 flex items-center gap-3 p-3">
          <Avatar name={request.jajmanName ?? 'Jajman'} />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{request.jajmanName ?? 'Jajman'}</p>
            <p className="text-xs text-muted">Phone hidden — chat only</p>
          </div>
          <button type="button" aria-label="Chat" className="p-2 text-primary"><MessageCircle size={18} /></button>
          <button type="button" aria-label="Call (hidden)" disabled className="p-2 text-muted opacity-40"><Phone size={18} /></button>
        </Card>

        <Card className="mb-3 p-3">
          <p className="flex items-center gap-2 font-medium">{puja?.name ?? 'Puja'}
            {request.isEmergency && <Badge className="bg-error/10 text-error">Urgent</Badge>}
            {request.type === 'multi' && <Badge className="bg-info/10 text-info">Multi-pandit</Badge>}
          </p>
          <p className="text-xs text-muted">Base charge ₹{request.charges.base}{request.charges.emergencySurcharge ? ` · urgent surcharge ₹${request.charges.emergencySurcharge}` : ''}</p>
        </Card>

        <Card className="mb-3 p-3">
          <p className="text-xs text-muted">Schedule</p>
          <p className="text-sm font-medium">{request.slotLabel}</p>
          {request.isEmergency && <p className="text-xs text-warning">Urgent same-day — surcharge applies.</p>}
        </Card>

        <Card className="mb-3 p-3">
          <p className="text-xs text-muted">Address</p>
          <p className="text-sm">{address ? `${address.line}, ${address.city}` : '—'}</p>
          <div className="mt-2 flex items-center justify-center rounded-md border border-dashed border-border bg-surface-2 py-6 text-xs text-muted">📍 Location (mock)</div>
        </Card>

        {request.type === 'multi' && (
          <Card className="mb-3 p-3">
            <p className="text-xs text-muted">Multi-pandit</p>
            <p className="text-sm">You are the <span className="font-medium">lead</span>. Team: {(request.teamPanditIds ?? []).length} pandit(s).</p>
          </Card>
        )}

        {request.notes && (
          <Card className="mb-3 p-3"><p className="text-xs text-muted">Notes</p><p className="text-sm">{request.notes}</p></Card>
        )}
      </div>

      <div className="border-t border-border p-3">
        {decided ? (
          <p className="text-center text-sm text-muted">This request is {request.status}.</p>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSearch({ action: 'reject' })}>Reject</Button>
            <Button className="flex-1" onClick={() => navigate(`/pandit/requests/${request.id}/accept`)}>Accept</Button>
          </div>
        )}
      </div>
    </>
  );
}
