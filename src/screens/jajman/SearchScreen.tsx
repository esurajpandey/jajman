import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Search, SlidersHorizontal, Map, X } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { PanditCard } from '../../components/ui/PanditCard';
import { Chip } from '../../components/ui/Chip';
import { FiltersSheet } from '../../components/discovery/FiltersSheet';
import { useDataStore } from '../../store/dataStore';
import { useDiscoveryStore, type SortKey } from '../../store/discoveryStore';
import { searchPandits, sortPandits } from '../../domain/search';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'rating', label: 'Top rated' },
  { key: 'distance', label: 'Nearest' },
  { key: 'price', label: 'Lowest price' },
];

export function SearchScreen() {
  const navigate = useNavigate();
  const pandits = useDataStore(useShallow((s) => s.pandits));
  const pujas = useDataStore(useShallow((s) => s.pujas));
  const { query, setQuery, filters, sort, setSort, resetFilters, activeFilterCount } = useDiscoveryStore();
  const [sheetOpen, setSheetOpen] = useState(false);

  const results = sortPandits(searchPandits(pandits, pujas, query, filters), sort);
  const activeCount = activeFilterCount();

  return (
    <>
      <AppBar title="Explore pandits" />
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2 rounded-md bg-surface-2 px-3">
          <Search size={18} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pandits, pujas, city…"
            aria-label="Search"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search" className="text-muted">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm"
          >
            <SlidersHorizontal size={14} />
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/map')}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm"
          >
            <Map size={14} />
            Map
          </button>
          {activeCount > 0 && (
            <button onClick={resetFilters} className="ml-auto text-xs text-primary">Clear all</button>
          )}
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {SORTS.map((s) => (
            <Chip key={s.key} label={s.label} selected={sort === s.key} onClick={() => setSort(s.key)} />
          ))}
        </div>
      </div>

      <div className="flex-1 p-4">
        <p className="mb-3 text-xs text-muted">{results.length} pandit{results.length === 1 ? '' : 's'} found</p>
        {results.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="text-4xl">🔍</div>
            <p className="text-sm text-muted">No pandits match your search.</p>
            <button onClick={() => navigate('/app/alternate')} className="text-sm font-medium text-primary">
              See alternate suggestions
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {results.map((p) => (
              <PanditCard key={p.id} p={p} onClick={() => navigate(`/app/pandit/${p.id}`)} />
            ))}
          </div>
        )}
      </div>

      <FiltersSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
