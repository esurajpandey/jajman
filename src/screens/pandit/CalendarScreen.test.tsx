import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CalendarScreen } from './CalendarScreen';
import { usePanditAvailabilityStore } from '../../store/panditAvailabilityStore';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';
import { seedPanditAvailability, seedPanditBookings, seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => {
  usePanditAvailabilityStore.setState({ recurring: seedPanditAvailability.recurring, slots: seedPanditAvailability.slots, leaves: seedPanditAvailability.leaves });
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('CalendarScreen', () => {
  it('renders the month grid and switches to Day view', () => {
    render(<MemoryRouter><CalendarScreen /></MemoryRouter>);
    expect(screen.getByText('Month')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Day' }));
    // day agenda heading present (selected defaults to today)
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveAttribute('aria-selected', 'true');
  });
  it('opens the add sheet with availability + leave actions', () => {
    render(<MemoryRouter><CalendarScreen /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText('Add'));
    expect(screen.getByRole('button', { name: 'Manage availability' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add leave / block' })).toBeInTheDocument();
  });
});
