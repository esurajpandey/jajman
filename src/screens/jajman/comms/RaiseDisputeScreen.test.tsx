import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RaiseDisputeScreen } from './RaiseDisputeScreen';
import { useBookingStore } from '../../../store/bookingStore';
import { useDisputeStore } from '../../../store/disputeStore';
import { useDataStore } from '../../../store/dataStore';
import { seedBookings, seedDisputes, seedCategories, seedPujas, seedPandits, seedReviews } from '../../../mock/seed';

beforeEach(() => {
  useBookingStore.setState({ bookings: seedBookings });
  useDisputeStore.setState({ disputes: seedDisputes });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/booking/:bookingId/dispute/new" element={<RaiseDisputeScreen />} />
        <Route path="/app/disputes/:disputeId" element={<div>Dispute detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RaiseDisputeScreen', () => {
  it('requires a reason + description, then creates a dispute', () => {
    renderAt('/app/booking/bkg-demo-1/dispute/new');
    const before = useDisputeStore.getState().disputes.length;
    fireEvent.click(screen.getByText('Puja incomplete'));
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Rituals were skipped.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit dispute' }));
    expect(useDisputeStore.getState().disputes.length).toBe(before + 1);
    expect(screen.getByText('Dispute detail')).toBeInTheDocument();
  });
});
