import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useClasses } from '@/lib/hooks/useClasses';
import { useLang } from '@/lib/hooks/useLang';
import { pickLocalized } from '@/lib/i18n';
import { PageTitle, Section, Loading, EmptyState } from '@/components/ui/primitives';

export function ClassNoticesPage() {
  const { t } = useTranslation();
  const [lang] = useLang();
  const { data: classes } = useClasses();
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const selectedClass = useMemo(() => classes?.find((c) => c.id === classId), [classes, classId]);
  const needsSection = selectedClass?.requires_section ?? false;
  const ready = Boolean(classId && (!needsSection || sectionId));

  const { data, isLoading } = useQuery({
    queryKey: ['class-notices', classId, sectionId],
    enabled: ready,
    queryFn: async () => {
      let q = supabase
        .from('class_notices')
        .select('*')
        .eq('class_id', classId)
        .eq('is_published', true)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      q = needsSection ? q.eq('section_id', sectionId) : q.is('section_id', null);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <>
      <PageTitle title={t('nav.classNotices')} />
      <Section>
        <div className="card grid gap-3 p-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t('form.class')}</span>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId('');
              }}
              className="input"
            >
              <option value="">—</option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name === 'Nursery' ? 'Nursery' : `Class ${c.name}`}
                </option>
              ))}
            </select>
          </label>
          {needsSection && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{t('form.section')}</span>
              <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="input">
                <option value="">—</option>
                {selectedClass?.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="mt-4">
          {!ready ? (
            <EmptyState message="Choose a class to view its notices." />
          ) : isLoading ? (
            <Loading />
          ) : !data || data.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="grid gap-3">
              {data.map((n) => {
                const title = pickLocalized(lang, n.title_en, n.title_hi);
                const content = pickLocalized(lang, n.content_en, n.content_hi);
                return (
                  <li key={n.id} className="card p-4">
                    <h2 lang={lang} className="font-semibold">
                      {title.text}
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
        </div>
      </Section>
    </>
  );
}
