import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/lib/hooks/useLang';
import { pickLocalized } from '@/lib/i18n';
import { PageTitle, Section, Loading, EmptyState } from '@/components/ui/primitives';

/** Public resources only (is_public + is_published). Files live in a public bucket. */
export function ResourcesPage() {
  const { t } = useTranslation();
  const [lang] = useLang();

  const { data, isLoading } = useQuery({
    queryKey: ['resources-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('is_published', true)
        .eq('is_public', true)
        .order('category');
      if (error) throw error;
      return data ?? [];
    },
  });

  function publicUrl(path: string | null): string | null {
    if (!path) return null;
    return supabase.storage.from('resources-public').getPublicUrl(path).data.publicUrl;
  }

  return (
    <>
      <PageTitle title={t('nav.resources')} />
      <Section>
        {isLoading ? (
          <Loading />
        ) : !data || data.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="grid gap-3">
            {data.map((r) => {
              const title = pickLocalized(lang, r.title_en, r.title_hi);
              const desc = pickLocalized(lang, r.desc_en, r.desc_hi);
              const url = publicUrl(r.file_path);
              return (
                <li key={r.id} className="card flex items-center justify-between gap-4 p-4">
                  <div>
                    <span className="rounded bg-surface px-2 py-0.5 text-xs text-navy">{r.category}</span>
                    <h2 lang={lang} className="mt-1 font-semibold">
                      {title.text}
                    </h2>
                    {desc.text && <p className="text-sm text-text/70">{desc.text}</p>}
                  </div>
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer noopener" className="btn-secondary shrink-0">
                      <Download className="h-4 w-4" aria-hidden />
                      {t('common.readMore')}
                    </a>
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
