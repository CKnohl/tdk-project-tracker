'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderKanban, FileText, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { RECENT_KEY, type RecentEntry, type RecentKind } from '@/components/shared/recent-tracker';

// Reads the localStorage "recently viewed" list written by <RecentTracker/> and
// shows the last few projects / reports / staff pages. Renders nothing until
// mounted (avoids hydration mismatch) and nothing when the list is empty.

const COLUMNS: { kind: RecentKind; title: string; icon: typeof FolderKanban }[] = [
  { kind: 'project', title: 'Projects', icon: FolderKanban },
  { kind: 'report', title: 'Reports', icon: FileText },
  { kind: 'staff', title: 'Staff', icon: Users },
];

export function RecentlyViewed() {
  const [entries, setEntries] = useState<RecentEntry[] | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      setEntries(raw ? (JSON.parse(raw) as RecentEntry[]) : []);
    } catch {
      setEntries([]);
    }
  }, []);

  if (!entries || entries.length === 0) return null;

  const cols = COLUMNS.map((c) => ({ ...c, items: entries.filter((e) => e.kind === c.kind).slice(0, 5) })).filter(
    (c) => c.items.length > 0,
  );
  if (cols.length === 0) return null;

  return (
    <Card className="p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recently Viewed</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {cols.map(({ kind, title, icon: Icon, items }) => (
          <div key={kind}>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Icon className="h-3.5 w-3.5" /> {title}
            </div>
            <div className="space-y-0.5">
              {items.map((e) => (
                <Link key={e.id} href={e.href} className="block truncate rounded px-1 py-1 text-sm hover:bg-accent">
                  {e.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
