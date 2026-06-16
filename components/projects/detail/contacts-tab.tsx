'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Mail, Phone, Users,
  Briefcase, HardHat, Ruler, Scale, Landmark, DraftingCompass, Wrench, ShieldCheck, User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ContactForm } from '../contact-form';
import { CONTACT_ROLE } from '@/lib/constants';
import { deleteContact } from '@/lib/actions/contacts';
import type { ContactItem } from '@/lib/types';
import type { ContactRole } from '@/types/database.types';

const ROLE_ORDER: ContactRole[] = [
  'client', 'contractor', 'surveyor', 'attorney', 'municipal_reviewer',
  'planner', 'architect', 'engineer', 'inspector', 'other',
];

const ROLE_ICONS: Record<ContactRole, React.ComponentType<{ className?: string }>> = {
  client: Briefcase,
  contractor: HardHat,
  surveyor: Ruler,
  attorney: Scale,
  municipal_reviewer: Landmark,
  planner: DraftingCompass,
  architect: DraftingCompass,
  engineer: Wrench,
  inspector: ShieldCheck,
  other: User,
};

export function ContactsTab({
  projectId,
  contacts,
  canEdit,
}: {
  projectId: string;
  contacts: ContactItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<ContactItem | null>(null);

  async function onDelete(c: ContactItem) {
    if (!confirm(`Delete contact "${c.name}"?`)) return;
    const res = await deleteContact(c.id, projectId);
    if (!res.ok) toast.error(res.error);
    else { toast.success('Contact deleted'); router.refresh(); }
  }

  const grouped = ROLE_ORDER
    .map((role) => ({ role, items: contacts.filter((c) => c.role === role) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Dialog open={adding} onOpenChange={setAdding}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" /> Add contact</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New contact</DialogTitle></DialogHeader>
              <ContactForm projectId={projectId} onSuccess={() => setAdding(false)} />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {contacts.length === 0 ? (
        <EmptyState icon={Users} title="No contacts" description="Track clients, contractors, surveyors, attorneys, and municipal reviewers here." />
      ) : (
        grouped.map(({ role, items }) => {
          const Icon = ROLE_ICONS[role];
          return (
            <section key={role}>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Icon className="h-4 w-4" /> {CONTACT_ROLE[role]} <span className="font-normal">· {items.length}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((c) => (
                  <div key={c.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{c.name}</div>
                        {c.company && <div className="text-xs text-muted-foreground">{c.company}</div>}
                      </div>
                      {canEdit && (
                        <div className="flex shrink-0 gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(c)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {c.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /><a className="hover:underline" href={`mailto:${c.email}`}>{c.email}</a></div>}
                      {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /><a className="hover:underline" href={`tel:${c.phone}`}>{c.phone}</a></div>}
                      {c.notes && <p className="pt-1 text-foreground/70">{c.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit contact</DialogTitle></DialogHeader>
          {editing && <ContactForm projectId={projectId} contact={editing} onSuccess={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
