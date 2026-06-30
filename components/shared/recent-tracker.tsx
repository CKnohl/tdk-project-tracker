'use client';

import { useEffect } from 'react';

// Records "recently viewed" entries in localStorage. The browser owns this list
// (it's personal, ephemeral UI state that references canonical records by id — it
// is NOT a second source of truth). Drop <RecentTracker/> on a detail page; the
// My Work "Recently Viewed" section reads the same key.

export type RecentKind = 'project' | 'report' | 'staff';
export const RECENT_KEY = 'tdk-recent-v1';
const PER_KIND = 5;

export interface RecentEntry {
  kind: RecentKind;
  id: string;
  label: string;
  href: string;
  ts: number;
}

export function RecentTracker({ kind, id, label, href }: { kind: RecentKind; id: string; label: string; href: string }) {
  useEffect(() => {
    if (!id || !label) return;
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const list: RecentEntry[] = raw ? JSON.parse(raw) : [];
      const deduped = list.filter((e) => !(e.kind === kind && e.id === id));
      const next: RecentEntry[] = [{ kind, id, label, href, ts: Date.now() }, ...deduped];
      // Keep at most PER_KIND of each kind (newest first).
      const counts: Record<string, number> = {};
      const capped = next.filter((e) => {
        counts[e.kind] = (counts[e.kind] ?? 0) + 1;
        return counts[e.kind] <= PER_KIND;
      });
      localStorage.setItem(RECENT_KEY, JSON.stringify(capped));
    } catch {
      // localStorage unavailable — recently-viewed is best-effort.
    }
  }, [kind, id, label, href]);

  return null;
}
