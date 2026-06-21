import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { WithdrawalStepper } from '../../components/pandit/WithdrawalStepper';
import { usePanditWalletStore } from '../../store/panditWalletStore';

export function WithdrawalStatusScreen() {
  const { withdrawalId = '' } = useParams();
  const navigate = useNavigate();
  const withdrawal = usePanditWalletStore(useShallow((s) => s.withdrawals.find((w) => w.id === withdrawalId)));
  const banks = usePanditWalletStore(useShallow((s) => s.banks));
  const advanceWithdrawal = usePanditWalletStore((s) => s.advanceWithdrawal);
  const retryWithdrawal = usePanditWalletStore((s) => s.retryWithdrawal);

  // Deterministic demo advance: step a non-terminal withdrawal forward (requested→processing→paid).
  useEffect(() => {
    if (withdrawal && (withdrawal.status === 'requested' || withdrawal.status === 'processing')) {
      advanceWithdrawal(withdrawal.id, new Date().toISOString());
    }
  }, [withdrawal?.id, withdrawal?.status, advanceWithdrawal, withdrawal]);

  if (!withdrawal) {
    return (
      <>
        <AppBar title="Withdrawal" left={<BackButton />} />
        <div className="flex-1 p-6 text-sm text-muted">Withdrawal not found.</div>
      </>
    );
  }
  const bank = banks.find((b) => b.id === withdrawal.bankId);

  return (
    <>
      <AppBar title="Withdrawal" left={<BackButton to="/pandit/wallet" />} />
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-2xl font-bold">₹{withdrawal.amount.toLocaleString('en-IN')}</p>
        <p className="text-xs text-muted">To {bank?.bankName ?? 'bank'} · {bank?.accountNumberMasked ?? ''}</p>

        <div className="mt-4"><WithdrawalStepper status={withdrawal.status} /></div>

        {withdrawal.status === 'failed' && (
          <div className="mt-4 rounded-md bg-error/10 p-3 text-sm text-error">
            {withdrawal.failReason ?? 'The withdrawal failed.'}
            <Button variant="outline" className="mt-2 w-full" onClick={() => { const w = retryWithdrawal(withdrawal.id, new Date().toISOString()); navigate(`/pandit/wallet/withdraw/${w.id}`); }}>Retry withdrawal</Button>
          </div>
        )}

        <Button variant="ghost" className="mt-4 w-full" onClick={() => navigate('/pandit/wallet')}>Back to wallet</Button>
      </div>
    </>
  );
}
