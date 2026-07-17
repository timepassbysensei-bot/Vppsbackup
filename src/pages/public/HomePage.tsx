import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LibraryBig,
  Monitor,
  FlaskConical,
  Trees,
  Bus,
  ShieldCheck,
  Droplets,
  Bell,
  BookOpen,
  CalendarDays,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';
import { useSettings } from '@/lib/hooks/useSettings';
import { useNotices, useUpcomingEvents, useActiveTiming, useSpotlight, useBirthdaysToday } from '@/lib/hooks/usePublicData';
import { useLang } from '@/lib/hooks/useLang';
import { pickLocalized } from '@/lib/i18n';
import { Section, LocalizedNote } from '@/components/ui/primitives';
import type { Facility } from '@/lib/types';

const FACILITY_ICONS: Record<string, LucideIcon> = {
  'library-big': LibraryBig,
  monitor: Monitor,
  'flask-conical': FlaskConical,
  trees: Trees,
  bus: Bus,
  'shield-check': ShieldCheck,
  droplets: Droplets,
};

function fmtTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = Number(h);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h12 = ((hour + 11) % 12) + 1;
  return `${h12}:${m} ${suffix}`;
}

export function HomePage() {
  const { t } = useTranslation();
  const [lang] = useLang();
  const { data: s } = useSettings();
  const { data: notices } = useNotices(3);
  const { data: events } = useUpcomingEvents(4);
  const { data: timing } = useActiveTiming();
  const { data: spotlight } = useSpotlight();
  const { data: birthdays } = useBirthdaysToday();

  const nameEn = s?.name_en ?? 'View Point Public School';
  const facilities = (s?.facilities ?? []) as Facility[];

  return (
    <>
      {/* Hero */}
      <section className="bg-navy text-white">
        <div className="container-page grid gap-6 py-14 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide text-amber">{s?.affiliation ?? 'CBSE'}</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{nameEn}</h1>
            {s?.name_hi && (
              <p lang="hi" className="mt-1 text-lg text-white/80">
                {s.name_hi}
              </p>
            )}
            {s?.tagline && <p className="mt-4 text-lg text-white/90">{s.tagline}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/admissions" className="btn bg-amber text-navy hover:brightness-95">
                {t('nav.admissions')}
              </Link>
              <Link to="/contact" className="btn bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20">
                {t('nav.contact')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <Section title={t('home.quickLinks')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { to: '/notices', label: t('nav.notices'), Icon: Bell },
            { to: '/homework', label: t('nav.homework'), Icon: BookOpen },
            { to: '/calendar', label: t('nav.calendar'), Icon: CalendarDays },
            { to: '/academics', label: t('nav.academics'), Icon: GraduationCap },
          ].map(({ to, label, Icon }) => (
            <Link key={to} to={to} className="card flex flex-col items-center gap-2 p-5 hover:ring-navy/20">
              <Icon className="h-7 w-7 text-navy" aria-hidden />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* Notice preview */}
      {notices && notices.length > 0 && (
        <Section title={t('nav.notices')}>
          <ul className="grid gap-3">
            {notices.map((n) => {
              const title = pickLocalized(lang, n.title_en, n.title_hi);
              const summary = pickLocalized(lang, n.summary_en, n.summary_hi);
              return (
                <li key={n.id} className="card p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-surface px-2 py-0.5 text-xs text-navy">{n.category}</span>
                    {n.is_urgent && <span className="rounded bg-danger px-2 py-0.5 text-xs text-white">Urgent</span>}
                  </div>
                  <h3 lang={lang} className="mt-2 font-semibold">
                    {title.text}
                    <LocalizedNote fellBack={title.fellBack} />
                  </h3>
                  {summary.text && <p className="mt-1 text-sm text-text/70">{summary.text}</p>}
                </li>
              );
            })}
          </ul>
          <Link to="/notices" className="mt-4 inline-block text-sm font-semibold text-navy underline">
            {t('common.readMore')}
          </Link>
        </Section>
      )}

      {/* Current timings (from DB) */}
      {timing && (
        <Section title={t('home.currentTimings')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="card p-5">
              <p className="text-sm font-semibold text-navy">{t('home.morning')}</p>
              <p className="mt-1 text-lg">
                {fmtTime(timing.morning_start)} – {fmtTime(timing.morning_end)}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-sm font-semibold text-navy">{t('home.day')}</p>
              <p className="mt-1 text-lg">
                {fmtTime(timing.day_start)} – {fmtTime(timing.day_end)}
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* Birthday greeting (hidden if none) */}
      {birthdays && birthdays.length > 0 && (
        <Section title="🎉">
          <div className="card border-l-4 border-amber p-5">
            <p className="font-semibold text-navy">{t('home.happyBirthday')}</p>
            <p lang={lang} className="mt-1 text-text/80">
              {birthdays
                .map((b) => (lang === 'hi' && b.greeting_hi ? b.greeting_hi : b.greeting_en) || b.display_name)
                .join(' · ')}
            </p>
          </div>
        </Section>
      )}

      {/* Student of the Month (current only) */}
      {spotlight && (
        <Section title={t('home.studentOfMonth')}>
          <div className="card p-5">
            <p className="text-sm font-semibold text-amber">{spotlight.award_title}</p>
            <p className="mt-1 text-lg font-semibold">{spotlight.display_name}</p>
            {(() => {
              const w = pickLocalized(lang, spotlight.writeup_en, spotlight.writeup_hi);
              return w.text ? (
                <p lang={lang} className="mt-2 text-text/70">
                  {w.text}
                </p>
              ) : null;
            })()}
          </div>
        </Section>
      )}

      {/* Upcoming events */}
      {events && events.length > 0 && (
        <Section title={t('home.upcomingEvents')}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {events.map((e) => {
              const title = pickLocalized(lang, e.title_en, e.title_hi);
              return (
                <li key={e.id} className="card p-4">
                  <p className="text-sm text-text/60">{e.start_date}</p>
                  <p lang={lang} className="font-semibold">
                    {title.text}
                  </p>
                  <span className="text-xs text-navy">{e.event_type}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Facilities */}
      {facilities.length > 0 && (
        <Section title={t('home.facilities')}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {facilities.map((f) => {
              const Icon = FACILITY_ICONS[f.icon] ?? ShieldCheck;
              return (
                <li key={f.key} className="card flex items-center gap-3 p-4">
                  <Icon className="h-6 w-6 text-navy" aria-hidden />
                  <span lang={lang}>{lang === 'hi' ? f.label_hi : f.label_en}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Principal's message (neutral placeholder until provided) */}
      <Section title={t('home.principalMessage')}>
        <div className="card p-5">
          {(() => {
            const msg = pickLocalized(lang, s?.principal_message_en, s?.principal_message_hi);
            return (
              <p lang={lang} className="text-text/80">
                {msg.text || t('home.principalMessagePlaceholder')}
              </p>
            );
          })()}
          {s?.principal_name && <p className="mt-3 text-sm font-semibold text-navy">— {s.principal_name}</p>}
        </div>
      </Section>
    </>
  );
}
