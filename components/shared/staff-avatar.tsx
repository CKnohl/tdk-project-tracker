import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initialsFromName, cn } from '@/lib/utils';

export function StaffAvatar({
  name,
  initials,
  src,
  className,
}: {
  name?: string | null;
  initials?: string | null;
  src?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn('h-7 w-7', className)} title={name ?? undefined}>
      {src ? <AvatarImage src={src} alt={name ?? ''} /> : null}
      <AvatarFallback>{initials || initialsFromName(name)}</AvatarFallback>
    </Avatar>
  );
}

export function StaffStack({
  members,
  max = 4,
}: {
  members: { id: string; full_name: string; initials: string | null }[];
  max?: number;
}) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((m) => (
        <StaffAvatar
          key={m.id}
          name={m.full_name}
          initials={m.initials}
          className="ring-2 ring-background"
        />
      ))}
      {extra > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium ring-2 ring-background">
          +{extra}
        </div>
      )}
    </div>
  );
}
