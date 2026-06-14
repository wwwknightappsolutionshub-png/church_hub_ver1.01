'use client';

import { useState } from 'react';
import type { MembershipEmailLinksDto } from '@church-hub/shared-types';
import { Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { EmailRoleMenu } from '@/components/membership/EmailRoleMenu';
import { CommCelebrationTemplatesPanel } from '@/components/communications/CommCelebrationTemplatesPanel';
import { HtmlRichEditor } from '@/components/ui/HtmlRichEditor';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CongregantsCommunicationsView() {
  const { data: emailLinks } = useApiQuery<MembershipEmailLinksDto>(
    ['membership-email-links'],
    '/membership/registry/email-links',
  );

  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [recipient, setRecipient] = useState<'all' | 'bcc'>('bcc');
  const [sending, setSending] = useState(false);

  const byRoleAll = (emailLinks?.byFamilyRole ?? [])
    .filter((r) => r.all)
    .map((r) => ({ role: r.role, href: r.all }));
  const byRoleBcc = (emailLinks?.byFamilyRole ?? [])
    .filter((r) => r.bcc)
    .map((r) => ({ role: r.role, href: r.bcc }));

  const sendEmail = async () => {
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (!bodyHtml.trim()) {
      toast.error('Message body is required');
      return;
    }
    setSending(true);
    try {
      const res = await api.post<{ sent: number; recipients: number; message: string }>(
        '/membership/registry/send-email',
        {
          subject: subject.trim(),
          bodyHtml,
          mode: recipient,
        },
      );
      toast.success(res.data.message || `Sent to ${res.data.recipients} recipient(s)`);
    } catch {
      toast.error('Could not send email — check congregant email addresses and API logs');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="congregants-communications">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Communications</h2>
        <p className="text-sm text-muted-foreground">
          Compose outreach with a rich editor and send directly to congregant email addresses.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base">Email composer</CardTitle>
            <CardDescription>Write your message, choose recipients, and send from the server.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="comm-recipient">Recipients</Label>
                <select
                  id="comm-recipient"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value as 'all' | 'bcc')}
                  data-testid="comm-recipient-mode"
                >
                  <option value="bcc">All congregants (BCC)</option>
                  <option value="all">All congregants (individual sends)</option>
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="comm-subject">Subject</Label>
                <Input
                  id="comm-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Message subject"
                  data-testid="comm-subject"
                />
              </div>
            </div>

            <div className="space-y-2" data-testid="comm-wysiwyg">
              <Label>Message</Label>
              <HtmlRichEditor
                value={bodyHtml}
                onChange={setBodyHtml}
                placeholder="Write your congregant email…"
                minHeight="min-h-[240px]"
              />
            </div>

            <Button
              type="button"
              disabled={sending}
              onClick={sendEmail}
              data-testid="comm-send-email"
            >
              <Send className="mr-1.5 h-4 w-4" />
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" />
                Quick launch
              </CardTitle>
              <CardDescription>Role-based mailto shortcuts without composing first.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <EmailRoleMenu
                label="Email All"
                testId="email-all-menu"
                allHref={emailLinks?.all}
                allLabel="All congregants"
                byRole={byRoleAll}
              />
              <EmailRoleMenu
                label="Email BCC"
                testId="email-bcc-menu"
                allHref={emailLinks?.bcc}
                allLabel="All congregants (BCC)"
                byRole={byRoleBcc}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <CommCelebrationTemplatesPanel />
    </div>
  );
}
