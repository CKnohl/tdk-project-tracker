'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Upload, Download, Trash2, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { formatDateTime } from '@/lib/utils';
import { createProjectFileUpload, registerProjectFile, deleteProjectFile, createFileDownloadUrl } from '@/lib/actions/files';
import { createClient } from '@/lib/supabase/client';
import type { FileItem } from '@/lib/types';

function humanSize(bytes: number | null) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function FilesTab({
  projectId,
  files,
  canEdit,
}: {
  projectId: string;
  files: FileItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  // Direct-to-storage: ticket → browser uploads straight to the bucket → register the
  // row. The file never passes through a server action (which caps bodies at ~1 MB).
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return toast.error('File exceeds the 50 MB limit.');
    setUploading(true);
    try {
      const ticket = await createProjectFileUpload(projectId, file.name);
      if (!ticket.ok) return toast.error(ticket.error);
      const { error: upErr } = await createClient()
        .storage.from('project-files')
        .uploadToSignedUrl(ticket.data.path, ticket.data.token, file, {
          contentType: file.type || 'application/octet-stream',
        });
      if (upErr) return toast.error(upErr.message);
      const res = await registerProjectFile(projectId, ticket.data.path, {
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
      });
      if (!res.ok) return toast.error(res.error);
      toast.success('File uploaded');
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function download(f: FileItem) {
    const res = await createFileDownloadUrl(f.storage_path);
    if (!res.ok) return toast.error(res.error);
    window.open(res.data, '_blank');
  }

  async function remove(f: FileItem) {
    if (!confirm(`Delete "${f.file_name}"?`)) return;
    const res = await deleteProjectFile(f.id, projectId, f.storage_path);
    if (!res.ok) toast.error(res.error);
    else { toast.success('File deleted'); router.refresh(); }
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <input ref={inputRef} type="file" className="hidden" onChange={onUpload} />
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload file
          </Button>
        </div>
      )}

      {files.length === 0 ? (
        <EmptyState icon={FileIcon} title="No files" description="Upload drawings, PDFs, and supporting documents." />
      ) : (
        <div className="divide-y rounded-lg border">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{f.file_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {humanSize(f.size_bytes)} · {f.uploader?.full_name ?? 'Unknown'} · {formatDateTime(f.created_at)}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" aria-label="Download file" className="h-8 w-8" onClick={() => download(f)}><Download className="h-4 w-4" /></Button>
                {canEdit && (
                  <Button variant="ghost" size="icon" aria-label="Delete file" className="h-8 w-8 text-destructive" onClick={() => remove(f)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
