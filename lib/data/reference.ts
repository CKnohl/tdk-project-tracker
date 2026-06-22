import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { ProjectStatus } from '@/types/database.types';

export interface CompanyOption {
  id: number;
  key: string;
  name: string;
  color: string | null;
}
export interface StaffOption {
  id: string;
  full_name: string;
  initials: string | null;
  email: string | null;
  is_active: boolean;
}
export interface ProjectOption {
  id: string;
  project_number: string;
  name: string;
  status: ProjectStatus;
}

export const getCompanies = cache(async (): Promise<CompanyOption[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from('companies').select('id, key, name, color').order('name');
  return data ?? [];
});

export const getStaffDirectory = cache(async (): Promise<StaffOption[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('staff')
    .select('id, full_name, initials, email, is_active')
    .order('full_name');
  return data ?? [];
});

// Active + on-hold projects, for assignment pickers on the staff workload center.
export const getProjectDirectory = cache(async (): Promise<ProjectOption[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('projects')
    .select('id, project_number, name, status')
    .in('status', ['active', 'on_hold'])
    .order('project_number');
  return data ?? [];
});
