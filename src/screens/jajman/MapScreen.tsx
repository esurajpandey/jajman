import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../components/ui/AppBar';
import { MockMap } from '../../components/ui/MockMap';
import { PanditCard } from '../../components/ui/PanditCard';
import { BackButton } from '../../components/ui/BackButton';
import { useDataStore } from '../../store/dataStore';

export function MapScreen() {
  const navigate = useNavigate();
  const pandits = useDataStore(useShallow((s) => s.getApprovedPandits()));
  const [selectedId, setSelectedId] = useState<string | null>(() => useDataStore.getState().getApprovedPandits()[0]?.id ?? null);
  const selected = pandits.find((p) => p.id === selectedId) ?? null;

  return (
    <>
      <AppBar
        title="Nearby pandits"
        left={<BackButton />}
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
