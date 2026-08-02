'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, Nfc, QrCode } from 'lucide-react';
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
} from '@/lib/contact-validation';
import { cn } from '@/lib/utils';

const publicApi = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 45_000,
});

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
      .get<RegisterInfo>(`/outreach/register/${code}`)
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
    return !phoneErr && !emailErr;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !form.firstName.trim()) return;
    if (!validateFields()) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    const parsed = PublicOutreachRegisterSchema.safeParse({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      referredBy: form.referredBy.trim() || undefined,
      notes: form.notes.trim() || undefined,
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
      await publicApi.post(`/outreach/register/${code}`, parsed.data);
      setDone(true);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const data = axios.isAxiosError(err) ? err.response?.data : undefined;
      const looksSaved =
        status === 409 ||
        (data &&
          typeof data === 'object' &&
          ('id' in data || 'firstName' in data || 'outreachContactId' in data));

      if (looksSaved) {
        setDone(true);
        return;
      }

      const apiMessage = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      const msg =
        typeof apiMessage === 'string'
          ? apiMessage
          : Array.isArray(apiMessage)
            ? apiMessage.join(', ')
            : 'Registration failed — please try again';
      toast.error(msg);
    } finally {
      setSubmitting(false);
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
            <form onSubmit={submit} className="space-y-3" noValidate>
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
                    setFieldErrors((prev) => ({
                      ...prev,
                      email: emailFormatError(email) ?? undefined,
                    }));
                  }}
                  onBlur={() =>
                    setFieldErrors((prev) => ({
                      ...prev,
                      email: emailFormatError(form.email) ?? undefined,
                    }))
                  }
                />
                {fieldErrors.email ? (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>
                ) : null}
              </div>
              <Input
                placeholder="Who referred you? (name)"
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
              <Button type="submit" className="w-full shadow-brand" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
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
