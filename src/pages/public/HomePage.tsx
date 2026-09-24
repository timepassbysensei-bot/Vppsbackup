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
  ArrowRight,
  Clock,
  Sparkles,
  Trophy,
  Quote,
  Cake,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { useSettings } from '@/lib/hooks/useSettings';
import {
  useNotices,
  useUpcomingEvents,
  useActiveTiming,
  useSpotlight,
  useBirthdaysToday,
} from '@/lib/hooks/usePublicData';
import { useLang } from '@/lib/hooks/useLang';
import { pickLocalized } from '@/lib/i18n';
import { Section, SectionHeading, Eyebrow, LocalizedNote } from '@/components/ui/primitives';
import { Reveal, Parallax, useRevealRef } from '@/components/motion/Reveal';
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

const QUICK_LINKS = [
  { to: '/notices', labelKey: 'nav.notices', Icon: Bell, tint: 'from-sky/20 to-sky/5', icon: 'text-sky' },
  { to: '/homework', labelKey: 'nav.homework', Icon: BookOpen, tint: 'from-teal/20 to-teal/5', icon: 'text-teal' },
  { to: '/calendar', labelKey: 'nav.calendar', Icon: CalendarDays, tint: 'from-amber/25 to-amber/5', icon: 'text-amber' },
  { to: '/academics', labelKey: 'nav.academics', Icon: GraduationCap, tint: 'from-navy/15 to-navy/5', icon: 'text-navy' },
] as const;

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

  const stats = [
    s?.established_year ? { key: 'home.statsEstablished', value: String(s.established_year) } : null,
    s?.affiliation ? { key: 'home.statsAffiliation', value: s.affiliation } : null,
    { key: 'home.statsClasses', value: t('home.classesRange') },
    facilities.length > 0 ? { key: 'home.statsFacilities', value: String(facilities.length) } : null,
  ].filter((x): x is { key: string; value: string } => x !== null);

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="mesh-brand grain relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-grid opacity-25" aria-hidden />
        <div className="orb animate-floaty -left-10 top-8 h-72 w-72 bg-sky/30" aria-hidden />
        <div className="orb animate-drift right-0 top-24 h-80 w-80 bg-teal/25" aria-hidden />
        <div className="orb animate-floaty-slow -bottom-16 left-1/3 h-64 w-64 bg-amber/25" aria-hidden />

        <div className="container-page relative grid gap-14 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            <Reveal>
              <span className="glass-dark inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {t('home.eyebrow')}
              </span>
            </Reveal>

            <Reveal delay={1}>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
                <span className="text-gradient">{nameEn}</span>
              </h1>
            </Reveal>

            {s?.name_hi && (
              <Reveal delay={2}>
                <p lang="hi" className="mt-2 text-lg text-white/75">
                  {s.name_hi}
                </p>
              </Reveal>
            )}

            <Reveal delay={2}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
                {s?.tagline ?? t('home.heroLead')}
              </p>
            </Reveal>

            <Reveal delay={3}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/admissions" className="btn-gold px-6 py-3 text-base">
                  {t('nav.admissions')}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link to="/about" className="btn-ghost px-6 py-3 text-base">
                  {t('nav.about')}
                </Link>
              </div>
            </Reveal>

            <Reveal delay={4}>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/70">
                {s?.affiliation && (
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-300" aria-hidden />
                    {s.affiliation}
                  </span>
                )}
                {s?.established_year && (
                  <span className="inline-flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-amber-300" aria-hidden />
                    {t('home.statsEstablished')} {s.established_year}
                  </span>
                )}
                {s?.address && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-300" aria-hidden />
                    {s.address.split(',').slice(-3).join(',').trim()}
                  </span>
                )}
              </div>
            </Reveal>
          </div>

          {/* At-a-glance glass panel */}
          <Reveal variant="right" delay={2}>
            <Parallax speed={0.06}>
              <div className="glass-dark relative rounded-xl p-6 shadow-elevated sm:p-7">
                <span className="orb -right-6 -top-6 h-24 w-24 bg-amber/40" aria-hidden />
                <div className="relative flex items-center gap-2 text-amber-300">
                  <Clock className="h-4 w-4" aria-hidden />
                  <p className="eyebrow">{t('home.currentTimings')}</p>
                </div>

                {timing ? (
                  <div className="relative mt-4 grid gap-3">
                    <div className="rounded-lg bg-white/10 p-4 ring-1 ring-white/15">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                        {t('home.morning')}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {timing.morning_start && timing.morning_end
                          ? `${fmtTime(timing.morning_start)} – ${fmtTime(timing.morning_end)}`
                          : '—'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/10 p-4 ring-1 ring-white/15">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                        {t('home.day')}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {timing.day_start && timing.day_end
                          ? `${fmtTime(timing.day_start)} – ${fmtTime(timing.day_end)}`
                          : '—'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="relative mt-3 text-sm text-white/70">{t('home.heroLead')}</p>
                )}

                <Link
                  to="/calendar"
                  className="relative mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300 transition-colors hover:text-white"
                >
                  {t('nav.calendar')}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </Parallax>
          </Reveal>
        </div>

        {/* Smooth transition into the white body */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-white" aria-hidden />
      </section>

      {/* ================= STAT BAND ================= */}
      {stats.length > 0 && (
        <div className="container-page relative z-10 -mt-10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {stats.map((stat, i) => (
              <Reveal key={stat.key} variant="scale" delay={(i + 1) as 1 | 2 | 3 | 4}>
                <div className="card hover-lift h-full p-5 text-center sm:text-left">
                  <p className="text-2xl font-extrabold text-navy sm:text-3xl">{stat.value}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">{t(stat.key)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      )}

      {/* ================= QUICK LINKS ================= */}
      <Section>
        <SectionHeading eyebrow={t('home.quickLinks')} title={t('home.exploreCta')} />
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {QUICK_LINKS.map(({ to, labelKey, Icon, tint, icon }, i) => (
            <Reveal key={to} delay={(i + 1) as 1 | 2 | 3 | 4}>
              <Link
                to={to}
                className="card hover-lift group flex h-full flex-col gap-4 p-5 sm:p-6"
              >
                <span className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${tint}`}>
                  <Icon className={`h-6 w-6 ${icon}`} aria-hidden />
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-navy">{t(labelKey)}</span>
                  <ArrowRight
                    className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-amber-700"
                    aria-hidden
                  />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ================= NOTICES ================= */}
      {notices && notices.length > 0 && (
        <div className="bg-surface">
          <Section>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow={t('home.stayInformed')} title={t('nav.notices')} />
              <Link
                to="/notices"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy transition-colors hover:text-amber-700"
              >
                {t('home.viewAll')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {notices.map((n, i) => {
                const title = pickLocalized(lang, n.title_en, n.title_hi);
                const summary = pickLocalized(lang, n.summary_en, n.summary_hi);
                return (
                  <NoticeCard
                    key={n.id}
                    index={(i + 1) as 1 | 2 | 3}
                    category={n.category}
                    urgent={n.is_urgent}
                    title={title.text}
                    fellBack={title.fellBack}
                    summary={summary.text}
                    lang={lang}
                  />
                );
              })}
            </ul>
          </Section>
        </div>
      )}

      {/* ================= SPOTLIGHT + BIRTHDAYS ================= */}
      {(spotlight || (birthdays && birthdays.length > 0)) && (
        <Section>
          <div className="grid gap-6 lg:grid-cols-2">
            {spotlight && (
              <Reveal variant="left">
                <div className="card relative h-full overflow-hidden p-7">
                  <span className="orb -right-8 -top-8 h-32 w-32 bg-amber/25" aria-hidden />
                  <div className="relative flex items-center gap-2 text-amber-700">
                    <Trophy className="h-5 w-5" aria-hidden />
                    <p className="eyebrow text-amber-700">{t('home.studentOfMonth')}</p>
                  </div>
                  <p className="relative mt-4 text-2xl font-bold text-navy">{spotlight.display_name}</p>
                  <p className="relative mt-1 text-sm font-medium text-amber-700">{spotlight.award_title}</p>
                  {(() => {
                    const w = pickLocalized(lang, spotlight.writeup_en, spotlight.writeup_hi);
                    return w.text ? (
                      <p lang={lang} className="relative mt-3 leading-relaxed text-text/70">
                        {w.text}
                      </p>
                    ) : null;
                  })()}
                </div>
              </Reveal>
            )}

            {birthdays && birthdays.length > 0 && (
              <Reveal variant="right">
                <div className="card h-full p-7">
                  <div className="flex items-center gap-2 text-teal-700">
                    <Cake className="h-5 w-5" aria-hidden />
                    <p className="eyebrow text-teal-700">{t('home.happyBirthday')}</p>
                  </div>
                  <ul lang={lang} className="mt-4 flex flex-wrap gap-2">
                    {birthdays.map((b, i) => (
                      <li
                        key={`${b.display_name}-${i}`}
                        className="rounded-full bg-gradient-to-r from-teal/15 to-sky/15 px-3.5 py-1.5 text-sm font-medium text-navy ring-1 ring-teal/20"
                      >
                        {(lang === 'hi' && b.greeting_hi ? b.greeting_hi : b.greeting_en) || b.display_name}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )}
          </div>
        </Section>
      )}

      {/* ================= UPCOMING EVENTS ================= */}
      {events && events.length > 0 && (
        <div className="bg-surface">
          <Section>
            <SectionHeading eyebrow={t('nav.calendar')} title={t('home.upcomingEvents')} />
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {events.map((e, i) => (
                <EventRow
                  key={e.id}
                  index={(i + 1) as 1 | 2 | 3 | 4}
                  date={e.start_date}
                  eventType={e.event_type}
                  title={pickLocalized(lang, e.title_en, e.title_hi).text}
                  lang={lang}
                />
              ))}
            </ul>
          </Section>
        </div>
      )}

      {/* ================= FACILITIES ================= */}
      {facilities.length > 0 && (
        <Section>
          <SectionHeading eyebrow={t('home.facilities')} title={t('home.facilitiesTitle')} />
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {facilities.map((f, i) => {
              const Icon = FACILITY_ICONS[f.icon] ?? ShieldCheck;
              return (
                <Reveal key={f.key} variant="scale" delay={((i % 4) + 1) as 1 | 2 | 3 | 4}>
                  <li className="card hover-lift flex h-full items-center gap-3 p-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy/5">
                      <Icon className="h-5 w-5 text-navy" aria-hidden />
                    </span>
                    <span lang={lang} className="text-sm font-medium text-navy">
                      {lang === 'hi' ? f.label_hi : f.label_en}
                    </span>
                  </li>
                </Reveal>
              );
            })}
          </ul>
        </Section>
      )}

      {/* ================= PRINCIPAL'S MESSAGE ================= */}
      <div className="bg-surface">
        <Section>
          <Reveal>
            <div className="card relative overflow-hidden p-8 sm:p-10">
              <Quote className="absolute right-6 top-6 h-16 w-16 text-amber/15" aria-hidden />
              <Eyebrow>{t('home.principalMessage')}</Eyebrow>
              {(() => {
                const msg = pickLocalized(lang, s?.principal_message_en, s?.principal_message_hi);
                return (
                  <p lang={lang} className="mt-4 max-w-3xl text-lg leading-relaxed text-text/80">
                    {msg.text || t('home.principalMessagePlaceholder')}
                  </p>
                );
              })()}
              {s?.principal_name && (
                <p className="mt-5 text-sm font-semibold text-navy">— {s.principal_name}</p>
              )}
            </div>
          </Reveal>
        </Section>
      </div>

      {/* ================= CTA ================= */}
      <Section>
        <Reveal variant="scale">
          <div className="mesh-brand grain relative overflow-hidden rounded-xl p-8 text-center text-white sm:p-12">
            <div className="absolute inset-0 bg-grid opacity-25" aria-hidden />
            <span className="orb -left-10 -top-10 h-48 w-48 bg-amber/30" aria-hidden />
            <span className="orb -bottom-12 -right-8 h-52 w-52 bg-sky/30" aria-hidden />
            <h2 className="relative text-2xl font-extrabold sm:text-3xl">{t('home.ctaTitle')}</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-white/80">{t('home.ctaBody')}</p>
            <div className="relative mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/admissions" className="btn-gold px-6 py-3 text-base">
                {t('nav.admissions')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link to="/contact" className="btn-ghost px-6 py-3 text-base">
                {t('nav.contact')}
              </Link>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function NoticeCard({
  index,
  category,
  urgent,
  title,
  fellBack,
  summary,
  lang,
}: {
  index: 1 | 2 | 3;
  category: string;
  urgent: boolean;
  title: string;
  fellBack: boolean;
  summary: string;
  lang: 'en' | 'hi';
}) {
  const ref = useRevealRef<HTMLLIElement>();
  return (
    <li
      ref={ref}
      className={`card hover-lift flex h-full flex-col p-5 reveal reveal-d${index}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">{category}</span>
        {urgent && (
          <span className="rounded-full bg-danger px-2.5 py-0.5 text-xs font-semibold text-white">
            Urgent
          </span>
        )}
      </div>
      <h3 lang={lang} className="mt-3 font-semibold text-navy">
        {title}
        <LocalizedNote fellBack={fellBack} />
      </h3>
      {summary && <p lang={lang} className="mt-2 text-sm leading-relaxed text-text/70">{summary}</p>}
    </li>
  );
}

function EventRow({
  index,
  date,
  eventType,
  title,
  lang,
}: {
  index: 1 | 2 | 3 | 4;
  date: string;
  eventType: string;
  title: string;
  lang: 'en' | 'hi';
}) {
  const ref = useRevealRef<HTMLLIElement>();
  const [y, m, d] = date.split('-');
  const day = d ?? '';
  const month = m ? new Date(Number(y), Number(m) - 1, 1).toLocaleString('en', { month: 'short' }) : '';
  return (
    <li ref={ref} className={`card hover-lift flex items-center gap-4 p-4 reveal reveal-d${index}`}>
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-navy to-navy-600 text-white">
        <span className="text-center leading-none">
          <span className="block text-lg font-bold">{day}</span>
          <span className="block text-[10px] uppercase tracking-wide text-white/70">{month}</span>
        </span>
      </span>
      <span className="min-w-0">
        <span lang={lang} className="block font-semibold text-navy">
          {title}
        </span>
        <span className="mt-0.5 block text-xs font-medium uppercase tracking-wide text-muted">
          {eventType}
        </span>
      </span>
    </li>
  );
}
