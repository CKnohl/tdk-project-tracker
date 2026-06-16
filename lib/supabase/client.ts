import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/** Browser-side Supabase client (uses the anon/publishable key). */
export function createClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ) as unknown as SupabaseClient<Database>;
}
