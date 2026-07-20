# Runbook — Document Interpretation (Settings → Operations)

Interpretation reads a document from the Operations Center intake queue and drafts
proposed tracker changes for human review. It is **off by default** and requires TWO
things to run; either one alone does nothing:

1. **The admin switch** — Settings → Operations → "Document interpretation" (admins only,
   stored as the `interpretation_enabled` global setting).
2. **A paid OpenAI API key on the server** — the `OPENAI_API_KEY` environment variable
   (Vercel → Project → Settings → Environment Variables). The default model is
   `gpt-4o-mini` (override with `OPENAI_MODEL`). The old `INTAKE_INTERPRET_ENABLED`
   env var is retired — the Settings switch replaced it.

## To purchase and enable

1. Create an OpenAI API key at platform.openai.com (billing must be set up; usage for
   `gpt-4o-mini` at intake volume is typically a few dollars per month — set a spend
   limit in the OpenAI dashboard).
2. Add `OPENAI_API_KEY` to the Vercel environment and redeploy.
3. In the app: Settings → Operations → turn **Document interpretation** on.
4. The Operations Center now shows **Interpret** on intake documents and the
   **Proposal Review** tab.

## To disable

Turn the switch off in Settings → Operations (takes effect immediately; no deploy).
Removing the env key also disables it regardless of the switch.

## Data governance

When enabled, the text of the interpreted document (pasted text or a text-readable
file's contents, capped at 24k characters) and the list of active project numbers/names
are sent to OpenAI. Nothing else is sent; nothing is ever applied to the tracker
without a person approving each proposal. Sign off on what document types may be
interpreted before enabling.
