import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { PanditCard } from '../../components/ui/PanditCard';
import { useDataStore } from '../../store/dataStore';
import { sortPandits } from '../../domain/search';

export function AlternateSuggestionsScreen() {
  const navigate = useNavigate();
  const approved = useDataStore(useShallow((s) => s.getApprovedPandits()));

  const sections: { title: string; list: ReturnType<typeof sortPandits> }[] = [
    { title: 'Top rated nearby', list: sortPandits(approved, 'rating').slice(0, 3) },
    { title: 'Closest to you', list: sortPandits(approved, 'distance').slice(0, 3) },
    { title: 'Budget friendly', list: sortPandits(approved, 'price').slice(0, 3) },
  ];

  return (
    <>
      <AppBar
        title="Suggestions for you"
        left={<BackButton />}
      />
      <div className="flex-1 pb-6">
        <p className="px-4 pt-3 text-sm text-muted">No exact match — here are pandits you might like.</p>
        {sections.map((s) => (
          <div key={s.title}>
            <SectionHeader title={s.title} />
            <div className="flex flex-col gap-3 px-4">
              {s.list.map((p) => (
                <PanditCard key={p.id} p={p} onClick={() => navigate(`/app/pandit/${p.id}`)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
