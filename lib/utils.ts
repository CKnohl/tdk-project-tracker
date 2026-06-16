import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isPast,
  parseISO,
} from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  return typeof value === 'string' ? parseISO(value) : value;
}

/** Short date e.g. "Jul 2, 2026". */
export function formatDate(value: string | Date | null | undefined) {
  const d = toDate(value);
  return d ? format(d, 'MMM d, yyyy') : '—';
}

/** Date + time e.g. "Jul 2, 2026 3:30 PM". */
export function formatDateTime(value: string | Date | null | undefined) {
  const d = toDate(value);
  return d ? format(d, 'MMM d, yyyy h:mm a') : '—';
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

export function initialsFromName(name: string | null | undefined) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '??';
}

/** Title-case a snake_case enum value: "engineering_design" -> "Engineering Design". */
export function humanize(value: string | null | undefined) {
  if (!value) return '';
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
