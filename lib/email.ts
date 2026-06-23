// Email delivery via Resend's REST API (https://resend.com/docs/api-reference).
// Implemented with `fetch` so we avoid an extra runtime dependency; swap to the
// `resend` SDK later if richer features are needed.
//
// SERVER ONLY — reads RESEND_API_KEY. Best-effort by design: every function
// returns instead of throwing so notification delivery can never break the
// action that triggered it.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const DEFAULT_FROM = 'TDK Project Tracker <onboarding@resend.dev>';

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded file content. */
  content: string;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

/** Returns false (never throws) on any failure, including a missing API key. */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? DEFAULT_FROM;

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[email] RESEND_API_KEY not set — skipping email to', msg.to);
    }
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        subject: msg.subject,
        html: msg.html,
        ...(msg.text ? { text: msg.text } : {}),
        ...(msg.attachments?.length ? { attachments: msg.attachments } : {}),
      }),
      // Don't let a slow provider hang a server action indefinitely.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[email] Resend responded', res.status, detail);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[email] send failed', e);
    return false;
  }
}

/** Branded, inline-styled HTML for a single notification email. */
export function renderNotificationEmail(opts: {
  heading: string;
  intro?: string | null;
  bodyLines?: string[];
  ctaLabel?: string;
  ctaHref?: string;
}): string {
  const lines = (opts.bodyLines ?? [])
    .map((l) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(l)}</p>`)
    .join('');

  const cta =
    opts.ctaLabel && opts.ctaHref
      ? `<a href="${opts.ctaHref}" style="display:inline-block;margin-top:8px;padding:10px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${escapeHtml(opts.ctaLabel)}</a>`
      : '';

  const intro = opts.intro
    ? `<p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#0f172a;">${escapeHtml(opts.intro)}</p>`
    : '';

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f1f5f9;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr>
        <td style="background:#0f172a;padding:18px 24px;">
          <span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.02em;">TDK Project Tracker</span>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <h1 style="margin:0 0 14px;font-size:18px;line-height:1.3;color:#0f172a;">${escapeHtml(opts.heading)}</h1>
          ${intro}
          ${lines}
          ${cta}
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">You're receiving this because of your notification settings in TDK Project Tracker. Manage them under Settings &rarr; Profile.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
