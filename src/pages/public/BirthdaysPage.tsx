import { useTranslation } from 'react-i18next';
import { useBirthdaysToday } from '@/lib/hooks/usePublicData';
import { useLang } from '@/lib/hooks/useLang';
import { PageTitle, Section, EmptyState, Loading } from '@/components/ui/primitives';

/**
 * Birthdays display. Data comes from the birthdays-today Function, which returns
 * ONLY safe display fields — never the DOB, year, or age.
 */
export function BirthdaysPage() {
  const { t } = useTranslation();
  const [lang] = useLang();
  const { data, isLoading } = useBirthdaysToday();

  return (
    <>
      <PageTitle title={t('nav.birthdays')} />
      <Section>
        {isLoading ? (
          <Loading />
        ) : !data || data.length === 0 ? (
          <EmptyState message="No birthdays to celebrate today." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((b, i) => (
              <li key={i} className="card border-l-4 border-amber p-5">
                <p className="font-semibold text-navy">{t('home.happyBirthday')}</p>
                <p className="mt-1 text-lg">{b.display_name}</p>
                {b.class_name && (
                  <p className="text-sm text-text/60">
                    {b.class_name === 'Nursery' ? 'Nursery' : `Class ${b.class_name}`}
                    {b.section_name ? ` ${b.section_name}` : ''}
                  </p>
                )}
                {(() => {
                  const g = lang === 'hi' && b.greeting_hi ? b.greeting_hi : b.greeting_en;
                  return g ? (
                    <p lang={lang} className="mt-2 text-text/75">
                      {g}
                    </p>
                  ) : null;
                })()}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
