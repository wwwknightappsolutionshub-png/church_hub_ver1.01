'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CreateYouthPostInput, YouthFeedPost } from '@church-hub/shared-types';

interface YouthGroup {
  id: string;
  name: string;
}

interface Props {
  groups: YouthGroup[];
  onPosted: (post: YouthFeedPost) => void;
}

export function YouthPostComposer({ groups, onPosted }: Props) {
  const [content, setContent] = useState('');
  const [youthGroupId, setYouthGroupId] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only images are supported in this demo uploader');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setMediaUrl(result);
      toast.success('Image attached (stored as data URL for demo)');
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error('Write something to post');
      return;
    }
    setSubmitting(true);
    try {
      const body: CreateYouthPostInput = {
        content: trimmed,
        youthGroupId: youthGroupId || undefined,
        media: mediaUrl
          ? [{ url: mediaUrl, kind: 'IMAGE' as const }]
          : undefined,
      };
      const { data } = await api.post<YouthFeedPost>('/youth/feed/posts', body);
      if (data.status === 'FLAGGED') {
        toast.warning('Post flagged by moderation — leaders will review before it appears publicly');
      } else {
        toast.success('Posted to the feed');
      }
      setContent('');
      setMediaUrl('');
      onPosted(data);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast.error(msg ?? 'Could not create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New post</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share encouragement, photos, or #hashtags…"
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[140px] flex-1">
              <Label htmlFor="feed-group" className="text-xs text-muted-foreground">
                Group (optional)
              </Label>
              <select
                id="feed-group"
                value={youthGroupId}
                onChange={(e) => setYouthGroupId(e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Church-wide</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-1 items-end gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="mr-1 h-4 w-4" />
                Photo
              </Button>
              <div className="flex-1">
                <Label htmlFor="feed-url" className="text-xs text-muted-foreground">
                  Or image URL
                </Label>
                <Input
                  id="feed-url"
                  value={mediaUrl.startsWith('data:') ? '' : mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://…"
                  className="mt-1 h-9"
                />
              </div>
            </div>
          </div>
          {mediaUrl && (
            <img
              src={mediaUrl}
              alt="Preview"
              className="max-h-40 rounded-lg border object-cover"
            />
          )}
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Post
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
