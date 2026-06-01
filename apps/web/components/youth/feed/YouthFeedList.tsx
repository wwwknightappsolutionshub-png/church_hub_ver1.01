'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { YouthFeedPage, YouthFeedPost } from '@church-hub/shared-types';
import { YouthPostCard } from './YouthPostCard';

interface Props {
  sort: 'recent' | 'top';
  youthGroupId?: string;
  moderatorView?: boolean;
  refreshKey?: number;
  prependPost?: YouthFeedPost | null;
}

export function YouthFeedList({
  sort,
  youthGroupId,
  moderatorView,
  refreshKey = 0,
  prependPost,
}: Props) {
  const [posts, setPosts] = useState<YouthFeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const buildUrl = useCallback(
    (nextCursor?: string | null) => {
      const params = new URLSearchParams();
      params.set('sort', sort);
      params.set('limit', '10');
      if (youthGroupId) params.set('youthGroupId', youthGroupId);
      if (moderatorView) params.set('moderator', 'true');
      if (nextCursor) params.set('cursor', nextCursor);
      return `/youth/feed/posts?${params.toString()}`;
    },
    [sort, youthGroupId, moderatorView],
  );

  const loadPage = useCallback(
    async (nextCursor?: string | null, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const { data } = await api.get<YouthFeedPage>(buildUrl(nextCursor));
        setError(null);
        setPosts((prev) => (append ? [...prev, ...data.items] : data.items));
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      } catch {
        setError(
          'Feed API unavailable. Restart the API server (port 4000) so /youth/feed routes load.',
        );
        if (!append) setPosts([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildUrl],
  );

  useEffect(() => {
    loadPage(null, false);
  }, [loadPage, refreshKey]);

  useEffect(() => {
    if (!prependPost) return;
    setPosts((prev) => (prev.some((p) => p.id === prependPost.id) ? prev : [prependPost, ...prev]));
  }, [prependPost]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && cursor && !loadingMore && !loading) {
          loadPage(cursor, true);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, hasMore, loading, loadingMore, loadPage]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 py-8 px-4 text-center text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (!posts.length) {
    return (
      <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        No posts yet. Be the first to share!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <YouthPostCard
          key={post.id}
          post={post}
          showModeration={moderatorView}
          onModerated={() => loadPage(null, false)}
        />
      ))}
      <div ref={sentinelRef} className="h-4" />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {!hasMore && posts.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">You&apos;re all caught up</p>
      )}
    </div>
  );
}
