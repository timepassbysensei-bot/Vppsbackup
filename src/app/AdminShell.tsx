import { type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, GraduationCap } from 'lucide-react';
import { useAuth } from './AuthProvider';

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation();
  const { role, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-black/5 bg-white">
        <div className="container-page flex items-center justify-between py-3">
          <Link to="/" className="flex items-center gap-2 text-navy">
            <GraduationCap className="h-6 w-6" aria-hidden />
            <span className="font-bold">VPPS Admin</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {role === 'principal' && (
              <>
                <Link to="/admin/principal" className="text-navy hover:underline">
                  {t('admin.principalDashboard')}
                </Link>
                <Link to="/admin/teacher" className="text-navy hover:underline">
                  {t('admin.teacherDashboard')}
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/admin/login');
              }}
              className="btn-secondary"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {t('admin.signOut')}
            </button>
          </div>
        </div>
      </header>
      <main className="container-page flex-1 py-8">
        <h1 className="mb-6 text-2xl font-bold text-navy">{title}</h1>
        {children}
      </main>
    </div>
  );
}
