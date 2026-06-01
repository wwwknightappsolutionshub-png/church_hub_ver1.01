'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LayoutGrid, Shield, TrendingUp } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { YOUTH_ROUTES } from '@/lib/youth/routes';
import type { YouthFeedPost } from '@church-hub/shared-types';
import { useYouthContext } from '@/components/youth/YouthProvider';
import { YouthFeedList } from './YouthFeedList';
import { YouthFeedModeration } from './YouthFeedModeration';
import { YouthPostComposer } from './YouthPostComposer';

interface YouthGroup {
  id: string;
  name: string;
}

export function YouthFeedPanel() {
  const ctx = useYouthContext();
  const canModerate = ctx?.permissions.moderateContent ?? false;
  const groups = useApiQuery<YouthGroup[]>(['youth-groups-feed'], '/youth/groups');
  const [sort, setSort] = useState<'recent' | 'top'>('recent');
  const [youthGroupId, setYouthGroupId] = useState('');
  const [moderatorView, setModeratorView] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newPost, setNewPost] = useState<YouthFeedPost | null>(null);

  return (
    <>
      <PageHeader
        title="Community Feed"
        description="Instagram-style youth feed with reactions, comments, media, and leader moderation."
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
      <div className="space-y-6 p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={sort === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSort('recent')}
          >
            <LayoutGrid className="mr-1 h-3.5 w-3.5" />
            Recent
          </Button>
          <Button
            type="button"
            variant={sort === 'top' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSort('top')}
          >
            <TrendingUp className="mr-1 h-3.5 w-3.5" />
            Top
          </Button>
          <select
            value={youthGroupId}
            onChange={(e) => setYouthGroupId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All groups</option>
            {(groups.data ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {canModerate && (
            <Button
              type="button"
              variant={moderatorView ? 'default' : 'outline'}
              size="sm"
              onClick={() => setModeratorView((v) => !v)}
              aria-pressed={moderatorView}
            >
              <Shield className="mr-1 h-3.5 w-3.5" aria-hidden />
              Moderator
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <YouthPostComposer
              groups={groups.data ?? []}
              onPosted={(post) => {
                setNewPost(post);
                setRefreshKey((k) => k + 1);
              }}
            />
            <YouthFeedList
              sort={sort}
              youthGroupId={youthGroupId || undefined}
              moderatorView={moderatorView}
              refreshKey={refreshKey}
              prependPost={newPost}
            />
          </div>
          <div className="lg:col-span-1">
            <YouthFeedModeration />
          </div>
        </div>
      </div>
    </>
  );
}
