import {
  LayoutDashboard,
  BriefcaseBusiness,
  FolderKanban,
  ListTodo,
  CalendarDays,
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

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/my-work', label: 'My Work', icon: BriefcaseBusiness },
  { href: '/projects', label: 'Active Projects', icon: FolderKanban, match: (p) => p.startsWith('/projects') },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/archive', label: 'Archive', icon: Archive },
  { href: '/tasks', label: 'General Tasks', icon: ListTodo, match: (p) => p.startsWith('/tasks') },
  { href: '/staff', label: 'Staff', icon: Users, match: (p) => p.startsWith('/staff') },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/settings') },
];

export function isActive(item: NavItem, pathname: string) {
  return item.match ? item.match(pathname) : pathname === item.href;
}
