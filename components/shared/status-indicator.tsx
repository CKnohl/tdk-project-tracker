import { cn } from '@/lib/utils';
import { MetaBadge } from '@/components/shared/meta-badge';
import { PROJECT_STATUS } from '@/lib/constants';
import type { ProjectStatus } from '@/types/database.types';

/** Modern SaaS-style pulsing green "Active" indicator. */
export function ActiveDot({ label = true, className }: { label?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      {label && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</span>}
    </span>
  );
}

/** Active → pulsing dot; on_hold / inactive → standard badge. */
export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  if (status === 'active') return <ActiveDot className={className} />;
  return <MetaBadge meta={PROJECT_STATUS[status]} className={className} />;
}
