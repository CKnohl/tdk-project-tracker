'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { StickyNote, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { commentOnTask } from '@/lib/actions/reviews';

export interface CompletedTaskRef {
  id: string;
  name: string;
  project_id: string | null;
}

/**
 * Offered right after completing a task: optionally attach a context note to the
 * task's timeline. Not every completion is black-and-white ("did the appointment
 * on time, but they stopped accepting oil-based paints — didn't return everything");
 * skipping is always one click. Shared by project tasks and general tasks.
 */
export function CompletionNoteDialog({ task, onClose }: { task: CompletedTaskRef | null; onClose: () => void }) {
  const router = useRouter();
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  function close() {
    setNote('');
    onClose();
  }

  async function save() {
    if (!task || busy) return;
    setBusy(true);
    const res = await commentOnTask(task.id, task.project_id, note);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Note added');
    close();
    router.refresh();
  }

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">Completed — add context?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Optional note on “{task?.name}” — partial outcomes, follow-ups needed, anything the
            full picture requires. It lands in the task&apos;s history.
          </p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            autoFocus
            placeholder="e.g. Appointment done on time, but they stopped accepting oil-based paints — still need to return the rest elsewhere."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={close}><X className="h-4 w-4" /> Skip</Button>
            <Button size="sm" disabled={!note.trim() || busy} onClick={save}>
              <StickyNote className="h-4 w-4" /> {busy ? 'Saving…' : 'Save note'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
