import { createClient } from '@/lib/supabase/server';

// Office-wide (scope='global') configuration reads. The `settings` table is the one
// owner of app configuration; this module is its read surface. RLS: every
// authenticated user may read global settings; only admins may write (see
// lib/actions/settings.ts).

export const INTERPRETATION_SETTING_KEY = 'interpretation_enabled';

export async function getGlobalSetting<T>(key: string, fallback: T): Promise<T> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('scope', 'global')
    .eq('key', key)
    .maybeSingle();
  return (data?.value as T | undefined) ?? fallback;
}

/**
 * Whether the office has turned document interpretation ON in Settings.
 * This is the human switch only — interpretation additionally requires the
 * server-side service key (lib/intake-interpret.ts `interpretKeyConfigured`).
 * Defaults to OFF: no document text ever leaves the building unless an admin
 * explicitly enables it after the key is purchased and configured.
 */
export async function getInterpretationEnabled(): Promise<boolean> {
  return getGlobalSetting<boolean>(INTERPRETATION_SETTING_KEY, false);
}
