'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROJECT_STATUS, WORKFLOW_STATE, PROJECT_PHASE, PHASE_ORDER } from '@/lib/constants';
import type { CompanyOption } from '@/lib/data/reference';

const ALL = '__all__';

/** sessionStorage key holding the last /projects query string (incl. leading "?"). */
export const PROJECTS_QUERY_KEY = 'tdk-projects-query';

/** localStorage key remembering the user's last project sort across visits. */
const SORT_KEY = 'tdk-projects-sort';

export function ProjectsToolbar({ companies }: { companies: CompanyOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get('q') ?? '');

  const update = React.useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === ALL) next.delete(key);
      else next.set(key, value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  // Debounce the search box.
  React.useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== q) update('q', q || null);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Remember the current filter/search query so a project's Back link can
  // return here with filters intact (see PROJECTS_QUERY_KEY consumers).
  React.useEffect(() => {
    try {
      sessionStorage.setItem(PROJECTS_QUERY_KEY, window.location.search);
    } catch {
      /* storage unavailable — non-critical */
    }
  }, [params]);

  // Restore the remembered sort on a fresh visit (when the URL has no sort yet).
  React.useEffect(() => {
    if (params.get('sort')) return;
    try {
      const saved = localStorage.getItem(SORT_KEY);
      if (saved && saved !== 'recent') update('sort', saved);
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const val = (key: string) => params.get(key) ?? ALL;
  const hasFilters = ['status', 'company', 'phase', 'workflow', 'group', 'sort', 'q'].some((k) => params.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" className="pl-8" />
      </div>

      <Select value={val('status')} onValueChange={(v) => update('status', v)}>
        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {Object.values(PROJECT_STATUS).filter((s) => s.value !== 'inactive').map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={val('company')} onValueChange={(v) => update('company', v)}>
        <SelectTrigger className="w-[120px]"><SelectValue placeholder="Company" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All companies</SelectItem>
          {companies.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={val('phase')} onValueChange={(v) => update('phase', v)}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Phase" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All phases</SelectItem>
          {PHASE_ORDER.map((p) => (
            <SelectItem key={p} value={p}>{PROJECT_PHASE[p].label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={val('workflow')} onValueChange={(v) => update('workflow', v)}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Workflow" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Any workflow</SelectItem>
          {Object.values(WORKFLOW_STATE).map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={params.get('group') ?? 'none'} onValueChange={(v) => update('group', v === 'none' ? null : v)}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Group" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No grouping</SelectItem>
          <SelectItem value="status">Group: Status</SelectItem>
          <SelectItem value="phase">Group: Phase</SelectItem>
          <SelectItem value="company">Group: Company</SelectItem>
          <SelectItem value="workflow">Group: Workflow</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={params.get('sort') ?? 'recent'}
        onValueChange={(v) => {
          try { localStorage.setItem(SORT_KEY, v); } catch { /* non-critical */ }
          update('sort', v === 'recent' ? null : v);
        }}
      >
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Recently updated</SelectItem>
          <SelectItem value="oldest">Oldest updated</SelectItem>
          <SelectItem value="next_due">Next deadline</SelectItem>
          <SelectItem value="most_overdue">Most overdue</SelectItem>
          <SelectItem value="most_tasks">Most open tasks</SelectItem>
          <SelectItem value="most_submittals">Most submittals</SelectItem>
          <SelectItem value="number">Project # (ascending)</SelectItem>
          <SelectItem value="number_desc">Project # (descending)</SelectItem>
          <SelectItem value="name">Project name</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => { setQ(''); router.replace(pathname, { scroll: false }); }}>
          <X className="h-4 w-4" /> Clear
        </Button>
      )}
    </div>
  );
}
