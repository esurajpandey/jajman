import { Navigate } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore';
import { useUiStore } from '../store/uiStore';

/** Splash target resolver: language → auth → role home. */
export function RootRedirect() {
  const authed = useSessionStore((s) => s.authed);
  const isAdmin = useSessionStore((s) => s.isAdmin);
  const activeRole = useSessionStore((s) => s.activeRole);
  const languageChosen = useUiStore((s) => s.languageChosen);

  if (!authed) return <Navigate to={languageChosen ? '/auth/welcome' : '/auth/language'} replace />;
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
  if (activeRole === 'pandit') return <Navigate to="/pandit/dashboard" replace />;
  return <Navigate to="/app/home" replace />;
}
