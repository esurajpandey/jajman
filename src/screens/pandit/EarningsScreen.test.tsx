import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EarningsScreen } from './EarningsScreen';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { useDataStore } from '../../store/dataStore';
import { seedPanditBookings, seedPanditBanks, seedPanditWithdrawals, seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => {
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('EarningsScreen', () => {
  it('shows KPI totals and switches range', () => {
    render(<MemoryRouter><EarningsScreen /></MemoryRouter>);
    expect(screen.getByText('Total earnings')).toBeInTheDocument();
    expect(screen.getByText('₹1,656')).toBeInTheDocument();   // avg per puja (unique)
    fireEvent.click(screen.getByRole('tab', { name: 'Week' }));
    expect(screen.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'true');
  });
});
