import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';

export function LoginPage() {
  const { t } = useTranslation();
  const { session, loading, status, role, signInWithGoogle } = useAuth();

  useEffect(() => {
    document.title = 'Login — VPPS';
  }, []);

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-text/60">{t('common.loading')}</div>;
  }

  // Signed in already → route to the right place based on status/role.
  if (session) {
    if (status !== 'approved') return <Navigate to="/admin/pending" replace />;
    return <Navigate to={role === 'principal' ? '/admin/principal' : '/admin/teacher'} replace />;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface p-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <h1 className="text-xl font-bold text-navy">{t('admin.login')}</h1>
        <p className="mt-2 text-sm text-text/70">
          Sign in with your school Google account. Access is granted by the principal after approval.
        </p>
        <button type="button" onClick={() => void signInWithGoogle()} className="btn-primary mt-6 w-full">
          <LogIn className="h-4 w-4" aria-hidden />
          {t('admin.loginGoogle')}
        </button>
        <p className="mt-4 text-xs text-text/50">
          Signing in creates a pending account. It cannot access any data until approved — this is enforced by the
          database, not just the interface.
        </p>
      </div>
    </div>
  );
}
