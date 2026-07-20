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
  /** false = not in the sidebar — reachable via ⌘K, Settings, and in-app links only. */
  inSidebar?: boolean;
}

// V6.1.3: the sidebar is only the daily surfaces — Dashboard, (Operations Center
// when enabled), My Work, Active Projects, Calendar, Settings. Everything else
// stays a real page but lives off the rail: ⌘K reaches all of it, General Tasks
// is linked from My Work/dashboards, Staff from the dashboard's Office Summary,
// and Activity + Archive have Settings cards.
// (V5.1: Notifications live in the My Work “Inbox” + the topbar bell; the
// /notifications route is a redirect for old bookmarks.)
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  // V6 Phase 0: office-level intake surface, PM/Admin only (rank >= 30) AND gated
  // by the Settings → Operations switch (see visibleNavItems).
  { href: '/operations', label: 'Operations Center', icon: Building2, match: (p) => p.startsWith('/operations'), minRank: 30 },
  { href: '/my-work', label: 'My Work', icon: BriefcaseBusiness, match: (p) => p.startsWith('/my-work') },
  { href: '/projects', label: 'Active Projects', icon: FolderKanban, match: (p) => p.startsWith('/projects') },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/settings', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/settings') },
  // Off-rail destinations (⌘K + in-app links only):
  { href: '/tasks', label: 'General Tasks', icon: ListTodo, match: (p) => p.startsWith('/tasks'), inSidebar: false },
  { href: '/staff', label: 'Staff', icon: Users, match: (p) => p.startsWith('/staff'), inSidebar: false },
  { href: '/activity', label: 'Activity', icon: Activity, match: (p) => p.startsWith('/activity'), minRank: 30, inSidebar: false },
  { href: '/archive', label: 'Archive', icon: Archive, inSidebar: false },
];

export function isActive(item: NavItem, pathname: string) {
  return item.match ? item.match(pathname) : pathname === item.href;
}

/**
 * Nav items visible to a given role rank (see lib/permissions rankOf).
 * The Operations Center is additionally gated by the admin's Settings → Operations
 * switch (`operationsVisible`) — when the office hasn't turned it on, the surface
 * is hidden entirely, even for PM/Admin. Data behind it is kept.
 */
export function visibleNavItems(rank: number, operationsVisible = false): NavItem[] {
  return NAV_ITEMS.filter((item) => (item.minRank ?? 0) <= rank).filter(
    (item) => item.href !== '/operations' || operationsVisible,
  );
}
