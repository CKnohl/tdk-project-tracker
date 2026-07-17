'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, CornerDownLeft, FolderKanban, User, Plus, type LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { StatusRail } from '@/components/shared/status-rail';
import { projectRailState } from '@/lib/status-rail';
import { createClient } from '@/lib/supabase/client';
import { visibleNavItems } from './nav';
import { PROJECT_STATUS } from '@/lib/constants';
import { rankOf, type RoleKey } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import type { ProjectStatus } from '@/types/database.types';

type Group = 'Actions' | 'Projects' | 'Staff' | 'Go to';

interface Command {
  key: string;
  group: Group;
  label: string;
  sub?: string;
  icon: LucideIcon;
  status?: ProjectStatus; // projects render a status rail
  onSelect: () => void;
}

interface ProjectHit {
  id: string;
  project_number: string;
  name: string;
  status: ProjectStatus;
}
interface StaffHit {
  id: string;
  full_name: string;
  initials: string | null;
}

/**
 * Global command palette (⌘K / Ctrl+K). Beyond project search it offers quick
 * actions, jump-to-page navigation, and staff lookup — so power users can drive
 * the whole app from the keyboard once there are hundreds of projects.
 */
export function SearchCommand({ role }: { role?: RoleKey }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [active, setActive] = React.useState(0);
  const [projects, setProjects] = React.useState<ProjectHit[]>([]);
  const [staff, setStaff] = React.useState<StaffHit[]>([]);
  const activeRef = React.useRef<HTMLButtonElement>(null);

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
    if (!open) { setQ(''); setProjects([]); setStaff([]); setActive(0); }
  }, [open]);

  // Search projects + staff in parallel while typing.
  React.useEffect(() => {
    const term = q.trim();
    if (!term) { setProjects([]); setStaff([]); return; }
    const t = setTimeout(async () => {
      const supabase = createClient();
      const clean = term.replace(/[%,()]/g, '');
      const [p, s] = await Promise.all([
        supabase
          .from('projects')
          .select('id, project_number, name, status')
          .or(`name.ilike.%${clean}%,project_number.ilike.%${clean}%`)
          .order('last_activity_at', { ascending: false })
          .limit(6),
        supabase
          .from('staff')
          .select('id, full_name, initials')
          .eq('is_active', true)
          .ilike('full_name', `%${clean}%`)
          .order('full_name')
          .limit(5),
      ]);
      setProjects((p.data as ProjectHit[]) ?? []);
      setStaff((s.data as StaffHit[]) ?? []);
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const navTo = (href: string) => { setOpen(false); router.push(href); };

  const term = q.trim().toLowerCase();
  const matches = (c: { label: string; sub?: string }) =>
    !term || c.label.toLowerCase().includes(term) || (c.sub?.toLowerCase().includes(term) ?? false);

  const actions: Command[] = [
    { key: 'new-project', group: 'Actions', label: 'New project', sub: 'Create a project', icon: Plus, onSelect: () => navTo('/projects/new') },
    { key: 'new-task', group: 'Actions', label: 'New general task', sub: 'Create a task', icon: Plus, onSelect: () => navTo('/tasks') },
  ];
  // Role-gated: PM/Admin-only destinations (e.g. Operations Center) never appear in
  // an engineer's command palette.
  const navCmds: Command[] = visibleNavItems(rankOf(role)).map((n) => ({
    key: `nav-${n.href}`, group: 'Go to', label: n.label, icon: n.icon, onSelect: () => navTo(n.href),
  }));
  const projectCmds: Command[] = projects.map((p) => ({
    key: `proj-${p.id}`, group: 'Projects', label: p.name, sub: p.project_number, icon: FolderKanban,
    status: p.status, onSelect: () => navTo(`/projects/${p.id}`),
  }));
  const staffCmds: Command[] = staff.map((s) => ({
    key: `staff-${s.id}`, group: 'Staff', label: s.full_name, sub: s.initials ?? undefined, icon: User,
    onSelect: () => navTo(`/staff/${s.id}`),
  }));

  // No query → quick actions + navigation. Querying → filtered actions/nav plus
  // live project and staff results.
  const list: Command[] = term
    ? [...actions.filter(matches), ...projectCmds, ...staffCmds, ...navCmds.filter(matches)]
    : [...actions, ...navCmds];

  React.useEffect(() => { setActive(0); }, [q, projects, staff]);
  React.useEffect(() => { activeRef.current?.scrollIntoView({ block: 'nearest' }); }, [active]);

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
        <DialogContent className="top-[15%] max-w-xl translate-y-0 gap-0 p-0">
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === 'Enter') { e.preventDefault(); list[active]?.onSelect(); }
              }}
              placeholder="Search projects, staff, or jump to…"
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin p-2">
            {term && list.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matches found.</p>
            )}
            {list.map((c, i) => {
              const showHeader = i === 0 || list[i - 1].group !== c.group;
              const Icon = c.icon;
              return (
                <React.Fragment key={c.key}>
                  {showHeader && (
                    <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {c.group}
                    </p>
                  )}
                  <button
                    ref={i === active ? activeRef : undefined}
                    onClick={c.onSelect}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      'relative flex w-full items-center justify-between gap-2 rounded-md py-2 pl-3 pr-2 text-left text-sm transition-colors',
                      c.status ? 'pl-4' : 'pl-3',
                      i === active && 'bg-accent',
                    )}
                  >
                    {c.status && (
                      <StatusRail state={projectRailState({ status: c.status })} radius="rounded-full" glow={false} className="left-1 top-1.5 h-[calc(100%-0.75rem)] w-1" />
                    )}
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        {c.sub && c.group === 'Projects' && <span className="font-mono text-xs text-muted-foreground">{c.sub} </span>}
                        <span className="truncate">{c.label}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      {c.group === 'Projects' && c.status && PROJECT_STATUS[c.status].label}
                      {c.group === 'Staff' && c.sub}
                      {i === active && <CornerDownLeft className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex items-center gap-3 border-t px-3 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1">↑</kbd><kbd className="rounded border bg-muted px-1">↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1">↵</kbd> open</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1">esc</kbd> close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
