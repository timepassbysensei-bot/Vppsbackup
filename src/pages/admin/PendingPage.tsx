import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';

export function PendingPage() {
  const { t } = useTranslation();
  const { session, loading, status, role, signOut, refresh } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-text/60">{t('common.loading')}</div>;
  }
  if (!session) return <Navigate to="/admin/login" replace />;
  if (status === 'approved') {
    return <Navigate to={role === 'principal' ? '/admin/principal' : '/admin/teacher'} replace />;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface p-4">
      <div className="card w-full max-w-md p-8 text-center">
        <Clock className="mx-auto h-10 w-10 text-amber" aria-hidden />
        <h1 className="mt-3 text-xl font-bold text-navy">{t('admin.pendingTitle')}</h1>
        <p className="mt-2 text-sm text-text/70">{t('admin.pendingBody')}</p>
        {status === 'rejected' && <p className="mt-2 text-sm text-danger">Your request was not approved.</p>}
        {status === 'suspended' && <p className="mt-2 text-sm text-danger">Your access has been suspended.</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={() => void refresh()} className="btn-secondary">
            Check again
          </button>
          <button type="button" onClick={() => void signOut()} className="btn-primary">
            {t('admin.signOut')}
          </button>
        </div>
      </div>
    </div>
  );
}
