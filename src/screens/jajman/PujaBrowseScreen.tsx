import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { PanditCard } from '../../components/ui/PanditCard';
import { useDataStore } from '../../store/dataStore';

export function PujaBrowseScreen() {
  const navigate = useNavigate();
  const { pujaId = '' } = useParams();
  const puja = useDataStore((s) => s.getPuja(pujaId));
  const pandits = useDataStore((s) => s.getPanditsForPuja(pujaId));

  return (
    <>
      <AppBar
        title={puja?.name ?? 'Puja'}
        left={
          <button onClick={() => navigate(-1)} aria-label="Back" className="text-muted">
            <ArrowLeft size={20} />
          </button>
        }
      />
      <div className="flex-1 pb-6">
        {puja && (
          <p className="px-4 pt-3 text-sm text-muted">
            Suggested duration {puja.suggestedDurationMins} min · ₹{puja.minAmount}–₹{puja.maxAmount}
          </p>
        )}
        <SectionHeader title={`${pandits.length} pandits offer this puja`} />
        <div className="flex flex-col gap-3 px-4">
          {pandits.length === 0 ? (
            <p className="text-sm text-muted">No pandits offer this puja yet.</p>
          ) : (
            pandits.map((p) => <PanditCard key={p.id} p={p} onClick={() => navigate(`/app/pandit/${p.id}`)} />)
          )}
        </div>
      </div>
    </>
  );
}
