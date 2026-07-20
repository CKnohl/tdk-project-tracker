import { Suspense } from 'react';
import { requireUser } from '@/lib/auth';
import { canManageProjects } from '@/lib/permissions';
import { getInterpretationEnabled } from '@/lib/data/settings';
import { AppShell } from '@/components/layout/app-shell';
import { RouteHistoryTracker } from '@/components/shared/route-history';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // The Operations Center surfaces (nav + ⌘K) only when the admin's
  // Settings → Operations switch is on AND the viewer is PM/Admin rank.
  const operationsVisible = canManageProjects(user.role) && (await getInterpretationEnabled());

  return (
    <>
      {/* Records every route into the shared nav back-stack (Application-State Preservation). */}
      <Suspense fallback={null}>
        <RouteHistoryTracker />
      </Suspense>
      <AppShell
        user={{
          full_name: user.full_name,
          email: user.email,
          avatar_url: user.avatar_url,
          role: user.role,
        }}
        operationsVisible={operationsVisible}
      >
        {children}
      </AppShell>
    </>
  );
}
