'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EventForm } from './event-form';

export function AddEventButton({ projects }: { projects: { id: string; project_number: string; name: string }[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Add event</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New calendar event</DialogTitle></DialogHeader>
        <EventForm projects={projects} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
