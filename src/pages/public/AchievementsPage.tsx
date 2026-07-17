import { useTranslation } from 'react-i18next';
import { useSpotlight } from '@/lib/hooks/usePublicData';
import { useLang } from '@/lib/hooks/useLang';
import { pickLocalized } from '@/lib/i18n';
import { PageTitle, Section, EmptyState } from '@/components/ui/primitives';

/**
 * Achievements shows ONLY the current Student of the Month (no public archive),
 * matching the blueprint. Restrained language — no fabricated awards/results.
 */
export function AchievementsPage() {
  const { t } = useTranslation();
  const [lang] = useLang();
  const { data: spotlight } = useSpotlight();

  return (
    <>
      <PageTitle title={t('nav.achievements')} />
      <Section title={t('home.studentOfMonth')}>
        {!spotlight ? (
          <EmptyState />
        ) : (
          <div className="card p-6">
            <p className="text-sm font-semibold text-amber">{spotlight.award_title}</p>
            <p className="mt-1 text-xl font-semibold">{spotlight.display_name}</p>
            {(() => {
              const w = pickLocalized(lang, spotlight.writeup_en, spotlight.writeup_hi);
              return w.text ? (
                <p lang={lang} className="mt-2 text-text/75">
                  {w.text}
                </p>
              ) : null;
            })()}
          </div>
        )}
      </Section>
    </>
  );
}
