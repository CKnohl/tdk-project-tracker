import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isPast,
  parseISO,
} from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// The office runs on Eastern time. Every displayed date/time is rendered in
// America/New_York (DST-aware) via Intl, regardless of the server's timezone
// (Vercel runs UTC) — so there are no surprise UTC offsets in the UI or reports.
const TZ = 'America/New_York';
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_OPTS: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
const TIME_OPTS: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  return typeof value === 'string' ? parseISO(value) : value;
}

function intl(d: Date, opts: Intl.DateTimeFormatOptions, tz: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts }).format(d);
}

/**
 * Short date e.g. "Jul 2, 2026" (Eastern). Date-only values (yyyy-MM-dd, e.g.
 * due/start dates) are floating calendar dates with no instant — pin them to
 * UTC noon so no timezone can shift the day. Timestamps are real instants in ET.
 */
export function formatDate(value: string | Date | null | undefined) {
  if (typeof value === 'string' && DATE_ONLY.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return intl(new Date(Date.UTC(y, m - 1, d, 12)), DATE_OPTS, 'UTC');
  }
  const d = toDate(value);
  return d ? intl(d, DATE_OPTS, TZ) : '—';
}

/** Date + time e.g. "Jul 2, 2026, 3:30 PM" (Eastern). */
export function formatDateTime(value: string | Date | null | undefined) {
  if (typeof value === 'string' && DATE_ONLY.test(value)) return formatDate(value);
  const d = toDate(value);
  if (!d) return '—';
  return `${formatDate(value)}, ${intl(d, TIME_OPTS, TZ)}`;
}

/** Time only e.g. "3:30 PM" (Eastern). */
export function formatTime(value: string | Date | null | undefined) {
  const d = toDate(value);
  return d ? intl(d, TIME_OPTS, TZ) : '';
}

/** "in 3 days" / "2 days ago". */
export function formatRelative(value: string | Date | null | undefined) {
  const d = toDate(value);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '—';
}

/** Human label for a due date with urgency hints. */
export function describeDue(value: string | Date | null | undefined): {
  label: string;
  tone: 'overdue' | 'today' | 'soon' | 'normal' | 'none';
} {
  const d = toDate(value);
  if (!d) return { label: 'No due date', tone: 'none' };
  if (isToday(d)) return { label: 'Due today', tone: 'today' };
  if (isTomorrow(d)) return { label: 'Due tomorrow', tone: 'soon' };
  if (isPast(d)) return { label: `Overdue · ${formatDate(d)}`, tone: 'overdue' };
  return { label: formatDate(d), tone: 'normal' };
}

/**
 * Compact count for a notification/nav badge: exact 1–9, then "9+" once it passes
 * 9 (standard UI convention). Use for the small red/pill badges throughout the app
 * (sidebar, bell, My Work rail) — NOT for canonical figures like the dashboard
 * Priority tiles or Summary counts, which should show the real number.
 */
export function formatBadgeCount(count: number): string {
  return count > 9 ? '9+' : String(count);
}

export function initialsFromName(name: string | null | undefined) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '??';
}

/** Short company tag for badges. "mp" -> "M&P", "tdk" -> "TDK". */
export function formatCompanyTag(key: string | null | undefined) {
  if (!key) return '';
  return key.toLowerCase() === 'mp' ? 'M&P' : key.toUpperCase();
}

/** Title-case a snake_case enum value: "engineering_design" -> "Engineering Design". */
export function humanize(value: string | null | undefined) {
  if (!value) return '';
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
