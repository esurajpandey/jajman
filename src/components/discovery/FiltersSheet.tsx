import { useState } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { Chip } from '../ui/Chip';
import { Button } from '../ui/Button';
import { useDataStore } from '../../store/dataStore';
import { useDiscoveryStore, emptyFilters, type DiscoveryFilters } from '../../store/discoveryStore';

const PRICE_OPTIONS = [1000, 2000, 5000];
const RATING_OPTIONS = [4.0, 4.5, 4.8];

export function FiltersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useDataStore((s) => s.categories);
  const pujas = useDataStore((s) => s.pujas);
  const cities = Array.from(new Set(useDataStore((s) => s.pandits).map((p) => p.city)));
  const committed = useDiscoveryStore((s) => s.filters);
  const setFilters = useDiscoveryStore((s) => s.setFilters);
  const [draft, setDraft] = useState<DiscoveryFilters>(committed);

  // re-sync the draft whenever the sheet (re)opens
  const patch = (p: Partial<DiscoveryFilters>) => setDraft((d) => ({ ...d, ...p }));
  const toggle = <K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) =>
    patch({ [key]: draft[key] === value ? null : value } as Partial<DiscoveryFilters>);

  const apply = () => {
    setFilters(draft);
    onClose();
  };
  const reset = () => setDraft({ ...emptyFilters });

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={reset}>Reset</Button>
          <Button className="flex-1" onClick={apply}>Apply</Button>
        </div>
      }
    >
      <Section title="Category">
        {categories.map((c) => (
          <Chip key={c.id} label={c.name} selected={draft.categoryId === c.id} onClick={() => toggle('categoryId', c.id)} />
        ))}
      </Section>
      <Section title="Puja">
        {pujas.map((p) => (
          <Chip key={p.id} label={p.name} selected={draft.pujaId === p.id} onClick={() => toggle('pujaId', p.id)} />
        ))}
      </Section>
      <Section title="Max price">
        {PRICE_OPTIONS.map((v) => (
          <Chip key={v} label={`₹${v}`} selected={draft.priceMax === v} onClick={() => toggle('priceMax', v)} />
        ))}
      </Section>
      <Section title="Minimum rating">
        {RATING_OPTIONS.map((v) => (
          <Chip key={v} label={`${v}+`} selected={draft.minRating === v} onClick={() => toggle('minRating', v)} />
        ))}
      </Section>
      <Section title="City">
        {cities.map((c) => (
          <Chip key={c} label={c} selected={draft.city === c} onClick={() => toggle('city', c)} />
        ))}
      </Section>
      <Section title="Max distance">
        {[5, 10, 25].map((v) => (
          <Chip key={v} label={`${v} km`} selected={draft.maxDistanceKm === v} onClick={() => toggle('maxDistanceKm', v)} />
        ))}
      </Section>
    </BottomSheet>
  );
}
