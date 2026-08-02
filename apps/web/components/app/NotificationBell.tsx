'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CheckCheck, LifeBuoy, Loader2, Megaphone } from 'lucide-react';
import { api } from '@/lib/api';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  sentAt: string;
  readAt: string | null;
  data?: { threadId?: string; followUpId?: string };
}

export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const { isPlatformOperator, isChurchStaff, churchId } = useModuleAccess();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [supportPending, setSupportPending] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{
        notifications?: AppNotification[];
        unread?: number;
        supportPending?: number;
      }>('/notifications/me');
      setNotifications(data.notifications ?? []);
      setSupportPending(data.supportPending ?? 0);
    } catch {
      setNotifications([]);
      setSupportPending(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [churchId, isPlatformOperator, pathname]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const unread = isPlatformOperator
    ? supportPending
    : notifications.filter((n) => !n.readAt).length;

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
    } catch {
      /* ignore */
    }
  };

  const markAll = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative z-50" ref={panelRef}>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        className="relative h-10 w-10 shrink-0 rounded-full p-0 text-foreground hover:bg-muted"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
      >
        <Bell className="h-5 w-5 text-foreground" strokeWidth={2} />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-card shadow-elevated">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            {!isPlatformOperator && unread > 0 ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"
                onClick={() => void markAll()}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : isPlatformOperator ? (
              <div className="space-y-1 p-2">
                <Link
                  href="/dashboard/platform/inbox"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-muted"
                >
                  <LifeBuoy className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">
                      {supportPending > 0
                        ? `${supportPending} support thread${supportPending === 1 ? '' : 's'} need a reply`
                        : 'Support inbox'}
                    </p>
                    <p className="text-xs text-muted-foreground">Open platform messaging</p>
                  </div>
                </Link>
                <Link
                  href="/dashboard/platform/inbox?tab=broadcasts"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-muted"
                >
                  <Megaphone className="mt-0.5 h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium">Broadcast to tenants</p>
                    <p className="text-xs text-muted-foreground">Send platform announcements</p>
                  </div>
                </Link>
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.slice(0, 20).map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        'w-full px-3 py-2.5 text-left hover:bg-muted/60',
                        !n.readAt && 'bg-primary/5',
                      )}
                      onClick={() => {
                        void markRead(n.id);
                        setOpen(false);
                        if (n.type === 'PLATFORM_SUPPORT' && n.data?.threadId) {
                          router.push(`/dashboard/support?thread=${n.data.threadId}`);
                        } else if (n.type === 'PLATFORM_BROADCAST') {
                          router.push('/dashboard/support');
                        } else if (
                          n.type === 'FOLLOW_UP_ARCHIVE_REQUEST' ||
                          n.type === 'FOLLOW_UP_REMINDER' ||
                          n.type === 'FOLLOW_UP_NEW_LEAD'
                        ) {
                          router.push('/dashboard/follow-up');
                        }
                      }}
                    >
                      <p className="text-sm font-medium leading-snug">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(n.sentAt).toLocaleString()}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isChurchStaff && !isPlatformOperator ? (
            <div className="border-t border-border p-2">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/dashboard/support" onClick={() => setOpen(false)}>
                  <LifeBuoy className="mr-1.5 h-3.5 w-3.5" />
                  Contact Church_Hub support
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
