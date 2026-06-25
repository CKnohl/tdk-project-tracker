import { PageHeader } from '@/components/shared/page-header';
import { StaffDashboard } from '@/components/staff/staff-dashboard';
import { getStaffDashboard } from '@/lib/data/staff';

export const metadata = { title: 'Staff' };

export default async function StaffPage() {
  const cards = await getStaffDashboard();

  return (
    <div className="space-y-5">
      <PageHeader title="Staff" description="Team workload, leadership, and review load across all active projects." />
      <StaffDashboard cards={cards} />
    </div>
  );
}
