'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Library, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useYouthContext } from '@/components/youth/YouthProvider';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { RESOURCE_CATEGORIES } from '@/lib/youth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Resource {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  url?: string | null;
  content?: string | null;
}

export function YouthResourcesPanel() {
  const ctx = useYouthContext();
  const canManage = ctx?.permissions.manageResources ?? false;
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('');
  const url = category ? `/youth/resources?category=${category}` : '/youth/resources';
  const resources = useApiQuery<Resource[]>(['youth-resources', category], url);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'GUIDE', url: '', content: '' });

  const createResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/youth/resources', {
        title: form.title.trim(),
        description: form.description || undefined,
        category: form.category,
        url: form.url || undefined,
        content: form.content || undefined,
      });
      toast.success('Resource published');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['youth-resources'] });
      queryClient.invalidateQueries({ queryKey: ['youth-stats'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not publish resource'));
    } finally {
      setSaving(false);
    }
  };

  const unpublish = async (id: string, title: string) => {
    if (!confirm(`Unpublish "${title}"?`)) return;
    try {
      await api.delete(`/youth/resources/${id}`);
      toast.success('Resource unpublished');
      queryClient.invalidateQueries({ queryKey: ['youth-resources'] });
      queryClient.invalidateQueries({ queryKey: ['youth-stats'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not unpublish resource'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {RESOURCE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {canManage && (
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add resource
          </Button>
        )}
      </div>

      {canManage && showForm && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={createResource} className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {RESOURCE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <Input className="sm:col-span-2" placeholder="URL (optional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
              <Input className="sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <textarea
                className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
                placeholder="Content (optional)"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
              <Button type="submit" disabled={saving} className="sm:col-span-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {resources.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(resources.data ?? []).map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Library className="h-4 w-4 text-emerald-600" />
                    {r.title}
                  </CardTitle>
                  <Badge variant="outline">{r.category.replace('_', ' ')}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {r.description && <p>{r.description}</p>}
                {r.content && <p className="line-clamp-3">{r.content}</p>}
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    Open resource <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {canManage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="mt-2 text-destructive"
                    onClick={() => unpublish(r.id, r.title)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Unpublish
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
