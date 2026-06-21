import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PanditDashboardScreen } from './PanditDashboardScreen';
import { useSessionStore, MOCK_OTP } from '../../store/sessionStore';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';
import { seedPanditBookings, seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('PanditDashboardScreen', () => {
  it('renders the greeting, accepting toggle, and earnings mini', () => {
    render(<MemoryRouter><PanditDashboardScreen /></MemoryRouter>);
    expect(screen.getByText(/Namaste/)).toBeInTheDocument();
    expect(screen.getByText('Pending requests')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Accepting bookings' })).toBeInTheDocument();
  });
  it('toggles accepting-bookings off', () => {
    render(<MemoryRouter><PanditDashboardScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('switch', { name: 'Accepting bookings' }));
    expect(useSessionStore.getState().acceptingBookings).toBe(false);
  });
});
