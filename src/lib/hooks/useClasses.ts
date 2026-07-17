import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ClassRow {
  id: string;
  name: string;
  requires_section: boolean;
  sort_order: number;
  sections: { id: string; name: string }[];
}

/** Classes with their sections, ordered. Nursery has requires_section = false. */
export function useClasses() {
  return useQuery({
    queryKey: ['classes-with-sections'],
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<ClassRow[]> => {
      const [{ data: classes, error: cErr }, { data: sections, error: sErr }] = await Promise.all([
        supabase.from('classes').select('id,name,requires_section,sort_order').order('sort_order'),
        supabase.from('sections').select('id,name,class_id'),
      ]);
      if (cErr) throw cErr;
      if (sErr) throw sErr;
      return (classes ?? []).map((c) => ({
        ...c,
        sections: (sections ?? [])
          .filter((s) => s.class_id === c.id)
          .map((s) => ({ id: s.id, name: s.name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));
    },
  });
}
