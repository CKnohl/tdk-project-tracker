import { PageHeader } from '@/components/shared/page-header';
import { StaffDashboard } from '@/components/staff/staff-dashboard';
import { ScrollRestoration } from '@/components/shared/scroll-restoration';
import { getStaffDashboard } from '@/lib/data/staff';

export const metadata = { title: 'Staff' };

export default async function StaffPage() {
  const cards = await getStaffDashboard();

  return (
    <div className="space-y-5">
      <ScrollRestoration storageKey="tdk-staff-scroll" />
      <PageHeader title="Staff" description="Team workload, leadership, and review load across all active projects." />
      <StaffDashboard cards={cards} />
    </div>
  );
}
