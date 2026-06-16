import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function WidgetCard({
  title,
  icon: Icon,
  count,
  href,
  viewAllLabel = 'View all',
  className,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  count?: number;
  href?: string;
  viewAllLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {title}
          {typeof count === 'number' && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {count}
            </span>
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
