import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useSessionStore } from '../../store/sessionStore';

export function AdminLoginScreen() {
  const navigate = useNavigate();
  const loginAdmin = useSessionStore((s) => s.loginAdmin);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgot, setForgot] = useState(false);

  const submit = () => {
    loginAdmin(); // mock: any non-empty credentials
    navigate('/admin/dashboard', { replace: true });
  };

  return (
    <div className="flex flex-1 flex-col p-6">
      <button type="button" onClick={() => navigate('/auth/login')} aria-label="Back" className="text-muted">
        <ArrowLeft size={20} />
      </button>
      <h1 className="mt-4 text-xl font-bold">Admin console</h1>
      <p className="mt-1 text-sm text-muted">Restricted access.</p>
      <div className="mt-6 flex flex-col gap-4">
        <TextField label="Email" name="email" type="email" leading={<Mail size={16} />}
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" name="password" type="password" leading={<Lock size={16} />}
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button type="button" onClick={() => setForgot(true)} className="mt-3 self-start text-sm text-primary">
        Forgot password?
      </button>
      {forgot && <p className="mt-1 text-xs text-muted">Reset link sent to super-admin (demo).</p>}
      <Button className="mt-5 w-full" disabled={!email || !password} onClick={submit}>Sign in</Button>
    </div>
  );
}
