import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function MetaBadge({
  meta,
  className,
}: {
  meta: { label: string; tone: BadgeTone } | undefined | null;
  className?: string;
}) {
  if (!meta) return null;
  return (
    <Badge tone={meta.tone} className={cn(className)}>
      {meta.label}
    </Badge>
  );
}
