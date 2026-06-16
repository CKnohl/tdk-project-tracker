import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { ProfileForm } from '@/components/settings/profile-form';
import { getCurrentUser } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/permissions';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader title="Profile" description="Your account details and preferences." />
      <Card>
        <CardContent className="pt-6">
          <ProfileForm fullName={user.full_name ?? ''} email={user.email} role={ROLE_LABEL[user.role]} />
        </CardContent>
      </Card>
    </div>
  );
}
