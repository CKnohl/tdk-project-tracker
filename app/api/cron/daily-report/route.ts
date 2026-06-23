import { NextResponse, type NextRequest } from 'next/server';
import { format } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';
import { runReadyReport } from '@/lib/reports/run';
import { sendEmail, renderNotificationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Automated daily Ready Report. Scheduled weekday mornings via vercel.json.
 * Reuses the shared runReadyReport() orchestrator (service-role client, no user
 * session), then emails Admins + Project Managers a link + the PDF attached.
 * Guarded by CRON_SECRET (Vercel Cron sends it as a Bearer token automatically).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // 1. Generate + persist the report (and its stored PDF).
  const { id, snapshot, pdf } = await runReadyReport({
    client: admin,
    generatedBy: null,
    generatorName: 'Automated daily report',
    reportType: 'daily_digest',
  });

  // 2. Resolve recipients: active Admins + Project Managers with an email.
  const { data: roles } = await admin.from('roles').select('id, key');
  const managerRoleIds = (roles ?? [])
    .filter((r) => r.key === 'admin' || r.key === 'project_manager')
    .map((r) => r.id);

  let recipients: string[] = [];
  if (managerRoleIds.length > 0) {
    const { data: users } = await admin
      .from('users')
      .select('email')
      .in('role_id', managerRoleIds)
      .eq('is_active', true);
    recipients = (users ?? []).map((u) => u.email).filter((e): e is string => Boolean(e));
  }

  if (recipients.length === 0) {
    return NextResponse.json({ id, emailed: 0, note: 'no recipients' });
  }

  // 3. Email the digest.
  const today = format(new Date(), 'EEEE, MMM d');
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  const html = renderNotificationEmail({
    heading: `Ready Report — ${today}`,
    intro: 'Daily operations summary',
    bodyLines: [snapshot.executive_summary],
    ctaLabel: 'View the full report',
    ctaHref: base ? `${base}/reports/${id}` : undefined,
  });

  const attachments = pdf
    ? [{ filename: `ready-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`, content: pdf.toString('base64') }]
    : undefined;

  const results = await Promise.allSettled(
    recipients.map((to) =>
      sendEmail({ to, subject: `Ready Report — ${today}`, html, attachments }),
    ),
  );
  const emailed = results.filter((r) => r.status === 'fulfilled' && r.value).length;

  return NextResponse.json({ id, recipients: recipients.length, emailed, pdf: Boolean(pdf) });
}
