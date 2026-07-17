import { useTranslation } from 'react-i18next';
import { useNotices } from '@/lib/hooks/usePublicData';
import { useLang } from '@/lib/hooks/useLang';
import { pickLocalized } from '@/lib/i18n';
import { PageTitle, Section, Loading, EmptyState, LocalizedNote } from '@/components/ui/primitives';

export function NoticesPage() {
  const { t } = useTranslation();
  const [lang] = useLang();
  const { data: notices, isLoading } = useNotices(50);

  return (
    <>
      <PageTitle title={t('nav.notices')} />
      <Section>
        {isLoading ? (
          <Loading />
        ) : !notices || notices.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="grid gap-3">
            {notices.map((n) => {
              const title = pickLocalized(lang, n.title_en, n.title_hi);
              const content = pickLocalized(lang, n.content_en ?? n.summary_en, n.content_hi ?? n.summary_hi);
              return (
                <li key={n.id} className="card p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-surface px-2 py-0.5 text-xs text-navy">{n.category}</span>
                    {n.is_pinned && <span className="rounded bg-navy px-2 py-0.5 text-xs text-white">Pinned</span>}
                    {n.is_urgent && <span className="rounded bg-danger px-2 py-0.5 text-xs text-white">Urgent</span>}
                    {n.effective_date && <span className="text-xs text-text/50">{n.effective_date}</span>}
                  </div>
                  <h2 lang={lang} className="mt-2 text-lg font-semibold">
                    {title.text}
                    <LocalizedNote fellBack={title.fellBack} />
                  </h2>
                  {content.text && (
                    <p lang={lang} className="mt-1 whitespace-pre-line text-text/75">
                      {content.text}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
