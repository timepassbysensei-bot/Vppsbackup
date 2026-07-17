import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useActiveTiming } from '@/lib/hooks/usePublicData';
import { PageTitle, Section } from '@/components/ui/primitives';

export function AcademicsPage() {
  const { t } = useTranslation();
  const { data: timing } = useActiveTiming();
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id,name,sort_order').order('sort_order');
      return data ?? [];
    },
  });

  return (
    <>
      <PageTitle
        title={t('nav.academics')}
        subtitle="Co-educational, Nursery to Class 10, following the CBSE curriculum."
      />
      <Section title="Classes offered">
        <ul className="flex flex-wrap gap-2">
          {(classes ?? []).map((c) => (
            <li key={c.id} className="card px-4 py-2 text-sm font-medium text-navy">
              {c.name === 'Nursery' ? 'Nursery' : `Class ${c.name}`}
            </li>
          ))}
        </ul>
      </Section>
      {timing && (
        <Section title={t('home.currentTimings')}>
          <p className="text-text/70">
            School operates two shifts. Please check the homepage for the current active timings, which are managed by
            the school office.
          </p>
        </Section>
      )}
    </>
  );
}
