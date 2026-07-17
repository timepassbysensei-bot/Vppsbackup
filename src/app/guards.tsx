import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

function FullScreenLoading() {
  return (
    <div className="grid min-h-screen place-items-center text-text/60" role="status" aria-live="polite">
      Loading…
    </div>
  );
}

/**
 * Requires an approved staff session. Route guarding here is UX only — every
 * data read/write is independently enforced by RLS and Functions, so a user who
 * bypasses this guard still sees nothing they aren't authorized for.
 */
export function RequireApproved({ children }: { children: ReactNode }) {
  const { loading, session, status } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoading />;
  if (!session) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  if (status !== 'approved') return <Navigate to="/admin/pending" replace />;
  return <>{children}</>;
}

/** Requires an approved principal. Falls back to the teacher dashboard. */
export function RequirePrincipal({ children }: { children: ReactNode }) {
  const { loading, session, status, role } = useAuth();

  if (loading) return <FullScreenLoading />;
  if (!session) return <Navigate to="/admin/login" replace />;
  if (status !== 'approved') return <Navigate to="/admin/pending" replace />;
  if (role !== 'principal') return <Navigate to="/admin/teacher" replace />;
  return <>{children}</>;
}
