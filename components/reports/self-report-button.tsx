'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileUser, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateSelfReport } from '@/lib/actions/reports';

/**
 * Generates a personal Self Report and opens it. Omit `subjectStaffId` for the
 * signed-in user's own report (My Work); pass a staff id on the Staff detail page
 * (only Project Managers / Admins may target someone else — enforced server-side).
 */
export function SelfReportButton({
  subjectStaffId,
  label = 'Self Report',
  variant = 'outline',
}: {
  subjectStaffId?: string;
  label?: string;
  variant?: 'default' | 'outline';
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function run() {
    setPending(true);
    const res = await generateSelfReport(subjectStaffId);
    if (!res.ok) {
      setPending(false);
      return toast.error(res.error);
    }
    toast.success('Self Report generated');
    router.push(`/reports/${res.id}`);
  }

  return (
    <Button onClick={run} disabled={pending} size="sm" variant={variant}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUser className="h-4 w-4" />}
      {label}
    </Button>
  );
}
