'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePlus2, Loader2, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_LANDING_MEMBERSHIP_FORM,
  type LandingMembershipFormConfig,
} from '@church-hub/shared-types';
import { mergeLandingMembershipFormConfig } from '@/lib/merge-landing-membership-form';
import {
  fetchAdminMembershipForm,
  resetAdminMembershipForm,
  saveAdminMembershipForm,
} from '@/lib/church-membership-api';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { isChurchLeadershipRole } from '@/lib/session-role';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export function ChurchLandingMembershipFormTab() {
  const queryClient = useQueryClient();
  const { userRoles } = useModuleAccess();
  const isAdmin = isChurchLeadershipRole(userRoles);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['church-landing-membership-form'],
    queryFn: async () => {
      const res = await fetchAdminMembershipForm();
      return {
        form: mergeLandingMembershipFormConfig(res.form),
        defaults: res.defaults ?? DEFAULT_LANDING_MEMBERSHIP_FORM,
      };
    },
    enabled: isAdmin,
    retry: 1,
  });

  const [form, setForm] = useState<LandingMembershipFormConfig | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data?.form) {
      setForm(data.form);
      setDirty(false);
    }
  }, [data?.form]);

  const saveMutation = useMutation({
    mutationFn: async (payload: LandingMembershipFormConfig) => {
      const res = await saveAdminMembershipForm(payload);
      return mergeLandingMembershipFormConfig(res.form);
    },
    onSuccess: (result) => {
      setForm(result);
      setDirty(false);
      queryClient.setQueryData(['church-landing-membership-form'], {
        form: result,
        defaults: data?.defaults ?? DEFAULT_LANDING_MEMBERSHIP_FORM,
      });
      queryClient.invalidateQueries({ queryKey: ['comm-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['comm-stats'] });
      toast.success('Membership form saved and published', {
        description: 'An in-app notification was sent to church administrators.',
        duration: 8000,
      });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not save membership form'),
  });

  const createNewMutation = useMutation({
    mutationFn: async () => {
      const res = await resetAdminMembershipForm();
      return mergeLandingMembershipFormConfig(res.form);
    },
    onSuccess: (result) => {
      setForm(result);
      setDirty(false);
      queryClient.setQueryData(['church-landing-membership-form'], {
        form: result,
        defaults: data?.defaults ?? DEFAULT_LANDING_MEMBERSHIP_FORM,
      });
      toast.success('New membership form created from defaults');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not create new form'),
  });

  const update = (patch: Partial<LandingMembershipFormConfig>) => {
    setForm((f) => (f ? { ...f, ...patch } : f));
    setDirty(true);
  };

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">Church administrators only.</p>
    );
  }

  if (isLoading || (!form && !isError)) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !form) {
    const message =
      error instanceof Error
        ? error.message
        : 'Could not load membership form settings.';
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Ensure the API is running on port 4000, then restart it:{' '}
          <code className="rounded bg-muted px-1">pnpm --filter @church-hub/api dev</code>
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
          <Button
            type="button"
            onClick={() => createNewMutation.mutate()}
            disabled={createNewMutation.isPending}
          >
            {createNewMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FilePlus2 className="mr-2 h-4 w-4" />
            )}
            Create new form
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">Public membership registration form</h3>
            <Badge variant={dirty ? 'outline' : 'default'}>
              {dirty ? 'Unsaved changes' : 'Published'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Full CRUD for the visitor registration popup on your church landing page. Includes born
            again, Holy Spirit baptism, and service unit multi-select (pending join requests).
            Submissions sync to Membership; admin, pastor, and registrant receive notifications.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setForm({ ...(data?.defaults ?? DEFAULT_LANDING_MEMBERSHIP_FORM) })}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Revert draft
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={createNewMutation.isPending}
            onClick={() => createNewMutation.mutate()}
          >
            {createNewMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FilePlus2 className="mr-2 h-4 w-4" />
            )}
            Create new form
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate(form)}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save & publish
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Modal title</Label>
          <Input value={form.title} onChange={(e) => update({ title: e.target.value })} />
        </div>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.requireEmail}
            onChange={(e) => update({ requireEmail: e.target.checked })}
          />
          Require email
        </label>
      </div>

      <div>
        <Label>Introduction text</Label>
        <Textarea
          rows={3}
          value={form.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-muted/25 p-4 sm:grid-cols-2">
        <p className="sm:col-span-2 text-sm font-medium">Form fields shown to visitors</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.showBornAgain}
            onChange={(e) => update({ showBornAgain: e.target.checked })}
          />
          Are you born again?
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.showBaptizedInHolySpirit}
            onChange={(e) => update({ showBaptizedInHolySpirit: e.target.checked })}
          />
          Baptized in the Holy Spirit?
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.showServiceUnits}
            onChange={(e) => update({ showServiceUnits: e.target.checked })}
          />
          Where would you love to serve (multi-select)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.createPortalAccount}
            onChange={(e) => update({ createPortalAccount: e.target.checked })}
          />
          Create portal login + email temp password
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Born again question label</Label>
          <Input
            value={form.bornAgainLabel}
            onChange={(e) => update({ bornAgainLabel: e.target.value })}
          />
        </div>
        <div>
          <Label>Baptized question label</Label>
          <Input
            value={form.baptizedLabel}
            onChange={(e) => update({ baptizedLabel: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Service units field label</Label>
          <Input
            value={form.serviceUnitsLabel}
            onChange={(e) => update({ serviceUnitsLabel: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-lg bg-muted/30 p-4">
        <h4 className="font-medium">Registrant email template</h4>
        <p className="text-xs text-muted-foreground">
          Placeholders: {'{{churchName}}'}, {'{{firstName}}'}, {'{{email}}'}, {'{{tempPassword}}'},
          {'{{loginUrl}}'}
        </p>
        <div>
          <Label>Subject</Label>
          <Input
            value={form.registrantEmailSubject}
            onChange={(e) => update({ registrantEmailSubject: e.target.value })}
          />
        </div>
        <div>
          <Label>Body</Label>
          <Textarea
            rows={8}
            value={form.registrantEmailBody}
            onChange={(e) => update({ registrantEmailBody: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-lg bg-muted/30 p-4">
        <h4 className="font-medium">Admin & pastor email template</h4>
        <p className="text-xs text-muted-foreground">
          Placeholders: {'{{memberName}}'}, {'{{email}}'}, {'{{phone}}'}, {'{{bornAgain}}'},
          {'{{baptizedInHolySpirit}}'}, {'{{serviceUnits}}'}, {'{{membershipUrl}}'}
        </p>
        <div>
          <Label>Subject</Label>
          <Input
            value={form.staffEmailSubject}
            onChange={(e) => update({ staffEmailSubject: e.target.value })}
          />
        </div>
        <div>
          <Label>Body</Label>
          <Textarea
            rows={8}
            value={form.staffEmailBody}
            onChange={(e) => update({ staffEmailBody: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
