'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  DEFAULT_LANDING_MEMBERSHIP_FORM,
  type LandingMembershipFormConfig,
} from '@church-hub/shared-types';
import { mergeLandingMembershipFormConfig } from '@/lib/merge-landing-membership-form';
import {
  fetchPublicMembershipForm,
  registerPublicMembership,
} from '@/lib/church-membership-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LandingModal } from './LandingModal';
import { churchSectionClass, landingContainer } from './church-landing-classes';
import { LandingSectionHeader } from './LandingSectionHeader';
import { cn } from '@/lib/utils';
import {
  emailFormatError,
  filterPhoneTyping,
  phoneFormatError,
} from '@/lib/contact-validation';

type ServiceUnitOption = { id: string; name: string; description?: string | null };

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
  bornAgain: '' | 'yes' | 'no';
  baptizedInHolySpirit: '' | 'yes' | 'no';
  serviceUnitIds: string[];
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedMarketing: boolean;
};

const emptyForm: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  notes: '',
  bornAgain: '',
  baptizedInHolySpirit: '',
  serviceUnitIds: [],
  acceptedTerms: false,
  acceptedPrivacy: false,
  acceptedMarketing: false,
};

function boolFromChoice(v: '' | 'yes' | 'no'): boolean | undefined {
  if (v === 'yes') return true;
  if (v === 'no') return false;
  return undefined;
}

export function LandingMembershipSection({
  churchSlug,
  churchName,
}: {
  churchSlug: string;
  churchName: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [config, setConfig] = useState<LandingMembershipFormConfig | null>(null);
  const [units, setUnits] = useState<ServiceUnitOption[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [portalCreated, setPortalCreated] = useState(false);
  const [registrantEmail, setRegistrantEmail] = useState('');

  const effectiveConfig = useMemo(
    () => mergeLandingMembershipFormConfig(config),
    [config],
  );

  useEffect(() => {
    if (searchParams.get('register') === '1') {
      setOpen(true);
      const el = document.getElementById('give');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!open) return;
    setLoadingConfig(true);
    fetchPublicMembershipForm(churchSlug)
      .then((data) => {
        setConfig(mergeLandingMembershipFormConfig(data.form));
        setUnits(data.serviceUnits ?? []);
      })
      .catch((err) => {
        setConfig({ ...DEFAULT_LANDING_MEMBERSHIP_FORM });
        setUnits([]);
        toast.error(
          err instanceof Error ? err.message : 'Could not load form settings — using defaults',
        );
      })
      .finally(() => setLoadingConfig(false));
  }, [open, churchSlug]);

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const toggleUnit = (id: string) => {
    setForm((f) => ({
      ...f,
      serviceUnitIds: f.serviceUnitIds.includes(id)
        ? f.serviceUnitIds.filter((x) => x !== id)
        : [...f.serviceUnitIds, id],
    }));
  };

  const resetModal = () => {
    setSubmitted(false);
    setPortalCreated(false);
    setRegistrantEmail('');
    setForm(emptyForm);
  };

  const handleClose = () => {
    setOpen(false);
    resetModal();
  };

  const goToLogin = () => {
    const params = new URLSearchParams({ church: churchSlug, registered: '1' });
    if (portalCreated) params.set('portal', '1');
    if (registrantEmail) params.set('email', registrantEmail);
    handleClose();
    router.push(`/login?${params.toString()}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('Please enter your first and last name');
      return;
    }
    if (effectiveConfig.requireEmail && !form.email.trim()) {
      toast.error('Email is required');
      return;
    }
    const emailErr = emailFormatError(form.email);
    if (emailErr) {
      toast.error(emailErr);
      return;
    }
    const phoneErr = phoneFormatError(form.phone);
    if (phoneErr) {
      toast.error(phoneErr);
      return;
    }
    if (effectiveConfig.showBornAgain && !form.bornAgain) {
      toast.error('Please answer whether you are born again');
      return;
    }
    if (effectiveConfig.showBaptizedInHolySpirit && !form.baptizedInHolySpirit) {
      toast.error('Please answer whether you are baptized in the Holy Spirit');
      return;
    }
    if (!form.acceptedTerms || !form.acceptedPrivacy) {
      toast.error('Please accept the Terms of Service and Privacy Policy');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        notes: form.notes.trim() || undefined,
        bornAgain: effectiveConfig.showBornAgain ? boolFromChoice(form.bornAgain) : undefined,
        baptizedInHolySpirit: effectiveConfig.showBaptizedInHolySpirit
          ? boolFromChoice(form.baptizedInHolySpirit)
          : undefined,
        serviceUnitIds:
          effectiveConfig.showServiceUnits && form.serviceUnitIds.length > 0
            ? form.serviceUnitIds
            : undefined,
        acceptedTerms: true as const,
        acceptedPrivacy: true as const,
        acceptedMarketing: form.acceptedMarketing,
      };

      const res = await registerPublicMembership(churchSlug, payload);

      setPortalCreated(!!res.portalAccountCreated);
      setRegistrantEmail(form.email.trim());
      setSubmitted(true);
      toast.success('Registration successful!');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        const text =
          typeof msg === 'string'
            ? msg
            : Array.isArray(msg)
              ? msg.join(', ')
              : err.response?.status === 409
                ? 'An account with this email already exists. Please sign in instead.'
                : 'Registration failed';
        toast.error(text);
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const modalTitle = submitted
    ? 'Registration successful'
    : (effectiveConfig.title ?? 'Membership registration');

  return (
    <>
      <section id="give" className={churchSectionClass('brand', { rule: true })}>
        <div
          className={cn(
            landingContainer,
            'flex flex-col items-center gap-5 text-center sm:gap-6',
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm sm:h-16 sm:w-16">
            <Heart className="h-7 w-7 text-[hsl(43_74%_62%)] sm:h-8 sm:w-8" />
          </div>
          <LandingSectionHeader
            eyebrow="Next step"
            title="Church Membership"
            description={`Take the next step in your walk with God at ${churchName}. Register your interest and our membership team will connect with you about classes and community.`}
            align="center"
            tone="brand"
            className="[&_.church-section-divider]:bg-[hsl(43_74%_55%)]"
          />
          <Button
            size="lg"
            type="button"
            variant="secondary"
            className="h-12 w-full max-w-sm touch-manipulation shadow-lg sm:w-auto"
            onClick={() => setOpen(true)}
          >
            Get started
          </Button>
        </div>
      </section>

      <LandingModal
        open={open}
        onClose={handleClose}
        title={modalTitle}
        className="sm:max-w-xl"
      >
        {loadingConfig ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : submitted ? (
          <div className="space-y-5 text-center sm:text-left">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <CheckCircle2 className="h-12 w-12 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-heading text-lg font-semibold text-foreground">
                  Registration successful!
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your details have been saved. Church admin and pastoral staff have been notified.
                </p>
              </div>
            </div>
            {portalCreated && registrantEmail && (
              <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
                We sent a <strong>temporary password</strong> to{' '}
                <strong>{registrantEmail}</strong>. On the next screen, sign in with that email and
                password, then change your password in settings.
              </p>
            )}
            {!portalCreated && registrantEmail && (
              <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                Check <strong>{registrantEmail}</strong> for a confirmation message from{' '}
                {churchName}.
              </p>
            )}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button type="button" className="h-11 flex-1 touch-manipulation" onClick={goToLogin}>
                Continue to sign in
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 touch-manipulation"
                onClick={handleClose}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {effectiveConfig.description && (
              <p className="text-sm text-muted-foreground">{effectiveConfig.description}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="mem-first">First name *</Label>
                <Input
                  id="mem-first"
                  value={form.firstName}
                  onChange={(e) => update({ firstName: e.target.value })}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div>
                <Label htmlFor="mem-last">Last name *</Label>
                <Input
                  id="mem-last"
                  value={form.lastName}
                  onChange={(e) => update({ lastName: e.target.value })}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="mem-email">
                  Email{effectiveConfig.requireEmail ? ' *' : ''}
                </Label>
                <Input
                  id="mem-email"
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={(e) => update({ email: e.target.value })}
                  required={effectiveConfig.requireEmail}
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="mem-phone">UK phone</Label>
                <Input
                  id="mem-phone"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => update({ phone: filterPhoneTyping(e.target.value) })}
                  autoComplete="tel"
                  placeholder="07123 456789"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="mem-address">Address</Label>
              <Input
                id="mem-address"
                value={form.address}
                onChange={(e) => update({ address: e.target.value })}
                autoComplete="street-address"
              />
            </div>
            <div>
              <Label htmlFor="mem-city">City</Label>
              <Input
                id="mem-city"
                value={form.city}
                onChange={(e) => update({ city: e.target.value })}
                autoComplete="address-level2"
              />
            </div>

            {effectiveConfig.showBornAgain && (
              <fieldset className="rounded-lg border border-border bg-muted/20 p-4">
                <legend className="px-1 text-sm font-semibold">
                  {effectiveConfig.bornAgainLabel}
                </legend>
                <div className="mt-3 flex flex-wrap gap-6">
                  {(['yes', 'no'] as const).map((v) => (
                    <label
                      key={v}
                      className="flex min-h-11 cursor-pointer items-center gap-2 text-sm touch-manipulation"
                    >
                      <input
                        type="radio"
                        name="bornAgain"
                        className="h-4 w-4"
                        checked={form.bornAgain === v}
                        onChange={() => update({ bornAgain: v })}
                        required
                      />
                      {v === 'yes' ? 'Yes' : 'No'}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {effectiveConfig.showBaptizedInHolySpirit && (
              <fieldset className="rounded-lg border border-border bg-muted/20 p-4">
                <legend className="px-1 text-sm font-semibold">
                  {effectiveConfig.baptizedLabel}
                </legend>
                <div className="mt-3 flex flex-wrap gap-6">
                  {(['yes', 'no'] as const).map((v) => (
                    <label
                      key={v}
                      className="flex min-h-11 cursor-pointer items-center gap-2 text-sm touch-manipulation"
                    >
                      <input
                        type="radio"
                        name="baptized"
                        className="h-4 w-4"
                        checked={form.baptizedInHolySpirit === v}
                        onChange={() => update({ baptizedInHolySpirit: v })}
                        required
                      />
                      {v === 'yes' ? 'Yes' : 'No'}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {effectiveConfig.showServiceUnits && (
              <fieldset className="rounded-lg border border-border bg-muted/20 p-4">
                <legend className="px-1 text-sm font-semibold">
                  {effectiveConfig.serviceUnitsLabel}
                </legend>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select all ministries where you would like to serve. Each selection creates a
                  pending join request for church leaders to review.
                </p>
                {units.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No active service units are listed yet. You can still register — a leader will
                    follow up with you.
                  </p>
                ) : (
                  <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
                    {units.map((unit) => (
                      <label
                        key={unit.id}
                        className={cn(
                          'flex cursor-pointer gap-3 rounded-lg border p-3 transition touch-manipulation',
                          form.serviceUnitIds.includes(unit.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border/80 bg-card hover:border-primary/30',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4"
                          checked={form.serviceUnitIds.includes(unit.id)}
                          onChange={() => toggleUnit(unit.id)}
                        />
                        <span>
                          <span className="font-medium">{unit.name}</span>
                          {unit.description && (
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {unit.description}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            )}

            <div>
              <Label htmlFor="mem-notes">Notes (optional)</Label>
              <Textarea
                id="mem-notes"
                rows={3}
                placeholder="How did you hear about us? Any questions?"
                value={form.notes}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </div>

            <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3 text-left">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={form.acceptedTerms}
                  onChange={(e) => update({ acceptedTerms: e.target.checked })}
                />
                <span>
                  I agree to the{' '}
                  <a
                    href="/legal/terms-of-service"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Terms of Service
                  </a>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={form.acceptedPrivacy}
                  onChange={(e) => update({ acceptedPrivacy: e.target.checked })}
                />
                <span>
                  I have read the{' '}
                  <a
                    href="/legal/privacy-policy"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Privacy Policy
                  </a>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={form.acceptedMarketing}
                  onChange={(e) => update({ acceptedMarketing: e.target.checked })}
                />
                <span>Send me church updates by email (optional)</span>
              </label>
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 touch-manipulation"
                onClick={handleClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" className="h-11 touch-manipulation" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering…
                  </>
                ) : (
                  'Register'
                )}
              </Button>
            </div>
          </form>
        )}
      </LandingModal>
    </>
  );
}
