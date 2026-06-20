import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { OtpInput } from '../../components/ui/OtpInput';
import { Button } from '../../components/ui/Button';
import { useSessionStore, MOCK_OTP } from '../../store/sessionStore';

export function OtpScreen() {
  const navigate = useNavigate();
  const pendingPhone = useSessionStore((s) => s.pendingPhone);
  const verifyOtp = useSessionStore((s) => s.verifyOtp);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (verifyOtp(code)) navigate('/auth/role', { replace: true });
    else setError('Incorrect code. Try the demo code below.');
  };

  return (
    <div className="flex flex-1 flex-col p-6">
      <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="text-muted">
        <ArrowLeft size={20} />
      </button>
      <h1 className="mt-4 text-xl font-bold">Verify your number</h1>
      <p className="mt-1 text-sm text-muted">
        Enter the 6-digit code sent to {pendingPhone ?? 'your phone'}.
      </p>

      <div className="mt-6">
        <OtpInput value={code} onChange={(v) => { setCode(v); setError(''); }} />
        {error && <p className="mt-2 text-xs text-error">{error}</p>}
      </div>

      <div className="mt-3 rounded-md bg-surface-2 p-3 text-xs text-muted">
        Demo: use code <span className="font-semibold text-text">{MOCK_OTP}</span> (no real SMS is sent).
      </div>

      <Button className="mt-5 w-full" disabled={code.length !== 6} onClick={submit}>
        Verify & continue
      </Button>
      <button type="button" className="mt-4 text-center text-sm text-muted">Resend code</button>
    </div>
  );
}
