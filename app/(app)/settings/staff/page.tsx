import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { StaffManager } from '@/components/settings/staff-manager';
import { getCurrentUser } from '@/lib/auth';
import { canManageProjects } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { getCompanies } from '@/lib/data/reference';

export const metadata = { title: 'Staff Management' };

export default async function StaffSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !canManageProjects(user.role)) redirect('/settings');

  const supabase = await createClient();
  const [{ data: staff }, companies] = await Promise.all([
    supabase.from('staff').select('id, full_name, initials, email, phone, company_id, is_active, user_id').order('full_name'),
    getCompanies(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Staff Management" description="Add, edit, deactivate staff and transfer project ownership." />
      <Card>
        <CardContent className="pt-6">
          <StaffManager staff={staff ?? []} companies={companies} />
        </CardContent>
      </Card>
    </div>
  );
}
