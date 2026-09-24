import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { useLang } from '@/lib/hooks/useLang';

/**
 * Language switcher.
 *
 * Responsive by design: on phones it renders a compact segmented control
 * ("EN | हिन्दी") with the full label exposed through `aria-label`, so it always
 * fits inside the header next to the hamburger, even on 320px-wide devices.
 */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const [lang, setLang] = useLang();

  const option =
    'inline-flex min-h-touch shrink-0 items-center rounded-full px-2 py-1 text-xs font-semibold transition-colors sm:px-2.5 sm:text-sm';

  return (
    <div
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-navy/10 bg-white p-0.5 sm:gap-1 sm:p-1"
      role="group"
      aria-label={t('common.language')}
    >
      <Languages className="ml-1 hidden h-4 w-4 shrink-0 text-navy sm:block" aria-hidden />
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        aria-label={t('common.english')}
        className={`${option} ${lang === 'en' ? 'bg-navy text-white' : 'text-text/70 hover:text-navy'}`}
      >
        <span aria-hidden className="sm:hidden">
          EN
        </span>
        <span aria-hidden className="hidden sm:inline">
          {t('common.english')}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setLang('hi')}
        aria-pressed={lang === 'hi'}
        aria-label={t('common.hindi')}
        lang="hi"
        className={`${option} ${lang === 'hi' ? 'bg-navy text-white' : 'text-text/70 hover:text-navy'}`}
      >
        {t('common.hindi')}
      </button>
    </div>
  );
}
