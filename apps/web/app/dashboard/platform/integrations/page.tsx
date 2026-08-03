'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plug, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { PlatformConsoleShell } from '@/components/platform/PlatformConsoleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type WhatsAppConfig = {
  enabled: boolean;
  apiUrl: string | null;
  sessionId: string | null;
  apiKeyHeader: string;
  apiKeyConfigured: boolean;
  apiKeyHint: string | null;
  envFallbackAvailable: boolean;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
  lastSendAt: string | null;
  lastSendOk: boolean | null;
  updatedAt: string | null;
  updatedBy: { id: string; email: string; firstName: string; lastName: string } | null;
};

export default function PlatformIntegrationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { isPlatformOperator, hasPlatformPermission, isLoading: accessLoading } = useModuleAccess();
  const canAccess = isPlatformOperator && hasPlatformPermission('platform.integrations:read');
  const canWrite = hasPlatformPermission('platform.integrations:write');

  const { data: config, isLoading } = useApiQuery<WhatsAppConfig>(
    ['platform-whatsapp-config'],
    '/platform/integrations/whatsapp',
    { enabled: canAccess },
  );

  const [enabled, setEnabled] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [apiKeyHeader, setApiKeyHeader] = useState('x-api-key');
  const [apiKey, setApiKey] = useState('');
  const [clearApiKey, setClearApiKey] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!accessLoading && !canAccess) router.replace('/dashboard/platform');
  }, [accessLoading, canAccess, router]);

  useEffect(() => {
    if (!config) return;
    setEnabled(config.enabled);
    setApiUrl(config.apiUrl ?? '');
    setSessionId(config.sessionId ?? '');
    setApiKeyHeader(config.apiKeyHeader || 'x-api-key');
    setApiKey('');
    setClearApiKey(false);
    setHydrated(true);
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        enabled,
        apiUrl: apiUrl.trim() || null,
        sessionId: sessionId.trim() || null,
        apiKeyHeader: apiKeyHeader.trim() || 'x-api-key',
      };
      if (clearApiKey) payload.clearApiKey = true;
      else if (apiKey.trim()) payload.apiKey = apiKey.trim();
      const { data } = await api.patch('/platform/integrations/whatsapp', payload);
      return data as WhatsAppConfig;
    },
    onSuccess: () => {
      toast.success('WhatsApp session saved');
      setApiKey('');
      setClearApiKey(false);
      qc.invalidateQueries({ queryKey: ['platform-whatsapp-config'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not save WhatsApp config')),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/platform/integrations/whatsapp/test', {
        phone: testPhone.trim(),
        message: testMessage.trim() || undefined,
      });
      return data as { success: boolean; error?: string | null; messageId?: string };
    },
    onSuccess: (data) => {
      if (data.success) toast.success(`Test sent (${data.messageId ?? 'ok'})`);
      else toast.error(data.error || 'Test send failed');
      qc.invalidateQueries({ queryKey: ['platform-whatsapp-config'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Test send failed')),
  });

  if (accessLoading || !canAccess) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const statusLabel = !config
    ? '…'
    : config.enabled && config.apiKeyConfigured && config.apiUrl && config.sessionId
      ? 'Live (database)'
      : config.envFallbackAvailable
        ? 'Env fallback ready'
        : 'Not configured';

  return (
    <PlatformConsoleShell
      title="Integrations"
      description="One global WhatsApp session for the whole platform. All churches send through this gateway."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            config?.enabled && config.apiKeyConfigured
              ? 'border-emerald-600/40 text-emerald-700'
              : 'text-muted-foreground',
          )}
        >
          {statusLabel}
        </Badge>
        {config?.apiKeyConfigured && (
          <Badge variant="secondary">Key {config.apiKeyHint ?? '••••'}</Badge>
        )}
        {config?.envFallbackAvailable && (
          <Badge variant="outline">WHATSAPP_* env available</Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="h-4 w-4" aria-hidden />
              WhatsApp gateway
            </CardTitle>
            <CardDescription>
              Provider send URL, API key, and session ID. The API key is encrypted at rest and never
              shown again after save — paste a new key to rotate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading || !hydrated ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading config…
              </div>
            ) : (
              <>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={enabled}
                    disabled={!canWrite}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  <span className="text-sm">
                    <span className="font-medium">Enable database config</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      When on, the saved session is used for every WhatsApp send. When off, env
                      fallback is used if present.
                    </span>
                  </span>
                </label>

                <div className="space-y-2">
                  <Label htmlFor="wa-api-url">API URL</Label>
                  <Input
                    id="wa-api-url"
                    placeholder="https://provider.example.com/api/send"
                    value={apiUrl}
                    disabled={!canWrite}
                    onChange={(e) => setApiUrl(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wa-session">Session ID</Label>
                  <Input
                    id="wa-session"
                    placeholder="Linked WhatsApp session / instance id"
                    value={sessionId}
                    disabled={!canWrite}
                    onChange={(e) => setSessionId(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="wa-key-header">API key header</Label>
                    <Input
                      id="wa-key-header"
                      value={apiKeyHeader}
                      disabled={!canWrite}
                      onChange={(e) => setApiKeyHeader(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wa-api-key">
                      API key{' '}
                      {config?.apiKeyConfigured ? (
                        <span className="font-normal text-muted-foreground">
                          (leave blank to keep {config.apiKeyHint})
                        </span>
                      ) : (
                        <span className="font-normal text-muted-foreground">(required)</span>
                      )}
                    </Label>
                    <Input
                      id="wa-api-key"
                      type="password"
                      placeholder={config?.apiKeyConfigured ? '••••••••' : 'Paste provider API key'}
                      value={apiKey}
                      disabled={!canWrite || clearApiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {config?.apiKeyConfigured && canWrite && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={clearApiKey}
                      onChange={(e) => {
                        setClearApiKey(e.target.checked);
                        if (e.target.checked) setApiKey('');
                      }}
                    />
                    Clear stored API key
                  </label>
                )}

                {canWrite && (
                  <Button
                    type="button"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save session
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Test send</CardTitle>
              <CardDescription>
                Sends through the live resolver (database if enabled, else env). Use E.164, e.g.
                447700900123.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="wa-test-phone">Phone number</Label>
                <Input
                  id="wa-test-phone"
                  placeholder="447700900123"
                  value={testPhone}
                  disabled={!canWrite}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wa-test-msg">Message (optional)</Label>
                <Input
                  id="wa-test-msg"
                  placeholder="Church Hub connectivity test"
                  value={testMessage}
                  disabled={!canWrite}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
              </div>
              {canWrite && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending || !testPhone.trim()}
                >
                  {testMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send test
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status</CardTitle>
              <CardDescription>Last activity for this global session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Last test:</span>{' '}
                {config?.lastTestAt
                  ? `${new Date(config.lastTestAt).toLocaleString()} — ${
                      config.lastTestOk ? 'OK' : 'Failed'
                    }`
                  : 'Never'}
              </p>
              {config?.lastTestMessage && (
                <p className="break-words text-muted-foreground">{config.lastTestMessage}</p>
              )}
              <p>
                <span className="text-muted-foreground">Last send:</span>{' '}
                {config?.lastSendAt
                  ? `${new Date(config.lastSendAt).toLocaleString()} — ${
                      config.lastSendOk ? 'OK' : 'Failed'
                    }`
                  : 'Never'}
              </p>
              {config?.updatedAt && (
                <p className="text-muted-foreground">
                  Updated {new Date(config.updatedAt).toLocaleString()}
                  {config.updatedBy
                    ? ` by ${config.updatedBy.firstName} ${config.updatedBy.lastName}`.trim()
                    : ''}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PlatformConsoleShell>
  );
}
