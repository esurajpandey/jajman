import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TransactionsScreen } from './TransactionsScreen';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { useDataStore } from '../../store/dataStore';
import { seedPanditBookings, seedPanditBanks, seedPanditWithdrawals, seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => {
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('TransactionsScreen', () => {
  it('filters to withdrawals only', () => {
    render(<MemoryRouter><TransactionsScreen /></MemoryRouter>);
    expect(screen.getByText('+₹2,310')).toBeInTheDocument();   // an earning credit (gross)
    fireEvent.click(screen.getByRole('button', { name: 'Withdrawals' }));
    expect(screen.queryByText('+₹2,310')).toBeNull();
    expect(screen.getByText('−₹5,000')).toBeInTheDocument();   // wd-1 paid debit
  });
});
