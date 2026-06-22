import Image from 'next/image';
import { cn } from '@/lib/utils';

// Intrinsic dimensions of public/brand/tdk-logo.png. Swapping in a higher-res
// master at the same path needs no code change (size is driven by className).
const LOGO_W = 700;
const LOGO_H = 350;

/** Full TDK Engineering Associates wordmark. Size via className (e.g. w-full, h-14). */
export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/tdk-logo.png"
      alt="TDK Engineering Associates, PC"
      width={LOGO_W}
      height={LOGO_H}
      priority={priority}
      className={cn('select-none', className)}
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
