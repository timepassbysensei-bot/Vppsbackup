import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

function FullScreenLoading() {
  return (
    <div className="grid min-h-screen place-items-center text-text/60" role="status" aria-live="polite">
      Loading…
    </div>
  );
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

/**
 * Pure predicate for teacher-dashboard access. Kept separate from the component
 * so it can be unit tested without rendering a router.
 *
 * The PRINCIPAL deliberately passes: supervisory access to every teacher tool is
 * an authorized capability, not a role change. Nothing is stored in localStorage
 * and no re-login is needed. Each write is still re-checked by RLS, where
 * `teacher_owns_class` / `teacher_can` short-circuit to true for `is_principal()`
 * — i.e. a principal manages ALL classes, while an ordinary teacher stays
 * restricted to their own assignments.
 */
export function canOpenTeacherDashboard(
  role: string | null,
  status: string | null,
): boolean {
  return status === 'approved' && (role === 'teacher' || role === 'principal');
}

/**
 * Guards `/admin/teacher` for an approved teacher OR an approved principal.
 * Still UX only — RLS remains the real gate.
 */
export function RequireTeacherAccess({ children }: { children: ReactNode }) {
  const { loading, session, status, role } = useAuth();

  if (loading) return <FullScreenLoading />;
  if (!session) return <Navigate to="/admin/login" replace />;
  if (!canOpenTeacherDashboard(role, status)) return <Navigate to="/admin/pending" replace />;
  return <>{children}</>;
}
