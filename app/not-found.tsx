import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Compass className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">The page you’re looking for doesn’t exist or was moved.</p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
