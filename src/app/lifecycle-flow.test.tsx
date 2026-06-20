import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { useBookingStore } from '../store/bookingStore';
import { useDataStore } from '../store/dataStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useBookingStore.setState(useBookingStore.getInitialState());
  useDataStore.setState(useDataStore.getInitialState());
  useSessionStore.getState().setPendingPhone('9');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('bookings lifecycle (integration)', () => {
  it('Bookings tab → open a scheduled booking → cancel it', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/bookings'] });
    render(<RouterProvider router={router} />);
    // scheduled demo-2 (Satyanarayan Katha) under Upcoming
    fireEvent.click(screen.getByText('Satyanarayan Katha'));
    fireEvent.click(screen.getByRole('button', { name: /Cancel booking/ }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm cancellation/ }));
    expect(useBookingStore.getState().getBooking('bkg-demo-2')?.status).toBe('cancelled');
  });
});
