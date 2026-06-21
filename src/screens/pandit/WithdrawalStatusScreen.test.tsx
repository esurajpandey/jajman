import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WithdrawalStatusScreen } from './WithdrawalStatusScreen';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { seedPanditBanks, seedPanditWithdrawals } from '../../mock/seed';

beforeEach(() => usePanditWalletStore.setState({ banks: seedPanditBanks, withdrawals: seedPanditWithdrawals }));

function renderAt(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/pandit/wallet/withdraw/${id}`]}>
      <Routes><Route path="/pandit/wallet/withdraw/:withdrawalId" element={<WithdrawalStatusScreen />} /></Routes>
    </MemoryRouter>,
  );
}

describe('WithdrawalStatusScreen', () => {
  it('renders the paid stepper for a settled withdrawal', () => {
    renderAt('wd-1');
    expect(screen.getByText('₹5,000')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });
  it('shows the failure reason and a retry for a failed withdrawal', () => {
    renderAt('wd-2');
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry withdrawal' })).toBeInTheDocument();
  });
});
