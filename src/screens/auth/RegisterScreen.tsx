import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone } from 'lucide-react';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useSessionStore } from '../../store/sessionStore';

export function RegisterScreen() {
  const navigate = useNavigate();
  const setPendingPhone = useSessionStore((s) => s.setPendingPhone);
  const setPendingName = useSessionStore((s) => s.setPendingName);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const valid = name.trim().length > 1 && /^\d{10}$/.test(phone);

  const next = () => {
    if (!valid) return;
    setPendingName(name.trim());
    setPendingPhone(phone);
    navigate('/auth/otp');
  };

  return (
    <div className="flex flex-1 flex-col p-6">
      <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="text-muted">
        <ArrowLeft size={20} />
      </button>
      <h1 className="mt-4 text-xl font-bold">Create your account</h1>
      <div className="mt-6 flex flex-col gap-4">
        <TextField label="Full name" name="name" leading={<User size={16} />}
          value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Mobile number" name="phone" inputMode="numeric" maxLength={10}
          leading={<Phone size={16} />} value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
      </div>
      <Button className="mt-5 w-full" disabled={!valid} onClick={next}>Continue</Button>
      <button type="button" onClick={() => navigate('/auth/login')} className="mt-4 text-center text-sm text-primary">
        I already have an account
      </button>
    </div>
  );
}
