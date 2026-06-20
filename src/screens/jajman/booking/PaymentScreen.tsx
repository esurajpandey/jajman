import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Loader2, Smartphone, CreditCard, Building2, Wallet } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { useBookingStore } from '../../../store/bookingStore';
import { cn } from '../../../lib/cn';

const METHODS = [
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'netbanking', label: 'Net banking', icon: Building2 },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
];

export function PaymentScreen() {
  const navigate = useNavigate();
  const { bookingId = '', kind = 'advance' } = useParams();
  const booking = useBookingStore((s) => s.getBooking(bookingId));
  const payAdvance = useBookingStore((s) => s.payAdvance);
  const payRemaining = useBookingStore((s) => s.payRemaining);
  const [method, setMethod] = useState('upi');
  const [phase, setPhase] = useState<'idle' | 'processing' | 'done'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!booking) return <><AppBar title="Payment" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Booking not found.</div></>;

  const amount = kind === 'remaining' ? booking.remainingAmount : booking.advanceAmount;

  const advancePayable = kind !== 'remaining' && booking.status === 'accepted';
  const remainingPayable = kind === 'remaining' && booking.status === 'completed' && booking.amountPaid < booking.charges.subtotal;
  if (phase === 'idle' && !advancePayable && !remainingPayable) {
    return (
      <>
        <AppBar title="Payment" left={<BackButton />} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm text-muted">This payment isn't due for this booking.</p>
          <Button onClick={() => navigate(`/app/booking/${booking.id}`, { replace: true })}>Back to booking</Button>
        </div>
      </>
    );
  }

  const pay = () => {
    setPhase('processing');
    timerRef.current = setTimeout(() => {
      if (kind === 'remaining') payRemaining(booking.id);
      else payAdvance(booking.id);
      setPhase('done');
    }, 1200);
  };

  if (phase === 'done') {
    return (
      <>
        <AppBar title="Payment" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15"><Check size={36} className="text-success" /></div>
          <h1 className="text-lg font-semibold">Payment successful</h1>
          <p className="text-sm text-muted">₹{amount} paid via {METHODS.find((m) => m.id === method)?.label}.</p>
          <Button className="mt-4 w-full" onClick={() => navigate(`/app/booking/${booking.id}`, { replace: true })}>Done</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <AppBar title={kind === 'remaining' ? 'Pay remaining' : 'Pay advance'} left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-md bg-surface-2 p-4 text-center">
          <p className="text-xs text-muted">Amount</p>
          <p className="text-3xl font-bold">₹{amount}</p>
        </div>
        <h3 className="mb-2 text-sm font-semibold">Payment method</h3>
        <div className="flex flex-col gap-2">
          {METHODS.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.id} type="button" onClick={() => setMethod(m.id)} className={cn('flex items-center gap-3 rounded-md border p-3 text-left', method === m.id ? 'border-primary bg-primary/5' : 'border-border')}>
                <Icon size={18} className="text-primary" />
                <span className="flex-1 text-sm">{m.label}</span>
                {method === m.id && <Check size={16} className="text-primary" />}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">This is a mock payment — no real transaction occurs.</p>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={phase === 'processing'} onClick={pay}>
          {phase === 'processing' ? <><Loader2 size={18} className="animate-spin" /> Processing…</> : `Pay ₹${amount}`}
        </Button>
      </div>
    </>
  );
}
