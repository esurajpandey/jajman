import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { usePanditBookingStore } from '../store/panditBookingStore';
import { useDataStore } from '../store/dataStore';
import { seedPanditBookings, seedAddresses, seedCategories, seedPujas, seedPandits, seedReviews } from '../mock/seed';
import { useBookingStore } from '../store/bookingStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
  useBookingStore.setState({ addresses: seedAddresses });
  // approved pandit in pandit mode, with a future-dated request so it's not expired at runtime
  const future = new Date(Date.now() + 36 * 3600 * 1000).toISOString();
  usePanditBookingStore.setState({ bookings: seedPanditBookings.map((b) => (b.status === 'requested' ? { ...b, requestExpiresAt: future } : b)) });
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
  useSessionStore.getState().becomePandit();
  useSessionStore.getState().switchMode('pandit');
  useSessionStore.getState().setPanditStatus('approved');
});

describe('pandit core flow (integration)', () => {
  it('dashboard → requests → detail → accept advances the request', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/dashboard'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByText('Pending requests')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Pending requests'));
    // requests list shows a jajman; open the first
    fireEvent.click(screen.getByText('Rohit Deshpande'));
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Accept' }));
    expect(usePanditBookingStore.getState().getRequest('preq-2')!.status).toBe('accepted');
  });
});
