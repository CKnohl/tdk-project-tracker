import { createClient } from '@/lib/supabase/server';
import type { StaffWorkloadRow } from '@/types/database.types';

export async function getStaffWithWorkload(): Promise<StaffWorkloadRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('v_staff_workload').select('*').order('full_name');
  return data ?? [];
}

export interface StaffMember {
  id: string;
  full_name: string;
  initials: string | null;
  email: string | null;
  user_id: string | null;
}

export async function getStaffMember(id: string): Promise<StaffMember | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('staff')
    .select('id, full_name, initials, email, user_id')
    .eq('id', id)
    .maybeSingle();
  return data;
}
