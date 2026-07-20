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
  appointment: 'bg-pink-500',
  custom: 'bg-slate-500',
};

// Month-grid chip tints — same categories as EVENT_COLORS but as readable
// backgrounds, so the category is visible at a glance (not just a 6px dot).
export const EVENT_TINTS: Record<string, string> = {
  deadline: 'bg-red-500/10 text-red-700 dark:text-red-300',
  submittal: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  follow_up: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  meeting: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  presentation: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  town_meeting: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
  inspection: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  site_visit: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  milestone: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  appointment: 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
  custom: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
};
