import { cn } from '@/lib/utils';
import { RAIL, type RailState } from '@/lib/status-rail';

/**
 * Thin vertical status rail for the far-left edge of a card/row.
 * The parent must be `relative` with left padding to clear the rail.
 */
export function StatusRail({
  state,
  radius = 'rounded-l-xl',
  glow = true,
  className,
}: {
  state: RailState;
  radius?: string;
  glow?: boolean;
  className?: string;
}) {
  const cfg = RAIL[state];
  return (
    <span
      aria-hidden="true"
      title={cfg.label}
      className={cn('pointer-events-none absolute left-0 top-0 h-full w-1.5', radius, cfg.anim, className)}
      style={{ backgroundColor: cfg.color, boxShadow: glow ? cfg.glow : 'none' }}
    />
  );
}

/** Compact "LIVE" pill for active projects. */
export function LivePill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400',
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      Live
    </span>
  );
}
