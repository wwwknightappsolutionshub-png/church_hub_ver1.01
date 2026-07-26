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

const publicApi = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
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
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !form.firstName.trim()) return;
    setSubmitting(true);
    try {
      await publicApi.post(`/outreach/register/${code}`, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        notes: form.notes || undefined,
      });
      setDone(true);
      toast.success('You are registered — welcome message on its way!');
    } catch {
      toast.error('Registration failed — please try again');
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
              Self-registration via outreach team
              {info.evangelistName ? ` · ${info.evangelistName}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <Input
                placeholder="First name *"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
              <Input
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register with us'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const AUTO_CLOSE_SECONDS = 5;

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
      try {
        window.close();
      } catch {
        // ignored — browsers block close unless opened by script
      }
      // Fallback when the tab cannot be closed programmatically (typical for QR/NFC opens).
      setTimeout(() => {
        if (!document.hidden) {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.replace('about:blank');
          }
        }
      }, 150);
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
