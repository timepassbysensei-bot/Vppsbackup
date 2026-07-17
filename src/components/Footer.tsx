import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';
import { useSettings } from '@/lib/hooks/useSettings';

/** Footer. Deliberately NO WhatsApp button/number (not provided). */
export function Footer() {
  const { t } = useTranslation();
  const { data: s } = useSettings();

  return (
    <footer className="mt-16 border-t border-black/5 bg-surface">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <h2 className="text-sm font-bold text-navy">{s?.name_en ?? 'View Point Public School'}</h2>
          {s?.name_hi && (
            <p lang="hi" className="text-sm text-text/70">
              {s.name_hi}
            </p>
          )}
          {s?.tagline && <p className="mt-2 text-sm text-text/70">{s.tagline}</p>}
        </div>

        <address className="not-italic text-sm text-text/80">
          {s?.address && (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden />
              <span>{s.address}</span>
            </p>
          )}
          {s?.phone && (
            <p className="mt-2 flex items-center gap-2">
              <Phone className="h-4 w-4 text-navy" aria-hidden />
              <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="hover:text-navy">
                {s.phone}
              </a>
            </p>
          )}
          {s?.email && (
            <p className="mt-2 flex items-center gap-2">
              <Mail className="h-4 w-4 text-navy" aria-hidden />
              <a href={`mailto:${s.email}`} className="hover:text-navy">
                {s.email}
              </a>
            </p>
          )}
          {s?.office_hours && <p className="mt-2 text-text/70">{s.office_hours}</p>}
        </address>

        <div className="text-sm">
          <div className="flex gap-3">
            {s?.facebook_url && (
              <a href={s.facebook_url} target="_blank" rel="noreferrer noopener" aria-label="Facebook" className="text-navy">
                <Facebook className="h-5 w-5" aria-hidden />
              </a>
            )}
            {s?.instagram_url && (
              <a href={s.instagram_url} target="_blank" rel="noreferrer noopener" aria-label="Instagram" className="text-navy">
                <Instagram className="h-5 w-5" aria-hidden />
              </a>
            )}
          </div>
          <nav className="mt-4 flex flex-col gap-1 text-text/70" aria-label="Legal">
            <Link to="/privacy" className="hover:text-navy">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-navy">
              Terms
            </Link>
            <Link to="/accessibility" className="hover:text-navy">
              Accessibility
            </Link>
          </nav>
        </div>
      </div>
      <div className="border-t border-black/5 py-4">
        <p className="container-page text-xs text-text/60">
          © {new Date().getFullYear()} {s?.name_en ?? 'View Point Public School'}. {t('contact.feeNote')}
        </p>
      </div>
    </footer>
  );
}
