import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useSessionStore } from '../../store/sessionStore';

export function LoginScreen() {
  const navigate = useNavigate();
  const setPendingPhone = useSessionStore((s) => s.setPendingPhone);
  const [phone, setPhone] = useState('');
  const valid = /^\d{10}$/.test(phone);

  const sendOtp = () => {
    if (!valid) return;
    setPendingPhone(phone);
    navigate('/auth/otp');
  };

  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="text-3xl" aria-hidden="true">🙏</div>
      <h1 className="mt-3 text-xl font-bold">Login or sign up</h1>
      <p className="mt-1 text-sm text-muted">We'll send a one-time code to your mobile.</p>

      <div className="mt-6">
        <TextField
          label="Mobile number"
          name="mobile"
          inputMode="numeric"
          maxLength={10}
          placeholder="10-digit number"
          leading={<Phone size={16} />}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      <Button className="mt-5 w-full" disabled={!valid} onClick={sendOtp}>
        Send OTP
      </Button>

      <button type="button" onClick={() => navigate('/auth/password')} className="mt-4 text-sm text-primary">
        Use password instead
      </button>

      <div className="mt-auto flex flex-col items-center gap-2 pt-6 text-sm">
        <button type="button" onClick={() => navigate('/auth/register')} className="text-muted">
          New here? <span className="font-medium text-primary">Create an account</span>
        </button>
        <button type="button" onClick={() => navigate('/admin/login')} className="text-xs text-muted underline">
          Admin login
        </button>
      </div>
    </div>
  );
}
