import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { ShieldCheck } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { DisputeListItem } from '../../../components/comms/DisputeListItem';
import { useDisputeStore } from '../../../store/disputeStore';

export function DisputesListScreen() {
  const navigate = useNavigate();
  const disputes = useDisputeStore(useShallow((s) => s.getDisputes()));

  return (
    <>
      <AppBar title="Disputes" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        {disputes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <ShieldCheck size={36} className="text-muted" />
            <p className="text-sm text-muted">No disputes — we hope it stays that way.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {disputes.map((d) => (
              <DisputeListItem key={d.id} dispute={d} bookingRef={d.bookingId} onClick={() => navigate(`/app/disputes/${d.id}`)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
