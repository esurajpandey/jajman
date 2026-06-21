import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Star } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { ReviewRow } from '../../../components/profile/ReviewRow';
import { useDataStore } from '../../../store/dataStore';

export function MyReviewsScreen() {
  const navigate = useNavigate();
  const reviews = useDataStore(useShallow((s) => s.getMyReviews()));
  const deleteReview = useDataStore((s) => s.deleteReview);
  const getPandit = useDataStore((s) => s.getPandit);

  return (
    <>
      <AppBar title="My Reviews" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Star size={36} className="text-muted" />
            <p className="text-sm text-muted">You haven't reviewed any puja yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <ReviewRow
                key={r.id}
                review={r}
                panditName={getPandit(r.panditId)?.name ?? 'Pandit'}
                onOpen={() => navigate(`/app/pandit/${r.panditId}`)}
                onDelete={() => deleteReview(r.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
