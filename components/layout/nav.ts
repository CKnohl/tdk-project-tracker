import {
  LayoutDashboard,
  BriefcaseBusiness,
  Building2,
  FolderKanban,
  ListTodo,
  CalendarDays,
  Activity,
  Archive,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match nested routes (e.g. /projects/123). */
  match?: (pathname: string) => boolean;
  /** Minimum role rank required to see this item (default 0 = everyone). */
  minRank?: number;
}

// V5.1: Notifications live in the My Work “Inbox” (one owner: the notifications
// table) + the topbar bell. The standalone nav entry has been removed; the
// /notifications route is kept only as a redirect to the Inbox for old bookmarks.
// Order follows the daily flow: Office dashboard → personal work → projects →
// schedule → people.
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  // V6 Phase 0: office-level intake surface, PM/Admin only (rank >= 30). Engineers
  // never see it (minRank gates it out of the rendered nav).
  { href: '/operations', label: 'Operations Center', icon: Building2, match: (p) => p.startsWith('/operations'), minRank: 30 },
  { href: '/my-work', label: 'My Work', icon: BriefcaseBusiness, match: (p) => p.startsWith('/my-work') },
  { href: '/projects', label: 'Active Projects', icon: FolderKanban, match: (p) => p.startsWith('/projects') },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/activity', label: 'Activity', icon: Activity, match: (p) => p.startsWith('/activity') },
  { href: '/tasks', label: 'General Tasks', icon: ListTodo, match: (p) => p.startsWith('/tasks') },
  { href: '/staff', label: 'Staff', icon: Users, match: (p) => p.startsWith('/staff') },
  { href: '/archive', label: 'Archive', icon: Archive },
  { href: '/settings', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/settings') },
];

export function isActive(item: NavItem, pathname: string) {
  return item.match ? item.match(pathname) : pathname === item.href;
}

/** Nav items visible to a given role rank (see lib/permissions rankOf). */
export function visibleNavItems(rank: number): NavItem[] {
  return NAV_ITEMS.filter((item) => (item.minRank ?? 0) <= rank);
}
