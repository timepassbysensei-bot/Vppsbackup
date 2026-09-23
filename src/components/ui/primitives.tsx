import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Reveal } from '@/components/motion/Reveal';

/** Small uppercase label used above headings. */
export function Eyebrow({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'navy' | 'light' }) {
  // `amber-700` (not `amber`) keeps small uppercase text at AA contrast on white.
  const color = tone === 'light' ? 'text-amber-300' : tone === 'gold' ? 'text-amber-700' : 'text-navy';
  return (
    <p className={`eyebrow ${color}`}>
      <span className="h-px w-6 bg-amber" aria-hidden />
      {children}
    </p>
  );
}

/** Heading block with an optional eyebrow and supporting text. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = 'dark',
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  tone?: 'dark' | 'light';
  align?: 'left' | 'center';
}) {
  const isLight = tone === 'light';
  return (
    <Reveal className={align === 'center' ? 'text-center' : ''}>
      {eyebrow && (
        <div className={align === 'center' ? 'flex justify-center' : ''}>
          <Eyebrow tone={isLight ? 'light' : 'gold'}>{eyebrow}</Eyebrow>
        </div>
      )}
      <h2 className={`section-title mt-3 ${isLight ? 'text-white' : ''}`}>{title}</h2>
      {description && (
        <p className={`mt-3 max-w-2xl text-text/70 ${isLight ? 'text-white/75' : ''} ${align === 'center' ? 'mx-auto' : ''}`}>
          {description}
        </p>
      )}
    </Reveal>
  );
}

/** Page section wrapper with a heading. Kept backwards-compatible. */
export function Section({
  title,
  eyebrow,
  children,
  id,
  className = '',
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`container-page py-12 sm:py-14 ${className}`}>
      {title && (
        <Reveal className="mb-7">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 className="section-title mt-2">{title}</h2>
          <span className="divider-gold mt-4 block h-1 w-14" aria-hidden />
        </Reveal>
      )}
      {children}
    </section>
  );
}

/** Large gradient page title used at the top of interior pages. */
export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mesh-brand grain relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />
      <div className="orb animate-floaty-slow -right-16 -top-24 h-64 w-64 bg-amber/30" aria-hidden />
      <div className="orb animate-drift -bottom-24 left-1/4 h-56 w-56 bg-sky/30" aria-hidden />
      <div className="container-page relative py-12 sm:py-16">
        <h1 className="text-gradient animate-rise text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-white/80">{subtitle}</p>}
        <span className="divider-gold mt-6 block h-1 w-16" aria-hidden />
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="card p-8 text-center text-muted" role="status">
      {message ?? t('common.empty')}
    </div>
  );
}

export function Loading() {
  const { t } = useTranslation();
  return (
    <div className="card p-8 text-center text-muted" role="status" aria-live="polite">
      {t('common.loading')}
    </div>
  );
}

/** Renders localized text and, when Hindi is missing, an inline notice. */
export function LocalizedNote({ fellBack }: { fellBack: boolean }) {
  const { t } = useTranslation();
  if (!fellBack) return null;
  return <span className="ml-2 rounded bg-surface px-2 py-0.5 text-xs text-muted">{t('common.hiUnavailable')}</span>;
}
