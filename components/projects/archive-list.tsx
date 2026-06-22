'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusRail } from '@/components/shared/status-rail';
import { humanize, formatDate } from '@/lib/utils';
import { setProjectStatus } from '@/lib/actions/projects';
import type { ProjectCard } from '@/lib/data/projects';

export function ArchiveList({ projects, canEdit }: { projects: ProjectCard[]; canEdit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function restore(p: ProjectCard) {
    setBusy(p.id);
    const res = await setProjectStatus(p.id, 'active');
    setBusy(null);
    if (!res.ok) toast.error(res.error);
    else { toast.success('Project restored'); router.refresh(); }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <Card key={p.id} className="card-hover relative flex h-full flex-col gap-2 p-4 pl-5">
          <StatusRail state="inactive" />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="font-mono text-xs text-muted-foreground">{p.project_number}</span>
              <Link href={`/projects/${p.id}`} className="block truncate font-semibold hover:underline">{p.name}</Link>
            </div>
            {p.inactive_reason && <Badge tone="gray">{humanize(p.inactive_reason)}</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">{p.company?.name} · updated {formatDate(p.updated_at)}</div>
          {canEdit && (
            <div className="mt-auto pt-2">
              <Button variant="outline" size="sm" onClick={() => restore(p)} disabled={busy === p.id}>
                <RotateCcw className="h-4 w-4" /> Restore
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
