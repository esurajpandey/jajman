import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Wallet, ArrowDownToLine, ListOrdered } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { Card } from '../../components/ui/Card';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { KpiCard } from '../../components/pandit/KpiCard';
import { MiniBarChart } from '../../components/pandit/MiniBarChart';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { useDataStore } from '../../store/dataStore';
import { walletSummary, earningsSeries, transactionsFrom, settlementFor } from '../../domain/earnings';

type Range = 'week' | 'month' | 'year';

export function EarningsScreen() {
  const navigate = useNavigate();
  const nowISO = new Date().toISOString();
  const [range, setRange] = useState<Range>('month');
  const bookings = usePanditBookingStore(useShallow((s) => s.bookings));
  const withdrawals = usePanditWalletStore(useShallow((s) => s.withdrawals));
  const getPuja = useDataStore((s) => s.getPuja);

  const summary = walletSummary(bookings, withdrawals);
  const series = earningsSeries(bookings, range, nowISO);
  const periodTotal = series.reduce((sum, b) => sum + b.value, 0);
  const grossTotal = bookings.reduce((sum, b) => (settlementFor(b).status === 'settled' ? sum + settlementFor(b).gross : sum), 0);
  const commissionTotal = grossTotal - summary.total;
  const recent = transactionsFrom(bookings, withdrawals).filter((t) => t.type === 'earning').slice(0, 4);

  return (
    <>
      <AppBar title="Earnings" />
      <div className="flex-1 overflow-y-auto p-4">
        <SegmentedControl<Range> segments={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} value={range} onChange={setRange} />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <KpiCard label="Total earnings" value={`₹${summary.total.toLocaleString('en-IN')}`} />
          <KpiCard label="This period" value={`₹${periodTotal.toLocaleString('en-IN')}`} />
          <KpiCard label="Completed pujas" value={`${summary.completedCount}`} />
          <KpiCard label="Avg per puja" value={`₹${summary.avgPerPuja.toLocaleString('en-IN')}`} />
        </div>

        <Card className="mt-4 p-3">
          <p className="mb-2 text-sm font-medium">Earnings ({range})</p>
          <MiniBarChart data={series} />
        </Card>

        <Card className="mt-4 p-3 text-sm">
          <div className="flex justify-between py-0.5"><span className="text-muted">Gross</span><span>₹{grossTotal.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between py-0.5"><span className="text-muted">Commission</span><span>−₹{commissionTotal.toLocaleString('en-IN')}</span></div>
          <div className="mt-1 flex justify-between border-t border-border py-1 font-semibold"><span>Net</span><span>₹{summary.total.toLocaleString('en-IN')}</span></div>
        </Card>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Card onClick={() => navigate('/pandit/wallet')} className="flex cursor-pointer flex-col items-center gap-1 p-3 text-center"><Wallet size={18} className="text-primary" /><span className="text-xs">Wallet</span></Card>
          <Card onClick={() => navigate('/pandit/wallet/withdraw')} className="flex cursor-pointer flex-col items-center gap-1 p-3 text-center"><ArrowDownToLine size={18} className="text-primary" /><span className="text-xs">Withdraw</span></Card>
          <Card onClick={() => navigate('/pandit/wallet/transactions')} className="flex cursor-pointer flex-col items-center gap-1 p-3 text-center"><ListOrdered size={18} className="text-primary" /><span className="text-xs">Transactions</span></Card>
        </div>

        <h2 className="mb-2 mt-5 text-sm font-semibold">Recent earnings</h2>
        {recent.length === 0 ? (
          <p className="rounded-md bg-surface-2 p-3 text-sm text-muted">No earnings yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-sm">
                <span className="truncate">{getPuja(bookings.find((b) => b.id === t.bookingId)?.pujaId ?? '')?.name ?? 'Puja'}</span>
                <span className="font-medium text-success">+₹{t.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
