'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, ArrowRightLeft, Loader2 } from 'lucide-react';
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
import { setUserRole, setUserActive, linkUserStaff } from '@/lib/actions/settings';
import type { CompanyOption } from '@/lib/data/reference';
import type { RoleKey } from '@/lib/permissions';

// ONE roster. Staff Management absorbed the old Users & Roles page (V6.1.1): the
// person's directory entry (name/company/phone/active) and their sign-in (login
// email, role, enabled) live on the same row. New sign-ins start as Read Only
// (handle_new_user) until an admin promotes them here. Role/link/sign-in controls
// are admin-only; staff CRUD and offboarding stay PM/Admin (server-enforced).

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

interface UserVM {
  id: string;
  email: string;
  full_name: string | null;
  role_id: number;
  is_active: boolean;
  staff_id: string | null;
}

interface RoleVM {
  id: number;
  key: string;
  name: string;
}

const NONE = '__none__';

export function StaffManager({
  staff,
  companies,
  users = [],
  roles = [],
  canManageUsers = false,
}: {
  staff: StaffVM[];
  companies: CompanyOption[];
  users?: UserVM[];
  roles?: RoleVM[];
  canManageUsers?: boolean;
}) {
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

  // users.staff_id is the authoritative link (never staff.user_id).
  const userByStaff = React.useMemo(
    () => new Map(users.filter((u) => u.staff_id).map((u) => [u.staff_id as string, u])),
    [users],
  );
  const unlinkedUsers = users.filter((u) => !u.staff_id);
  const unlinkedStaff = active.filter((s) => !userByStaff.has(s.id));
  const roleKey = (id: number) => (roles.find((r) => r.id === id)?.key as RoleKey) ?? 'read_only';
  const roleName = (id: number) => roles.find((r) => r.id === id)?.name ?? 'Read Only';

  const run = async (p: Promise<{ ok: boolean; error?: string }>, ok: string) => {
    const res = await p;
    if (!res.ok) toast.error(res.error ?? 'Failed');
    else { toast.success(ok); router.refresh(); }
  };

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

  function signInCell(s: StaffVM) {
    const u = userByStaff.get(s.id);
    if (!canManageUsers) {
      return u
        ? <span className="text-xs text-muted-foreground">{u.email}</span>
        : <span className="text-xs text-muted-foreground">—</span>;
    }
    return (
      <div className="flex items-center gap-2">
        <Select
          value={u?.id ?? NONE}
          onValueChange={(v) =>
            v === NONE
              ? u && run(linkUserStaff(u.id, null), 'Sign-in unlinked')
              : run(linkUserStaff(v, s.id), 'Sign-in linked')
          }
        >
          <SelectTrigger className="h-8 w-[190px]"><SelectValue placeholder="No sign-in" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No sign-in</SelectItem>
            {u && <SelectItem value={u.id}>{u.email}</SelectItem>}
            {unlinkedUsers.map((x) => <SelectItem key={x.id} value={x.id}>{x.email}</SelectItem>)}
          </SelectContent>
        </Select>
        {u && (
          <Switch
            checked={u.is_active}
            onCheckedChange={(c) => run(setUserActive(u.id, c), c ? 'Sign-in enabled' : 'Sign-in disabled')}
            aria-label="Sign-in enabled"
            title="Sign-in enabled"
          />
        )}
      </div>
    );
  }

  function roleCell(s: StaffVM) {
    const u = userByStaff.get(s.id);
    if (!u) return <span className="text-xs text-muted-foreground">—</span>;
    if (!canManageUsers) return <span className="text-sm">{roleName(u.role_id)}</span>;
    return (
      <Select value={roleKey(u.role_id)} onValueChange={(v) => run(setUserRole(u.id, v as RoleKey), 'Role updated')}>
        <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {roles.map((r) => <SelectItem key={r.id} value={r.key}>{r.name}</SelectItem>)}
        </SelectContent>
      </Select>
    );
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
            <TableHead>Sign-in</TableHead>
            <TableHead>Role</TableHead>
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
                    <div className="text-xs text-muted-foreground">
                      {[s.email, s.phone].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{companyName(s.company_id)}</TableCell>
              <TableCell>{signInCell(s)}</TableCell>
              <TableCell>{roleCell(s)}</TableCell>
              <TableCell className="text-center"><Switch checked={s.is_active} onCheckedChange={(c) => toggle(s, c)} /></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" aria-label="Edit staff member" className="h-8 w-8" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Sign-ins that exist but aren't linked to a staff entry yet. New logins land
          here automatically as Read Only until an admin links + promotes them. */}
      {canManageUsers && unlinkedUsers.length > 0 && (
        <div className="rounded-lg border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sign-ins not linked to staff
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            New logins start as Read Only. Link each one to their staff entry and set their role.
          </p>
          <div className="space-y-2">
            {unlinkedUsers.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{u.full_name ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={roleKey(u.role_id)} onValueChange={(v) => run(setUserRole(u.id, v as RoleKey), 'Role updated')}>
                    <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => <SelectItem key={r.id} value={r.key}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={NONE} onValueChange={(v) => v !== NONE && run(linkUserStaff(u.id, v), 'Sign-in linked')}>
                    <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Link to staff…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Link to staff…</SelectItem>
                      {unlinkedStaff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Switch
                    checked={u.is_active}
                    onCheckedChange={(c) => run(setUserActive(u.id, c), c ? 'Sign-in enabled' : 'Sign-in disabled')}
                    aria-label="Sign-in enabled"
                    title="Sign-in enabled"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
