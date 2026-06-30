import {
  LayoutDashboard,
  BriefcaseBusiness,
  FolderKanban,
  ListTodo,
  CalendarDays,
  Activity,
  Archive,
  Users,
  Bell,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match nested routes (e.g. /projects/123). */
  match?: (pathname: string) => boolean;
}

// V5: Notifications now live in the My Work “Inbox” (one owner: the notifications
// table) + the topbar bell. The nav entry is kept for ONE transitional release —
// it points at /notifications, which redirects to the Inbox — so rollback is easy.
// Remove it in a later cleanup once the Inbox is proven. Order follows the daily
// flow: Office dashboard → personal work → projects → schedule → people.
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/my-work', label: 'My Work', icon: BriefcaseBusiness, match: (p) => p.startsWith('/my-work') },
  { href: '/projects', label: 'Active Projects', icon: FolderKanban, match: (p) => p.startsWith('/projects') },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/activity', label: 'Activity', icon: Activity, match: (p) => p.startsWith('/activity') },
  { href: '/tasks', label: 'General Tasks', icon: ListTodo, match: (p) => p.startsWith('/tasks') },
  { href: '/staff', label: 'Staff', icon: Users, match: (p) => p.startsWith('/staff') },
  { href: '/archive', label: 'Archive', icon: Archive },
  { href: '/notifications', label: 'Notifications', icon: Bell }, // transitional → redirects to My Work Inbox
  { href: '/settings', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/settings') },
];

export function isActive(item: NavItem, pathname: string) {
  return item.match ? item.match(pathname) : pathname === item.href;
}
