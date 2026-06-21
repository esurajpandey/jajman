import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequestDetailScreen } from './RequestDetailScreen';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';
import { useBookingStore } from '../../store/bookingStore';
import { seedPanditBookings, seedAddresses, seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => {
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  useBookingStore.setState({ addresses: seedAddresses });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('RequestDetailScreen', () => {
  it('shows the request context and Accept/Reject for a pending request', () => {
    render(
      <MemoryRouter initialEntries={['/pandit/requests/preq-2']}>
        <Routes><Route path="/pandit/requests/:id" element={<RequestDetailScreen />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Rohit Deshpande')).toBeInTheDocument();
    expect(screen.getByText('Satyanarayan Katha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });
});
