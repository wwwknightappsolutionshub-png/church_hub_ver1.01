'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  Heart,
  Loader2,
  MessageCircle,
  Plus,
  Share2,
  Sparkles,
  ThumbsUp,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import type { HubCardItem, HubKind, HubListResponse } from './hub-types';
import { HUB_THEMES } from './hub-themes';
import { HubDetailModal } from './HubDetailModal';

interface HubBoardProps {
  type: HubKind;
  title: string;
  description: string;
  hubPath: string;
}

export function HubBoard({ type, title, description, hubPath }: HubBoardProps) {
  const theme = HUB_THEMES[type];
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { isChurchStaff } = useModuleAccess();
  const [showForm, setShowForm] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<HubCardItem | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [prayerForm, setPrayerForm] = useState({
    subject: '',
    description: '',
    displayName: '',
  });
  const [praiseForm, setPraiseForm] = useState({
    testimony: '',
    description: '',
    displayName: '',
    showDisplayName: false,
  });

  const endpoint = type === 'prayer' ? '/community-hub/prayer' : '/community-hub/praise';

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['hub', type, from, to],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        if (pageParam) params.set('cursor', pageParam);
        params.set('limit', '24');
        if (from) params.set('from', new Date(from).toISOString());
        if (to) params.set('to', new Date(to).toISOString());
        const { data: res } = await api.get<HubListResponse>(`${endpoint}?${params}`);
        return res;
      },
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
    });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  useEffect(() => {
    const postId = searchParams.get('post');
    if (!postId || !items.length) return;
    const match = items.find((i) => i.id === postId);
    if (match) setSelected(match);
  }, [searchParams, items]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '240px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['hub', type] });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (type === 'prayer') {
        await api.post(endpoint, {
          subject: prayerForm.subject.trim(),
          description: prayerForm.description.trim(),
          ...(prayerForm.displayName.trim()
            ? { displayName: prayerForm.displayName.trim() }
            : {}),
        });
      } else {
        await api.post(endpoint, {
          testimony: praiseForm.testimony.trim(),
          description: praiseForm.description.trim(),
          showDisplayName: praiseForm.showDisplayName,
          ...(praiseForm.displayName.trim()
            ? { displayName: praiseForm.displayName.trim() }
            : {}),
        });
      }
      toast.success('Posted — visible to the community after quick review (~30 min)');
      setShowForm(false);
      setPrayerForm({ subject: '', description: '', displayName: '' });
      setPraiseForm({ testimony: '', description: '', displayName: '', showDisplayName: false });
      invalidate();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data
          ? String((err.response.data as { message: string | string[] }).message)
          : null;
      toast.error(msg ? (Array.isArray(msg) ? msg.join(', ') : msg) : 'Could not submit');
    } finally {
      setBusy(false);
    }
  };

  const pastorAction = async (id: string, action: 'approve' | 'delete') => {
    try {
      if (action === 'approve') await api.post(`/community-hub/${id}/approve`);
      else await api.delete(`/community-hub/${id}`);
      toast.success(action === 'approve' ? 'Approved' : 'Removed');
      invalidate();
      if (selected?.id === id) setSelected(null);
    } catch {
      toast.error('Action failed');
    }
  };

  const quickShare = async (card: HubCardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/dashboard/${hubPath}?post=${card.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: card.title, text: card.excerpt, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="min-h-0 pb-8">
      <div
        className={cn(
          'relative overflow-hidden border-b bg-gradient-to-br px-4 py-8 sm:px-6 md:px-8',
          theme.gradient,
        )}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 left-1/4 h-24 w-24 rounded-full bg-white/15 blur-xl" />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium backdrop-blur">
                {type === 'prayer' ? (
                  <Heart className={cn('h-3.5 w-3.5', theme.accentText)} />
                ) : (
                  <Sparkles className={cn('h-3.5 w-3.5', theme.accentText)} />
                )}
                Open community board
              </div>
              <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
            </div>
            <Button
              className={cn('w-full shrink-0 shadow-lg sm:w-auto', theme.cta)}
              onClick={() => setShowForm(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {type === 'prayer' ? 'Share prayer' : 'Share testimony'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 md:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="datetime-local"
            className="h-9 w-full min-w-0 flex-1 text-xs sm:max-w-[180px]"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From date"
          />
          <Input
            type="datetime-local"
            className="h-9 w-full min-w-0 flex-1 text-xs sm:max-w-[180px]"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To date"
          />
          <Button variant="outline" size="sm" onClick={invalidate}>
            Refresh
          </Button>
        </div>

        {showForm && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
              aria-label="Close form"
            />
            <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[85dvh] max-w-lg overflow-y-auto rounded-2xl border bg-card p-5 shadow-2xl sm:inset-x-auto sm:bottom-auto sm:top-[10%]">
              <h2 className="font-heading text-lg font-bold">
                New {type === 'prayer' ? 'prayer request' : 'testimony'}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Everyone in your church can read approved posts. Names stay anonymous unless you opt
                in.
              </p>
              <form onSubmit={submit} className="mt-4 space-y-3">
                {type === 'prayer' ? (
                  <>
                    <Input
                      placeholder="Prayer subject"
                      value={prayerForm.subject}
                      onChange={(e) => setPrayerForm({ ...prayerForm, subject: e.target.value })}
                      required
                    />
                    <textarea
                      className="min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="Tell us how we can pray…"
                      value={prayerForm.description}
                      onChange={(e) =>
                        setPrayerForm({ ...prayerForm, description: e.target.value })
                      }
                      required
                    />
                    <Input
                      placeholder="Display as (optional — leave blank for anonymous)"
                      value={prayerForm.displayName}
                      onChange={(e) =>
                        setPrayerForm({ ...prayerForm, displayName: e.target.value })
                      }
                    />
                  </>
                ) : (
                  <>
                    <Input
                      placeholder="Testimony headline"
                      value={praiseForm.testimony}
                      onChange={(e) => setPraiseForm({ ...praiseForm, testimony: e.target.value })}
                      required
                    />
                    <textarea
                      className="min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="Your full story…"
                      value={praiseForm.description}
                      onChange={(e) =>
                        setPraiseForm({ ...praiseForm, description: e.target.value })
                      }
                      required
                    />
                    <Input
                      placeholder="Your name (optional)"
                      value={praiseForm.displayName}
                      onChange={(e) =>
                        setPraiseForm({ ...praiseForm, displayName: e.target.value })
                      }
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={praiseForm.showDisplayName}
                        onChange={(e) =>
                          setPraiseForm({ ...praiseForm, showDisplayName: e.target.checked })
                        }
                      />
                      Show my name on the card
                    </label>
                  </>
                )}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post to community'}
                </Button>
              </form>
            </div>
          </>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className={cn('h-8 w-8 animate-spin', theme.accentText)} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {items.map((card) => (
            <article
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(card)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(card);
                }
              }}
              className={cn(
                'cursor-pointer',
                'group flex flex-col rounded-2xl border bg-card p-4 text-left shadow-sm transition',
                'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2',
                theme.ring,
                card.status !== 'APPROVED' && 'opacity-90',
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <span
                  className={cn(
                    'line-clamp-2 font-heading text-sm font-semibold leading-snug',
                    theme.accentText,
                  )}
                >
                  {card.title}
                </span>
                <Badge
                  variant={
                    card.status === 'APPROVED'
                      ? 'success'
                      : card.status === 'PENDING'
                        ? 'gold'
                        : 'outline'
                  }
                  className="shrink-0 text-[9px]"
                >
                  {card.status === 'APPROVED' ? 'Live' : card.status}
                </Badge>
              </div>
              <p className="line-clamp-4 flex-1 text-xs leading-relaxed text-muted-foreground">
                {card.excerpt}
              </p>
              <p className="mt-2 text-[10px] text-muted-foreground">
                {card.displayName ?? 'Anonymous'} ·{' '}
                {new Date(card.createdAt).toLocaleDateString()}
              </p>
              {card.status === 'APPROVED' && (
                <div className="mt-3 flex items-center justify-between border-t pt-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <ThumbsUp className={cn('h-3 w-3', card.likedByMe && 'fill-current')} />
                    {card.likeCount}
                    <MessageCircle className="h-3 w-3" />
                    {card.commentCount}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => quickShare(card, e)}
                    className="rounded p-1 hover:bg-muted"
                    aria-label="Share"
                  >
                    <Share2 className="h-3 w-3" />
                  </button>
                </div>
              )}
              {isChurchStaff && card.status === 'PENDING' && (
                <div className="mt-2 flex gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => pastorAction(card.id, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => pastorAction(card.id, 'delete')}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>

        {!isLoading && items.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No posts yet — be the first to share with your church family.
          </p>
        )}

        <div ref={sentinelRef} className="h-4" aria-hidden />
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Loader2 className={cn('h-6 w-6 animate-spin', theme.accentText)} />
          </div>
        )}
      </div>

      {selected && (
        <HubDetailModal
          card={selected}
          type={type}
          hubPath={hubPath}
          open={!!selected}
          onClose={() => setSelected(null)}
          onEngagementChange={invalidate}
        />
      )}
    </div>
  );
}
