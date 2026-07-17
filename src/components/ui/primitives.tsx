import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Page section wrapper with a heading. */
export function Section({
  title,
  children,
  id,
}: {
  title?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="container-page py-8">
      {title && <h2 className="mb-4 text-xl font-bold text-navy sm:text-2xl">{title}</h2>}
      {children}
    </section>
  );
}

/** Large page title used at the top of interior pages. */
export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-black/5 bg-surface">
      <div className="container-page py-8">
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-text/70">{subtitle}</p>}
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="card p-8 text-center text-text/60" role="status">
      {message ?? t('common.empty')}
    </div>
  );
}

export function Loading() {
  const { t } = useTranslation();
  return (
    <div className="card p-8 text-center text-text/60" role="status" aria-live="polite">
      {t('common.loading')}
    </div>
  );
}

/** Renders localized text and, when Hindi is missing, an inline notice. */
export function LocalizedNote({ fellBack }: { fellBack: boolean }) {
  const { t } = useTranslation();
  if (!fellBack) return null;
  return <span className="ml-2 rounded bg-surface px-2 py-0.5 text-xs text-text/60">{t('common.hiUnavailable')}</span>;
}
