'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ContentRow {
  id: string;
  dayOfYear: number;
  title: string;
  reference: string;
  theme: string;
  status: string;
}

interface ContentDetail {
  id: string;
  variantId: string;
  dayOfYear: number;
  title: string;
  reference: string;
  passage: string;
  wisdom: string;
  application: string;
  prayer: string;
  theme: string;
  imageUrl: string | null;
  status: string;
}

const emptyDraft = (variantId: string) => ({
  variantId,
  dayOfYear: 1,
  title: '',
  reference: '',
  passage: '',
  wisdom: '',
  application: '',
  prayer: '',
  theme: 'Wisdom',
  imageUrl: '',
  status: 'DRAFT' as 'DRAFT' | 'PUBLISHED',
});

export function Wisdom365ContentManager({
  variants,
}: {
  variants: Array<{ id: string; name: string }>;
}) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? '');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<ContentDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyDraft(variantId));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!variantId) return;
    setLoading(true);
    try {
      const { data } = await api.get<{ items: ContentRow[]; total: number }>(
        `/platform/wisdom365/variants/${variantId}/content`,
        { params: { page, limit: 25 } },
      );
      setRows(data.items);
      setTotal(data.total);
    } catch {
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [variantId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setDraft(emptyDraft(variantId));
  }, [variantId]);

  const openEdit = async (id: string) => {
    try {
      const { data } = await api.get<ContentDetail>(`/platform/wisdom365/content/${id}`);
      setEditor(data);
      setCreating(false);
    } catch {
      toast.error('Could not load entry');
    }
  };

  const saveEditor = async () => {
    if (!editor) return;
    setBusy(true);
    try {
      await api.patch(`/platform/wisdom365/content/${editor.id}`, {
        title: editor.title,
        reference: editor.reference,
        passage: editor.passage,
        wisdom: editor.wisdom,
        application: editor.application,
        prayer: editor.prayer,
        theme: editor.theme,
        imageUrl: editor.imageUrl,
        status: editor.status,
        dayOfYear: editor.dayOfYear,
      });
      toast.success('Content updated');
      setEditor(null);
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Update failed'));
    } finally {
      setBusy(false);
    }
  };

  const createEntry = async () => {
    setBusy(true);
    try {
      await api.post('/platform/wisdom365/content', draft);
      toast.success('Content created');
      setCreating(false);
      setDraft(emptyDraft(variantId));
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Create failed'));
    } finally {
      setBusy(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Delete this content entry?')) return;
    try {
      await api.delete(`/platform/wisdom365/content/${id}`);
      toast.success('Deleted');
      setEditor(null);
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Delete failed'));
    }
  };

  const publishBatch = async () => {
    const dayFrom = parseInt(prompt('Publish from day:', '1') ?? '1', 10);
    const dayTo = parseInt(prompt('Publish to day:', '365') ?? '365', 10);
    if (!variantId || Number.isNaN(dayFrom) || Number.isNaN(dayTo)) return;
    try {
      await api.post('/platform/wisdom365/content/publish-batch', { variantId, dayFrom, dayTo });
      toast.success(`Published days ${dayFrom}–${dayTo}`);
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Publish failed'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily content repository</CardTitle>
        <CardDescription>Create, edit, publish — {total} entries for selected variant</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            value={variantId}
            onChange={(e) => {
              setVariantId(e.target.value);
              setPage(1);
            }}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" /> New entry
          </Button>
          <Button size="sm" variant="outline" onClick={publishBatch}>
            Batch publish
          </Button>
        </div>

        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="p-2 text-left">Day</th>
                  <th className="p-2 text-left">Reference</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-2">{row.dayOfYear}</td>
                    <td className="p-2">{row.reference}</td>
                    <td className="p-2">
                      <Badge variant="outline">{row.status}</Badge>
                    </td>
                    <td className="p-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => void openEdit(row.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <span>
            Page {page} · {rows.length} of {total}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page * 25 >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>

        {(editor || creating) && (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="font-semibold">{creating ? 'New content entry' : `Edit day ${editor?.dayOfYear}`}</p>
            {creating ? (
              <>
                <Input
                  type="number"
                  value={draft.dayOfYear}
                  onChange={(e) => setDraft({ ...draft, dayOfYear: parseInt(e.target.value, 10) || 1 })}
                  placeholder="Day of year"
                />
                <Input value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} placeholder="Reference" />
                <Textarea value={draft.passage} onChange={(e) => setDraft({ ...draft, passage: e.target.value })} rows={3} placeholder="Passage" />
                <Textarea value={draft.wisdom} onChange={(e) => setDraft({ ...draft, wisdom: e.target.value })} rows={2} placeholder="Wisdom" />
                <Textarea value={draft.application} onChange={(e) => setDraft({ ...draft, application: e.target.value })} rows={2} placeholder="Application" />
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as 'DRAFT' | 'PUBLISHED' })}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                </select>
                <Button onClick={createEntry} disabled={busy}>Create</Button>
              </>
            ) : editor ? (
              <>
                <Input value={editor.reference} onChange={(e) => setEditor({ ...editor, reference: e.target.value })} />
                <Textarea value={editor.passage} onChange={(e) => setEditor({ ...editor, passage: e.target.value })} rows={4} />
                <Textarea value={editor.wisdom} onChange={(e) => setEditor({ ...editor, wisdom: e.target.value })} rows={3} />
                <Textarea value={editor.application} onChange={(e) => setEditor({ ...editor, application: e.target.value })} rows={3} />
                <Textarea value={editor.prayer} onChange={(e) => setEditor({ ...editor, prayer: e.target.value })} rows={2} />
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={editor.status}
                  onChange={(e) => setEditor({ ...editor, status: e.target.value })}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                </select>
                <div className="flex gap-2">
                  <Button onClick={saveEditor} disabled={busy}>Save</Button>
                  <Button variant="destructive" onClick={() => void deleteEntry(editor.id)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                  <Button variant="ghost" onClick={() => setEditor(null)}>Close</Button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
