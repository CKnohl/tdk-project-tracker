'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ShieldAlert, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/shared/combobox';
import { setProjectManager } from '@/lib/actions/projects';
import type { LeaderlessProject } from '@/lib/data/dashboard';
import type { StaffOption } from '@/lib/data/reference';

/**
 * The "big deal" box — appears on the admin/PM dashboard ONLY while an active
 * project has no active manager (e.g. after an offboarding). One click accepts
 * the suggested lead (most open tasks on the project); the combobox picks anyone
 * else. A human always confirms — nothing is reassigned automatically.
 */
export function LeaderlessAlert({ projects, staff }: { projects: LeaderlessProject[]; staff: StaffOption[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [choice, setChoice] = React.useState<Record<string, string>>({});

  if (projects.length === 0) return null;
  const options = staff.filter((s) => s.is_active).map((s) => ({ value: s.id, label: s.full_name }));

  async function assign(projectId: string, staffId: string, label: string) {
    setBusyId(projectId);
    const res = await setProjectManager(projectId, staffId);
    setBusyId(null);
    if (!res.ok) return toast.error(res.error);
    toast.success(`${label} now manages this project`);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
        <ShieldAlert className="h-4 w-4" /> Projects without an active manager
      </h2>
      <p className="mb-3 text-xs text-amber-800/80 dark:text-amber-300/80">
        These need a new manager assigned — suggested is the active team member with the most open tasks.
      </p>
      <div className="space-y-2">
        {projects.map((p) => {
          const selected = choice[p.id] ?? p.suggested?.id ?? '';
          const selectedName = options.find((o) => o.value === selected)?.label ?? '';
          return (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-background/60 px-3 py-2 dark:border-amber-900/60">
              <div className="min-w-0">
                <Link href={`/projects/${p.id}`} className="text-sm font-medium hover:underline">
                  <span className="font-mono text-xs text-muted-foreground">{p.project_number}</span> {p.name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {p.former_manager ? `Manager deactivated: ${p.former_manager}` : 'No manager assigned'}
                  {p.suggested && ` · Suggested: ${p.suggested.full_name}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Combobox
                  options={options}
                  value={selected || null}
                  onChange={(v) => setChoice((c) => ({ ...c, [p.id]: v }))}
                  placeholder="Choose manager…"
                  className="h-8 w-48"
                />
                <Button
                  size="sm"
                  className="h-8"
                  disabled={!selected || busyId === p.id}
                  onClick={() => assign(p.id, selected, selectedName)}
                >
                  <UserCheck className="h-4 w-4" /> Assign
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
