'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CompanyOption } from '@/lib/data/reference';

const ALL = '__all__';

/** Search / company / sort toolbar for the Archive, mirroring Active Projects. */
export function ArchiveToolbar({ companies }: { companies: CompanyOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get('q') ?? '');

  const update = React.useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === ALL) next.delete(key);
      else next.set(key, value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  React.useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== q) update('q', q || null);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const val = (key: string) => params.get(key) ?? ALL;
  const hasFilters = ['company', 'sort', 'q'].some((k) => params.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search archived projects…" className="pl-8" />
      </div>

      <Select value={val('company')} onValueChange={(v) => update('company', v)}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Company" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All companies</SelectItem>
          {companies.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={params.get('sort') ?? 'recent'} onValueChange={(v) => update('sort', v === 'recent' ? null : v)}>
        <SelectTrigger className="w-[170px]"><SelectValue placeholder="Sort" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Recently updated</SelectItem>
          <SelectItem value="oldest">Oldest updated</SelectItem>
          <SelectItem value="number">Project # (ascending)</SelectItem>
          <SelectItem value="number_desc">Project # (descending)</SelectItem>
          <SelectItem value="name">Project name</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => { setQ(''); router.replace(pathname, { scroll: false }); }}>
          <X className="h-4 w-4" /> Clear
        </Button>
      )}
    </div>
  );
}
