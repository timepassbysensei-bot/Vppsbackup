import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useClasses } from '@/lib/hooks/useClasses';
import { useLang } from '@/lib/hooks/useLang';
import { pickLocalized } from '@/lib/i18n';
import { PageTitle, Section, Loading, EmptyState } from '@/components/ui/primitives';

/**
 * Homework lookup by class → (section) → date. Nursery requires no section.
 * Server-side RLS also gates visibility to the retention window, so old
 * homework simply returns no rows even if a date is chosen.
 */
export function HomeworkPage() {
  const { t } = useTranslation();
  const [lang] = useLang();
  const { data: classes } = useClasses();
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const selectedClass = useMemo(() => classes?.find((c) => c.id === classId), [classes, classId]);
  const needsSection = selectedClass?.requires_section ?? false;
  const ready = Boolean(classId && date && (!needsSection || sectionId));

  const { data: homework, isLoading } = useQuery({
    queryKey: ['homework', classId, sectionId, date],
    enabled: ready,
    queryFn: async () => {
      let q = supabase
        .from('homework_uploads')
        .select('*')
        .eq('class_id', classId)
        .eq('homework_date', date)
        .eq('is_published', true)
        .eq('is_deleted', false);
      q = needsSection ? q.eq('section_id', sectionId) : q.is('section_id', null);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <>
      <PageTitle title={t('nav.homework')} />
      <Section>
        <div className="card grid gap-3 p-5 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t('form.class')}</span>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId('');
              }}
              className="min-h-touch rounded border border-black/10 px-3 py-2"
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
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="min-h-touch rounded border border-black/10 px-3 py-2"
              >
                <option value="">—</option>
                {selectedClass?.sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-h-touch rounded border border-black/10 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4">
          {!ready ? (
            <EmptyState message="Choose a class and date to view homework." />
          ) : isLoading ? (
            <Loading />
          ) : !homework || homework.length === 0 ? (
            <EmptyState message="No homework found for this selection." />
          ) : (
            <ul className="grid gap-3">
              {homework.map((h) => {
                const notes = pickLocalized(lang, h.notes_en, h.notes_hi);
                return (
                  <li key={h.id} className="card p-4">
                    <p className="text-sm text-text/60">{h.homework_date}</p>
                    {notes.text && (
                      <p lang={lang} className="mt-1 whitespace-pre-line">
                        {notes.text}
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
