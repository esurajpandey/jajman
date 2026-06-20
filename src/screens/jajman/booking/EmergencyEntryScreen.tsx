import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Zap } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { PanditCard } from '../../../components/ui/PanditCard';
import { useDataStore } from '../../../store/dataStore';
import { sortPandits } from '../../../domain/search';

export function EmergencyEntryScreen() {
  const navigate = useNavigate();
  const pandits = useDataStore(useShallow((s) => s.getApprovedPandits()));
  // "available now" = fastest responders
  const available = sortPandits(pandits, 'distance').filter((p) => p.responseTimeMins <= 20).slice(0, 5);

  return (
    <>
      <AppBar title="Urgent booking" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-start gap-3 rounded-md border border-error/30 bg-error/5 p-3">
          <Zap size={20} className="text-error" />
          <p className="text-sm text-muted">Same-day bookings carry an urgent surcharge and are limited to pandits who can respond before the puja time.</p>
        </div>
        <h3 className="mb-2 text-sm font-semibold">Available for urgent booking</h3>
        <div className="flex flex-col gap-3">
          {available.map((p) => (
            <PanditCard key={p.id} p={p} onClick={() => navigate(`/app/book/${p.id}?urgent=1`)} />
          ))}
        </div>
      </div>
    </>
  );
}
