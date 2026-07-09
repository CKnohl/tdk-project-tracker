// Shared navigation-state / origin tracking (V5.1 Application-State Preservation).
//
// The URL is the source of truth for each list's state (filters/sort/search/tab
// live in searchParams; scroll is restored by ScrollRestoration keyed on the full
// URL). This module keeps a small back-STACK of visited URLs in sessionStorage so
// a shared <BackLink/> can return the user to exactly where they came from —
// instead of a hard-coded route — and it survives refresh/deep-link.
//
// Client-only (touches sessionStorage); imported by client components.

const KEY = 'tdk-nav-stack';
const MAX = 30;

export interface NavTarget {
  href: string;
  label: string;
}

// First path segment → friendly label for the Back link.
const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  'my-work': 'My Work',
  projects: 'Projects',
  staff: 'Staff',
  calendar: 'Calendar',
  archive: 'Archive',
  due: 'Priority Items',
  activity: 'Activity',
  tasks: 'General Tasks',
  reports: 'Reports',
  settings: 'Settings',
};

function read(): string[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function write(stack: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(stack.slice(-MAX)));
  } catch {
    /* storage unavailable */
  }
}

const pathnameOf = (url: string) => url.split('?')[0];
const sectionOf = (url: string) => pathnameOf(url).split('/').filter(Boolean)[0] ?? '';

/**
 * Record a visited URL. Behaves like a real back-stack:
 *  - same URL as the top → ignore
 *  - same pathname, different query (a filter change on the same list) → replace
 *    the top, so Back doesn't step through every filter tweak
 *  - a URL already deeper in the stack (a back navigation) → truncate to it
 *  - otherwise → push
 */
export function recordNav(url: string) {
  const stack = read();
  const top = stack[stack.length - 1];
  if (top === url) return;

  if (top && pathnameOf(top) === pathnameOf(url)) {
    stack[stack.length - 1] = url;
  } else {
    const existing = stack.lastIndexOf(url);
    if (existing >= 0) stack.length = existing + 1;
    else stack.push(url);
  }
  write(stack);
}

const labelFor = (url: string) => SECTION_LABELS[sectionOf(url)] ?? 'Back';

/**
 * The most recent visited URL whose pathname differs from the current page — i.e.
 * where the user came from. Robust regardless of whether the current URL has been
 * recorded yet. Falls back (deep-link / fresh load with no history) to `fallback`.
 */
export function getBackTarget(currentUrl: string, fallback: NavTarget): NavTarget {
  const stack = read();
  const curPath = pathnameOf(currentUrl);
  for (let i = stack.length - 1; i >= 0; i--) {
    if (pathnameOf(stack[i]) !== curPath) {
      return { href: stack[i], label: labelFor(stack[i]) };
    }
  }
  return fallback;
}
