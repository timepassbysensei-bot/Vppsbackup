import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { useLang } from '@/lib/hooks/useLang';

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const [lang, setLang] = useLang();

  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={t('common.language')}>
      <Languages className="h-4 w-4 text-navy" aria-hidden />
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={`min-h-touch rounded px-2 py-1 text-sm ${lang === 'en' ? 'font-semibold text-navy underline' : 'text-text/70'}`}
      >
        {t('common.english')}
      </button>
      <span aria-hidden className="text-text/30">
        /
      </span>
      <button
        type="button"
        onClick={() => setLang('hi')}
        aria-pressed={lang === 'hi'}
        lang="hi"
        className={`min-h-touch rounded px-2 py-1 text-sm ${lang === 'hi' ? 'font-semibold text-navy underline' : 'text-text/70'}`}
      >
        {t('common.hindi')}
      </button>
    </div>
  );
}
