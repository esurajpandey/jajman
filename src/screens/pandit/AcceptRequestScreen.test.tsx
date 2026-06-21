import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AcceptRequestScreen } from './AcceptRequestScreen';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { seedPanditBookings } from '../../mock/seed';

beforeEach(() => usePanditBookingStore.setState({ bookings: seedPanditBookings }));

function renderAccept(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/pandit/requests/${id}/accept`]}>
      <Routes>
        <Route path="/pandit/requests/:id/accept" element={<AcceptRequestScreen />} />
        <Route path="/pandit/requests" element={<div>Requests list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AcceptRequestScreen', () => {
  it('adds a travel charge and accepts, advancing the request to accepted', () => {
    renderAccept('preq-2'); // base 1500, not urgent
    fireEvent.click(screen.getByRole('switch', { name: 'Add travel charge' }));
    fireEvent.change(screen.getByLabelText('Travel charge (₹)'), { target: { value: '100' } });
    expect(screen.getByText('₹1600')).toBeInTheDocument(); // total to jajman
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Accept' }));
    const b = usePanditBookingStore.getState().getRequest('preq-2')!;
    expect(b.status).toBe('accepted');
    expect(b.charges.travel).toBe(100);
    expect(screen.getByText('Requests list')).toBeInTheDocument();
  });
});
