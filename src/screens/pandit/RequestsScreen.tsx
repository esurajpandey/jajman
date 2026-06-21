import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Inbox } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { RequestCard } from '../../components/pandit/RequestCard';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';

export function RequestsScreen() {
  const navigate = useNavigate();
  const nowISO = new Date().toISOString();
  const requests = usePanditBookingStore(useShallow((s) => s.getRequests(nowISO)));
  const getPuja = useDataStore((s) => s.getPuja);

  return (
    <>
      <AppBar title="Requests" />
      <div className="flex-1 overflow-y-auto p-4">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox size={36} className="text-muted" />
            <p className="text-sm text-muted">No pending requests.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} puja={getPuja(r.pujaId)} nowISO={nowISO} onClick={() => navigate(`/pandit/requests/${r.id}`)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
