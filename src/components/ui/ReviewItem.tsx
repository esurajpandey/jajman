import dayjs from 'dayjs';
import { Star } from 'lucide-react';
import type { Review } from '../../mock/types';
import { Avatar } from './Avatar';

export function ReviewItem({ review }: { review: Review }) {
  return (
    <div className="flex gap-3 border-b border-border py-3 last:border-b-0">
      <Avatar name={review.jajmanName} size={36} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{review.jajmanName}</span>
          <span className="text-xs text-muted">{dayjs(review.date).format('MMM YYYY')}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={12} className={n <= review.rating ? 'fill-accent text-accent' : 'text-border'} />
          ))}
        </div>
        <p className="mt-1 text-sm text-text">{review.text}</p>
      </div>
    </div>
  );
}
