import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Plus } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { BankCard } from '../../components/pandit/BankCard';
import { usePanditWalletStore } from '../../store/panditWalletStore';

export function BankAccountsScreen() {
  const navigate = useNavigate();
  const banks = usePanditWalletStore(useShallow((s) => s.banks));
  const removeBank = usePanditWalletStore((s) => s.removeBank);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <>
      <AppBar
        title="Bank accounts"
        left={<BackButton />}
        right={<button type="button" aria-label="Add bank" onClick={() => navigate('/pandit/wallet/banks/new')} className="p-2 text-primary"><Plus size={20} /></button>}
      />
      <div className="flex-1 overflow-y-auto p-4">
        {banks.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No bank accounts — add one to withdraw.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {banks.map((b) => (
              <BankCard key={b.id} bank={b} onEdit={() => navigate(`/pandit/wallet/banks/${b.id}/edit`)} onDelete={() => setConfirmId(b.id)} />
            ))}
          </div>
        )}
      </div>

      <BottomSheet open={!!confirmId} onClose={() => setConfirmId(null)} title="Remove bank account?">
        <p className="text-sm text-muted">This bank account will be removed.</p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setConfirmId(null)}>Cancel</Button>
          <Button className="flex-1" onClick={() => { if (confirmId) removeBank(confirmId); setConfirmId(null); }}>Remove</Button>
        </div>
      </BottomSheet>
    </>
  );
}
