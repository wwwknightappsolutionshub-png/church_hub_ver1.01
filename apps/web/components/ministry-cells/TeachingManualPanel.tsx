'use client';

import { useState } from 'react';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface TeachingResource {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  fileUrl: string | null;
  sortOrder?: number;
}

const emptyForm = {
  title: '',
  description: '',
  content: '',
  fileUrl: '',
  sortOrder: '0',
};

interface TeachingManualPanelProps {
  resources: TeachingResource[];
  onChanged: () => void;
}

export function TeachingManualPanel({ resources, onChanged }: TeachingManualPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (r: TeachingResource) => {
    setEditingId(r.id);
    setForm({
      title: r.title,
      description: r.description ?? '',
      content: r.content ?? '',
      fileUrl: r.fileUrl ?? '',
      sortOrder: String(r.sortOrder ?? 0),
    });
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      await api.post('/ministry-cells/teaching', {
        id: editingId ?? undefined,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        content: form.content.trim() || undefined,
        fileUrl: form.fileUrl.trim() || undefined,
        sortOrder: Number(form.sortOrder) || 0,
      });
      toast.success(editingId ? 'Resource updated' : 'Resource added');
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      onChanged();
    } catch {
      toast.error('Failed to save teaching resource');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this teaching resource?')) return;
    setBusy(true);
    try {
      await api.delete(`/ministry-cells/teaching/${id}`);
      toast.success('Resource deleted');
      onChanged();
    } catch {
      toast.error('Failed to delete resource');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium">
          <BookOpen className="h-4 w-4" />
          Church-wide teaching manual
        </p>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add resource
        </Button>
      </div>

      {showForm && (
        <form onSubmit={save} className="space-y-3 rounded-md border border-border p-4">
          <div>
            <Label htmlFor="teach-title">Title</Label>
            <Input
              id="teach-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="teach-desc">Description</Label>
            <Input
              id="teach-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="teach-content">Content</Label>
            <Textarea
              id="teach-content"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={4}
              placeholder="Lesson notes, discussion questions, etc."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="teach-file">File URL (optional)</Label>
              <Input
                id="teach-file"
                value={form.fileUrl}
                onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div>
              <Label htmlFor="teach-order">Sort order</Label>
              <Input
                id="teach-order"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {editingId ? 'Save changes' : 'Add resource'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {resources.map((t) => (
          <div
            key={t.id}
            className="flex items-start justify-between gap-2 rounded-md border border-border p-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t.title}</p>
              {t.description && (
                <p className="text-muted-foreground">{t.description}</p>
              )}
              {t.content && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.content}</p>
              )}
              {t.fileUrl && (
                <a
                  href={t.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-primary underline"
                >
                  Open file
                </a>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => openEdit(t)}
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => remove(t.id)}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {resources.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">
            No teaching resources yet. Add lessons shared across all cell branches.
          </p>
        )}
      </div>
    </div>
  );
}
