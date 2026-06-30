'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { CalendarFeedRow } from '@/types/database.types';

export function useCalendarFeed(startISO: string, endISO: string) {
  return useQuery({
    queryKey: ['calendar-feed', startISO, endISO],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('v_calendar_feed')
        .select('*')
        .gte('start_at', startISO)
        .lte('start_at', endISO)
        .order('start_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CalendarFeedRow[];
    },
  });
}

export const EVENT_COLORS: Record<string, string> = {
  deadline: 'bg-red-500',
  submittal: 'bg-violet-500',
  follow_up: 'bg-orange-500',
  meeting: 'bg-sky-500',
  presentation: 'bg-indigo-500',
  town_meeting: 'bg-teal-500',
  inspection: 'bg-yellow-500',
  site_visit: 'bg-emerald-500',
  milestone: 'bg-blue-500',
  custom: 'bg-slate-500',
};
