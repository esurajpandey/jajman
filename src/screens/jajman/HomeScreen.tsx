import { Moon, Sun } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../components/ui/AppBar';
import { SearchBar } from '../../components/ui/SearchBar';
import { CategoryChip } from '../../components/ui/CategoryChip';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { PanditCard } from '../../components/ui/PanditCard';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';

export function HomeScreen() {
  const categories = useDataStore((s) => s.categories);
  const pandits = useDataStore(useShallow((s) => s.getApprovedPandits()));
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  return (
    <>
      <AppBar
        left={<span aria-hidden="true" className="text-lg font-bold text-primary">ॐ</span>}
        title={
          <div className="leading-tight">
            <div className="text-[11px] font-normal text-muted">Namaste 🙏</div>
            <div className="text-sm">Booking for Home</div>
          </div>
        }
        right={
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 text-muted"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        }
      />

      <div className="pb-4">
        <div className="px-4 pt-3">
          <SearchBar />
        </div>

        <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto px-4">
          {categories.map((c) => (
            <CategoryChip key={c.id} label={c.name} icon={c.icon} />
          ))}
        </div>

        <SectionHeader
          title="Featured Pandits"
          action={<button type="button" className="text-xs font-medium text-primary">See all</button>}
        />
        <div className="flex flex-col gap-3 px-4">
          {pandits.map((p) => (
            <PanditCard key={p.id} p={p} />
          ))}
        </div>
      </div>
    </>
  );
}
