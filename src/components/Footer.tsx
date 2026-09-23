import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, Mail, Phone, MapPin, ArrowUp, GraduationCap } from 'lucide-react';
import { useSettings } from '@/lib/hooks/useSettings';
import { useBrandingUrl } from '@/lib/branding';

/** Footer. Deliberately NO WhatsApp button/number (not provided). */
export function Footer() {
  const { t } = useTranslation();
  const { data: s } = useSettings();
  const logo = useBrandingUrl('logo');
  const name = s?.name_en ?? 'View Point Public School';

  return (
    <footer className="relative mt-20 overflow-hidden bg-navy-900 text-white/80">
      <div
        className="h-1 w-full bg-gradient-to-r from-amber via-amber-300 to-teal"
        aria-hidden
      />
      <div className="grain relative">
        <div className="absolute inset-0 opacity-[0.15] bg-grid" aria-hidden />
        <div className="container-page relative grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 text-white">
              <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15">
                {logo ? <img src={logo} alt="" className="h-full w-full object-cover" /> : <GraduationCap className="h-5 w-5" aria-hidden />}
              </span>
              <span className="font-bold text-white">{name}</span>
            </div>
            {s?.name_hi && (
              <p lang="hi" className="mt-2 text-sm text-white/60">
                {s.name_hi}
              </p>
            )}
            {s?.tagline && <p className="mt-3 text-sm leading-relaxed text-white/70">{s.tagline}</p>}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">
              {t('footer.explore')}
            </h3>
            <nav className="mt-4 flex flex-col gap-2 text-sm" aria-label="Footer">
              {[
                { to: '/about', label: t('nav.about') },
                { to: '/academics', label: t('nav.academics') },
                { to: '/notices', label: t('nav.notices') },
                { to: '/calendar', label: t('nav.calendar') },
                { to: '/achievements', label: t('nav.achievements') },
                { to: '/resources', label: t('nav.resources') },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="w-fit text-white/70 transition-colors hover:text-amber-300">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">
              {t('footer.reachUs')}
            </h3>
            <address className="mt-4 flex flex-col gap-3 text-sm not-italic">
              {s?.address && (
                <span className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                  <span className="text-white/70">{s.address}</span>
                </span>
              )}
              {s?.phone && (
                <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-white/70 transition-colors hover:text-amber-300">
                  <Phone className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                  {s.phone}
                </a>
              )}
              {s?.email && (
                <a href={`mailto:${s.email}`} className="flex items-center gap-2 text-white/70 transition-colors hover:text-amber-300">
                  <Mail className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                  {s.email}
                </a>
              )}
              {s?.office_hours && <span className="text-white/50">{s.office_hours}</span>}
            </address>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">
              {t('footer.connect')}
            </h3>
            <div className="mt-4 flex gap-3">
              {s?.facebook_url && (
                <a
                  href={s.facebook_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Facebook"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition-colors hover:bg-amber hover:text-navy-900"
                >
                  <Facebook className="h-5 w-5" aria-hidden />
                </a>
              )}
              {s?.instagram_url && (
                <a
                  href={s.instagram_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Instagram"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition-colors hover:bg-amber hover:text-navy-900"
                >
                  <Instagram className="h-5 w-5" aria-hidden />
                </a>
              )}
            </div>
            <nav className="mt-4 flex flex-col gap-2 text-sm" aria-label="Legal">
              <Link to="/privacy" className="w-fit text-white/60 transition-colors hover:text-amber-300">
                Privacy
              </Link>
              <Link to="/terms" className="w-fit text-white/60 transition-colors hover:text-amber-300">
                Terms
              </Link>
              <Link to="/accessibility" className="w-fit text-white/60 transition-colors hover:text-amber-300">
                Accessibility
              </Link>
              <Link to="/admin/login" className="w-fit text-white/60 transition-colors hover:text-amber-300">
                {t('nav.teacherLogin')}
              </Link>
            </nav>
          </div>
        </div>

        <div className="relative border-t border-white/10 py-5">
          <div className="container-page flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-xs text-white/50">
              © {new Date().getFullYear()} {name}. {t('contact.feeNote')}
            </p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white/70 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowUp className="h-3.5 w-3.5" aria-hidden />
              {t('common.backToTop')}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
