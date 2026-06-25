import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Accent = 'red' | 'orange' | 'yellow' | 'blue' | 'none';

// `card` carries a subtle full border plus a prominent colored left accent rail.
const ACCENT: Record<Accent, { card: string; icon: string; count: string }> = {
  red: {
    card: 'border-red-200 dark:border-red-900/70 border-l-4 border-l-red-500',
    icon: 'text-red-600 dark:text-red-400',
    count: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  },
  orange: {
    card: 'border-orange-200 dark:border-orange-900/70 border-l-4 border-l-orange-500',
    icon: 'text-orange-600 dark:text-orange-400',
    count: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  },
  yellow: {
    card: 'border-amber-300 dark:border-amber-900/70 border-l-4 border-l-amber-500',
    icon: 'text-amber-600 dark:text-amber-400',
    count: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  blue: {
    card: 'border-sky-300 dark:border-sky-900/70 border-l-4 border-l-sky-500',
    icon: 'text-sky-600 dark:text-sky-400',
    count: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  },
  none: { card: '', icon: 'text-muted-foreground', count: 'bg-muted text-muted-foreground' },
};

export function WidgetCard({
  title,
  icon: Icon,
  count,
  href,
  viewAllLabel = 'View all',
  accent = 'none',
  className,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  count?: number;
  href?: string;
  viewAllLabel?: string;
  accent?: Accent;
  className?: string;
  children: React.ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <Card className={cn('card-hover flex flex-col', a.card, className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {Icon && <Icon className={cn('h-4 w-4', a.icon)} />}
          {title}
          {typeof count === 'number' && (
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', a.count)}>{count}</span>
          )}
        </CardTitle>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {viewAllLabel} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-2">{children}</CardContent>
    </Card>
  );
}
