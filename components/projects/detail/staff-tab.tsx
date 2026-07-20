'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/shared/multi-select';
import { StaffAvatar } from '@/components/shared/staff-avatar';
import { EmptyState } from '@/components/shared/empty-state';
import { setProjectStaff } from '@/lib/actions/projects';
import type { StaffOption } from '@/lib/data/reference';
import type { ProjectStaffMember } from '@/lib/types';

export function StaffTab({
  projectId,
  members,
  staff,
  canEdit,
}: {
  projectId: string;
  members: ProjectStaffMember[];
  staff: StaffOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const current = members.map((m) => m.staff?.id).filter(Boolean) as string[];
  const [selected, setSelected] = React.useState<string[]>(current);
  const [pending, setPending] = React.useState(false);
  const dirty = selected.slice().sort().join() !== current.slice().sort().join();

  const options = staff.filter((s) => s.is_active).map((s) => ({ value: s.id, label: s.full_name }));

  async function save() {
    setPending(true);
    const res = await setProjectStaff(projectId, selected);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Team updated');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <MultiSelect options={options} selected={selected} onChange={setSelected} placeholder="Assign team members" />
          </div>
          <Button onClick={save} disabled={!dirty || pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </Button>
        </div>
      )}

      {members.length === 0 ? (
        <EmptyState icon={Users} title="No team assigned" />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {/* Each member links to their staff page (workload + assignments), same as the
              main Staff directory — one click from a project to what someone is working on.
              Deactivated staff are hidden (their membership row remains for history). */}
          {members.map((m) =>
            m.staff && m.staff.is_active !== false ? (
              <Link
                key={m.staff.id}
                href={`/staff/${m.staff.id}`}
                className="flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-accent/40"
              >
                <StaffAvatar name={m.staff.full_name} initials={m.staff.initials} />
                <div>
                  <div className="text-sm font-medium">{m.staff.full_name}</div>
                  {m.role_on_project && <div className="text-xs text-muted-foreground">{m.role_on_project}</div>}
                </div>
              </Link>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
