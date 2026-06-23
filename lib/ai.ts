// AI executive summary via the OpenAI Chat Completions API.
// Implemented with `fetch` (no SDK dependency), mirroring lib/email.ts.
//
// SERVER ONLY. Best-effort: returns null on any failure (missing key, network,
// bad response) so callers fall back to the deterministic summary.

import type { ReportSnapshot } from '@/lib/data/reports';

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

/** Compact, token-cheap digest of the snapshot for the prompt. */
function buildMetrics(s: ReportSnapshot): string {
  const overdue = s.risks.find((r) => r.label === 'Overdue tasks')?.count ?? 0;
  const top = s.workload[0];
  const deltas = s.previous_counts
    ? `active ${s.counts.active} (was ${s.previous_counts.active}), on_hold ${s.counts.on_hold} (was ${s.previous_counts.on_hold}), waiting ${s.counts.awaiting} (was ${s.previous_counts.awaiting})`
    : `active ${s.counts.active}, on_hold ${s.counts.on_hold}, waiting ${s.counts.awaiting} (no prior report)`;

  return [
    `Reporting period: since ${s.previous_report_at ?? 'the last 7 days'}.`,
    `Project counts: ${deltas}.`,
    `Overdue tasks: ${overdue}. Tasks due today/overdue listed: ${s.immediate.length}.`,
    `Projects needing attention: ${s.needs_attention.length}. Projects waiting on others: ${s.waiting.length}.`,
    `Completed since last report: ${s.completed_since.length}. New projects since last report: ${s.new_projects.length}.`,
    top ? `Highest workload: ${top.full_name} with ${top.open_tasks} open tasks (${top.overdue} overdue, ${top.due_this_week} due this week).` : 'No staff workload.',
    s.workload_alerts.length
      ? `Workload alerts: ${s.workload_alerts.map((a) => `${a.full_name} (${a.kind === 'overdue' ? 'overdue work' : 'high load'})`).join('; ')}.`
      : 'No workload alerts.',
    `Most urgent upcoming deadline: ${s.upcoming.find((u) => u.start_at)?.title ?? 'none'}.`,
  ].join('\n');
}

/**
 * Returns a concise management summary, or null if OpenAI is unavailable.
 * Highlights overdue work, workload issues, waiting projects, and changes since
 * the previous report.
 */
export async function generateExecutiveSummary(snapshot: ReportSnapshot): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[ai] OPENAI_API_KEY not set — using deterministic summary');
    }
    return null;
  }

  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  try {
    const res = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 320,
        messages: [
          {
            role: 'system',
            content:
              'You are the operations chief of staff for an engineering firm (TDK / M&P). ' +
              'Write a concise executive summary (3–5 sentences, plain prose, no headings, no bullet points) ' +
              'for the leadership team. Emphasize overdue work, staff workload problems, projects waiting on ' +
              'external responses, and the most important changes since the previous report. Be specific with ' +
              'numbers and names. Do not invent data beyond what is provided.',
          },
          { role: 'user', content: buildMetrics(snapshot) },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      console.error('[ai] OpenAI responded', res.status, await res.text().catch(() => ''));
      return null;
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : null;
  } catch (e) {
    console.error('[ai] summary generation failed', e);
    return null;
  }
}
