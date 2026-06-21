import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PaymentHistoryScreen } from './PaymentHistoryScreen';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';
import { seedBookings, seedCategories, seedPujas, seedPandits, seedReviews } from '../../../mock/seed';

beforeEach(() => {
  useBookingStore.setState({ bookings: seedBookings });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('PaymentHistoryScreen', () => {
  it('lists payment rows derived from seeded bookings', () => {
    render(<MemoryRouter><PaymentHistoryScreen /></MemoryRouter>);
    // bkg-demo-4 is fully paid → Advance + Remaining rows exist
    expect(screen.getAllByText(/Advance|Remaining/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ganesh Puja').length).toBeGreaterThan(0);
  });
});
