import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { usePanditAvailabilityStore } from '../store/panditAvailabilityStore';
import { usePanditBookingStore } from '../store/panditBookingStore';
import { useDataStore } from '../store/dataStore';
import { seedPanditAvailability, seedPanditBookings, seedCategories, seedPujas, seedPandits, seedReviews } from '../mock/seed';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  usePanditAvailabilityStore.setState({ recurring: seedPanditAvailability.recurring, slots: seedPanditAvailability.slots, leaves: seedPanditAvailability.leaves });
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
  useSessionStore.getState().becomePandit();
  useSessionStore.getState().switchMode('pandit');
  useSessionStore.getState().setPanditStatus('approved');
});

describe('pandit calendar flow (integration)', () => {
  it('calendar → add sheet → Manage availability → toggle a recurring day', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/calendar'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByLabelText('Add'));
    fireEvent.click(screen.getByRole('button', { name: 'Manage availability' }));
    expect(screen.getByText('Availability')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Tue' }));
    expect(usePanditAvailabilityStore.getState().recurring.some((r) => r.weekday === 2)).toBe(true);
  });
});
