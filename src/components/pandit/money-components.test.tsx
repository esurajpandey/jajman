import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MiniBarChart } from './MiniBarChart';
import { BankCard } from './BankCard';
import { TransactionRow } from './TransactionRow';
import { WithdrawalStepper } from './WithdrawalStepper';
import type { BankAccount, WalletTxn } from '../../mock/types';

describe('MiniBarChart', () => {
  it('renders a labelled bar per bucket', () => {
    render(<MiniBarChart data={[{ label: 'May', value: 1000 }, { label: 'Jun', value: 500 }]} />);
    expect(screen.getByText('May')).toBeInTheDocument();
    expect(screen.getByLabelText('Jun: ₹500')).toBeInTheDocument();
  });
});

describe('BankCard', () => {
  const bank: BankAccount = { id: 'bank-1', holderName: 'Ramesh', accountNumberMasked: '••••3421', ifsc: 'HDFC0001234', bankName: 'HDFC Bank', isDefault: true };
  it('shows masked account, Default chip, and fires edit', () => {
    const onEdit = vi.fn();
    render(<BankCard bank={bank} onEdit={onEdit} onDelete={() => {}} />);
    expect(screen.getByText('••••3421')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Edit HDFC Bank'));
    expect(onEdit).toHaveBeenCalled();
  });
});

describe('TransactionRow', () => {
  it('shows a + credit for earnings and a − debit for withdrawals', () => {
    const earn: WalletTxn = { id: 'e', type: 'earning', amount: 1690, note: 'Booking earning', createdAt: '2026-06-09T00:00:00.000Z' };
    const { rerender } = render(<TransactionRow txn={earn} />);
    expect(screen.getByText('+₹1,690')).toBeInTheDocument();
    const wd: WalletTxn = { id: 'w', type: 'withdrawal', amount: -5000, note: 'Withdrawal', createdAt: '2026-05-15T00:00:00.000Z' };
    rerender(<TransactionRow txn={wd} />);
    expect(screen.getByText('−₹5,000')).toBeInTheDocument();
  });
});

describe('WithdrawalStepper', () => {
  it('shows the Failed state', () => {
    render(<WithdrawalStepper status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
  it('shows steps when in progress', () => {
    render(<WithdrawalStepper status="processing" />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });
});
