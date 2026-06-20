import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { MockMap } from '../../components/ui/MockMap';
import { PanditCard } from '../../components/ui/PanditCard';
import { useDataStore } from '../../store/dataStore';

export function MapScreen() {
  const navigate = useNavigate();
  const pandits = useDataStore((s) => s.getApprovedPandits());
  const [selectedId, setSelectedId] = useState<string | null>(pandits[0]?.id ?? null);
  const selected = pandits.find((p) => p.id === selectedId) ?? null;

  return (
    <>
      <AppBar
        title="Nearby pandits"
        left={
          <button onClick={() => navigate(-1)} aria-label="Back" className="text-muted">
            <ArrowLeft size={20} />
          </button>
        }
      />
      <div className="relative flex-1">
        <MockMap pandits={pandits} selectedId={selectedId} onSelect={setSelectedId} />
        {selected && (
          <div className="absolute inset-x-0 bottom-0 p-3">
            <PanditCard p={selected} onClick={() => navigate(`/app/pandit/${selected.id}`)} />
          </div>
        )}
      </div>
    </>
  );
}
