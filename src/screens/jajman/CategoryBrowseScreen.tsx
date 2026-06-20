import { useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../components/ui/AppBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { PanditCard } from '../../components/ui/PanditCard';
import { BackButton } from '../../components/ui/BackButton';
import { useDataStore } from '../../store/dataStore';

export function CategoryBrowseScreen() {
  const navigate = useNavigate();
  const { categoryId = '' } = useParams();
  const category = useDataStore((s) => s.getCategory(categoryId));
  const pujas = useDataStore(useShallow((s) => s.getPujasForCategory(categoryId)));
  const pandits = useDataStore(useShallow((s) => s.getPanditsForCategory(categoryId)));

  return (
    <>
      <AppBar
        title={category ? `${category.icon} ${category.name}` : 'Category'}
        left={<BackButton />}
      />
      <div className="flex-1 pb-6">
        <SectionHeader title="Pujas in this category" />
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
          {pujas.length === 0 ? (
            <p className="px-4 py-2 text-sm text-muted">No pujas listed in this category yet.</p>
          ) : (
            pujas.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/app/puja/${p.id}`)}
                className="shrink-0 rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                {p.name}
              </button>
            ))
          )}
        </div>
        <SectionHeader title={`${pandits.length} pandits available`} />
        <div className="flex flex-col gap-3 px-4">
          {pandits.length === 0 ? (
            <p className="text-sm text-muted">No pandits in this category yet.</p>
          ) : (
            pandits.map((p) => <PanditCard key={p.id} p={p} onClick={() => navigate(`/app/pandit/${p.id}`)} />)
          )}
        </div>
      </div>
    </>
  );
}
