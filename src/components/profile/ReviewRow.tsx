import { Card } from '../ui/Card';
import { RatingStars } from '../ui/RatingStars';
import type { Review } from '../../mock/types';

export function ReviewRow({
  review,
  panditName,
  onOpen,
  onDelete,
}: {
  review: Review;
  panditName: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="p-3">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{panditName}</span>
          <RatingStars value={review.rating} />
        </div>
        <p className="mt-1 text-sm text-muted">{review.text}</p>
        <p className="mt-1 text-xs text-muted">{review.date}</p>
      </button>
      <div className="mt-2 flex">
        <button type="button" onClick={onDelete} className="ml-auto text-xs font-medium text-error">Delete</button>
      </div>
    </Card>
  );
}
