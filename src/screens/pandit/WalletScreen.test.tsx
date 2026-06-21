import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WalletScreen } from './WalletScreen';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { useDataStore } from '../../store/dataStore';
import { seedPanditBookings, seedPanditBanks, seedPanditWithdrawals, seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => {
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('WalletScreen', () => {
  it('shows the available-balance hero and an enabled Withdraw CTA', () => {
    render(<MemoryRouter><WalletScreen /></MemoryRouter>);
    expect(screen.getByText('Available balance')).toBeInTheDocument();
    expect(screen.getByText('₹3,281')).toBeInTheDocument();   // available (unique)
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeEnabled();
  });
});
