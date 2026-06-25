import Link from 'next/link';
import { AlertTriangle, Clock, ListChecks, CircleCheck, ArrowRight, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Variant = 'overdue' | 'today' | 'week';

interface State {
  card: string;
  icon: string;
  badge: string;
  iconCmp: LucideIcon;
}

// Calm by default — color + emphasis only appear when there is work to do.
const STYLES: Record<Variant, { on: State; off: State }> = {
  overdue: {
    on: {
      card: 'border-red-300 dark:border-red-900 border-l-4 border-l-red-500 animate-soft-pulse',
      icon: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
      iconCmp: AlertTriangle,
    },
    off: { card: '', icon: 'text-muted-foreground/60', badge: 'bg-muted text-muted-foreground', iconCmp: CircleCheck },
  },
  today: {
    on: {
      card: 'border-orange-200 dark:border-orange-900/70 border-l-4 border-l-orange-500',
      icon: 'text-orange-600 dark:text-orange-400',
      badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
      iconCmp: Clock,
    },
    off: { card: '', icon: 'text-muted-foreground/60', badge: 'bg-muted text-muted-foreground', iconCmp: Clock },
  },
  week: {
    on: {
      card: 'border-sky-200 dark:border-sky-900/70 border-l-4 border-l-sky-500',
      icon: 'text-sky-600 dark:text-sky-400',
      badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
      iconCmp: ListChecks,
    },
    off: { card: '', icon: 'text-muted-foreground/60', badge: 'bg-muted text-muted-foreground', iconCmp: ListChecks },
  },
};

export function PriorityCard({
  variant,
  title,
  count,
  href,
  emptyLabel,
  children,
}: {
  variant: Variant;
  title: string;
  count: number;
  href?: string;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  const populated = count > 0;
  const s = STYLES[variant][populated ? 'on' : 'off'];
  const Icon = s.iconCmp;

  return (
    <Card className={cn('card-hover flex flex-col', s.card)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className={cn('h-4 w-4', s.icon)} />
          {title}
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium tabular-nums', s.badge)}>{count}</span>
        </CardTitle>
        {href && populated && (
          <Link href={href} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-2">
        {populated ? (
          children
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <CircleCheck className="h-6 w-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
