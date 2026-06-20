import { useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { RatingSummary } from '../../components/ui/RatingSummary';
import { DistributionBars } from '../../components/ui/DistributionBars';
import { ReviewItem } from '../../components/ui/ReviewItem';
import { useDataStore } from '../../store/dataStore';

export function ReviewsScreen() {
  const { panditId = '' } = useParams();
  const pandit = useDataStore((s) => s.getPandit(panditId));
  const reviews = useDataStore(useShallow((s) => s.getReviewsForPandit(panditId)));

  return (
    <>
      <AppBar
        title="Reviews"
        left={<BackButton />}
      />
      <div className="flex-1 overflow-y-auto p-4">
        {pandit && (
          <div className="mb-4 flex items-center justify-between gap-4">
            <RatingSummary value={pandit.rating} count={pandit.ratingCount} />
            <div className="flex-1"><DistributionBars reviews={reviews} /></div>
          </div>
        )}
        {reviews.length === 0 ? (
          <p className="text-sm text-muted">No reviews yet.</p>
        ) : (
          reviews.map((r) => <ReviewItem key={r.id} review={r} />)
        )}
      </div>
    </>
  );
}
