import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Lock } from 'lucide-react';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useSessionStore } from '../../store/sessionStore';

export function PasswordLoginScreen() {
  const navigate = useNavigate();
  const loginWithPassword = useSessionStore((s) => s.loginWithPassword);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (loginWithPassword(phone, password)) navigate('/app/home', { replace: true });
    else setError('Enter a valid number and a password of at least 4 characters.');
  };

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-xl font-bold">Login with password</h1>
      <div className="mt-6 flex flex-col gap-4">
        <TextField label="Mobile number" name="phone" inputMode="numeric" maxLength={10}
          leading={<Phone size={16} />} value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
        <TextField label="Password" name="password" type="password" leading={<Lock size={16} />}
          value={password} onChange={(e) => setPassword(e.target.value)} error={error || undefined} />
      </div>
      <button type="button" onClick={() => navigate('/auth/forgot')} className="mt-3 self-start text-sm text-primary">
        Forgot password?
      </button>
      <Button className="mt-5 w-full" onClick={submit}>Login</Button>
      <button type="button" onClick={() => navigate('/auth/login')} className="mt-4 text-center text-sm text-primary">
        Use OTP instead
      </button>
    </div>
  );
}
