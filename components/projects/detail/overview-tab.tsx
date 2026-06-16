import { Building2, User, CalendarClock, ListChecks, FileText, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { MetaBadge } from '@/components/shared/meta-badge';
import { StaffStack } from '@/components/shared/staff-avatar';
import { PROJECT_PHASE, WORKFLOW_STATE } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { ProjectDetail } from '@/lib/data/projects';

function Fact({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

export function OverviewTab({ detail }: { detail: ProjectDetail }) {
  const { project, staff, stats } = detail;
  const members = staff.map((m) => m.staff).filter(Boolean) as { id: string; full_name: string; initials: string | null }[];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="space-y-4 p-4 lg:col-span-2">
        <div>
          <h3 className="text-sm font-semibold">Description &amp; scope</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {project.description || 'No description provided.'}
          </p>
          {project.scope && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{project.scope}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3">
          <Fact icon={Building2} label="Company" value={project.company?.name ?? '—'} />
          <Fact icon={User} label="Manager" value={project.manager?.full_name ?? 'Unassigned'} />
          <Fact icon={CalendarClock} label="Target" value={formatDate(project.target_completion_date)} />
          <Fact icon={ListChecks} label="Open tasks" value={stats?.open_tasks ?? 0} />
          <Fact icon={FileText} label="Awaiting submittals" value={stats?.awaiting_submittals ?? 0} />
          <Fact icon={Users} label="Team size" value={members.length} />
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <div>
          <div className="text-[11px] uppercase text-muted-foreground">Phase</div>
          <div className="mt-1"><MetaBadge meta={PROJECT_PHASE[project.phase]} /></div>
        </div>
        {project.workflow_state !== 'normal' && (
          <div>
            <div className="text-[11px] uppercase text-muted-foreground">Workflow</div>
            <div className="mt-1"><MetaBadge meta={WORKFLOW_STATE[project.workflow_state]} /></div>
          </div>
        )}
        <div>
          <div className="text-[11px] uppercase text-muted-foreground">Team</div>
          <div className="mt-2">{members.length ? <StaffStack members={members} max={6} /> : <span className="text-sm text-muted-foreground">None</span>}</div>
        </div>
      </Card>
    </div>
  );
}
