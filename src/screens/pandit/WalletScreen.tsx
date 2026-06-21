import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { BalanceHeroCard } from '../../components/pandit/BalanceHeroCard';
import { TransactionRow } from '../../components/pandit/TransactionRow';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { useDataStore } from '../../store/dataStore';
import { walletSummary, transactionsFrom } from '../../domain/earnings';

export function WalletScreen() {
  const navigate = useNavigate();
  const bookings = usePanditBookingStore(useShallow((s) => s.bookings));
  const withdrawals = usePanditWalletStore(useShallow((s) => s.withdrawals));
  const getPuja = useDataStore((s) => s.getPuja);
  const summary = walletSummary(bookings, withdrawals);
  const recent = transactionsFrom(bookings, withdrawals).slice(0, 5);

  return (
    <>
      <AppBar title="Wallet" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <BalanceHeroCard available={summary.available} disabled={summary.available <= 0} onWithdraw={() => navigate('/pandit/wallet/withdraw')} />
        {summary.available <= 0 && <p className="mt-2 text-center text-xs text-muted">No funds available to withdraw yet.</p>}

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-muted">Pending</p><p className="text-sm font-semibold">₹{summary.pending.toLocaleString('en-IN')}</p></div>
          <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-muted">Total</p><p className="text-sm font-semibold">₹{summary.total.toLocaleString('en-IN')}</p></div>
          <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-muted">Withdrawn</p><p className="text-sm font-semibold">₹{summary.withdrawn.toLocaleString('en-IN')}</p></div>
        </div>

        <p className="mt-3 rounded-md bg-surface-2 p-3 text-xs text-muted">Pending balance clears after each booking is completed and settled.</p>

        <div className="mt-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent transactions</h2>
          <button type="button" onClick={() => navigate('/pandit/wallet/transactions')} className="text-xs text-primary">View all</button>
        </div>
        <div className="mt-1 divide-y divide-border">
          {recent.map((t) => (
            <TransactionRow key={t.id} txn={t} pujaName={t.bookingId ? getPuja(bookings.find((b) => b.id === t.bookingId)?.pujaId ?? '')?.name : undefined} />
          ))}
        </div>
      </div>
    </>
  );
}
