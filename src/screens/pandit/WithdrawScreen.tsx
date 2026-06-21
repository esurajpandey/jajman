import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { Chip } from '../../components/ui/Chip';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { usePanditWalletStore } from '../../store/panditWalletStore';
import { walletSummary } from '../../domain/earnings';

export function WithdrawScreen() {
  const navigate = useNavigate();
  const bookings = usePanditBookingStore(useShallow((s) => s.bookings));
  const withdrawals = usePanditWalletStore(useShallow((s) => s.withdrawals));
  const banks = usePanditWalletStore(useShallow((s) => s.banks));
  const requestWithdrawal = usePanditWalletStore((s) => s.requestWithdrawal);
  const { available } = walletSummary(bookings, withdrawals);

  const [amount, setAmount] = useState('');
  const [bankId, setBankId] = useState(banks.find((b) => b.isDefault)?.id ?? banks[0]?.id ?? '');
  const [err, setErr] = useState('');

  const n = Number(amount);
  const confirm = () => {
    setErr('');
    if (!bankId) { setErr('Select a bank account.'); return; }
    if (!(n > 0)) { setErr('Enter an amount to withdraw.'); return; }
    if (n > available) { setErr('Amount exceeds your available balance.'); return; }
    const w = requestWithdrawal(n, bankId, new Date().toISOString());
    navigate(`/pandit/wallet/withdraw/${w.id}`);
  };

  return (
    <>
      <AppBar title="Withdraw" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <p className="rounded-md bg-surface-2 p-3 text-sm">Available to withdraw: <span className="font-semibold">₹{available.toLocaleString('en-IN')}</span></p>

        {banks.length === 0 ? (
          <div className="mt-4 rounded-md border border-border p-4 text-center text-sm text-muted">
            Add a bank account to withdraw.
            <Button variant="outline" className="mt-2 w-full" onClick={() => navigate('/pandit/wallet/banks/new')}>+ Add bank account</Button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-end gap-2">
              <TextField label="Amount (₹)" name="amount" type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-sm" />
              <Chip label="Withdraw all" onClick={() => setAmount(String(available))} />
            </div>
            {err && <p className="mt-1 text-xs text-error">{err}</p>}

            <h2 className="mb-2 mt-4 text-sm font-semibold">To bank</h2>
            <div className="flex flex-col gap-2">
              {banks.map((b) => (
                <label key={b.id} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <input type="radio" name="bank" checked={bankId === b.id} onChange={() => setBankId(b.id)} aria-label={b.bankName} />
                  <span>{b.bankName} · {b.accountNumberMasked}</span>
                </label>
              ))}
            </div>

            <p className="mt-3 text-xs text-muted">Withdrawals are processed in 1–2 business days (mock).</p>
            <Button className="mt-4 w-full" disabled={!amount} onClick={confirm}>Confirm withdrawal</Button>
          </>
        )}
      </div>
    </>
  );
}
