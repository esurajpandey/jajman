import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone } from 'lucide-react';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <div className="flex flex-1 flex-col p-6">
      <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="text-muted">
        <ArrowLeft size={20} />
      </button>
      <h1 className="mt-4 text-xl font-bold">Reset your password</h1>
      <p className="mt-1 text-sm text-muted">We'll send a reset link to your registered mobile.</p>
      <div className="mt-6">
        <TextField label="Mobile number" name="phone" inputMode="numeric" maxLength={10}
          leading={<Phone size={16} />} value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
      </div>
      {sent ? (
        <p className="mt-5 rounded-md bg-success/10 p-3 text-sm text-success">
          Reset link sent (demo). Check your messages.
        </p>
      ) : (
        <Button className="mt-5 w-full" disabled={!/^\d{10}$/.test(phone)} onClick={() => setSent(true)}>
          Send reset link
        </Button>
      )}
      <button type="button" onClick={() => navigate('/auth/login')} className="mt-4 text-center text-sm text-primary">
        Back to login
      </button>
    </div>
  );
}
