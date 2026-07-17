import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/lib/hooks/useLang';
import { pickLocalized } from '@/lib/i18n';

/**
 * Emergency alert bar. Shows the most recent published notice flagged urgent (or
 * category 'Emergency'). Principal-controlled via the notices table. Hidden when
 * there is nothing urgent, so it never nags visitors.
 */
export function AlertBar() {
  const [lang] = useLang();
  const { data } = useQuery({
    queryKey: ['alert-notice'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('public_notices')
        .select('title_en,title_hi,is_urgent,category,priority')
        .eq('is_published', true)
        .eq('audience', 'public')
        .eq('is_deleted', false)
        .or('is_urgent.eq.true,category.eq.Emergency')
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  if (!data) return null;
  const { text } = pickLocalized(lang, data.title_en, data.title_hi);

  return (
    <div role="alert" className="bg-danger text-white">
      <div className="container-page flex items-center gap-2 py-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        <span lang={lang}>{text}</span>
      </div>
    </div>
  );
}
