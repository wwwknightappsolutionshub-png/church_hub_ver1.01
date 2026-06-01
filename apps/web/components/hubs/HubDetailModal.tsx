'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  MessageCircle,
  Share2,
  ThumbsUp,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { HubCardItem, HubKind } from './hub-types';
import { HUB_THEMES } from './hub-themes';

interface HubComment {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

interface Props {
  card: HubCardItem;
  type: HubKind;
  hubPath: string;
  open: boolean;
  onClose: () => void;
  onEngagementChange: () => void;
}

export function HubDetailModal({
  card,
  type,
  hubPath,
  open,
  onClose,
  onEngagementChange,
}: Props) {
  const theme = HUB_THEMES[type];
  const [detail, setDetail] = useState(card);
  const [liked, setLiked] = useState(card.likedByMe);
  const [likeCount, setLikeCount] = useState(card.likeCount);
  const [commentCount, setCommentCount] = useState(card.commentCount);
  const [comments, setComments] = useState<HubComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [busyLike, setBusyLike] = useState(false);
  const [busyComment, setBusyComment] = useState(false);

  useEffect(() => {
    setDetail(card);
    setLiked(card.likedByMe);
    setLikeCount(card.likeCount);
    setCommentCount(card.commentCount);
  }, [card]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const { data } = await api.get<HubComment[]>(
        `/community-hub/posts/${card.id}/comments`,
      );
      setComments(data);
    } catch {
      toast.error('Could not load comments');
    } finally {
      setLoadingComments(false);
    }
  }, [card.id]);

  useEffect(() => {
    if (open && card.status === 'APPROVED') void loadComments();
    if (!open) setComments([]);
  }, [open, card.id, card.status, loadComments]);

  const toggleLike = async () => {
    if (card.status !== 'APPROVED') return;
    setBusyLike(true);
    try {
      const { data } = await api.post<{ liked: boolean }>(
        `/community-hub/posts/${card.id}/like`,
      );
      setLiked(data.liked);
      setLikeCount((n) => (data.liked ? n + 1 : Math.max(0, n - 1)));
      onEngagementChange();
    } catch {
      toast.error('Could not update like');
    } finally {
      setBusyLike(false);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = commentText.trim();
    if (!body) return;
    setBusyComment(true);
    try {
      const { data } = await api.post<HubComment>(
        `/community-hub/posts/${card.id}/comments`,
        { body },
      );
      setComments((prev) => [...prev, data]);
      setCommentCount((n) => n + 1);
      setCommentText('');
      onEngagementChange();
    } catch {
      toast.error('Could not post comment');
    } finally {
      setBusyComment(false);
    }
  };

  const sharePost = async () => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard/${hubPath}?post=${card.id}`
        : '';
    const title = detail.title;
    const text = detail.description.slice(0, 200);
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else if (url) {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied — share with members');
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        toast.error('Share cancelled or unavailable');
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hub-modal-title"
        className={cn(
          'relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border bg-card shadow-2xl sm:max-h-[85vh] sm:rounded-3xl',
          'animate-in slide-in-from-bottom-4 duration-300 sm:zoom-in-95',
        )}
      >
        <div className={cn('bg-gradient-to-br px-5 pb-4 pt-5', theme.gradient)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Badge
                variant={detail.status === 'APPROVED' ? 'success' : 'gold'}
                className="mb-2 text-[10px]"
              >
                {detail.status}
              </Badge>
              <h2 id="hub-modal-title" className="font-heading text-xl font-bold leading-tight">
                {detail.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {detail.displayName ?? 'Anonymous'} ·{' '}
                {new Date(detail.createdAt).toLocaleString()}
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{detail.description}</p>

          {detail.status === 'APPROVED' && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={liked ? 'default' : 'outline'}
                  size="sm"
                  disabled={busyLike}
                  onClick={toggleLike}
                  className={cn(liked && theme.cta)}
                >
                  {busyLike ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ThumbsUp className={cn('mr-1.5 h-4 w-4', liked && 'fill-current')} />
                  )}
                  {likeCount}{' '}
                  {type === 'prayer'
                    ? likeCount === 1
                      ? 'praying'
                      : 'praying'
                    : likeCount === 1
                      ? 'amen'
                      : 'amens'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={sharePost}>
                  <Share2 className="mr-1.5 h-4 w-4" />
                  Share
                </Button>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <MessageCircle className="h-4 w-4" />
                  Comments ({commentCount})
                </p>
                {loadingComments ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-3">
                    {comments.map((c) => (
                      <li key={c.id} className="text-sm">
                        <span className="font-medium">{c.authorName}</span>
                        <span className="text-muted-foreground">
                          {' '}
                          · {new Date(c.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        <p className="mt-0.5 text-muted-foreground">{c.body}</p>
                      </li>
                    ))}
                    {!comments.length && (
                      <li className="text-center text-sm text-muted-foreground">
                        Be the first to encourage with a comment.
                      </li>
                    )}
                  </ul>
                )}
                <form onSubmit={submitComment} className="mt-3 flex gap-2">
                  <Input
                    placeholder="Write an encouraging comment…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    maxLength={2000}
                  />
                  <Button type="submit" size="sm" disabled={busyComment || !commentText.trim()}>
                    Post
                  </Button>
                </form>
              </div>
            </div>
          )}

          {detail.status === 'PENDING' && (
            <p className="mt-4 rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              Visible to you while pending. The community will see it after pastor approval or in about
              30 minutes.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
