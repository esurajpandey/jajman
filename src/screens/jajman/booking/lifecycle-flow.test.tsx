import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BookingDetailScreen } from './BookingDetailScreen';
import { RatePanditScreen } from './RatePanditScreen';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';

beforeEach(() => {
  useBookingStore.setState(useBookingStore.getInitialState());
  useDataStore.setState(useDataStore.getInitialState());
});

function harness(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/booking/:bookingId" element={<BookingDetailScreen />} />
        <Route path="/app/booking/:bookingId/rate" element={<RatePanditScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('lifecycle flow', () => {
  it('cancel a scheduled booking refunds advance minus 5%', () => {
    harness('/app/booking/bkg-demo-2'); // scheduled, amountPaid 344
    fireEvent.click(screen.getByRole('button', { name: /Cancel booking/ }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm cancellation/ }));
    const b = useBookingStore.getState().getBooking('bkg-demo-2')!;
    expect(b.status).toBe('cancelled');
    expect(b.cancellation?.refundAmount).toBe(327); // 344 − round(0.05*344)=17 → 327
  });

  it('rate a completed booking adds a review and marks it rated', () => {
    const reviewsBefore = useDataStore.getState().getReviewsForPandit('pnd-2').length;
    harness('/app/booking/bkg-demo-1/rate'); // completed, pandit pnd-2
    fireEvent.click(screen.getByRole('button', { name: '5 stars' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));
    expect(useDataStore.getState().getReviewsForPandit('pnd-2').length).toBe(reviewsBefore + 1);
    expect(useBookingStore.getState().getBooking('bkg-demo-1')?.status).toBe('rated');
  });
});
