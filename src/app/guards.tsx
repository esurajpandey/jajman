import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore';

/** Redirect to login if not authenticated. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const authed = useSessionStore((s) => s.authed);
  return authed ? <>{children}</> : <Navigate to="/auth/login" replace />;
}

/** Redirect authenticated users away from guest-only (auth) screens. */
export function RequireGuest({ children }: { children: ReactNode }) {
  const authed = useSessionStore((s) => s.authed);
  const isAdmin = useSessionStore((s) => s.isAdmin);
  if (authed) return <Navigate to={isAdmin ? '/admin/dashboard' : '/app/home'} replace />;
  return <>{children}</>;
}
