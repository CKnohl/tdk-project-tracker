'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { setUserRole, setUserActive, linkUserStaff } from '@/lib/actions/settings';
import type { RoleKey } from '@/lib/permissions';

interface UserRowVM {
  id: string;
  email: string;
  full_name: string | null;
  role_id: number;
  is_active: boolean;
  staff_id: string | null;
}

const NONE = '__none__';

export function UsersTable({
  users,
  roles,
  staff,
}: {
  users: UserRowVM[];
  roles: { id: number; key: string; name: string }[];
  staff: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const roleKey = (id: number) => (roles.find((r) => r.id === id)?.key as RoleKey) ?? 'read_only';

  const run = async (p: Promise<{ ok: boolean; error?: string }>, ok: string) => {
    const res = await p;
    if (!res.ok) toast.error(res.error ?? 'Failed');
    else { toast.success(ok); router.refresh(); }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Staff link</TableHead>
          <TableHead className="text-right">Active</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell>
              <div className="font-medium">{u.full_name ?? '—'}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
            </TableCell>
            <TableCell>
              <Select value={roleKey(u.role_id)} onValueChange={(v) => run(setUserRole(u.id, v as RoleKey), 'Role updated')}>
                <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => <SelectItem key={r.id} value={r.key}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Select value={u.staff_id ?? NONE} onValueChange={(v) => run(linkUserStaff(u.id, v === NONE ? null : v), 'Staff link updated')}>
                <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Not linked" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not linked</SelectItem>
                  {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell className="text-right">
              <Switch checked={u.is_active} onCheckedChange={(c) => run(setUserActive(u.id, c), c ? 'Activated' : 'Deactivated')} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
