'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CalendarCheck, Check, Pause, Volume2 } from 'lucide-react';
import type { Wisdom365PersonalDay } from '@/lib/wisdom365';
import {
  isWisdom365Speaking,
  speakWisdom365,
  stopWisdom365Speech,
  preloadSpeechVoices,
} from '@/lib/wisdom365-speech';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Wisdom365TodayCard({
  day,
  streak,
  completedToday,
  onMarkComplete,
}: {
  day: Wisdom365PersonalDay;
  streak: number;
  completedToday: boolean;
  onMarkComplete: () => void;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [imgError, setImgError] = useState(false);

  const toggleListen = () => {
    if (isWisdom365Speaking()) {
      stopWisdom365Speech();
      setSpeaking(false);
      return;
    }
    preloadSpeechVoices();
    const ok = speakWisdom365(day.audioScript, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
    if (!ok) setSpeaking(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <article className="relative mx-auto w-full max-w-lg flex-1 overflow-hidden rounded-none sm:rounded-2xl sm:shadow-2xl">
        <div className="relative min-h-[min(78dvh,720px)] w-full">
          {!imgError ? (
            <Image
              src={day.imageUrl}
              alt=""
              fill
              priority
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 480px"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="absolute inset-0 bg-gradient-to-br from-amber-900 via-slate-900 to-slate-950"
              aria-hidden
            />
          )}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25"
            aria-hidden
          />

          <div className="relative flex h-full min-h-[min(78dvh,720px)] flex-col justify-between p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-white/20 bg-white/10 text-white backdrop-blur">
                  Day {day.dayOfYear}
                </Badge>
                <Badge variant="outline" className="border-amber-400/50 text-amber-200">
                  {day.theme}
                </Badge>
                {streak > 0 && (
                  <span className="text-xs font-medium text-amber-200/90">{streak}-day streak</span>
                )}
              </div>
              <p className="text-lg font-medium leading-snug text-white/95">{day.greeting}</p>
              <p className="text-sm font-semibold text-amber-300">{day.focusLine}</p>
            </div>

            <div className="space-y-5">
              <p className="font-heading text-xl font-bold leading-snug text-white sm:text-2xl">
                {day.passage}
              </p>
              <p className="text-sm font-semibold tracking-wide text-amber-300/90">
                {day.reference}
              </p>
              <p className="text-sm leading-relaxed text-white/85">{day.personalWisdom}</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-4">
              <Button
                type="button"
                size="lg"
                variant="secondary"
                className={cn(
                  'min-h-12 flex-1 gap-2 bg-white/15 text-white backdrop-blur hover:bg-white/25 sm:flex-none',
                  speaking && 'ring-2 ring-amber-400',
                )}
                onClick={toggleListen}
              >
                {speaking ? (
                  <>
                    <Pause className="h-5 w-5" /> Stop
                  </>
                ) : (
                  <>
                    <Volume2 className="h-5 w-5" /> Listen
                  </>
                )}
              </Button>
              {!completedToday ? (
                <Button
                  type="button"
                  size="lg"
                  className="min-h-12 flex-1 gap-2 bg-amber-500 text-slate-950 hover:bg-amber-400 sm:flex-none"
                  onClick={onMarkComplete}
                >
                  <Check className="h-5 w-5" />
                  Done today
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  disabled
                  className="min-h-12 flex-1 gap-2 border-emerald-400/50 text-emerald-200 sm:flex-none"
                >
                  <CalendarCheck className="h-5 w-5" />
                  Completed
                </Button>
              )}
            </div>
          </div>
        </div>
      </article>

      <section className="mx-auto w-full max-w-lg space-y-4 px-4 py-6 sm:px-0">
        <div className="rounded-xl border border-border/80 bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            For you today
          </p>
          <p className="mt-2 text-sm leading-relaxed">{day.personalApplication}</p>
        </div>
        <p className="text-center text-sm italic text-muted-foreground">{day.personalPrayer}</p>
      </section>
    </div>
  );
}
