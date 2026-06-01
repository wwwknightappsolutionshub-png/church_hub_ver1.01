'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Flame,
  Loader2,
  Plus,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  DevotionalPrayerListDto,
  DevotionalPrayerPointsDto,
  DevotionalPrayerStreakDto,
  DevotionalPrayerWeeklyDigestDto,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { DevotionalGroupListDto } from '@church-hub/shared-types';
import { DEVOTIONAL_QUERY_KEYS } from '@/lib/devotional-hub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function DevotionalPrayerPanel() {
  const queryClient = useQueryClient();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListTitle, setNewListTitle] = useState('');
  const [shareGroup, setShareGroup] = useState(false);
  const [groupId, setGroupId] = useState('');
  const [newItemBody, setNewItemBody] = useState('');
  const [busy, setBusy] = useState(false);

  const lists = useApiQuery<DevotionalPrayerListDto[]>(
    DEVOTIONAL_QUERY_KEYS.prayerLists(),
    '/devotional-hub/prayer-lists',
  );

  const groups = useApiQuery<DevotionalGroupListDto>(
    DEVOTIONAL_QUERY_KEYS.groups(),
    '/devotional-hub/groups',
  );

  const streak = useApiQuery<DevotionalPrayerStreakDto>(
    ['devotional-prayer-streak'],
    '/devotional-hub/prayer-lists/streak',
  );

  const digest = useApiQuery<DevotionalPrayerWeeklyDigestDto>(
    ['devotional-prayer-digest'],
    '/devotional-hub/prayer-lists/digest',
  );

  const selected =
    lists.data?.find((l) => l.id === selectedListId) ?? lists.data?.[0] ?? null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['devotional-prayer-lists'] });
    queryClient.invalidateQueries({ queryKey: ['devotional-prayer-streak'] });
    queryClient.invalidateQueries({ queryKey: ['devotional-prayer-digest'] });
  };

  const createList = async () => {
    if (!newListTitle.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post<DevotionalPrayerListDto>('/devotional-hub/prayer-lists', {
        title: newListTitle,
        scope: shareGroup ? 'GROUP' : 'PERSONAL',
        groupId: shareGroup ? groupId || undefined : undefined,
      });
      setNewListTitle('');
      setSelectedListId(data.id);
      invalidate();
      toast.success('Prayer list created');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create list'));
    } finally {
      setBusy(false);
    }
  };

  const prayToday = async () => {
    try {
      await api.post('/devotional-hub/prayer-lists/streak/pray-today');
      invalidate();
      toast.success('Great — streak updated!');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not record prayer'));
    }
  };

  const addItem = async () => {
    if (!selected || !newItemBody.trim()) return;
    try {
      await api.post(`/devotional-hub/prayer-lists/${selected.id}/items`, {
        body: newItemBody,
      });
      setNewItemBody('');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not add item'));
    }
  };

  const toggleAnswered = async (itemId: string, answered: boolean) => {
    try {
      if (answered) {
        await api.delete(`/devotional-hub/prayer-lists/items/${itemId}/answered`);
      } else {
        await api.post(`/devotional-hub/prayer-lists/items/${itemId}/answered`);
      }
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Update failed'));
    }
  };

  const booster = async (itemId: string) => {
    try {
      const { data } = await api.post<{ booster: DevotionalPrayerPointsDto }>(
        `/devotional-hub/prayer-lists/items/${itemId}/booster`,
        {},
      );
      invalidate();
      toast.success(data.booster.title);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Booster failed'));
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await api.delete(`/devotional-hub/prayer-lists/items/${itemId}`);
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Delete failed'));
    }
  };

  const deleteList = async (listId: string) => {
    if (!confirm('Delete this prayer list?')) return;
    try {
      await api.delete(`/devotional-hub/prayer-lists/${listId}`);
      setSelectedListId(null);
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Delete failed'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-orange-200/50 bg-gradient-to-br from-orange-50/40 to-background dark:from-orange-950/20">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Flame className="h-4 w-4 text-orange-600" />
                Prayer streak: {streak.data?.streakDays ?? 0} days
              </p>
              <p className="text-xs text-muted-foreground">
                Longest {streak.data?.longestStreak ?? 0}
                {streak.data?.prayedToday ? ' · prayed today' : ''}
              </p>
            </div>
            <Button
              size="sm"
              onClick={prayToday}
              disabled={streak.data?.prayedToday}
              variant={streak.data?.prayedToday ? 'secondary' : 'default'}
            >
              I prayed today
            </Button>
          </CardContent>
        </Card>

        {digest.data && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Weekly digest</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground leading-relaxed">
              {digest.data.summary}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New prayer list</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input
            className="max-w-xs"
            placeholder="List name"
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={shareGroup} onChange={(e) => setShareGroup(e.target.checked)} />
            <Share2 className="h-3.5 w-3.5" />
            Share with group
          </label>
          {shareGroup && (
            <select
              className="h-10 max-w-[220px] rounded-md border border-input bg-background px-3 text-sm"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            >
              <option value="">Select group</option>
              {(groups.data?.myGroups ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
          <Button size="sm" onClick={createList} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="space-y-1">
          {(lists.data ?? []).map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setSelectedListId(l.id)}
              className={cn(
                'w-full rounded-md border px-3 py-2 text-left text-sm',
                selected?.id === l.id && 'border-primary bg-primary/5',
              )}
            >
              <span className="font-medium">{l.title}</span>
              <div className="mt-1 flex gap-1">
                <Badge variant="outline" className="text-[10px]">
                  {l.scope}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {l.openCount} open
                </Badge>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{selected.title}</CardTitle>
              {selected.isOwner && (
                <Button type="button" size="sm" variant="ghost" onClick={() => deleteList(selected.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add prayer request…"
                  value={newItemBody}
                  onChange={(e) => setNewItemBody(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                />
                <Button type="button" onClick={addItem} disabled={!selected.isOwner}>
                  Add
                </Button>
              </div>

              <ul className="space-y-3">
                {selected.items.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      'rounded-lg border p-3 text-sm',
                      item.isAnswered && 'border-emerald-200/60 bg-emerald-50/20 opacity-80',
                    )}
                  >
                    <p className={item.isAnswered ? 'line-through' : ''}>{item.body}</p>
                    {item.aiBooster && (
                      <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
                        <p className="font-medium">{item.aiBooster.title}</p>
                        <ul className="mt-1 list-disc pl-4">
                          {item.aiBooster.points?.slice(0, 2).map((p) => (
                            <li key={p.text}>{p.text}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-2 flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={item.isAnswered ? 'secondary' : 'outline'}
                        onClick={() => toggleAnswered(item.id, item.isAnswered)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {item.isAnswered ? 'Undo' : 'Answered'}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => booster(item.id)}>
                        <Sparkles className="h-3.5 w-3.5" />
                        Booster
                      </Button>
                      {selected.isOwner && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
