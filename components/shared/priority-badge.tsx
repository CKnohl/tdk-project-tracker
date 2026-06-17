import { cn } from '@/lib/utils';
import { TASK_PRIORITY } from '@/lib/constants';
import type { TaskPriority } from '@/types/database.types';

// Only the badge is colored — surrounding text stays in normal dashboard colors.
const STYLES: Record<TaskPriority, string> = {
  urgent: 'bg-red-500 text-white animate-breathe',
  high: 'bg-red-500 text-white animate-breathe',
  medium: 'bg-amber-400 text-amber-950',
  low: 'bg-emerald-500 text-white',
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        STYLES[priority],
        className,
      )}
    >
      {TASK_PRIORITY[priority].label}
    </span>
  );
}
