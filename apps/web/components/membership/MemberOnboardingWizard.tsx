'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  ONBOARDING_STEP_LABELS,
  ROLE_LABELS,
  SELECTABLE_ROLES,
  STATUS_LABELS,
  formatMemberName,
} from '@/lib/membership';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FamilyOption {
  id: string;
  name: string;
}

interface MemberOnboardingWizardProps {
  memberId: string | null;
  initialStep?: number;
  ministryOptions: string[];
  families: FamilyOption[];
  onClose: () => void;
  onCreated?: (id: string) => void;
}

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  roles: string[];
  ministryInterests: string[];
  familyId: string;
  notes: string;
};

const emptyForm: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  address: '',
  city: '',
  roles: ['ADULT'],
  ministryInterests: [],
  familyId: '',
  notes: '',
};

export function MemberOnboardingWizard({
  memberId,
  initialStep = 1,
  ministryOptions,
  families,
  onClose,
  onCreated,
}: MemberOnboardingWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(initialStep);
  const [activeId, setActiveId] = useState<string | null>(memberId);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [review, setReview] = useState<{
    firstName: string;
    lastName: string;
    status: string;
    roles: string[];
    ministryInterests: string[];
    family?: { name: string } | null;
  } | null>(null);

  useEffect(() => {
    if (!memberId) return;
    api
      .get<{
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        dateOfBirth?: string;
        address?: string;
        city?: string;
        roles: string[];
        ministryInterests: string[];
        notes?: string;
        status: string;
        onboardingStep: number;
        family?: { id: string; name: string };
      }>(`/membership/members/${memberId}`)
      .then(({ data }) => {
        setActiveId(data.id);
        setStep(Math.max(1, Math.min(data.onboardingStep || 1, 5)));
        setForm({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email ?? '',
          phone: data.phone ?? '',
          dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth).slice(0, 10) : '',
          address: data.address ?? '',
          city: data.city ?? '',
          roles: data.roles?.length ? data.roles : ['ADULT'],
          ministryInterests: data.ministryInterests ?? [],
          familyId: data.family?.id ?? '',
          notes: data.notes ?? '',
        });
        setReview({
          firstName: data.firstName,
          lastName: data.lastName,
          status: data.status,
          roles: data.roles ?? [],
          ministryInterests: data.ministryInterests ?? [],
          family: data.family ?? null,
        });
      })
      .catch(() => toast.error('Could not load member'));
  }, [memberId]);

  const ensureMember = async (): Promise<string> => {
    if (activeId) return activeId;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      throw new Error('First and last name required');
    }
    const { data } = await api.post<{ id: string }>('/membership/members', {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email || undefined,
      startOnboarding: true,
    });
    setActiveId(data.id);
    onCreated?.(data.id);
    return data.id;
  };

  const saveStep = async (nextStep: number) => {
    setSaving(true);
    try {
      const id = await ensureMember();
      const payload: Record<string, unknown> = {
        step: nextStep,
        data: {},
      };

      if (step === 1) {
        payload.data = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email || undefined,
          phone: form.phone || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          address: form.address || undefined,
          city: form.city || undefined,
        };
      } else if (step === 2) {
        payload.data = { roles: form.roles };
      } else if (step === 3) {
        payload.data = { ministryInterests: form.ministryInterests };
      } else if (step === 4) {
        payload.data = {
          familyId: form.familyId || undefined,
          notes: form.notes || undefined,
        };
        if (form.familyId) {
          await api.post(`/membership/members/${id}/family`, { familyId: form.familyId });
        }
      }

      const { data } = await api.patch<typeof review & { id: string }>(
        `/membership/members/${id}/onboarding`,
        payload,
      );

      setReview({
        firstName: data?.firstName ?? form.firstName,
        lastName: data?.lastName ?? form.lastName,
        status: (data as { status?: string })?.status ?? 'VISITOR',
        roles: form.roles,
        ministryInterests: form.ministryInterests,
        family: families.find((f) => f.id === form.familyId) ?? null,
      });

      if (nextStep <= 5) setStep(nextStep);
      queryClient.invalidateQueries({ queryKey: ['membership'] });
    } catch {
      toast.error('Could not save step');
    } finally {
      setSaving(false);
    }
  };

  const complete = async () => {
    if (!activeId) return;
    setSaving(true);
    try {
      await api.post(`/membership/members/${activeId}/onboarding/complete`);
      toast.success('Onboarding complete — welcome to the church family!');
      queryClient.invalidateQueries({ queryKey: ['membership'] });
      onClose();
    } catch {
      toast.error('Finish all steps before completing');
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (role: string) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }));
  };

  const toggleMinistry = (tag: string) => {
    setForm((f) => ({
      ...f,
      ministryInterests: f.ministryInterests.includes(tag)
        ? f.ministryInterests.filter((t) => t !== tag)
        : [...f.ministryInterests, tag],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-xl font-bold">Member onboarding</h2>
          <p className="text-sm text-muted-foreground">Digital workflow — Visitor to New Member</p>
          <div className="mt-4 flex gap-1">
            {ONBOARDING_STEP_LABELS.map((label, i) => (
              <div
                key={label}
                className={cn(
                  'h-1 flex-1 rounded-full',
                  i + 1 <= step ? 'bg-primary' : 'bg-muted',
                )}
                title={label}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Step {step} of 5 — {ONBOARDING_STEP_LABELS[step - 1]}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="First name *"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
              <Input
                placeholder="Last name *"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
              <Input
                type="email"
                placeholder="Email"
                className="sm:col-span-2"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                type="date"
                placeholder="Date of birth"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              />
              <Input
                className="sm:col-span-2"
                placeholder="Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <Input
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-wrap gap-2">
              {SELECTABLE_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    form.roles.includes(role)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-wrap gap-2">
              {ministryOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleMinistry(tag)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    form.ministryInterests.includes(tag)
                      ? 'border-secondary bg-secondary/15 text-secondary-foreground'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Link to family household</label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.familyId}
                  onChange={(e) => setForm({ ...form, familyId: e.target.value })}
                >
                  <option value="">No family yet</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          )}

          {step === 5 && review && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
              <div>
                <p className="text-lg font-semibold">{formatMemberName(review)}</p>
                <Badge variant="gold" className="mt-1">
                  {STATUS_LABELS[review.status] ?? review.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Roles</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {review.roles.map((r) => (
                    <Badge key={r} variant="outline">
                      {ROLE_LABELS[r] ?? r}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Ministry interests</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {review.ministryInterests.length === 0 ? (
                    <span className="text-sm text-muted-foreground">None selected</span>
                  ) : (
                    review.ministryInterests.map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              {review.family && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Family: </span>
                  {review.family.name}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} disabled={saving}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
            {step < 5 ? (
              <Button
                type="button"
                disabled={saving || (step === 1 && (!form.firstName.trim() || !form.lastName.trim()))}
                onClick={() => saveStep(step + 1)}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button type="button" disabled={saving} onClick={complete} className="shadow-brand">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    <Check className="mr-1.5 h-4 w-4" />
                    Complete onboarding
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
