import { createClient } from '@/lib/supabase/server';
import type { ActivityItem } from '@/lib/types';

// Firm-wide activity feed over activity_logs (the single owner of "what changed").
// Same select shape the per-project history tab uses, just unscoped and newest-first.
const ACTIVITY_SELECT =
  'id,actor_id,action,entity_type,entity_id,project_id,summary,metadata,created_at,actor:users(id,full_name),project:projects(id,project_number,name)';

export async function getActivityFeed(limit = 150): Promise<ActivityItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('activity_logs')
    .select(ACTIVITY_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<ActivityItem[]>();
  return data ?? [];
}
