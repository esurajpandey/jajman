import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WithdrawScreen } from './WithdrawScreen';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { seedPanditBookings, seedPanditBanks, seedPanditWithdrawals } from '../../mock/seed';

beforeEach(() => {
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals });
});

describe('WithdrawScreen', () => {
  it('rejects an amount over the available balance', () => {
    render(<MemoryRouter><WithdrawScreen /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '99999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm withdrawal' }));
    expect(screen.getByText(/exceeds your available balance/)).toBeInTheDocument();
  });
  it('"Withdraw all" fills the available amount', () => {
    render(<MemoryRouter><WithdrawScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw all' }));
    expect((screen.getByLabelText('Amount (₹)') as HTMLInputElement).value).toBe('3281');
  });
});
