'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateReadyReport } from '@/lib/actions/reports';

export function GenerateReportButton() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function run() {
    setPending(true);
    const res = await generateReadyReport();
    if (!res.ok) {
      setPending(false);
      return toast.error(res.error);
    }
    toast.success('Ready Report generated');
    router.push(`/reports/${res.id}`);
  }

  return (
    <Button onClick={run} disabled={pending} size="sm">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      Generate Ready Report
    </Button>
  );
}
