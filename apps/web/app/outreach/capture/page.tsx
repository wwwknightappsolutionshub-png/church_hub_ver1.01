'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, Nfc, QrCode, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { BrandMark } from '@/components/brand/BrandMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  emailFormatError,
  filterPhoneTyping,
  phoneFormatError,
  PublicOutreachRegisterSchema,
  sanitizeEmail,
} from '@/lib/contact-validation';
import { cn } from '@/lib/utils';

const EMAIL_EXISTS_MSG =
  'This email Id exists with us. Can you use another or are you this same owner.';

function publicApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    // Always hit the same host Nginx proxies to the API (works for church-hub + custom aliases).
    return `${window.location.origin}/api/v1`;
  }
  return `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1`;
}

const publicApi = axios.create({
  headers: { 'Content-Type': 'application/json' },
  timeout: 45_000,
});

function apiErrorToastMessage(err: unknown): string {
  if (!axios.isAxiosError(err)) return 'Registration failed — please try again';
  const data = err.response?.data as { message?: string | string[]; code?: string } | undefined;
  const raw = data?.message;
  if (typeof raw === 'string' && raw.trim()) {
    if (/^internal server error$/i.test(raw.trim())) {
      return 'Could not save your details. Check phone/email and try again.';
    }
    return raw.replace(/^phone:\s*/i, '').replace(/^email:\s*/i, '');
  }
  if (Array.isArray(raw) && raw.length) return raw.join(', ');
  if (err.response?.status === 400) {
    return 'Please enter a valid UK phone number and email address.';
  }
  return 'Registration failed — please try again';
}

function isEmailExistsConflict(err: unknown): boolean {
  if (!axios.isAxiosError(err) || err.response?.status !== 409) return false;
  const data = err.response.data as
    | {
        code?: string;
        message?: string | { code?: string; message?: string; exists?: boolean };
        exists?: boolean;
      }
    | undefined;
  if (!data) return false;
  if (data.code === 'EMAIL_EXISTS' || data.exists === true) return true;
  if (typeof data.message === 'object' && data.message) {
    if (data.message.code === 'EMAIL_EXISTS' || data.message.exists === true) return true;
    if (typeof data.message.message === 'string' && /email id exists/i.test(data.message.message)) {
      return true;
    }
  }
  if (typeof data.message === 'string' && /email id exists/i.test(data.message)) return true;
  return false;
}

interface RegisterInfo {
  code: string;
  church: { name: string; slug: string };
  evangelistName: string;
  nfcUrl?: string | null;
}

function CaptureForm() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [info, setInfo] = useState<RegisterInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; email?: string }>({});
  const [emailExistsOpen, setEmailExistsOpen] = useState(false);
  const [sameOwnerConfirmed, setSameOwnerConfirmed] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const submitAfterConfirmRef = useRef(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    referredBy: '',
    notes: '',
  });

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }
    publicApi
      .get<RegisterInfo>(`${publicApiBaseUrl()}/outreach/register/${code}`)
      .then(({ data }) => setInfo(data))
      .catch(() => toast.error('Invalid or expired outreach link'))
      .finally(() => setLoading(false));
  }, [code]);

  const validateFields = () => {
    const phoneErr = phoneFormatError(form.phone);
    const emailErr = emailFormatError(form.email);
    setFieldErrors({
      phone: phoneErr ?? undefined,
      email: emailErr ?? undefined,
    });
    if (!form.phone.trim() && !form.email.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        phone: prev.phone ?? 'Enter a UK phone number or an email',
      }));
      return false;
    }
    return !phoneErr && !emailErr;
  };

  const checkEmailAgainstDb = async (rawEmail: string): Promise<boolean> => {
    if (!code) return false;
    const email = sanitizeEmail(rawEmail);
    if (!email || emailFormatError(email)) return false;
    setCheckingEmail(true);
    try {
      const { data } = await publicApi.get<{ exists: boolean; message?: string }>(
        `${publicApiBaseUrl()}/outreach/register/${code}/check-email`,
        { params: { email } },
      );
      return data.exists === true;
    } catch {
      // Network / API issues — do not block typing; submit still re-checks server-side.
      return false;
    } finally {
      setCheckingEmail(false);
    }
  };

  const runEmailBlurCheck = async () => {
    const formatErr = emailFormatError(form.email);
    setFieldErrors((prev) => ({ ...prev, email: formatErr ?? undefined }));
    if (formatErr || !sanitizeEmail(form.email)) return;
    if (sameOwnerConfirmed) return;
    const exists = await checkEmailAgainstDb(form.email);
    if (exists) setEmailExistsOpen(true);
  };

  const performSubmit = async (confirmSameOwner: boolean) => {
    if (!code || !form.firstName.trim()) return;

    const parsed = PublicOutreachRegisterSchema.safeParse({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      referredBy: form.referredBy.trim() || undefined,
      notes: form.notes.trim() || undefined,
      confirmSameOwner: confirmSameOwner || undefined,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const msg = first?.message ?? 'Please check your details';
      if (first?.path[0] === 'phone') setFieldErrors((prev) => ({ ...prev, phone: msg }));
      if (first?.path[0] === 'email') setFieldErrors((prev) => ({ ...prev, email: msg }));
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    try {
      await publicApi.post(`${publicApiBaseUrl()}/outreach/register/${code}`, parsed.data);
      setDone(true);
    } catch (err) {
      if (isEmailExistsConflict(err)) {
        setSameOwnerConfirmed(false);
        setEmailExistsOpen(true);
        return;
      }

      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const data = axios.isAxiosError(err) ? err.response?.data : undefined;
      const looksSaved =
        (status === 409 && !isEmailExistsConflict(err)) ||
        (data &&
          typeof data === 'object' &&
          ('id' in data || 'firstName' in data || 'outreachContactId' in data));

      if (looksSaved) {
        setDone(true);
        return;
      }

      toast.error(apiErrorToastMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !form.firstName.trim()) return;
    if (!validateFields()) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    const email = sanitizeEmail(form.email);
    if (email && !sameOwnerConfirmed) {
      const exists = await checkEmailAgainstDb(email);
      if (exists) {
        submitAfterConfirmRef.current = true;
        setEmailExistsOpen(true);
        return;
      }
    }

    await performSubmit(sameOwnerConfirmed);
  };

  const onUseAnotherEmail = () => {
    setEmailExistsOpen(false);
    setSameOwnerConfirmed(false);
    submitAfterConfirmRef.current = false;
    setForm((f) => ({ ...f, email: '' }));
    setFieldErrors((prev) => ({ ...prev, email: undefined }));
    requestAnimationFrame(() => emailInputRef.current?.focus());
  };

  const onConfirmSameOwner = async () => {
    setSameOwnerConfirmed(true);
    setEmailExistsOpen(false);
    const shouldSubmit = submitAfterConfirmRef.current;
    submitAfterConfirmRef.current = false;
    if (shouldSubmit) {
      await performSubmit(true);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!code || !info) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <QrCode className="h-12 w-12 text-muted-foreground" />
        <h1 className="font-heading text-xl font-bold">Invalid outreach link</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Scan a valid team QR code or tap an NFC tag provided by your church outreach team.
        </p>
      </div>
    );
  }

  if (done) {
    return <ThankYouSuccess firstName={form.firstName} churchName={info.church.name} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background px-4 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandMark />
        </div>

        <Card className="shadow-elevated">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Nfc className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="font-heading">Connect with {info.church.name}</CardTitle>
            <CardDescription>
              Self-registration via church outreach
              {info.evangelistName ? ` · ${info.evangelistName}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void submit(e)} className="space-y-3" noValidate>
              <Input
                placeholder="First name *"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
                autoComplete="given-name"
              />
              <Input
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                autoComplete="family-name"
              />
              <div>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="UK phone (e.g. 07123 456789)"
                  value={form.phone}
                  aria-invalid={!!fieldErrors.phone}
                  className={cn(fieldErrors.phone && 'border-destructive')}
                  onChange={(e) => {
                    const phone = filterPhoneTyping(e.target.value);
                    setForm({ ...form, phone });
                    setFieldErrors((prev) => ({
                      ...prev,
                      phone: phoneFormatError(phone) ?? undefined,
                    }));
                  }}
                  onBlur={() =>
                    setFieldErrors((prev) => ({
                      ...prev,
                      phone: phoneFormatError(form.phone) ?? undefined,
                    }))
                  }
                />
                {fieldErrors.phone ? (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.phone}</p>
                ) : (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    UK numbers only — digits, no letters
                  </p>
                )}
              </div>
              <div>
                <Input
                  ref={emailInputRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={form.email}
                  aria-invalid={!!fieldErrors.email}
                  className={cn(fieldErrors.email && 'border-destructive')}
                  onChange={(e) => {
                    const email = e.target.value;
                    setForm({ ...form, email });
                    setSameOwnerConfirmed(false);
                    setFieldErrors((prev) => ({
                      ...prev,
                      email: emailFormatError(email) ?? undefined,
                    }));
                  }}
                  onBlur={() => void runEmailBlurCheck()}
                />
                {fieldErrors.email ? (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>
                ) : checkingEmail ? (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking email…
                  </p>
                ) : sameOwnerConfirmed ? (
                  <p className="mt-1 text-[10px] text-emerald-700">
                    Confirmed as existing contact — you can submit.
                  </p>
                ) : null}
              </div>
              <Input
                placeholder="Minister's Name"
                value={form.referredBy}
                onChange={(e) => setForm({ ...form, referredBy: e.target.value })}
                autoComplete="off"
              />
              <textarea
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Anything you would like us to know? (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">
                By submitting, you agree to be contacted by {info.church.name}. A welcome message
                will be sent automatically.
              </p>
              <Button
                type="submit"
                className="w-full shadow-brand"
                disabled={submitting || checkingEmail}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {emailExistsOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-exists-title"
          onClick={onUseAnotherEmail}
        >
          <div
            className="w-full rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 id="email-exists-title" className="font-heading text-lg font-bold text-foreground">
                Email already on file
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onUseAnotherEmail}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{EMAIL_EXISTS_MSG}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="flex-1" onClick={onUseAnotherEmail}>
                Use another email
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={submitting}
                onClick={() => void onConfirmSameOwner()}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, I'm the same person"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const AUTO_CLOSE_SECONDS = 5;

function tryClosePage() {
  try {
    window.close();
  } catch {
    // ignored
  }
  setTimeout(() => {
    if (!document.hidden) {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.replace('about:blank');
      }
    }
  }, 150);
}

function ThankYouSuccess({
  firstName,
  churchName,
}: {
  firstName: string;
  churchName: string;
}) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    const closeTimer = setTimeout(() => {
      tryClosePage();
    }, AUTO_CLOSE_SECONDS * 1000);

    return () => {
      clearInterval(tick);
      clearTimeout(closeTimer);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <CheckCircle2 className="h-14 w-14 text-emerald-600" />
      <h1 className="font-heading text-2xl font-bold">Thank you, {firstName}!</h1>
      <p className="max-w-md text-muted-foreground">
        {churchName} has received your details. You should receive a welcome message shortly. We look
        forward to seeing you!
      </p>
      <p className="text-sm text-muted-foreground">
        {secondsLeft > 0
          ? `This page will close in ${secondsLeft} second${secondsLeft === 1 ? '' : 's'}…`
          : 'Closing…'}
      </p>
      <Button type="button" variant="outline" onClick={tryClosePage}>
        Done
      </Button>
    </div>
  );
}

export default function PublicOutreachCapturePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CaptureForm />
    </Suspense>
  );
}
