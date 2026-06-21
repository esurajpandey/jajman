import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { TransactionRow } from '../../components/pandit/TransactionRow';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { useDataStore } from '../../store/dataStore';
import { transactionsFrom } from '../../domain/earnings';
import type { TxnType, WalletTxn } from '../../mock/types';

type Filter = 'all' | TxnType;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'earning', label: 'Earnings' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'refund', label: 'Refunds' },
  { value: 'commission', label: 'Commission' },
];

export function TransactionsScreen() {
  const navigate = useNavigate();
  const bookings = usePanditBookingStore(useShallow((s) => s.bookings));
  const withdrawals = usePanditWalletStore(useShallow((s) => s.withdrawals));
  const getPuja = useDataStore((s) => s.getPuja);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<WalletTxn | null>(null);

  const all = transactionsFrom(bookings, withdrawals);
  const txns = filter === 'all' ? all : all.filter((t) => t.type === filter);
  const pujaFor = (t: WalletTxn) => (t.bookingId ? getPuja(bookings.find((b) => b.id === t.bookingId)?.pujaId ?? '')?.name : undefined);

  return (
    <>
      <AppBar title="Transactions" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => <Chip key={f.value} label={f.label} selected={filter === f.value} onClick={() => setFilter(f.value)} />)}
        </div>
        {txns.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No transactions.</p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {txns.map((t) => (
              <button key={t.id} type="button" className="w-full text-left" onClick={() => setSelected(t)}>
                <TransactionRow txn={t} pujaName={pujaFor(t)} />
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title="Transaction">
        {selected && (
          <div className="text-sm">
            <div className="flex justify-between py-1"><span className="text-muted">Type</span><span className="capitalize">{selected.type}</span></div>
            <div className="flex justify-between py-1"><span className="text-muted">Amount</span><span>{selected.amount < 0 ? '−' : selected.amount > 0 ? '+' : ''}₹{Math.abs(selected.amount).toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between py-1"><span className="text-muted">Date</span><span>{selected.createdAt.slice(0, 10)}</span></div>
            <p className="mt-1 text-muted">{selected.note}</p>
            {selected.withdrawalId && (
              <Button variant="outline" className="mt-3 w-full" onClick={() => { const id = selected.withdrawalId!; setSelected(null); navigate(`/pandit/wallet/withdraw/${id}`); }}>View withdrawal</Button>
            )}
          </div>
        )}
      </BottomSheet>
    </>
  );
}
