import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Heart } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { PanditCard } from '../../components/ui/PanditCard';
import { Button } from '../../components/ui/Button';
import { useDataStore } from '../../store/dataStore';

export function FavoritesScreen() {
  const navigate = useNavigate();
  const favorites = useDataStore(useShallow((s) => s.getFavorites()));
  const toggleFavorite = useDataStore((s) => s.toggleFavorite);

  return (
    <>
      <AppBar title="Favorites" />
      <div className="flex-1 p-4">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Heart size={36} className="text-muted" />
            <p className="text-sm text-muted">No favourite pandits yet.</p>
            <button onClick={() => navigate('/app/search')} className="text-sm font-medium text-primary">Explore pandits</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {favorites.map((p) => (
              <div key={p.id} className="flex flex-col gap-2">
                <PanditCard p={p} onClick={() => navigate(`/app/pandit/${p.id}`)} />
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => navigate(`/app/book/${p.id}`)}>Quick rebook</Button>
                  <Button variant="outline" onClick={() => toggleFavorite(p.id)} aria-label={`Remove ${p.name} from favourites`}>
                    <Heart size={18} className="fill-error text-error" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
