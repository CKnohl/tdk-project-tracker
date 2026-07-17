import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { OperationsCenter } from '@/components/operations/operations-center';
import { ScrollRestoration } from '@/components/shared/scroll-restoration';
import { getCurrentUser } from '@/lib/auth';
import { canManageProjects } from '@/lib/permissions';
import { getIntakeDocuments } from '@/lib/data/intake';
import { getProposalsByDocument, getAllProposals } from '@/lib/data/proposals';
import { getProjectDirectory } from '@/lib/data/reference';

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

  const [documents, projects, proposalsByDoc, allProposals] = await Promise.all([
    getIntakeDocuments(),
    getProjectDirectory(),
    getProposalsByDocument(),
    getAllProposals(),
  ]);

  return (
    <div className="space-y-5">
      <ScrollRestoration storageKey="tdk-operations-scroll" />
      <PageHeader
        title="Operations Center"
        description="Office intake — process documents that arrive before they're on a project. Interpret a document into proposals, then review and apply them; a project only changes when you approve."
      />
      <OperationsCenter documents={documents} projects={projects} proposalsByDoc={proposalsByDoc} allProposals={allProposals} />
    </div>
  );
}
