'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  AlarmClock,
  BookOpen,
  ChevronLeft,
  Flame,
  Loader2,
  PenLine,
  TrendingUp,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Wisdom365SubscriptionSummary, Wisdom365VariantDto } from '@church-hub/shared-types';
import {
  fetchDayContent,
  fetchChurchInsights,
  fetchHistory,
  fetchProgress,
  fetchTodayContent,
  markDayComplete,
  saveReminder,
  toPersonalDay,
  type Wisdom365HistoryItem,
} from '@/lib/wisdom365-api';
import { WISDOM365_TABS, WISDOM365_TAGLINE, type Wisdom365TabId, defaultReminderSettings } from '@/lib/wisdom365';
import {
  ensureWisdom365NotificationPermission,
  formatReminderTime,
} from '@/lib/wisdom365-reminder';
import { WISDOM365_REMINDERS_SYNC_EVENT } from '@/lib/hooks/use-wisdom365-reminder';
import { preloadSpeechVoices, speakWisdom365, stopWisdom365Speech } from '@/lib/wisdom365-speech';
import { Wisdom365RenewalBanner } from '@/components/wisdom365/Wisdom365RenewalBanner';
import { userDisplayName } from '@/lib/user-display';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { Wisdom365Hero } from '@/components/wisdom365/Wisdom365Hero';
import { Wisdom365MobileTabNav } from '@/components/wisdom365/Wisdom365MobileTabNav';
import { Wisdom365TodayCard } from '@/components/wisdom365/Wisdom365TodayCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const WELCOME_SPOKEN_KEY = 'wisdom365-welcome-spoken';

export function Wisdom365JourneyPanel({
  variant,
  subscriptions = [],
  licensePricePence,
  onBack,
}: {
  variant: Wisdom365VariantDto;
  subscriptions?: Wisdom365SubscriptionSummary[];
  licensePricePence?: number;
  onBack?: () => void;
}) {
  const { isChurchStaff, user, member } = useModuleAccess();
  const firstName = userDisplayName(user, member, 'friend').split(' ')[0];
  const slug = variant.slug;

  const [tab, setTab] = useState<Wisdom365TabId>('today');
  const [loading, setLoading] = useState(true);
  const [personalDay, setPersonalDay] = useState<ReturnType<typeof toPersonalDay> | null>(null);
  const [history, setHistory] = useState<Wisdom365HistoryItem[]>([]);
  const [viewDay, setViewDay] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [completedToday, setCompletedToday] = useState(false);
  const [journal, setJournal] = useState('');
  const [savingJournal, setSavingJournal] = useState(false);
  const [reminder, setReminder] = useState(defaultReminderSettings());
  const [savingReminder, setSavingReminder] = useState(false);
  const [churchInsights, setChurchInsights] = useState<Awaited<ReturnType<typeof fetchChurchInsights>> | null>(null);
  const welcomeSpokenRef = useRef(false);

  const visibleTabs = WISDOM365_TABS.filter((t) => t.id !== 'insights' || isChurchStaff);

  const loadToday = useCallback(async () => {
    setLoading(true);
    try {
      const [day, progress] = await Promise.all([
        fetchTodayContent(slug, firstName),
        fetchProgress(slug),
      ]);
      setPersonalDay(toPersonalDay(day));
      setStreak(progress.streak);
      setCompletedToday(progress.completedToday);
      if (progress.reminder) {
        setReminder({
          hour: progress.reminder.hour,
          minute: progress.reminder.minute,
          alarmEnabled: progress.reminder.alarmEnabled,
          timezone: progress.reminder.timezone,
        });
      }
    } catch {
      toast.error('Could not load today\'s wisdom');
    } finally {
      setLoading(false);
    }
  }, [slug, firstName]);

  const loadHistory = useCallback(async () => {
    try {
      const items = await fetchHistory(slug);
      setHistory(items);
    } catch {
      toast.error('Could not load history');
    }
  }, [slug]);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  useEffect(() => {
    if (tab === 'library') void loadHistory();
  }, [tab, loadHistory]);

  useEffect(() => {
    if (tab === 'insights' && !isChurchStaff) setTab('today');
  }, [tab, isChurchStaff]);

  useEffect(() => {
    if (tab === 'insights' && isChurchStaff) {
      void fetchChurchInsights().then(setChurchInsights).catch(() => setChurchInsights(null));
    }
  }, [tab, isChurchStaff]);

  const speakWelcome = useCallback(() => {
    if (!personalDay || welcomeSpokenRef.current) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    const spokenKey = `${WELCOME_SPOKEN_KEY}-${slug}-${todayKey}`;
    if (sessionStorage.getItem(spokenKey)) return;
    preloadSpeechVoices();
    speakWisdom365(`${personalDay.greeting} ${personalDay.focusLine}`, {
      onStart: () => {
        welcomeSpokenRef.current = true;
        sessionStorage.setItem(spokenKey, '1');
      },
    });
  }, [personalDay, slug]);

  useEffect(() => {
    if (tab === 'today' && personalDay) {
      const t = setTimeout(speakWelcome, 600);
      return () => clearTimeout(t);
    }
  }, [tab, personalDay, speakWelcome]);

  useEffect(() => () => stopWisdom365Speech(), []);

  const openHistoryDay = async (dayOfYear: number) => {
    try {
      const day = await fetchDayContent(slug, dayOfYear, firstName);
      setPersonalDay(toPersonalDay(day));
      setViewDay(dayOfYear);
      setTab('today');
    } catch {
      toast.error('That day is not available (30-day window, no future days)');
    }
  };

  const handleComplete = async () => {
    try {
      const result = await markDayComplete(slug);
      setStreak(result.streak);
      setCompletedToday(true);
      toast.success('Today marked complete!');
    } catch {
      toast.error('Could not save progress');
    }
  };

  const handleSaveJournal = async () => {
    setSavingJournal(true);
    try {
      await markDayComplete(slug, journal);
      toast.success('Application saved');
    } catch {
      toast.error('Could not save journal');
    } finally {
      setSavingJournal(false);
    }
  };

  const handleSaveReminder = async () => {
    setSavingReminder(true);
    try {
      if (reminder.alarmEnabled) {
        await ensureWisdom365NotificationPermission();
      }
      await saveReminder(slug, reminder);
      window.dispatchEvent(new Event(WISDOM365_REMINDERS_SYNC_EVENT));
      toast.success(`Reminder set for ${formatReminderTime(reminder)}`);
    } catch {
      toast.error('Could not save reminder');
    } finally {
      setSavingReminder(false);
    }
  };

  const streakLabel = personalDay
    ? streak > 0
      ? `${streak}-day streak · Day ${personalDay.dayOfYear} of 365`
      : `Day ${personalDay.dayOfYear} of 365`
    : undefined;

  const contentPad =
    'pb-[calc(9rem+env(safe-area-inset-bottom))] xl:pb-[calc(5rem+env(safe-area-inset-bottom))]';

  if (loading && !personalDay) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Wisdom365RenewalBanner
        subscriptions={subscriptions}
        licensePricePence={licensePricePence}
      />

      {onBack && (
        <div className="border-b px-4 py-2">
          <Button variant="ghost" size="sm" className="gap-1" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" /> All journeys
          </Button>
        </div>
      )}

      {tab === 'today' ? (
        <Wisdom365Hero
          compact
          streakLabel={streakLabel}
          badge={
            <Badge variant="outline" className="border-amber-500/40 text-amber-600">
              {variant.name}
            </Badge>
          }
        />
      ) : (
        <Wisdom365Hero description={`${variant.name} · ${WISDOM365_TAGLINE}`} streakLabel={streakLabel} />
      )}

      <div className={cn('flex flex-1 flex-col', contentPad)}>
        {tab === 'today' && personalDay && (
          <>
            {viewDay !== null && viewDay !== personalDay.dayOfYear && (
              <p className="mx-auto max-w-lg px-4 pt-4 text-center text-xs text-muted-foreground">
                Viewing Day {viewDay}{' '}
                <button type="button" className="text-primary underline" onClick={() => void loadToday()}>
                  Back to today
                </button>
              </p>
            )}
            <Wisdom365TodayCard
              day={personalDay}
              streak={streak}
              completedToday={completedToday}
              onMarkComplete={handleComplete}
            />
          </>
        )}

        {tab === 'journey' && personalDay && (
          <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{variant.name} journey</CardTitle>
                <CardDescription>{variant.bibleTranslationLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex justify-between text-sm">
                  <span>Day {personalDay.dayOfYear}</span>
                  <span className="text-muted-foreground">of 365</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                    style={{ width: `${Math.min(100, (personalDay.dayOfYear / 365) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flame className="h-4 w-4 text-amber-500" /> Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-4xl font-bold">{streak}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlarmClock className="h-4 w-4" /> Daily reminder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  type="time"
                  value={`${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    setReminder((r) => ({ ...r, hour: h ?? 7, minute: m ?? 0 }));
                  }}
                  className="w-full rounded-lg border px-3 py-3 text-base"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={reminder.alarmEnabled}
                    onChange={(e) => setReminder((r) => ({ ...r, alarmEnabled: e.target.checked }))}
                  />
                  Device alarm & notification
                </label>
                <Button className="w-full" onClick={handleSaveReminder} disabled={savingReminder}>
                  Save reminder
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'apply' && personalDay && (
          <div className="mx-auto w-full max-w-lg px-4 py-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PenLine className="h-4 w-4" /> Life application
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => speakWisdom365(personalDay.personalApplication)}
                >
                  <Volume2 className="mr-1 h-4 w-4" /> Listen
                </Button>
                <p className="rounded-lg bg-muted/50 p-3 text-sm">{personalDay.personalApplication}</p>
                <Textarea value={journal} onChange={(e) => setJournal(e.target.value)} rows={6} />
                <Button className="w-full" onClick={handleSaveJournal} disabled={savingJournal}>
                  Save entry
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'library' && (
          <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-6">
            <p className="text-sm text-muted-foreground">
              Past 30 days only — future days unlock automatically each morning.
            </p>
            {history.map((item) => (
              <button
                key={item.dayOfYear}
                type="button"
                onClick={() => void openHistoryDay(item.dayOfYear)}
                className="block w-full overflow-hidden rounded-xl border text-left shadow-sm transition hover:border-amber-500/50"
              >
                <div className="relative h-28">
                  <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="480px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white">
                    <p className="font-semibold">{item.reference}</p>
                    <p className="text-xs">{item.title}</p>
                  </div>
                  {item.isToday && (
                    <Badge className="absolute right-2 top-2 bg-amber-500 text-slate-950">Today</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === 'insights' && isChurchStaff && (
          <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
            {churchInsights && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Church engagement</CardTitle>
                  <CardDescription>Wisdom365+ activity in your congregation</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-2xl font-bold">{churchInsights.activeSubscriptions}</p>
                    <p className="text-xs text-muted-foreground">Active subscribers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{churchInsights.assignedJourneys}</p>
                    <p className="text-xs text-muted-foreground">Assigned journeys</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{churchInsights.completionsLast7Days}</p>
                    <p className="text-xs text-muted-foreground">Completions (7 days)</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{churchInsights.totalLicenses}</p>
                    <p className="text-xs text-muted-foreground">Total licenses</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {churchInsights?.byVariant.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">By journey</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {churchInsights.byVariant.map((v) => (
                    <div key={v.slug} className="flex justify-between text-sm">
                      <span>{v.name}</span>
                      <span className="font-medium">{v.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4" /> Leader tools
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/devotional-hub/plans/new">Create devotional plan</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/communications">Send reminder</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Wisdom365MobileTabNav tabs={visibleTabs} active={tab} onChange={setTab} />
    </div>
  );
}
