import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore';

/** §0.6 — gated pandit tabs require an approved pandit; pending/rejected redirect to the gating screen. */
export function RequirePanditApproved({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.panditStatus);
  if (status === 'approved') return <>{children}</>;
  if (status === 'rejected') return <Navigate to="/pandit/rejected" replace />;
  return <Navigate to="/pandit/pending-approval" replace />;
}
