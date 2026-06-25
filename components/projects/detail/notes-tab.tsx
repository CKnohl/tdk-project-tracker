'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Trash2, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/shared/empty-state';
import { formatDateTime } from '@/lib/utils';
import { createNote, deleteNote } from '@/lib/actions/notes';
import type { NoteItem } from '@/lib/types';

export function NotesTab({
  projectId,
  notes,
  canEdit,
}: {
  projectId: string;
  notes: NoteItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = React.useState('');
  const [pending, setPending] = React.useState(false);

  async function add() {
    if (!body.trim()) return;
    setPending(true);
    const res = await createNote({ project_id: projectId, body });
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    setBody('');
    router.refresh();
  }

  async function remove(n: NoteItem) {
    if (!confirm('Delete this note?')) return;
    const res = await deleteNote(n.id, projectId);
    if (!res.ok) toast.error(res.error);
    else router.refresh();
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="space-y-2">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Add a note or log correspondence…" />
          <div className="flex justify-end">
            <Button size="sm" onClick={add} disabled={pending || !body.trim()}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Add note
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <EmptyState icon={StickyNote} title="No notes yet" />
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-lg border p-3">
              <p className="whitespace-pre-wrap text-sm">{n.body}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{n.author?.full_name ?? 'Unknown'} · {formatDateTime(n.created_at)}</span>
                {canEdit && (
                  <Button variant="ghost" size="icon" aria-label="Delete note" className="h-6 w-6 text-destructive" onClick={() => remove(n)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
