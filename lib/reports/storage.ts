// Report PDF storage helpers. All access uses the service-role client, which
// bypasses storage RLS — so the `reports` bucket stays private and the only
// policy needed is the defense-in-depth read policy in migration 0020.
// SERVER ONLY.

import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'reports';

/** Upload a report PDF as `{reportId}.pdf`. Returns the storage path, or null on failure. */
export async function uploadReportPdf(reportId: string, pdf: Buffer): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const path = `${reportId}.pdf`;
    const { error } = await admin.storage.from(BUCKET).upload(path, pdf, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (error) {
      console.error('[reports] PDF upload failed', error.message);
      return null;
    }
    return path;
  } catch (e) {
    console.error('[reports] PDF upload error', e);
    return null;
  }
}

/** Create a time-limited signed download URL for a stored report PDF. */
export async function getReportPdfSignedUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
    if (error) return null;
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
