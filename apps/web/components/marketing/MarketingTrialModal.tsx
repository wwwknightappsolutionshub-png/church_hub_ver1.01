'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import {
  markTrialModalDismissed,
  parseNameFromEmailLocalPart,
  wasTrialModalDismissed,
} from '@/lib/marketing-trial';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SHOW_AFTER_MS = 10_000;

function apiErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { message?: string | string[]; code?: string } } })
      .response?.data;
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (typeof data?.message === 'string') return data.message;
    if (data && typeof data === 'object' && 'message' in data) {
      const nested = (data as { message?: unknown }).message;
      if (nested && typeof nested === 'object' && nested !== null && 'message' in nested) {
        return String((nested as { message: string }).message);
      }
    }
  }
  return 'Something went wrong. Please try again.';
}

function isNameRequiredError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { message?: string | string[] } } }).response?.data;
    const message = data?.message;
    if (typeof message === 'string') return message.includes('NAME_REQUIRED');
    if (Array.isArray(message)) return message.some((m) => String(m).includes('NAME_REQUIRED'));
  }
  return false;
}

/** Exit-intent / timed modal on the SaaS marketing home page only. */
export function MarketingTrialModal() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [needsName, setNeedsName] = useState(false);

  const dismiss = useCallback(() => {
    setOpen(false);
    markTrialModalDismissed();
  }, []);

  const show = useCallback(() => {
    if (wasTrialModalDismissed()) return;
    setOpen(true);
  }, []);

  useEffect(() => {
    if (wasTrialModalDismissed()) return;

    const timer = window.setTimeout(show, SHOW_AFTER_MS);

    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY > 0) return;
      if (e.relatedTarget != null) return;
      show();
    };

    document.addEventListener('mouseout', onMouseOut);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mouseout', onMouseOut);
    };
  }, [show]);

  useEffect(() => {
    const parsed = parseNameFromEmailLocalPart(email);
    if (parsed) {
      setNeedsName(false);
      setFirstName(parsed.firstName);
      setLastName(parsed.lastName);
    } else if (email.includes('@')) {
      setNeedsName(true);
    }
  }, [email]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: { email: string; firstName?: string; lastName?: string } = {
        email: email.trim(),
      };
      if (needsName || !parseNameFromEmailLocalPart(email)) {
        payload.firstName = firstName.trim();
        payload.lastName = lastName.trim();
      }

      await api.post('/marketing/trial-access', payload);
      dismiss();
      toast.success('Thank you for giving Church_Hub a chance', {
        description: 'We have sent you the login details. Check your inbox (and spam folder).',
        duration: 8_000,
      });
    } catch (err) {
      if (isNameRequiredError(err)) {
        setNeedsName(true);
        toast.message('Please enter your first and last name');
      } else {
        toast.error(apiErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-modal-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-gradient-to-br from-primary/15 via-transparent to-gold/10 px-6 pb-2 pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Church_Hub
          </p>
          <h2 id="trial-modal-title" className="mt-2 font-heading text-2xl font-bold leading-tight">
            Don&apos;t Opt Out Yet — We Are Ministry Inclined
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Review the actual dashboard first and decide if you really do not need this system
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 px-6 pb-6 pt-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <Input
              type="email"
              required
              autoFocus
              placeholder="pastor@yourchurch.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {needsName ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">First name</label>
                <Input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Last name</label>
                <Input required value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
          ) : null}

          <Button type="submit" className="w-full shadow-brand" disabled={submitting}>
            {submitting ? 'Sending…' : 'Get access'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            We&apos;ll email a one-time login link. No credit card required.
          </p>
        </form>
      </div>
    </div>
  );
}
