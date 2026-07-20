import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { StaffManager } from '@/components/settings/staff-manager';
import { getCurrentUser } from '@/lib/auth';
import { canManageProjects, isAdmin } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { getCompanies } from '@/lib/data/reference';

export const metadata = { title: 'Staff Management' };

// V6.1.1: the ONE people surface — the old Users & Roles page merged in here.
// Each staff row carries their sign-in (login email, role, enabled) alongside the
// directory entry; sign-in/role controls are admin-only (server-enforced too).
export default async function StaffSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !canManageProjects(user.role)) redirect('/settings');
  const admin = isAdmin(user.role);

  const supabase = await createClient();
  const [{ data: staff, error: staffErr }, { data: users }, { data: roles }, companies] = await Promise.all([
    supabase.from('staff').select('id, full_name, initials, email, phone, company_id, is_active, user_id').order('full_name'),
    supabase.from('users').select('id, email, full_name, role_id, is_active, staff_id').order('full_name'),
    supabase.from('roles').select('id, key, name').order('rank', { ascending: false }),
    getCompanies(),
  ]);
  // Never render an empty roster silently — if this logs "column ... schema cache",
  // the Data API's schema cache is stale after a migration (reload it in Supabase).
  if (staffErr) console.error('[StaffSettingsPage] staff query failed:', staffErr.message);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff Management"
        description="The office roster — staff details, sign-ins, roles, activation, and project ownership in one place."
      />
      <Card>
        <CardContent className="pt-6">
          <StaffManager
            staff={staff ?? []}
            companies={companies}
            users={users ?? []}
            roles={roles ?? []}
            canManageUsers={admin}
          />
        </CardContent>
      </Card>
    </div>
  );
}
