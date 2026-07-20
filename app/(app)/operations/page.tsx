import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { OperationsCenter } from '@/components/operations/operations-center';
import { ScrollRestoration } from '@/components/shared/scroll-restoration';
import { getCurrentUser } from '@/lib/auth';
import { canManageProjects } from '@/lib/permissions';
import { getIntakeDocuments } from '@/lib/data/intake';
import { getProposalsByDocument, getAllProposals } from '@/lib/data/proposals';
import { getProjectDirectory } from '@/lib/data/reference';
import { getInterpretationEnabled } from '@/lib/data/settings';
import { interpretKeyConfigured } from '@/lib/intake-interpret';

export const metadata = { title: 'Operations Center' };

// V6 Phase 0 — the office intake surface. PM/Admin only (rank >= 30); engineers never
// see it (the nav hides it and this guard blocks a typed URL). No AI in Phase 0 —
// documents land here, are processed as a queue, and are manually filed to a project
// via the existing note/task actions.
//
// Firm-wide activity is NOT re-rendered here: it already has one home at /activity
// (visible to everyone, PMs included). Duplicating it in the Operations Center would
// be a second copy of the same feed — so Phase 0 keeps this surface focused on intake.
export default async function OperationsCenterPage() {
  const user = await getCurrentUser();
  if (!user || !canManageProjects(user.role)) redirect('/dashboard');
  // The whole Operations Center is gated by the admin's Settings → Operations
  // switch — when off, the surface is hidden entirely (nav, ⌘K, and this typed
  // URL). Intake documents and proposals are kept behind it.
  const interpretationOn = await getInterpretationEnabled();
  if (!interpretationOn) redirect('/dashboard');

  const [documents, projects, proposalsByDoc, allProposals] = await Promise.all([
    getIntakeDocuments(),
    getProjectDirectory(),
    getProposalsByDocument(),
    getAllProposals(),
  ]);
  // Interpretation additionally requires the server-side service key.
  const interpretAvailable = interpretationOn && interpretKeyConfigured();

  return (
    <div className="space-y-5">
      <ScrollRestoration storageKey="tdk-operations-scroll" />
      <PageHeader
        title="Operations Center"
        description={
          interpretAvailable
            ? "Office intake — process documents that arrive before they're on a project. Interpret a document into proposals, then review and apply them; a project only changes when you approve."
            : "Office intake — process documents that arrive before they're on a project, then file them to the right project. Nothing changes a project until you file it."
        }
      />
      <OperationsCenter
        documents={documents}
        projects={projects}
        proposalsByDoc={proposalsByDoc}
        allProposals={allProposals}
        interpretAvailable={interpretAvailable}
      />
    </div>
  );
}
