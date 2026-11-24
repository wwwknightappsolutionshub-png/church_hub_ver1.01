'use client';

import { useCallback, useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ReleaseItem = {
  id: string;
  title: string;
  body: string;
  sentAt: string;
  data?: { category?: string; version?: string; kind?: string };
};

const BANNER_SESSION_KEY = 'churchhub.whatsNewBannerDismissed';

export function WhatsNewBanner() {
  const [items, setItems] = useState<ReleaseItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hidden, setHidden] = useState(true);

  const load = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem(BANNER_SESSION_KEY) === '1') {
        setHidden(true);
        return;
      }
      const { data } = await api.get<{ items?: ReleaseItem[]; unread?: number }>(
        '/notifications/whats-new',
      );
      const list = data.items ?? [];
      setItems(list);
      setHidden(list.length === 0);
    } catch {
      setItems([]);
      setHidden(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dismiss = async () => {
    try {
      await api.post('/notifications/whats-new/dismiss');
    } catch {
      /* ignore */
    }
    sessionStorage.setItem(BANNER_SESSION_KEY, '1');
    setHidden(true);
    setDrawerOpen(false);
  };

  if (hidden || items.length === 0) return null;

  const latest = items[0]!;

  return (
    <>
      <div
        className={cn(
          'relative z-30 border-b border-amber-200/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white',
        )}
      >
        <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-2.5 sm:items-center sm:px-6">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-300 sm:mt-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300/90">
              What&apos;s New in Church_Hub
              {latest.data?.version ? ` · ${latest.data.version}` : ''}
            </p>
            <p className="truncate text-sm font-medium">{latest.title}</p>
            <p className="line-clamp-1 text-xs text-white/70">{latest.body}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 bg-white/10 text-white hover:bg-white/20"
              onClick={() => setDrawerOpen(true)}
            >
              View
            </Button>
            <Button
              size="sm"
              className="h-8 bg-amber-400 text-slate-900 hover:bg-amber-300"
              onClick={() => void dismiss()}
            >
              Got it
            </Button>
            <button
              type="button"
              aria-label="Dismiss"
              className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => void dismiss()}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close drawer"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-card shadow-elevated">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold">What&apos;s New</p>
                <p className="text-xs text-muted-foreground">Recent Church_Hub updates</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setDrawerOpen(false)}>
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.data?.category ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                          {item.data.category}
                        </span>
                      ) : null}
                      {item.data?.version ? (
                        <span className="text-[10px] text-muted-foreground">{item.data.version}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-medium">{item.title}</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{item.body}</p>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {new Date(item.sentAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t p-3">
              <Button className="w-full" onClick={() => void dismiss()}>
                Mark as read / Got it
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                After dismissing, you can still find updates in the notification bell.
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
