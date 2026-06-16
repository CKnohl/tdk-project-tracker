import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { UsersTable } from '@/components/settings/users-table';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Users & Roles' };

export default async function UsersSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) redirect('/settings');

  const supabase = await createClient();
  const [{ data: users }, { data: roles }, { data: staff }] = await Promise.all([
    supabase.from('users').select('id, email, full_name, role_id, is_active, staff_id').order('full_name'),
    supabase.from('roles').select('id, key, name').order('rank', { ascending: false }),
    supabase.from('staff').select('id, full_name').order('full_name'),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Users & Roles" description="Assign roles and link accounts to staff directory entries." />
      <Card>
        <CardContent className="pt-6">
          <UsersTable users={users ?? []} roles={roles ?? []} staff={staff ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
