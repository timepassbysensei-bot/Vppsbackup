import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X, GraduationCap, LogIn } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useSettings } from '@/lib/hooks/useSettings';
import { useBrandingUrl } from '@/lib/branding';
import { useLang } from '@/lib/hooks/useLang';

const NAV = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/about', key: 'nav.about' },
  { to: '/academics', key: 'nav.academics' },
  { to: '/notices', key: 'nav.notices' },
  { to: '/homework', key: 'nav.homework' },
  { to: '/achievements', key: 'nav.achievements' },
  { to: '/resources', key: 'nav.resources' },
  { to: '/admissions', key: 'nav.admissions' },
  { to: '/contact', key: 'nav.contact' },
];

export function Header() {
  const { t } = useTranslation();
  const [lang] = useLang();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: settings } = useSettings();
  const logo = useBrandingUrl('logo');

  const nameEn = settings?.name_en ?? 'View Point Public School';
  const nameHi = settings?.name_hi ?? null;

  // Elevate the bar once the hero scrolls under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkClass = 'group relative inline-flex min-h-touch items-center rounded-full px-3 py-2 text-sm font-medium transition-colors';
  const navText = (isActive: boolean) =>
    isActive ? 'text-navy' : 'text-text/70 hover:text-navy';

  const Brand = (
    <Link to="/" className="flex items-center gap-2.5" aria-label={nameEn}>
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-navy-600 to-navy-900 text-white shadow-md">
        {logo ? (
          <img src={logo} alt="" className="h-full w-full object-cover" />
        ) : (
          <GraduationCap className="h-5 w-5" aria-hidden />
        )}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="max-w-[11rem] truncate text-sm font-bold text-navy sm:max-w-none sm:text-base">
          {nameEn}
        </span>
        {nameHi && (
          <span lang="hi" className="max-w-[11rem] truncate text-xs text-text/60 sm:max-w-none">
            {nameHi}
          </span>
        )}
      </span>
    </Link>
  );

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        scrolled
          ? 'border-navy/10 bg-white/85 shadow-[0_10px_30px_-20px_rgba(8,22,40,0.6)] backdrop-blur-xl'
          : 'border-transparent bg-white/60 backdrop-blur-md'
      }`}
    >
      <div className="container-page flex items-center justify-between gap-4 py-3">
        {Brand}

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {({ isActive }) => (
                <>
                  <span className={navText(isActive)}>{t(item.key)}</span>
                  <span
                    aria-hidden
                    className={`absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-amber to-amber-300 transition-transform duration-300 ${
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          <LanguageSwitcher />
          <Link to="/admissions" className="btn-gold px-4 py-2">
            {t('nav.admissions')}
          </Link>
          <Link to="/admin/login" className="btn-secondary px-4 py-2">
            <LogIn className="h-4 w-4" aria-hidden />
            {t('nav.teacherLogin')}
          </Link>
        </div>

        {/* Mobile / tablet menu trigger */}
        <div className="flex items-center gap-2 xl:hidden">
          <LanguageSwitcher />
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="btn-secondary min-h-touch min-w-touch px-3"
                aria-label={t('common.menu')}
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-900/50 backdrop-blur-sm" />
              {/* Radix Dialog gives us focus trap, Escape-to-close, scroll lock. */}
              <Dialog.Content
                className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] overflow-y-auto bg-white p-5 shadow-2xl"
                aria-label="Primary"
              >
                <div className="mb-3 flex items-center justify-between">
                  <Dialog.Title className="text-base font-semibold text-navy">
                    {t('common.menu')}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="btn-secondary min-h-touch min-w-touch px-3"
                      aria-label={t('common.close')}
                    >
                      <X className="h-5 w-5" aria-hidden />
                    </button>
                  </Dialog.Close>
                </div>
                <nav className="flex flex-col gap-0.5" aria-label="Mobile">
                  {NAV.map((item, i) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setOpen(false)}
                      lang={lang}
                      className={({ isActive }) =>
                        `flex min-h-touch items-center rounded-xl px-3 py-2.5 text-base font-medium transition-colors ${
                          isActive ? 'bg-surface text-navy' : 'text-text/80 hover:bg-surface/70 hover:text-navy'
                        } ${i < 6 ? `animate-rise rise-d${i + 1}` : ''}`
                      }
                    >
                      {t(item.key)}
                    </NavLink>
                  ))}
                </nav>
                <div className="mt-4 flex flex-col gap-2">
                  <Link to="/admissions" onClick={() => setOpen(false)} className="btn-gold w-full">
                    {t('nav.admissions')}
                  </Link>
                  <Link to="/admin/login" onClick={() => setOpen(false)} className="btn-secondary w-full">
                    <LogIn className="h-4 w-4" aria-hidden />
                    {t('nav.teacherLogin')}
                  </Link>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
