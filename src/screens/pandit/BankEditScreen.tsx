import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { ToggleRow } from '../../components/ui/ToggleRow';
import { usePanditWalletStore } from '../../store/panditWalletStore';

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function BankEditScreen() {
  const navigate = useNavigate();
  const { bankId } = useParams();
  const existing = usePanditWalletStore((s) => (bankId ? s.banks.find((b) => b.id === bankId) : undefined));
  const addBank = usePanditWalletStore((s) => s.addBank);
  const updateBank = usePanditWalletStore((s) => s.updateBank);

  const [holderName, setHolderName] = useState(existing?.holderName ?? '');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmNumber, setConfirmNumber] = useState('');
  const [ifsc, setIfsc] = useState(existing?.ifsc ?? '');
  const [bankName, setBankName] = useState(existing?.bankName ?? '');
  const [isDefault, setIsDefault] = useState(existing?.isDefault ?? false);
  const [err, setErr] = useState('');

  const save = () => {
    setErr('');
    if (!holderName || !bankName) { setErr('Enter the account holder and bank name.'); return; }
    if (!IFSC_RE.test(ifsc)) { setErr('Enter a valid IFSC (e.g. HDFC0001234).'); return; }
    if (existing) {
      updateBank(existing.id, { holderName, ifsc, bankName, isDefault, ...(accountNumber ? { accountNumber } : {}) });
    } else {
      if (accountNumber.length < 4) { setErr('Enter a valid account number.'); return; }
      if (accountNumber !== confirmNumber) { setErr('Account numbers do not match.'); return; }
      addBank({ holderName, accountNumber, ifsc, bankName, isDefault });
    }
    navigate('/pandit/wallet/banks');
  };

  return (
    <>
      <AppBar title={existing ? 'Edit bank account' : 'Add bank account'} left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          <TextField label="Account holder name" name="holder" value={holderName} onChange={(e) => setHolderName(e.target.value)} />
          {!existing && <TextField label="Account number" name="acct" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />}
          {!existing && <TextField label="Confirm account number" name="acct2" inputMode="numeric" value={confirmNumber} onChange={(e) => setConfirmNumber(e.target.value)} />}
          {existing && <p className="text-xs text-muted">Account on file: {existing.accountNumberMasked}</p>}
          <TextField label="IFSC" name="ifsc" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} />
          <TextField label="Bank name" name="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          <div className="rounded-md border border-border px-3"><ToggleRow label="Set as default" checked={isDefault} onChange={setIsDefault} /></div>
        </div>
        {err && <p className="mt-2 text-xs text-error">{err}</p>}
        <Button className="mt-4 w-full" onClick={save}>Save</Button>
      </div>
    </>
  );
}
