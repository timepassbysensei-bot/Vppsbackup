import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import hi from './hi.json';

export type Lang = 'en' | 'hi';
const STORAGE_KEY = 'vpps.lang';

/** Language preference is stored in localStorage ONLY (no cookies, no server). */
export function getStoredLang(): Lang {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  return v === 'hi' ? 'hi' : 'en';
}

export function setStoredLang(lang: Lang): void {
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  void i18n.changeLanguage(lang);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: getStoredLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

document.documentElement.lang = getStoredLang();

export default i18n;

/**
 * Picks the requested language's field, falling back to English. Returns a flag
 * so the UI can show the "Hindi translation not available" note when Hindi was
 * requested but is missing — we NEVER auto-translate silently.
 */
export function pickLocalized(
  lang: Lang,
  enValue: string | null | undefined,
  hiValue: string | null | undefined,
): { text: string; fellBack: boolean } {
  if (lang === 'hi') {
    if (hiValue && hiValue.trim()) return { text: hiValue, fellBack: false };
    return { text: enValue ?? '', fellBack: true };
  }
  return { text: enValue ?? '', fellBack: false };
}
