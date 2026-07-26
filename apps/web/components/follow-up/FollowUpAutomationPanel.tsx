'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Rule {
  id: string;
  name: string;
  trigger: string;
  stage: string | null;
  delayHours: number;
  channel: string;
  isActive: boolean;
  notifyAssignee: boolean;
}

export function FollowUpAutomationPanel() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: rules, isLoading } = useApiQuery<Rule[]>(
    ['follow-up-automation'],
    '/follow-up/automation-rules',
    { enabled: open },
  );
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (rule: Rule) => {
    setBusy(rule.id);
    try {
      await api.post('/follow-up/automation-rules', {
        id: rule.id,
        name: rule.name,
        trigger: rule.trigger,
        stage: rule.stage,
        delayHours: rule.delayHours,
        channel: rule.channel,
        notifyAssignee: rule.notifyAssignee,
        isActive: !rule.isActive,
      });
      queryClient.invalidateQueries({ queryKey: ['follow-up-automation'] });
    } catch {
      toast.error('Could not update rule');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 text-left"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 shrink-0 text-primary" />
              Follow-up automation
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Delayed WhatsApp/email reminders and assignee alerts. Processed every minute via
              notification queue + fail-safe scheduler.
            </p>
          </div>
          <ChevronDown
            className={cn(
              'mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open ? 'rotate-0' : '-rotate-90',
            )}
            aria-hidden
          />
        </button>
      </CardHeader>
      {open ? (
        <CardContent>
          {isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
          <ul className="space-y-2">
            {rules?.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.trigger}
                    {r.stage ? ` · ${r.stage}` : ''} · after {r.delayHours}h · {r.channel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.isActive ? 'default' : 'outline'}>
                    {r.isActive ? 'Active' : 'Off'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === r.id}
                    onClick={() => void toggle(r)}
                  >
                    {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Toggle'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}
