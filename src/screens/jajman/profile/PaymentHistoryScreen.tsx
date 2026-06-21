import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Receipt } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Card } from '../../../components/ui/Card';
import { useBookingStore } from '../../../store/bookingStore';
import { useDataStore } from '../../../store/dataStore';
import { paymentEntries } from '../../../domain/payments';

const KIND_LABEL = { advance: 'Advance', remaining: 'Remaining', refund: 'Refund' } as const;

export function PaymentHistoryScreen() {
  const navigate = useNavigate();
  const bookings = useBookingStore(useShallow((s) => s.bookings));
  const getPandit = useDataStore((s) => s.getPandit);
  const getPuja = useDataStore((s) => s.getPuja);
  const entries = paymentEntries(bookings);

  return (
    <>
      <AppBar title="Payment History" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Receipt size={36} className="text-muted" />
            <p className="text-sm text-muted">No payments yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((e, i) => {
              const b = bookings.find((x) => x.id === e.bookingId);
              const pandit = b ? getPandit(b.panditId) : undefined;
              const puja = b ? getPuja(b.pujaId) : undefined;
              return (
                <Card
                  key={`${e.bookingId}-${e.kind}-${i}`}
                  onClick={() => navigate(`/app/receipt/${e.bookingId}`)}
                  className="flex cursor-pointer items-center justify-between gap-2 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{puja?.name ?? 'Puja'}</p>
                    <p className="truncate text-xs text-muted">{pandit?.name ?? 'Pandit'} · {KIND_LABEL[e.kind]} · {e.dateISO.slice(0, 10)}</p>
                  </div>
                  <span className={e.kind === 'refund' ? 'shrink-0 font-semibold text-success' : 'shrink-0 font-semibold'}>
                    {e.kind === 'refund' ? '+' : ''}₹{e.amount}
                  </span>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
