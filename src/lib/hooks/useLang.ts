import { useCallback, useSyncExternalStore } from 'react';
import i18n, { getStoredLang, setStoredLang, type Lang } from '@/lib/i18n';

/** Reactive current language backed by i18next + localStorage. */
export function useLang(): [Lang, (l: Lang) => void] {
  const lang = useSyncExternalStore(
    (cb) => {
      i18n.on('languageChanged', cb);
      return () => i18n.off('languageChanged', cb);
    },
    () => getStoredLang(),
    () => 'en' as Lang,
  );
  const set = useCallback((l: Lang) => setStoredLang(l), []);
  return [lang, set];
}
