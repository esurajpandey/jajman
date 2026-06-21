import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RequestsScreen } from './RequestsScreen';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';
import { seedPanditBookings, seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => {
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('RequestsScreen', () => {
  it('renders without crashing and shows the requests header', () => {
    render(<MemoryRouter><RequestsScreen /></MemoryRouter>);
    expect(screen.getByText('Requests')).toBeInTheDocument();
  });
  it('shows seeded requests when their expiry is in the future', () => {
    const future = new Date(Date.now() + 36 * 3600 * 1000).toISOString();
    usePanditBookingStore.setState({ bookings: seedPanditBookings.map((b) => (b.status === 'requested' ? { ...b, requestExpiresAt: future } : b)) });
    render(<MemoryRouter><RequestsScreen /></MemoryRouter>);
    expect(screen.getByText('Rohit Deshpande')).toBeInTheDocument();
  });
});
