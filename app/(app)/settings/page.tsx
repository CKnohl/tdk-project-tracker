import Link from 'next/link';
import { UserCog, Users, Building2, IdCard, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin, canManageProjects } from '@/lib/permissions';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const admin = !!user && isAdmin(user.role);
  const manager = !!user && canManageProjects(user.role);

  const items = [
    { href: '/settings/profile', icon: UserCog, title: 'Profile', desc: 'Your name and preferences', show: true },
    { href: '/settings/staff', icon: IdCard, title: 'Staff Management', desc: 'Add, edit, deactivate, transfer ownership', show: manager },
    { href: '/settings/users', icon: Users, title: 'Users & Roles', desc: 'Manage access and roles', show: admin },
    { href: '/settings/companies', icon: Building2, title: 'Companies', desc: 'TDK & M&P configuration', show: admin },
    { href: '/settings/operations', icon: SlidersHorizontal, title: 'Operations', desc: 'Document interpretation and intake options', show: admin },
  ].filter((i) => i.show);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Settings" />
      <div className="space-y-2">
        {items.map((i) => {
          const Icon = i.icon;
          return (
            <Link key={i.href} href={i.href}>
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-accent/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{i.title}</div>
                  <div className="text-sm text-muted-foreground">{i.desc}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
