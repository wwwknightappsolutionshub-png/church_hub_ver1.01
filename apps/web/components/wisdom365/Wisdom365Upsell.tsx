'use client';

import Link from 'next/link';
import { CheckCircle2, Crown, Sparkles } from 'lucide-react';
import { WISDOM365_FEATURES, WISDOM365_TAGLINE } from '@/lib/wisdom365';
import { Wisdom365Hero } from '@/components/wisdom365/Wisdom365Hero';
import { EnterpriseContent, EnterpriseShell } from '@/components/layout/EnterpriseModuleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Wisdom365Upsell({ isChurchStaff }: { isChurchStaff: boolean }) {
  return (
    <EnterpriseShell>
      <Wisdom365Hero
        description={WISDOM365_TAGLINE}
        badge={
          <Badge className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-100">
            <Crown className="h-3.5 w-3.5" />
            Add-on not active
          </Badge>
        }
      />
      <EnterpriseContent className="space-y-6 !border-0 !bg-transparent !p-0 !shadow-none">
        <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white dark:border-amber-900/40 dark:from-amber-950/20 dark:to-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Unlock Wisdom365+ for your congregation
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              A premium daily discipleship experience—scripture, insight, and practical application
              delivered every day of the year.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {WISDOM365_FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="flex gap-3 rounded-lg border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-semibold text-sm">{f.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {isChurchStaff ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-sm font-medium">Church administrator</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enable Wisdom365+ for this tenant from the platform console under{' '}
                  <strong>Community modules → Wisdom365+</strong>, or contact your Church_Hub operator
                  to purchase the add-on.
                </p>
                <Button asChild className="mt-3" variant="default">
                  <Link href="/dashboard/platform">Open platform console</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This module is not enabled for your church yet. Please speak with your pastor or
                church administrator about adding Wisdom365+.
              </p>
            )}
          </CardContent>
        </Card>
      </EnterpriseContent>
    </EnterpriseShell>
  );
}
