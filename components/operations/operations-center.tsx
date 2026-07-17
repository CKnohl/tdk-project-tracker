'use client';

import * as React from 'react';
import { IntakePanel } from '@/components/operations/intake-panel';
import { ProposalsWorkspace } from '@/components/operations/proposals-workspace';
import { cn, formatBadgeCount } from '@/lib/utils';
import type { IntakeDocumentItem } from '@/lib/data/intake';
import type { IntakeProposalItem } from '@/lib/data/proposals';
import type { ProjectOption } from '@/lib/data/reference';

// V6 — Operations Center shell: two tabs. "Intake Queue" (documents + interpret, Phase 0/1)
// and "Proposal Review" (the cross-document review workspace, Phase 1.2). Both are client
// views over server-loaded data; neither introduces a write path.

export function OperationsCenter({
  documents, projects, proposalsByDoc, allProposals,
}: {
  documents: IntakeDocumentItem[];
  projects: ProjectOption[];
  proposalsByDoc: Record<string, IntakeProposalItem[]>;
  allProposals: IntakeProposalItem[];
}) {
  const [tab, setTab] = React.useState<'queue' | 'review'>('queue');
  const needsReview = allProposals.filter((p) => p.state === 'proposed' || p.state === 'edited').length;

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Operations Center views" className="flex gap-1 border-b">
        {(['queue', 'review'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn('relative -mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            {t === 'queue' ? 'Intake Queue' : 'Proposal Review'}
            {t === 'review' && needsReview > 0 && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">{formatBadgeCount(needsReview)}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'queue' ? (
        <IntakePanel documents={documents} projects={projects} proposalsByDoc={proposalsByDoc} />
      ) : (
        <ProposalsWorkspace proposals={allProposals} />
      )}
    </div>
  );
}
