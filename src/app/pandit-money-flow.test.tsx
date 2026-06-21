import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { usePanditBookingStore } from '../store/panditBookingStore';
import { usePanditWalletStore } from '../store/panditWalletStore';
import { useDataStore } from '../store/dataStore';
import { seedPanditBookings, seedPanditBanks, seedPanditWithdrawals, seedCategories, seedPujas, seedPandits, seedReviews } from '../mock/seed';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  usePanditBookingStore.setState({ bookings: seedPanditBookings });
  usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
  useSessionStore.getState().becomePandit();
  useSessionStore.getState().switchMode('pandit');
  useSessionStore.getState().setPanditStatus('approved');
});

describe('pandit money flow (integration)', () => {
  it('earnings → wallet → withdraw → confirm advances a new withdrawal past "requested"', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/earnings'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByText('Total earnings')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Wallet'));                       // earnings shortcut card
    expect(screen.getByText('Available balance')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' })); // hero CTA
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm withdrawal' }));
    const latest = usePanditWalletStore.getState().withdrawals[0];
    expect(latest.amount).toBe(1000);
    expect(latest.status).not.toBe('requested');   // deterministic advance fired on the status screen
  });

  it('transactions filter narrows to withdrawals', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/wallet/transactions'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByText('+₹2,310')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Withdrawals' }));
    expect(screen.queryByText('+₹2,310')).toBeNull();
  });

  it('add a bank account from the bank-management screen', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/wallet/banks/new'] });
    render(<RouterProvider router={router} />);
    const before = usePanditWalletStore.getState().banks.length;
    fireEvent.change(screen.getByLabelText('Account holder name'), { target: { value: 'New Holder' } });
    fireEvent.change(screen.getByLabelText('Account number'), { target: { value: '5555666677778888' } });
    fireEvent.change(screen.getByLabelText('Confirm account number'), { target: { value: '5555666677778888' } });
    fireEvent.change(screen.getByLabelText('IFSC'), { target: { value: 'ICIC0004321' } });
    fireEvent.change(screen.getByLabelText('Bank name'), { target: { value: 'ICICI Bank' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(usePanditWalletStore.getState().banks.length).toBe(before + 1);
  });
});
