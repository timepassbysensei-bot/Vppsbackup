import { useTranslation } from 'react-i18next';
import { useSettings } from '@/lib/hooks/useSettings';
import { useLang } from '@/lib/hooks/useLang';
import { pickLocalized } from '@/lib/i18n';
import { PageTitle, Section } from '@/components/ui/primitives';

export function AboutPage() {
  const { t } = useTranslation();
  const [lang] = useLang();
  const { data: s } = useSettings();

  const about = pickLocalized(lang, s?.about_en, s?.about_hi);
  const mission = pickLocalized(lang, s?.mission_en, s?.mission_hi);
  const vision = pickLocalized(lang, s?.vision_en, s?.vision_hi);

  return (
    <>
      <PageTitle title={t('nav.about')} subtitle={s?.tagline ?? undefined} />
      <Section>
        <div className="grid gap-4 sm:grid-cols-2">
          <dl className="card p-5">
            {s?.established_year && (
              <div className="flex justify-between border-b border-black/5 py-2">
                <dt className="text-text/60">Established</dt>
                <dd className="font-medium">{s.established_year}</dd>
              </div>
            )}
            {s?.principal_name && (
              <div className="flex justify-between border-b border-black/5 py-2">
                <dt className="text-text/60">Principal</dt>
                <dd className="font-medium">{s.principal_name}</dd>
              </div>
            )}
            {s?.affiliation && (
              <div className="flex justify-between border-b border-black/5 py-2">
                <dt className="text-text/60">Affiliation</dt>
                <dd className="font-medium">{s.affiliation}</dd>
              </div>
            )}
            {/* Affiliation number is shown ONLY when present — never a placeholder. */}
            {s?.affiliation_number && (
              <div className="flex justify-between py-2">
                <dt className="text-text/60">Affiliation No.</dt>
                <dd className="font-medium">{s.affiliation_number}</dd>
              </div>
            )}
          </dl>
          <div className="card p-5">
            <p lang={lang} className="text-text/80">
              {about.text || 'Type: Co-educational, Nursery to Class 10, CBSE affiliated.'}
            </p>
          </div>
        </div>

        {(mission.text || vision.text) && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {mission.text && (
              <div className="card p-5">
                <h2 className="font-semibold text-navy">Mission</h2>
                <p lang={lang} className="mt-2 text-text/80">
                  {mission.text}
                </p>
              </div>
            )}
            {vision.text && (
              <div className="card p-5">
                <h2 className="font-semibold text-navy">Vision</h2>
                <p lang={lang} className="mt-2 text-text/80">
                  {vision.text}
                </p>
              </div>
            )}
          </div>
        )}
      </Section>
    </>
  );
}
