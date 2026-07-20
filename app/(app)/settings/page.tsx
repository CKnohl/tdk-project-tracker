import Link from 'next/link';
import { UserCog, Building2, IdCard, SlidersHorizontal, Activity, Archive, ChevronRight } from 'lucide-react';
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
    // V6.1.1: Users & Roles merged in here — one roster for people, sign-ins, roles.
    { href: '/settings/staff', icon: IdCard, title: 'Staff Management', desc: 'Staff, sign-ins, roles, activation, ownership', show: manager },
    // V6.1.3: off-rail destinations — real pages reached from here (and ⌘K) now
    // that the sidebar carries only the daily surfaces.
    { href: '/activity', icon: Activity, title: 'Activity', desc: 'Firm-wide activity feed, newest first', show: manager },
    { href: '/archive', icon: Archive, title: 'Archive', desc: 'Inactive and completed projects', show: true },
    { href: '/settings/companies', icon: Building2, title: 'Companies', desc: 'TDK & M&P configuration', show: admin },
    { href: '/settings/operations', icon: SlidersHorizontal, title: 'Operations', desc: 'Show/hide the Operations Center and document interpretation', show: admin },
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
