import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { useBookingStore } from '../store/bookingStore';
import { useDataStore } from '../store/dataStore';
import { seedAddresses } from '../mock/seed';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useBookingStore.setState({ addresses: seedAddresses });
  useDataStore.setState(useDataStore.getInitialState());
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('profile flow (integration)', () => {
  it('Profile tab → Addresses shows the saved addresses', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/profile'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByText('Addresses'));
    expect(screen.getByText('My Addresses')).toBeInTheDocument();
    expect(screen.getByText('Community temple')).toBeInTheDocument();
  });

  it('Become a Pandit → clicking "Become a Pandit" from Profile lands on the onboarding intro', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/profile'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole('button', { name: 'Become a Pandit' }));
    expect(screen.getByText('Offer your seva to families near you')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get started' })).toBeInTheDocument();
  });
});
