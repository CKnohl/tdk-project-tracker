'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, ArrowRightLeft, Loader2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StaffAvatar } from '@/components/shared/staff-avatar';
import { Field } from '@/components/shared/field';
import { StaffForm } from './staff-form';
import { OffboardingDialog } from './offboarding-dialog';
import { setStaffActive, transferOwnership } from '@/lib/actions/staff';
import type { CompanyOption } from '@/lib/data/reference';

interface StaffVM {
  id: string;
  full_name: string;
  initials: string | null;
  email: string | null;
  phone: string | null;
  company_id: number | null;
  is_active: boolean;
  user_id: string | null;
}

export function StaffManager({ staff, companies }: { staff: StaffVM[]; companies: CompanyOption[] }) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<StaffVM | null>(null);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [offboarding, setOffboarding] = React.useState<StaffVM | null>(null);

  const companyName = (id: number | null) => companies.find((c) => c.id === id)?.name ?? '—';
  const active = staff.filter((s) => s.is_active);

  async function toggle(s: StaffVM, value: boolean) {
    // Deactivation goes through the offboarding checklist (what happens to their
    // projects/tasks?) instead of flipping silently. Reactivation is direct —
    // it simply restores their open assignments.
    if (!value) {
      setOffboarding(s);
      return;
    }
    const res = await setStaffActive(s.id, true);
    if (!res.ok) toast.error(res.error);
    else { toast.success('Reactivated — their open assignments are restored'); router.refresh(); }
  }

  async function runTransfer() {
    if (!from || !to) return;
    setPending(true);
    const res = await transferOwnership(from, to);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Ownership transferred');
    setTransferOpen(false);
    setFrom(''); setTo('');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><ArrowRightLeft className="h-4 w-4" /> Transfer ownership</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Transfer project ownership</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Moves manager role, team membership, task assignments, and submittals from one person to another.
              </p>
              <Field label="From">
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>{active.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="To">
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>{active.filter((s) => s.id !== from).map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <div className="flex justify-end">
                <Button onClick={runTransfer} disabled={!from || !to || pending}>
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />} Transfer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> Add staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add staff member</DialogTitle></DialogHeader>
            <StaffForm companies={companies} onSuccess={() => setAdding(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Login</TableHead>
            <TableHead className="text-center">Active</TableHead>
            <TableHead className="text-right">Edit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((s) => (
            <TableRow key={s.id} className={s.is_active ? '' : 'opacity-60'}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <StaffAvatar name={s.full_name} initials={s.initials} className="h-7 w-7" />
                  <div>
                    <div className="font-medium">{s.full_name}</div>
                    {s.email && <div className="text-xs text-muted-foreground">{s.email}</div>}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{companyName(s.company_id)}</TableCell>
              <TableCell>{s.user_id ? <Link2 className="h-4 w-4 text-emerald-600" /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-center"><Switch checked={s.is_active} onCheckedChange={(c) => toggle(s, c)} /></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" aria-label="Edit staff member" className="h-8 w-8" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit staff member</DialogTitle></DialogHeader>
          {editing && <StaffForm companies={companies} staff={editing} onSuccess={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <OffboardingDialog person={offboarding} activeStaff={active} onClose={() => setOffboarding(null)} />
    </div>
  );
}
