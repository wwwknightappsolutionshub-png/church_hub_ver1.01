'use client';

import { useState } from 'react';
import { Loader2, Pencil, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export interface VariantRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  bibleTranslationLabel: string;
  bibleTranslationCode: string;
  requiresParentalConsent: boolean;
  isActive: boolean;
  sortOrder: number;
}

export function Wisdom365VariantEditor({
  variants,
  onSaved,
}: {
  variants: VariantRow[];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState<VariantRow | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await api.post('/platform/wisdom365/variants', {
        slug: editing.slug,
        name: editing.name,
        description: editing.description,
        imageUrl: editing.imageUrl,
        bibleTranslationLabel: editing.bibleTranslationLabel,
        bibleTranslationCode: editing.bibleTranslationCode,
        requiresParentalConsent: editing.requiresParentalConsent,
        sortOrder: editing.sortOrder,
        isActive: editing.isActive,
      });
      toast.success('Variant saved');
      setEditing(null);
      onSaved();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journey variants</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {variants.map((v) => (
          <div
            key={v.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
          >
            <div>
              <p className="font-medium">{v.name}</p>
              <p className="text-xs text-muted-foreground">{v.bibleTranslationLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={v.isActive ? 'default' : 'secondary'}>
                {v.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => setEditing({ ...v })}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {editing && (
          <div className="space-y-3 rounded-lg border border-amber-500/40 bg-muted/30 p-4">
            <p className="font-semibold">Edit {editing.name}</p>
            <Input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Name"
            />
            <Textarea
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              rows={3}
            />
            <Input
              value={editing.imageUrl}
              onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
              placeholder="Image URL"
            />
            <Input
              value={editing.bibleTranslationLabel}
              onChange={(e) => setEditing({ ...editing, bibleTranslationLabel: e.target.value })}
              placeholder="Bible translation label"
            />
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                />
                Active
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.requiresParentalConsent}
                  onChange={(e) =>
                    setEditing({ ...editing, requiresParentalConsent: e.target.checked })
                  }
                />
                Parent-managed (Kids)
              </label>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save variant
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
