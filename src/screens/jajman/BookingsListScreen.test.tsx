import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BookingsListScreen } from './BookingsListScreen';
import { useBookingStore } from '../../store/bookingStore';

beforeEach(() => useBookingStore.setState(useBookingStore.getInitialState()));

describe('BookingsListScreen', () => {
  it('shows scheduled bookings under Upcoming and switches tabs', () => {
    render(<MemoryRouter><BookingsListScreen /></MemoryRouter>);
    // seed bkg-demo-2 is scheduled (Upcoming) → its puja "Satyanarayan Katha" shows
    expect(screen.getByText('Satyanarayan Katha')).toBeInTheDocument();
    // switch to Completed → demo-1 and demo-4 both have Ganesh Puja (completed + rated)
    fireEvent.click(screen.getByRole('tab', { name: 'Completed' }));
    expect(screen.getAllByText('Ganesh Puja').length).toBeGreaterThanOrEqual(1);
  });
});
