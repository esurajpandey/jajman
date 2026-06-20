import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BookingFlow } from './BookingFlow';
import { useBookingStore } from '../../../store/bookingStore';

beforeEach(() => useBookingStore.setState(useBookingStore.getInitialState()));

function renderFlow() {
  return render(
    <MemoryRouter initialEntries={['/app/book/pnd-1']}>
      <Routes>
        <Route path="/app/book/:panditId" element={<BookingFlow />} />
        <Route path="/app/booking/:bookingId/sent" element={<div>SENT</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BookingFlow', () => {
  it('walks puja → slot → address → details → review → send', () => {
    renderFlow();
    // Step 0: pick the first puja
    fireEvent.click(screen.getByText('Satyanarayan Katha'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    // Step 1: pick a time
    fireEvent.click(screen.getByRole('button', { name: '09:00 AM' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    // Step 2: pick the home address
    fireEvent.click(screen.getByText('Home'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    // Step 3: details (optional) → continue
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    // Step 4: review → send
    expect(screen.getByText(/Advance now/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send booking request' }));
    expect(screen.getByText('SENT')).toBeInTheDocument();
    // a requested booking now exists
    expect(useBookingStore.getState().bookings.some((b) => b.status === 'requested' && b.panditId === 'pnd-1')).toBe(true);
  });
});
