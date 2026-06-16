import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { RoleKey } from '@/lib/permissions';

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: RoleKey;
  role_id: number;
  company_id: number | null;
  staff_id: string | null;
  is_active: boolean;
}

const getRolesMap = cache(async (): Promise<Map<number, RoleKey>> => {
  const supabase = await createClient();

  const { data } = await supabase
    .from('roles')
    .select('id, key');

  const map = new Map<number, RoleKey>();

  (data ?? []).forEach((r) => {
    map.set(r.id, r.key as RoleKey);
  });

  return map;
});

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select(
      'id, email, full_name, avatar_url, role_id, company_id, staff_id, is_active'
    )
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  const roles = await getRolesMap();

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    role: roles.get(profile.role_id) ?? 'read_only',
    role_id: profile.role_id,
    company_id: profile.company_id,
    staff_id: profile.staff_id,
    is_active: profile.is_active,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}