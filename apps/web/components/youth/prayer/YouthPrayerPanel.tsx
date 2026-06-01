'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bell,
  EyeOff,
  HandHeart,
  Heart,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { YouthPrayerNotification, YouthPrayerRequestDto } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useYouthContext } from '@/components/youth/YouthProvider';
import { PRAYER_CATEGORIES } from '@/lib/youth';
import { YOUTH_ROUTES } from '@/lib/youth/routes';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type TabId = 'feed' | 'share' | 'mine';

export function YouthPrayerPanel() {
  const ctx = useYouthContext();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>('feed');
  const [category, setCategory] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [encourageText, setEncourageText] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    content: '',
    category: 'GUIDANCE',
    alias: 'Anonymous',
    isAnonymous: true,
    allowComments: true,
  });

  const feedUrl = category ? `/youth/prayer/feed?category=${category}` : '/youth/prayer/feed';
  const feed = useApiQuery<YouthPrayerRequestDto[]>(['youth-prayer-feed', category], feedUrl);
  const mine = useApiQuery<YouthPrayerRequestDto[]>(['youth-prayer-my'], '/youth/prayer/my');
  const notifications = useApiQuery<YouthPrayerNotification[]>(
    ['youth-prayer-notifications'],
    '/youth/prayer/notifications',
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['youth-prayer-feed'] });
    queryClient.invalidateQueries({ queryKey: ['youth-prayer-my'] });
    queryClient.invalidateQueries({ queryKey: ['youth-prayer-notifications'] });
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = form.content.trim();
    if (content.length < 5) {
      toast.error('Please write at least 5 characters');
      return;
    }
    if (!form.isAnonymous && !ctx?.memberId) {
      toast.error('Link your account to a member profile to post with your name, or post anonymously.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(
        '/youth/prayer/requests',
        {
          content,
          category: form.category,
          isAnonymous: form.isAnonymous,
          alias: form.isAnonymous ? form.alias?.trim() || 'Anonymous' : undefined,
          allowComments: form.allowComments,
        },
        { timeout: 20_000 },
      );
      toast.success('Prayer request shared');
      setForm({
        content: '',
        category: 'GUIDANCE',
        alias: 'Anonymous',
        isAnonymous: true,
        allowComments: true,
      });
      invalidate();
      setTab(ctx?.memberId ? 'mine' : 'feed');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not share request'));
    } finally {
      setSubmitting(false);
    }
  };

  const tapPray = async (id: string) => {
    try {
      await api.post(`/youth/prayer/requests/${id}/pray`);
      toast.success('You prayed for this request');
      invalidate();
    } catch {
      toast.error('Could not register prayer');
    }
  };

  const sendEncouragement = async (id: string) => {
    const body = encourageText[id]?.trim();
    if (!body) return;
    try {
      await api.post(`/youth/prayer/requests/${id}/encourage`, { body });
      toast.success('Encouragement sent');
      setEncourageText((prev) => ({ ...prev, [id]: '' }));
      invalidate();
    } catch {
      toast.error('Could not send encouragement');
    }
  };

  const archive = async (id: string) => {
    try {
      await api.delete(`/youth/prayer/requests/${id}`);
      toast.success('Request removed');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not remove'));
    }
  };

  const hideFromWall = async (id: string) => {
    try {
      await api.patch(`/youth/prayer/requests/${id}/hide`);
      toast.success('Request hidden from the wall');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not hide request'));
    }
  };

  const renderCard = (item: YouthPrayerRequestDto, showActions = true) => {
    const expanded = expandedId === item.id;
    const encouragements = item.encouragements ?? [];

    return (
      <Card key={item.id}>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{item.displayName}</Badge>
            <Badge variant="secondary" className="text-[10px]">
              {PRAYER_CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category}
            </Badge>
            {item.isOwner && <Badge variant="gold" className="text-[10px]">Yours</Badge>}
          </div>
          <p className="mt-2 text-sm leading-relaxed">{item.content}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant={item.hasPrayed ? 'secondary' : 'default'}
              disabled={item.hasPrayed}
              onClick={() => tapPray(item.id)}
              className={cn(item.hasPrayed && 'opacity-80')}
            >
              <HandHeart className="mr-1.5 h-4 w-4" />
              {item.hasPrayed ? 'Praying' : 'Tap to pray'}
              <span className="ml-1.5 rounded-full bg-background/20 px-1.5 text-xs">
                {item.prayCount}
              </span>
            </Button>
            {item.allowComments && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setExpandedId(expanded ? null : item.id)}
              >
                <MessageCircle className="mr-1 inline h-3.5 w-3.5" />
                {item.encouragementCount} encouragement
                {item.encouragementCount === 1 ? '' : 's'}
              </button>
            )}
            {ctx?.permissions.managePrayerWall && !item.isOwner && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => hideFromWall(item.id)}
                title="Hide from prayer wall"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </Button>
            )}
            {(item.isOwner || ctx?.permissions.managePrayerWall) && showActions && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-destructive"
                onClick={() => archive(item.id)}
                title="Remove request"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {expanded && item.allowComments && (
            <div className="mt-4 space-y-2 border-t pt-3">
              {encouragements.map((e) => (
                <div
                  key={e.id}
                  className="rounded-md bg-muted/50 px-3 py-2 text-xs"
                >
                  <span className="font-medium">{e.author.firstName}: </span>
                  {e.body}
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Leave encouragement…"
                  value={encourageText[item.id] ?? ''}
                  onChange={(e) =>
                    setEncourageText((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  className="h-9 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => sendEncouragement(item.id)}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const unreadPrayer = (notifications.data ?? []).filter((n) => !n.readAt);

  return (
    <>
      <PageHeader
        title="Prayer Wall"
        description="Share requests anonymously or by name. Tap to pray and encourage others."
        badge={
          <Link
            href={YOUTH_ROUTES.hub}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Youth hub
            </span>
          </Link>
        }
      />
      <div className="space-y-6 p-6 pb-24 md:p-8 md:pb-8">
        {!ctx?.memberId && (
          <Card className="border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/20">
            <CardContent className="py-3 text-sm text-muted-foreground">
              Your login is not linked to a member profile. You can still share anonymous requests;
              named posts and &quot;My requests&quot; need a linked member record.
            </CardContent>
          </Card>
        )}
        {unreadPrayer.length > 0 && (
          <Card className="border-rose-200/60 bg-rose-50/40 dark:bg-rose-950/20">
            <CardContent className="flex items-start gap-3 py-4">
              <Bell className="mt-0.5 h-5 w-5 text-rose-600" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Someone prayed for you</p>
                {unreadPrayer.slice(0, 3).map((n) => (
                  <p key={n.id} className="text-muted-foreground">
                    {n.body}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'feed' as const, label: 'Prayer feed', icon: Heart },
              { id: 'share' as const, label: 'Share request', icon: Plus },
              { id: 'mine' as const, label: 'My requests', icon: HandHeart },
            ] as const
          ).map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={tab === t.id ? 'default' : 'outline'}
              onClick={() => setTab(t.id)}
            >
              <t.icon className="mr-1.5 h-3.5 w-3.5" />
              {t.label}
            </Button>
          ))}
        </div>

        {tab === 'feed' && (
          <div className="space-y-4">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {PRAYER_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {feed.isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {(feed.data ?? []).map((item) => renderCard(item))}
            {!feed.isLoading && !feed.data?.length && (
              <p className="text-sm text-muted-foreground">No prayer requests yet — be the first to share.</p>
            )}
          </div>
        )}

        {tab === 'share' && (
          <Card className="border-rose-200/50 bg-gradient-to-br from-rose-50/40 to-background dark:from-rose-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HandHeart className="h-4 w-4 text-rose-600" />
                New prayer request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitRequest} className="space-y-3">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {PRAYER_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isAnonymous}
                    onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
                  />
                  Post anonymously
                </label>
                {form.isAnonymous && (
                  <Input
                    placeholder="Display alias"
                    value={form.alias}
                    onChange={(e) => setForm({ ...form, alias: e.target.value })}
                  />
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.allowComments}
                    onChange={(e) => setForm({ ...form, allowComments: e.target.checked })}
                  />
                  Allow encouragement comments
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Share what we can pray for…"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Share on prayer wall
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {tab === 'mine' && (
          <div className="space-y-3">
            {mine.isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {(mine.data ?? []).map((item) => renderCard(item, true))}
            {!mine.isLoading && !mine.data?.length && (
              <p className="text-sm text-muted-foreground">
                You have not shared a request yet.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
