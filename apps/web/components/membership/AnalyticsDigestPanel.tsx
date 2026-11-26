'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { AnalyticsDigestSettingsDto } from '@church-hub/shared-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormSelect } from '@/components/ui/form-select';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AnalyticsDigestPanel({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useApiQuery<AnalyticsDigestSettingsDto>(
    ['analytics-digest-settings'],
    '/membership/analytics/digest-settings',
    { enabled: canEdit },
  );
  const [emails, setEmails] = useState('');
  const [busy, setBusy] = useState(false);

  if (!canEdit) return null;

  const save = async (patch: Partial<AnalyticsDigestSettingsDto>) => {
    setBusy(true);
    try {
      await api.patch('/membership/analytics/digest-settings', patch);
      toast.success('Digest settings saved');
      queryClient.invalidateQueries({ queryKey: ['analytics-digest-settings'] });
    } catch {
      toast.error('Could not save digest settings');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Weekly email digest</CardTitle>
        <CardDescription>
          Opt-in leadership snapshot (UTC schedule). Default off.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading || !data ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={data.enabled}
                onChange={(e) => void save({ enabled: e.target.checked })}
                disabled={busy}
              />
              Enable weekly digest
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs">
                Weekday (UTC)
                <FormSelect
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={data.weekday}
                  onChange={(e) => void save({ weekday: Number(e.target.value) })}
                  disabled={busy}
                >
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </FormSelect>
              </label>
              <label className="text-xs">
                Hour (UTC)
                <Input
                  type="number"
                  min={0}
                  max={23}
                  className="mt-1 h-9"
                  defaultValue={data.hourUtc}
                  onBlur={(e) => void save({ hourUtc: Number(e.target.value) })}
                  disabled={busy}
                />
              </label>
            </div>
            <label className="block text-xs">
              Recipient emails (comma-separated)
              <Input
                className="mt-1 h-9"
                defaultValue={data.recipientEmails.join(', ')}
                onChange={(e) => setEmails(e.target.value)}
                onBlur={() => {
                  const recipientEmails = (emails || data.recipientEmails.join(', '))
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  void save({ recipientEmails });
                }}
                disabled={busy}
              />
            </label>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void save({})}>
              Refresh
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}