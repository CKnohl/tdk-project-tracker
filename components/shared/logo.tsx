import Image from 'next/image';
import { cn } from '@/lib/utils';

// Intrinsic logo dimensions (public/brand/tdk-logo.png).
const RATIO = 440 / 252;

/** Full TDK Engineering Associates wordmark. Height-driven; width auto-derived. */
export function Logo({
  height = 28,
  priority = false,
  className,
}: {
  height?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/brand/tdk-logo.png"
      alt="TDK Engineering Associates, PC"
      width={Math.round(RATIO * height)}
      height={height}
      priority={priority}
      className={cn('w-auto select-none', className)}
      style={{ height }}
    />
  );
}

/** TDK arrow mark — used in the collapsed sidebar and as the app icon. */
export function LogoIcon({ size = 36, priority = false, className }: { size?: number; priority?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
      <Image
        src="/brand/tdk-arrow.png"
        alt="TDK"
        width={size}
        height={size}
        priority={priority}
        className="h-full w-full select-none object-contain"
      />
    </span>
  );
}
