'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { OutreachCampaignDto } from '@church-hub/shared-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormSelect } from '@/components/ui/form-select';

export function OutreachCampaignPanel({
  selectedCampaignId,
  onSelectCampaign,
  canManage,
}: {
  selectedCampaignId: string;
  onSelectCampaign: (id: string) => void;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: campaigns, isLoading } = useApiQuery<OutreachCampaignDto[]>(
    ['outreach-campaigns'],
    '/outreach/campaigns',
  );
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.post('/outreach/campaigns', { name: name.trim() });
      toast.success('Campaign created');
      setName('');
      queryClient.invalidateQueries({ queryKey: ['outreach-campaigns'] });
    } catch {
      toast.error('Could not create campaign');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Campaigns</CardTitle>
        <CardDescription>Tag captures by crusade, Sunday desk, or outreach week.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <FormSelect
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={selectedCampaignId}
          onChange={(e) => onSelectCampaign(e.target.value)}
          aria-label="Filter by campaign"
        >
          <option value="">All campaigns</option>
          {(campaigns ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {!c.isActive ? ' (inactive)' : ''}
              {c.isDefault ? ' ★ default' : ''}
            </option>
          ))}
        </FormSelect>
        {canManage ? (
          <div className="flex gap-2">
            <Input
              placeholder="New campaign name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />
            <Button type="button" size="sm" disabled={busy || !name.trim()} onClick={create}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        ) : null}
        {isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : null}
      </CardContent>
    </Card>
  );
}