import { useTranslation } from 'react-i18next';
import { useUpcomingEvents } from '@/lib/hooks/usePublicData';
import { useLang } from '@/lib/hooks/useLang';
import { pickLocalized } from '@/lib/i18n';
import { PageTitle, Section, Loading, EmptyState } from '@/components/ui/primitives';

export function CalendarPage() {
  const { t } = useTranslation();
  const [lang] = useLang();
  const { data: events, isLoading } = useUpcomingEvents(50);

  return (
    <>
      <PageTitle title={t('nav.calendar')} />
      <Section>
        {isLoading ? (
          <Loading />
        ) : !events || events.length === 0 ? (
          <EmptyState />
        ) : (
          <ol className="relative border-l border-black/10 pl-6">
            {events.map((e) => {
              const title = pickLocalized(lang, e.title_en, e.title_hi);
              const desc = pickLocalized(lang, e.desc_en, e.desc_hi);
              return (
                <li key={e.id} className="mb-6">
                  <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-amber" aria-hidden />
                  <p className="text-sm text-text/60">
                    {e.start_date}
                    {e.end_date && e.end_date !== e.start_date ? ` – ${e.end_date}` : ''}
                  </p>
                  <h2 lang={lang} className="font-semibold">
                    {title.text}
                  </h2>
                  <span className="text-xs text-navy">{e.event_type}</span>
                  {desc.text && (
                    <p lang={lang} className="mt-1 text-sm text-text/70">
                      {desc.text}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Section>
    </>
  );
}
