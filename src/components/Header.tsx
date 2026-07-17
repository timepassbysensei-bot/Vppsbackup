import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X, GraduationCap, LogIn } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useSettings } from '@/lib/hooks/useSettings';
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
  const { data: settings } = useSettings();

  const nameEn = settings?.name_en ?? 'View Point Public School';
  const nameHi = settings?.name_hi ?? null;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `min-h-touch inline-flex items-center rounded px-3 py-2 text-sm font-medium ${
      isActive ? 'text-navy underline underline-offset-4' : 'text-text/80 hover:text-navy'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="container-page flex items-center justify-between gap-4 py-3">
        <Link to="/" className="flex items-center gap-2" aria-label={nameEn}>
          <GraduationCap className="h-8 w-8 text-navy" aria-hidden />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-navy sm:text-base">{nameEn}</span>
            {nameHi && (
              <span lang="hi" className="text-xs text-text/70">
                {nameHi}
              </span>
            )}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <Link to="/admin/login" className="btn-secondary">
            <LogIn className="h-4 w-4" aria-hidden />
            {t('nav.teacherLogin')}
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher />
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="btn-secondary min-h-touch min-w-touch"
                aria-label={t('common.menu')}
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
              {/* Radix Dialog gives us focus trap, Escape-to-close, scroll lock. */}
              <Dialog.Content
                className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] overflow-y-auto bg-white p-4 shadow-xl"
                aria-label="Primary"
              >
                <div className="mb-4 flex items-center justify-between">
                  <Dialog.Title className="text-base font-semibold text-navy">
                    {t('common.menu')}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button type="button" className="btn-secondary min-h-touch min-w-touch" aria-label={t('common.close')}>
                      <X className="h-5 w-5" aria-hidden />
                    </button>
                  </Dialog.Close>
                </div>
                <nav className="flex flex-col gap-1" aria-label="Mobile">
                  {NAV.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setOpen(false)}
                      className={linkClass}
                      lang={lang}
                    >
                      {t(item.key)}
                    </NavLink>
                  ))}
                  <Link to="/admin/login" onClick={() => setOpen(false)} className="btn-secondary mt-3">
                    <LogIn className="h-4 w-4" aria-hidden />
                    {t('nav.teacherLogin')}
                  </Link>
                </nav>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
