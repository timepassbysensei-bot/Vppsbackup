import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertBar } from '@/components/AlertBar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SenseiWidget } from '@/components/SenseiWidget';

export function PublicLayout() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-navy focus:px-3 focus:py-2 focus:text-white"
      >
        {t('common.skipToContent')}
      </a>
      <AlertBar />
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <SenseiWidget />
    </div>
  );
}
