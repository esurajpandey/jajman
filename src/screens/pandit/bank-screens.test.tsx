import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BankAccountsScreen } from './BankAccountsScreen';
import { BankEditScreen } from './BankEditScreen';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { seedPanditBanks, seedPanditWithdrawals } from '../../mock/seed';

beforeEach(() => usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals }));

describe('BankAccountsScreen', () => {
  it('lists seeded banks with masked numbers', () => {
    render(<MemoryRouter><BankAccountsScreen /></MemoryRouter>);
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
    expect(screen.getByText('••••3421')).toBeInTheDocument();
  });
});

describe('BankEditScreen (add)', () => {
  it('rejects mismatched account numbers, then adds on valid input', () => {
    render(
      <MemoryRouter initialEntries={['/pandit/wallet/banks/new']}>
        <Routes>
          <Route path="/pandit/wallet/banks/new" element={<BankEditScreen />} />
          <Route path="/pandit/wallet/banks" element={<div>Bank list</div>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Account holder name'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText('Account number'), { target: { value: '1111222233334444' } });
    fireEvent.change(screen.getByLabelText('Confirm account number'), { target: { value: '9999' } });
    fireEvent.change(screen.getByLabelText('IFSC'), { target: { value: 'HDFC0001234' } });
    fireEvent.change(screen.getByLabelText('Bank name'), { target: { value: 'HDFC' } });
    const before = usePanditWalletStore.getState().banks.length;
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText(/do not match/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Confirm account number'), { target: { value: '1111222233334444' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(usePanditWalletStore.getState().banks.length).toBe(before + 1);
  });
});
