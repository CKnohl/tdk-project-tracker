'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { getReviewQueue } from '@/lib/data/my-work';
import type { NotificationItem } from '@/lib/types';

// Single source for the live badge/overlay data, polled by the bell and the My Work
// nav badge (one round trip, shared react-query key). RLS scopes notifications to
// the signed-in user; getReviewQueue is already role/lead-scoped.

const NOTIF_SELECT =
  'id,user_id,type,title,body,entity_type,entity_id,project_id,is_read,read_at,created_at,project:projects(id,project_number,name)';

export interface BadgeData {
  unread: number;
  reviews: number;
  recent: NotificationItem[];
}

export async function getBadgeData(): Promise<BadgeData> {
  const user = await getCurrentUser();
  if (!user) return { unread: 0, reviews: 0, recent: [] };

  const supabase = await createClient();
  const [recentRes, unreadRes, reviews] = await Promise.all([
    supabase.from('notifications').select(NOTIF_SELECT).order('created_at', { ascending: false }).limit(20).returns<NotificationItem[]>(),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false),
    getReviewQueue({ role: user.role, staff_id: user.staff_id }),
  ]);

  return {
    unread: unreadRes.count ?? 0,
    reviews: reviews.length,
    recent: recentRes.data ?? [],
  };
}
