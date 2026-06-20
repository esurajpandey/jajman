import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { useBookingStore } from '../store/bookingStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useBookingStore.setState(useBookingStore.getInitialState());
  useSessionStore.getState().setPendingPhone('9876543210');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('booking flow (integration)', () => {
  it('book a pandit end-to-end → request sent', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/book/pnd-1'] });
    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByText('Satyanarayan Katha'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));        // puja → slot
    fireEvent.click(screen.getByRole('button', { name: '09:00 AM' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));        // slot → address
    fireEvent.click(screen.getByText('Home'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));        // address → details
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));        // details → review
    fireEvent.click(screen.getByRole('button', { name: 'Send booking request' }));

    expect(screen.getByText(/Booking request sent/)).toBeInTheDocument();
    expect(useBookingStore.getState().bookings.some((b) => b.status === 'requested')).toBe(true);
  });
});
