import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';

export function ChangePasswordScreen() {
  const navigate = useNavigate();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const mismatch = confirm.length > 0 && next !== confirm;

  return (
    <div className="flex flex-1 flex-col p-6">
      <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="text-muted">
        <ArrowLeft size={20} />
      </button>
      <h1 className="mt-4 text-xl font-bold">Change password</h1>
      <div className="mt-6 flex flex-col gap-4">
        <TextField label="New password" name="new" type="password" leading={<Lock size={16} />}
          value={next} onChange={(e) => setNext(e.target.value)} hint="At least 4 characters" />
        <TextField label="Confirm password" name="confirm" type="password" leading={<Lock size={16} />}
          value={confirm} onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? 'Passwords do not match' : undefined} />
      </div>
      {done && <p className="mt-4 text-sm text-success">Password updated (demo).</p>}
      <Button className="mt-5 w-full" disabled={next.length < 4 || mismatch} onClick={() => setDone(true)}>
        Update password
      </Button>
    </div>
  );
}
