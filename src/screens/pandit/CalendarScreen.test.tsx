import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CalendarScreen } from './CalendarScreen';
import { usePanditAvailabilityStore } from '../../store/panditAvailabilityStore';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';
import { seedPanditAvailability, seedPanditBookings, seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';
import type { Booking } from '../../mock/types';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

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
  it('does not show a requested booking as a booking in the day agenda', () => {
    // Seed a single non-live (requested) booking on today; no availability slots or leaves.
    const requestedBooking: Booking = {
      id: 'test-req-1',
      panditId: 'pnd-1',
      pujaId: 'puja-ganesh',
      type: 'single',
      status: 'requested',
      pujaStartISO: `${TODAY_ISO}T10:00:00.000Z`,
      slotLabel: 'Today · 10:00 AM',
      addressId: 'addr-home',
      attachments: [],
      notes: '',
      isEmergency: false,
      charges: { base: 1800, travel: 0, emergencySurcharge: 0, subtotal: 1800 },
      advanceAmount: 540,
      remainingAmount: 1260,
      amountPaid: 0,
      createdAt: `${TODAY_ISO}T08:00:00.000Z`,
      requestExpiresAt: `${TODAY_ISO}T20:00:00.000Z`,
      isDisputed: false,
      jajmanName: 'Test Jajman',
    };
    usePanditAvailabilityStore.setState({ recurring: [], slots: [], leaves: [] });
    usePanditBookingStore.setState({ bookings: [requestedBooking] });

    render(<MemoryRouter><CalendarScreen /></MemoryRouter>);

    // The default selected day is today, so the agenda should show no live bookings.
    expect(screen.getByText('Nothing scheduled.')).toBeInTheDocument();
    // The puja name must not appear in the day agenda.
    expect(screen.queryByText('Ganesh Puja')).not.toBeInTheDocument();
  });
});
