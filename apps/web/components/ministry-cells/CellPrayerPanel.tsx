'use client';

import { useState } from 'react';
import { Heart, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const PRAYER_STATUSES = ['OPEN', 'PRAYING', 'ANSWERED', 'CLOSED'] as const;

interface PrayerRow {
  id: string;
  title: string;
  body: string | null;
  status: string;
  isAnonymous: boolean;
  createdAt: string;
  member: { firstName: string; lastName: string } | null;
  createdBy: { firstName: string; lastName: string };
}

interface CellPrayerPanelProps {
  branchId: string;
  canManageStatus: boolean;
  onChanged: () => void;
}

function statusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'OPEN') return 'destructive';
  if (status === 'PRAYING') return 'default';
  if (status === 'ANSWERED') return 'secondary';
  return 'outline';
}

export function CellPrayerPanel({ branchId, canManageStatus, onChanged }: CellPrayerPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: prayers = [], isLoading, refetch } = useApiQuery<PrayerRow[]>(
    ['ministry-cells', 'prayers', branchId],
    `/ministry-cells/branches/${branchId}/prayers`,
  );

  const refresh = () => {
    refetch();
    onChanged();
  };

  const createPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api.post(`/ministry-cells/branches/${branchId}/prayers`, {
        title: title.trim(),
        body: body.trim() || undefined,
        isAnonymous,
      });
      toast.success('Prayer request added');
      setTitle('');
      setBody('');
      setIsAnonymous(false);
      setShowForm(false);
      refresh();
    } catch {
      toast.error('Failed to add prayer request');
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (prayerId: string, status: string) => {
    setBusy(true);
    try {
      await api.patch(`/ministry-cells/prayers/${prayerId}`, { status });
      toast.success('Status updated');
      refresh();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-medium">
          <Heart className="h-4 w-4" />
          Cell prayer board
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          Add request
        </Button>
      </div>

      {showForm && (
        <form onSubmit={createPrayer} className="space-y-2 rounded-md border border-border p-3">
          <div>
            <Label htmlFor="prayer-title">Title</Label>
            <Input
              id="prayer-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="prayer-body">Details (optional)</Label>
            <Textarea
              id="prayer-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            Post anonymously
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              Submit
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {prayers.map((p) => (
            <li key={p.id} className="rounded-md border border-border/60 p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{p.title}</p>
                  {p.body && <p className="mt-1 text-muted-foreground">{p.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.isAnonymous
                      ? 'Anonymous'
                      : p.member
                        ? `${p.member.firstName} ${p.member.lastName}`
                        : `${p.createdBy.firstName} ${p.createdBy.lastName}`}
                    {' · '}
                    {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
              </div>
              {canManageStatus && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {PRAYER_STATUSES.filter((s) => s !== p.status).map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={busy}
                      onClick={() => updateStatus(p.id, s)}
                    >
                      Mark {s.toLowerCase()}
                    </Button>
                  ))}
                </div>
              )}
            </li>
          ))}
          {prayers.length === 0 && (
            <li className="py-4 text-center text-sm text-muted-foreground">
              No prayer requests for this branch yet.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
