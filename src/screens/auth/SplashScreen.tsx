import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../store/sessionStore';
import { useUiStore } from '../../store/uiStore';

export function SplashScreen() {
  const navigate = useNavigate();
  const authed = useSessionStore((s) => s.authed);
  const isAdmin = useSessionStore((s) => s.isAdmin);
  const activeRole = useSessionStore((s) => s.activeRole);
  const languageChosen = useUiStore((s) => s.languageChosen);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!authed) navigate(languageChosen ? '/auth/welcome' : '/auth/language', { replace: true });
      else if (isAdmin) navigate('/admin/dashboard', { replace: true });
      else if (activeRole === 'pandit') navigate('/pandit/dashboard', { replace: true });
      else navigate('/app/home', { replace: true });
    }, 1100);
    return () => clearTimeout(t);
  }, [authed, isAdmin, activeRole, languageChosen, navigate]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-gradient-to-b from-primary/15 to-bg">
      <div className="text-6xl" aria-hidden="true">ॐ</div>
      <h1 className="text-2xl font-bold text-primary">Pandit Seva</h1>
      <p className="text-sm text-muted">Book trusted pandits for every occasion</p>
    </div>
  );
}
