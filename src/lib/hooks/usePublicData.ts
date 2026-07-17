import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { callFunction } from '@/lib/api';
import type { BirthdayDisplay, CalendarEvent, PublicNotice, Spotlight, TimingSchedule } from '@/lib/types';

export function useNotices(limit = 20) {
  return useQuery({
    queryKey: ['notices', limit],
    queryFn: async (): Promise<PublicNotice[]> => {
      const { data, error } = await supabase
        .from('public_notices')
        .select('*')
        .eq('is_published', true)
        .eq('audience', 'public')
        .eq('is_deleted', false)
        .order('is_pinned', { ascending: false })
        .order('effective_date', { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) throw error;
      return (data as PublicNotice[]) ?? [];
    },
  });
}

export function useUpcomingEvents(limit = 6) {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['events', today, limit],
    queryFn: async (): Promise<CalendarEvent[]> => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('is_published', true)
        .eq('visibility', 'public')
        .gte('start_date', today)
        .order('start_date', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data as CalendarEvent[]) ?? [];
    },
  });
}

export function useActiveTiming() {
  return useQuery({
    queryKey: ['timing-active'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<TimingSchedule | null> => {
      const { data, error } = await supabase
        .from('timing_schedules')
        .select('*')
        .eq('state', 'active')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as TimingSchedule) ?? null;
    },
  });
}

export function useSpotlight() {
  return useQuery({
    queryKey: ['spotlight'],
    queryFn: async (): Promise<Spotlight | null> => {
      const { data, error } = await supabase
        .from('student_spotlights')
        .select('*')
        .eq('is_published', true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Spotlight) ?? null;
    },
  });
}

/**
 * Birthdays are fetched via the birthdays-today Function (service role) so the
 * browser NEVER receives a full DOB — only safe display fields.
 */
export function useBirthdaysToday() {
  return useQuery({
    queryKey: ['birthdays-today'],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<BirthdayDisplay[]> => {
      const res = await callFunction<{ birthdays: BirthdayDisplay[] }>('birthdays-today');
      return res.birthdays ?? [];
    },
  });
}
