import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/permissions';
import { getCompanies } from '@/lib/data/reference';
import { formatCompanyTag } from '@/lib/utils';

export const metadata = { title: 'Companies' };

export default async function CompaniesSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) redirect('/settings');
  const companies = await getCompanies();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Companies" description="Projects belong to exactly one company. Domains map sign-ins to a company." />
      <div className="space-y-3">
        {companies.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center gap-3 pt-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: c.color ?? '#475569' }}>
                {formatCompanyTag(c.key)}
              </span>
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">Sign-in domain mapped to this company</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
