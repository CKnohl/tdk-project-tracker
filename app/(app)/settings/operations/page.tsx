import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { InterpretationSettings } from '@/components/settings/interpretation-settings';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/permissions';
import { getInterpretationEnabled } from '@/lib/data/settings';
import { interpretKeyConfigured } from '@/lib/intake-interpret';

export const metadata = { title: 'Operations Settings' };

// Admin-only switchboard for the Operations Center's optional capabilities.
// Today that is one thing: document interpretation (off until purchased + enabled).
export default async function OperationsSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) redirect('/settings');
  const enabled = await getInterpretationEnabled();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Operations"
        description="Optional Operations Center capabilities. Everything here is off by default and changes nothing without human approval."
      />
      <InterpretationSettings enabled={enabled} keyConfigured={interpretKeyConfigured()} />
    </div>
  );
}
