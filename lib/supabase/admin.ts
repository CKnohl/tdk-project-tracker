import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Service-role client that bypasses RLS. SERVER ONLY.
 * Use exclusively in trusted server contexts (e.g. the cron route).
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
