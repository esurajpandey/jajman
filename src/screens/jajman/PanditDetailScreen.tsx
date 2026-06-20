import { useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Heart, MessageCircle, MapPin, Clock, Languages } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { RatingSummary } from '../../components/ui/RatingSummary';
import { ReviewItem } from '../../components/ui/ReviewItem';
import { useDataStore } from '../../store/dataStore';
import { cn } from '../../lib/cn';

export function PanditDetailScreen() {
  const navigate = useNavigate();
  const { panditId = '' } = useParams();
  const pandit = useDataStore((s) => s.getPandit(panditId));
  const pujas = useDataStore((s) => s.pujas);
  const reviews = useDataStore(useShallow((s) => s.getReviewsForPandit(panditId)));
  const toggleFavorite = useDataStore((s) => s.toggleFavorite);

  if (!pandit) {
    return (
      <>
        <AppBar title="Pandit" left={<BackButton />} />
        <div className="flex flex-1 items-center justify-center text-sm text-muted">Pandit not found.</div>
      </>
    );
  }

  return (
    <>
      <AppBar
        title={pandit.name}
        left={<BackButton />}
        right={
          <button onClick={() => toggleFavorite(pandit.id)} aria-label="Toggle favorite" aria-pressed={pandit.favorite} className="p-2">
            <Heart size={20} className={cn(pandit.favorite ? 'fill-error text-error' : 'text-muted')} />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 p-4">
          <Avatar name={pandit.name} size={64} />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">{pandit.name}</h1>
            <p className="text-sm text-muted">{pandit.specializations.join(' · ')}</p>
            <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted">
              <span className="flex items-center gap-1"><MapPin size={12} />{pandit.city} · {pandit.distanceKm} km</span>
              <span>· {pandit.experienceYears}y exp</span>
              <span>· {pandit.pujasCompleted} pujas</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 px-4">
          {[
            { label: 'Response', value: `${pandit.responseRatePct}%`, icon: <MessageCircle size={14} /> },
            { label: 'Replies in', value: `${pandit.responseTimeMins}m`, icon: <Clock size={14} /> },
            { label: 'Languages', value: `${pandit.languages.length}`, icon: <Languages size={14} /> },
          ].map((m) => (
            <div key={m.label} className="rounded-md bg-surface-2 p-2 text-center">
              <div className="flex justify-center text-primary">{m.icon}</div>
              <div className="text-sm font-semibold">{m.value}</div>
              <div className="text-[10px] text-muted">{m.label}</div>
            </div>
          ))}
        </div>

        <Section title="About">
          <p className="text-sm leading-relaxed text-text">{pandit.about}</p>
        </Section>

        <Section title="Languages">
          <div className="flex flex-wrap gap-2">{pandit.languages.map((l) => <Badge key={l}>{l}</Badge>)}</div>
        </Section>

        <Section title="Pujas offered">
          <div className="flex flex-col gap-2">
            {pandit.supportedPujas.map((sp) => {
              const puja = pujas.find((p) => p.id === sp.pujaId);
              return (
                <button
                  key={sp.pujaId}
                  onClick={() => navigate(`/app/puja/${sp.pujaId}`)}
                  className="flex items-center justify-between rounded-md border border-border bg-surface p-3 text-left"
                >
                  <span>
                    <span className="block text-sm font-medium">{puja?.name ?? sp.pujaId}</span>
                    <span className="block text-xs text-muted">{sp.durationMins} min</span>
                  </span>
                  <span className="text-sm font-semibold">₹{sp.charge}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Ratings & reviews">
          <RatingSummary value={pandit.rating} count={pandit.ratingCount} />
          <div className="mt-2">
            {reviews.slice(0, 2).map((r) => <ReviewItem key={r.id} review={r} />)}
          </div>
          {reviews.length > 2 && (
            <button onClick={() => navigate(`/app/pandit/${pandit.id}/reviews`)} className="mt-2 text-sm font-medium text-primary">
              See all {reviews.length} reviews
            </button>
          )}
        </Section>

        <div className="h-24" />
      </div>

      <div className="flex items-center gap-3 border-t border-border bg-surface p-3">
        <Button variant="outline" aria-label="Chat" onClick={() => navigate(`/app/chat/${pandit.id}`)} className="px-4">
          <MessageCircle size={18} />
        </Button>
        <Button className="flex-1" onClick={() => navigate(`/app/book/${pandit.id}`)}>
          <span>From ₹{pandit.startingPrice} · Book</span>
        </Button>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border p-4">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}
