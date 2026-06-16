import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { TONE_CLASSES, type BadgeTone } from '@/lib/constants';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  tone?: BadgeTone;
}

function Badge({ className, variant, tone, ...props }: BadgeProps) {
  return (
    <div
      className={cn(tone ? cn('border', TONE_CLASSES[tone]) : badgeVariants({ variant }), 'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
