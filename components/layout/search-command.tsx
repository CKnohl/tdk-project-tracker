'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, CornerDownLeft, FolderKanban } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { StatusRail } from '@/components/shared/status-rail';
import { projectRailState } from '@/lib/status-rail';
import { createClient } from '@/lib/supabase/client';
import { PROJECT_STATUS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ProjectStatus } from '@/types/database.types';

interface Hit {
  id: string;
  project_number: string;
  name: string;
  status: ProjectStatus;
}

export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => {
    if (!open) { setQ(''); setHits([]); setActive(0); }
  }, [open]);

  React.useEffect(() => {
    const term = q.trim();
    if (!term) { setHits([]); return; }
    const t = setTimeout(async () => {
      const supabase = createClient();
      const clean = term.replace(/[%,()]/g, '');
      const { data } = await supabase
        .from('projects')
        .select('id, project_number, name, status')
        .or(`name.ilike.%${clean}%,project_number.ilike.%${clean}%`)
        .order('last_activity_at', { ascending: false })
        .limit(8);
      setHits((data as Hit[]) ?? []);
      setActive(0);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const go = (hit: Hit) => {
    setOpen(false);
    router.push(`/projects/${hit.id}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="ml-2 hidden rounded border bg-muted px-1.5 text-[10px] sm:inline">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] max-w-xl translate-y-0 gap-0 p-0">
          <DialogTitle className="sr-only">Search projects</DialogTitle>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === 'Enter' && hits[active]) go(hits[active]);
              }}
              placeholder="Search projects by name or number…"
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
            {q && hits.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">No projects found.</p>}
            {!q && <p className="px-2 py-6 text-center text-sm text-muted-foreground">Type to search projects.</p>}
            {hits.map((h, i) => (
              <button
                key={h.id}
                onClick={() => go(h)}
                onMouseEnter={() => setActive(i)}
                className={cn('relative flex w-full items-center justify-between gap-2 rounded-md py-2 pl-4 pr-2 text-left text-sm', i === active && 'bg-accent')}
              >
                <StatusRail state={projectRailState({ status: h.status })} radius="rounded-full" glow={false} className="left-1 top-1.5 h-[calc(100%-0.75rem)] w-1" />
                <span className="flex min-w-0 items-center gap-2">
                  <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">{h.project_number}</span>{' '}
                    <span className="truncate">{h.name}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">{PROJECT_STATUS[h.status].label}</span>
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
