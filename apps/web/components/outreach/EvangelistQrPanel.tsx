'use client';

import { useState } from 'react';
import { Copy, Loader2, Nfc, QrCode, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface QrData {
  code: string;
  captureUrl: string;
  qrDataUrl: string;
  nfcUrl?: string | null;
  nfcInstructions?: string;
  evangelistName?: string;
  scanCount?: number;
}

export function EvangelistQrPanel() {
  const [qr, setQr] = useState<QrData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<QrData>('/outreach/qr/me');
      setQr(data);
    } catch {
      toast.error('Could not generate QR — ensure your user has a member profile');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!qr?.captureUrl) return;
    navigator.clipboard.writeText(qr.captureUrl);
    toast.success('Link copied — use for NFC programming or sharing');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-4 w-4 text-primary" />
          Team QR & NFC
        </CardTitle>
        <CardDescription>
          Self-registration link for your outreach team. Tap NFC tag or scan QR in the field.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {qr?.qrDataUrl ? (
          <>
            <div className="flex justify-center rounded-xl border bg-white p-4">
              <img src={qr.qrDataUrl} alt="Evangelist QR code" className="h-48 w-48" />
            </div>
            {qr.evangelistName && (
              <p className="text-center text-sm font-medium">{qr.evangelistName}</p>
            )}
            <p className="text-center text-xs text-muted-foreground">
              {qr.scanCount ?? 0} scans · code {qr.code.slice(0, 8)}…
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={copyLink}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy link
              </Button>
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Nfc className="h-3.5 w-3.5" />
                NFC programming
              </p>
              <p className="mt-1">{qr.nfcInstructions}</p>
              <p className="mt-2 break-all font-mono text-[10px]">{qr.captureUrl}</p>
            </div>
          </>
        ) : (
          <div className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center">
            <QrCode className="h-14 w-14 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              Generate your personal outreach QR code
            </p>
            <Button className="mt-4" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate QR code'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
