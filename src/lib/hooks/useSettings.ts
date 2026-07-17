import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SchoolSettings } from '@/lib/types';

/** The single public settings row. Cached aggressively; it changes rarely. */
export function useSettings() {
  return useQuery({
    queryKey: ['school_settings'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SchoolSettings | null> => {
      const { data, error } = await supabase.from('school_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return (data as SchoolSettings) ?? null;
    },
  });
}
