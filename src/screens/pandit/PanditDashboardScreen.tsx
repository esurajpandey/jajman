import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Star, Wallet, CalendarDays, ChevronRight } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ToggleRow } from '../../components/ui/ToggleRow';
import { useSessionStore } from '../../store/sessionStore';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { useDataStore } from '../../store/dataStore';
import { walletSummary } from '../../domain/earnings';
import { seedPanditStats } from '../../mock/seed';

export function PanditDashboardScreen() {
  const navigate = useNavigate();
  const nowISO = new Date().toISOString();
  const name = useSessionStore((s) => s.user?.name ?? 'Pandit');
  const accepting = useSessionStore((s) => s.acceptingBookings);
  const setAccepting = useSessionStore((s) => s.setAcceptingBookings);
  const requests = usePanditBookingStore(useShallow((s) => s.getRequests(nowISO)));
  const today = usePanditBookingStore(useShallow((s) => s.getToday(nowISO)));
  const getPuja = useDataStore((s) => s.getPuja);
  const allBookings = usePanditBookingStore(useShallow((s) => s.bookings));
  const withdrawals = usePanditWalletStore(useShallow((s) => s.withdrawals));
  const summary = walletSummary(allBookings, withdrawals);

  return (
    <>
      <AppBar title={`Namaste, ${name}`} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-md border border-border bg-surface px-3">
          <ToggleRow label="Accepting bookings" description={accepting ? 'You appear in search and can receive requests' : "Paused — you won't receive new requests"} checked={accepting} onChange={setAccepting} />
        </div>

        <Card onClick={() => navigate('/pandit/requests')} className="mt-4 flex cursor-pointer items-center justify-between p-3">
          <div>
            <p className="text-sm font-medium">Pending requests</p>
            <p className="text-xs text-muted">{requests.length} awaiting your response</p>
          </div>
          <div className="flex items-center gap-2"><Badge className="bg-primary/10 text-primary">{requests.length}</Badge><ChevronRight size={18} className="text-muted" /></div>
        </Card>

        <h2 className="mb-2 mt-5 text-sm font-semibold">Today</h2>
        {today.length === 0 ? (
          <p className="rounded-md bg-surface-2 p-3 text-sm text-muted">No bookings today.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {today.map((b) => (
              <Card key={b.id} className="flex items-center justify-between p-3">
                <div><p className="text-sm font-medium">{getPuja(b.pujaId)?.name ?? 'Puja'}</p><p className="text-xs text-muted">{b.slotLabel} · {b.jajmanName}</p></div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Card onClick={() => navigate('/pandit/earnings')} className="cursor-pointer p-3">
            <Wallet size={18} className="text-primary" />
            <p className="mt-1 text-xs text-muted">Available</p>
            <p className="text-lg font-semibold">₹{summary.available.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-muted">Pending ₹{summary.pending.toLocaleString('en-IN')}</p>
          </Card>
          <Card onClick={() => navigate('/pandit/ratings')} className="cursor-pointer p-3">
            <Star size={18} className="fill-accent text-accent" />
            <p className="mt-1 text-xs text-muted">Rating</p>
            <p className="text-lg font-semibold">{seedPanditStats.ratingAvg.toFixed(1)}</p>
            <p className="text-[11px] text-muted">{seedPanditStats.ratingCount} reviews</p>
          </Card>
        </div>

        <button type="button" onClick={() => navigate('/pandit/calendar')} className="mt-4 flex w-full items-center gap-2 rounded-md border border-border bg-surface px-3 py-3 text-sm">
          <CalendarDays size={18} className="text-muted" /> Manage availability <ChevronRight size={18} className="ml-auto text-muted" />
        </button>
      </div>
    </>
  );
}
