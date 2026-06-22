import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { ProfileForm } from '@/components/settings/profile-form';
import { NotificationPreferencesForm } from '@/components/settings/notification-preferences-form';
import { getCurrentUser } from '@/lib/auth';
import { getNotificationPreferences } from '@/lib/data/preferences';
import { ROLE_LABEL } from '@/lib/permissions';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const prefs = await getNotificationPreferences();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader title="Profile" description="Your account details and preferences." />
      <Card>
        <CardContent className="pt-6">
          <ProfileForm fullName={user.full_name ?? ''} email={user.email} role={ROLE_LABEL[user.role]} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationPreferencesForm initial={prefs} />
        </CardContent>
      </Card>
    </div>
  );
}
