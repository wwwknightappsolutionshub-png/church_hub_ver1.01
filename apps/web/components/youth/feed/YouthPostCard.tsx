'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  Flame,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Sparkles,
  ThumbsUp,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { YouthFeedComment, YouthFeedPost, YouthReactionType } from '@church-hub/shared-types';
import { cn } from '@/lib/utils';

const REACTIONS: { type: YouthReactionType; icon: typeof Heart; label: string }[] = [
  { type: 'LIKE', icon: ThumbsUp, label: 'Like' },
  { type: 'LOVE', icon: Heart, label: 'Love' },
  { type: 'AMEN', icon: Sparkles, label: 'Amen' },
  { type: 'FIRE', icon: Flame, label: 'Fire' },
  { type: 'SAVE', icon: Bookmark, label: 'Save' },
];

interface Props {
  post: YouthFeedPost;
  showModeration?: boolean;
  onModerated?: () => void;
}

export function YouthPostCard({ post, showModeration, onModerated }: Props) {
  const queryClient = useQueryClient();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<YouthFeedComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [myReactions, setMyReactions] = useState(post.myReactions);

  const authorName = `${post.author.firstName} ${post.author.lastName}`;
  const time = new Date(post.createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const toggleReaction = async (reactionType: YouthReactionType) => {
    const has = myReactions.includes(reactionType);
    try {
      if (has) {
        await api.delete('/youth/feed/reactions', { data: { postId: post.id, reactionType } });
        setMyReactions((prev: YouthReactionType[]) => prev.filter((r) => r !== reactionType));
      } else {
        await api.post('/youth/feed/reactions', { postId: post.id, reactionType });
        setMyReactions((prev: YouthReactionType[]) => [...prev, reactionType]);
      }
      queryClient.invalidateQueries({ queryKey: ['youth-feed'] });
    } catch {
      toast.error('Reaction failed');
    }
  };

  const loadComments = async () => {
    if (commentsOpen) {
      setCommentsOpen(false);
      return;
    }
    setLoadingComments(true);
    try {
      const { data } = await api.get<YouthFeedComment[]>(`/youth/feed/posts/${post.id}/comments`);
      setComments(data);
      setCommentsOpen(true);
    } catch {
      toast.error('Could not load comments');
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    try {
      const { data } = await api.post<YouthFeedComment>(`/youth/feed/posts/${post.id}/comments`, {
        content: trimmed,
      });
      setComments((prev) => [...prev, data]);
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['youth-feed'] });
    } catch {
      toast.error('Could not post comment');
    }
  };

  const submitReport = async () => {
    try {
      await api.post(`/youth/feed/posts/${post.id}/report`, { reason: reportReason.trim() || 'Inappropriate' });
      toast.success('Report submitted');
      setReportOpen(false);
      setReportReason('');
    } catch {
      toast.error('Report failed');
    }
  };

  const moderate = async (status: 'PUBLISHED' | 'HIDDEN' | 'REMOVED') => {
    try {
      await api.patch(`/youth/feed/posts/${post.id}/moderate`, { status });
      toast.success(`Post marked ${status.toLowerCase()}`);
      onModerated?.();
    } catch {
      toast.error('Moderation failed');
    }
  };

  return (
    <Card className={cn(post.status === 'FLAGGED' && 'border-amber-300/80')}>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
        <Avatar className="h-10 w-10">
          {post.author.avatarUrl && <AvatarImage src={post.author.avatarUrl} alt={authorName} />}
          <AvatarFallback>
            {post.author.firstName[0]}
            {post.author.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">{authorName}</p>
          <p className="text-xs text-muted-foreground">
            {post.youthGroup?.name ?? 'Church-wide'} · {time}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {post.status === 'FLAGGED' && (
            <Badge variant="outline" className="gap-1 border-amber-400 text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              Flagged
            </Badge>
          )}
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 px-2" onClick={() => setReportOpen((v) => !v)}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="whitespace-pre-wrap text-sm">{post.content}</p>
        {post.hashtags.length > 0 && (
          <p className="text-xs text-primary">
            {post.hashtags.map((t: string) => `#${t}`).join(' ')}
          </p>
        )}
        {post.media[0] && (
          <img
            src={post.media[0].url}
            alt=""
            className="max-h-96 w-full rounded-lg border object-cover"
          />
        )}
        {reportOpen && (
          <div className="flex gap-2 rounded-lg border bg-muted/30 p-2">
            <Input
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Reason for report"
              className="h-8 text-sm"
            />
            <Button type="button" size="sm" variant="destructive" onClick={submitReport}>
              Report
            </Button>
          </div>
        )}
        {showModeration && post.status !== 'PUBLISHED' && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => moderate('PUBLISHED')}>
              Approve
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => moderate('HIDDEN')}>
              Hide
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => moderate('REMOVED')}>
              Remove
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 border-t pt-3">
        <div className="flex w-full flex-wrap gap-1">
          {REACTIONS.map(({ type, icon: Icon, label }) => (
            <Button
              key={type}
              type="button"
              variant={myReactions.includes(type) ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1 px-2 text-xs"
              onClick={() => toggleReaction(type)}
            >
              <Icon className="h-3.5 w-3.5" />
              {post.reactionSummary[type] ? `${post.reactionSummary[type]}` : label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={loadComments}
        >
          <MessageCircle className="h-4 w-4" />
          {post.commentCount} comments
          {loadingComments && '…'}
        </Button>
        {commentsOpen && (
          <div className="w-full space-y-2 border-t pt-2">
            {comments.map((c) => (
              <div key={c.id} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">
                  {c.author.firstName} {c.author.lastName}
                </span>
                <p className="text-muted-foreground">{c.content}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                className="h-9"
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              />
              <Button type="button" size="sm" onClick={submitComment}>
                Reply
              </Button>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
