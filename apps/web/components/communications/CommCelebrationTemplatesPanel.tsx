'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CelebrationEmailTemplateDto } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { HtmlRichEditor } from '@/components/ui/HtmlRichEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CommCelebrationTemplatesPanel() {
  const { data: templates, isLoading, refetch } = useApiQuery<CelebrationEmailTemplateDto[]>(
    ['celebration-email-templates'],
    '/communications/celebration-templates',
  );

  const [birthdaySubject, setBirthdaySubject] = useState('');
  const [birthdayHtml, setBirthdayHtml] = useState('');
  const [birthdayAuto, setBirthdayAuto] = useState(true);
  const [anniversarySubject, setAnniversarySubject] = useState('');
  const [anniversaryHtml, setAnniversaryHtml] = useState('');
  const [anniversaryAuto, setAnniversaryAuto] = useState(true);
  const [saving, setSaving] = useState<'BIRTHDAY' | 'ANNIVERSARY' | null>(null);

  useEffect(() => {
    const b = templates?.find((t) => t.kind === 'BIRTHDAY');
    const a = templates?.find((t) => t.kind === 'ANNIVERSARY');
    if (b) {
      setBirthdaySubject(b.subject);
      setBirthdayHtml(b.bodyHtml);
      setBirthdayAuto(b.autoSend);
    }
    if (a) {
      setAnniversarySubject(a.subject);
      setAnniversaryHtml(a.bodyHtml);
      setAnniversaryAuto(a.autoSend);
    }
  }, [templates]);

  const save = async (kind: 'BIRTHDAY' | 'ANNIVERSARY') => {
    setSaving(kind);
    try {
      await api.patch(`/communications/celebration-templates/${kind.toLowerCase()}`, {
        subject: kind === 'BIRTHDAY' ? birthdaySubject : anniversarySubject,
        bodyHtml: kind === 'BIRTHDAY' ? birthdayHtml : anniversaryHtml,
        autoSend: kind === 'BIRTHDAY' ? birthdayAuto : anniversaryAuto,
        isActive: true,
      });
      toast.success(`${kind === 'BIRTHDAY' ? 'Birthday' : 'Anniversary'} template saved`);
      await refetch();
    } catch {
      toast.error('Could not save template');
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="celebration-templates-panel">
      <p className="text-sm text-muted-foreground">Edit the template as needed.</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Birthday celebrants</CardTitle>
            <CardDescription>Sent automatically on each member&apos;s birthday</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="birthday-subject">Subject</Label>
              <Input
                id="birthday-subject"
                value={birthdaySubject}
                onChange={(e) => setBirthdaySubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthday-body">Email body</Label>
              <HtmlRichEditor
                value={birthdayHtml}
                onChange={setBirthdayHtml}
                minHeight="min-h-[200px]"
                placeholder="Edit the template as needed"
                testId="birthday-template-editor"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={birthdayAuto}
                onChange={(e) => setBirthdayAuto(e.target.checked)}
              />
              Auto-send on birthday
            </label>
            <Button
              size="sm"
              disabled={saving === 'BIRTHDAY'}
              onClick={() => save('BIRTHDAY')}
              data-testid="save-birthday-template"
            >
              {saving === 'BIRTHDAY' ? 'Saving…' : 'Save birthday template'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Special anniversaries</CardTitle>
            <CardDescription>Sent on member/family special occasion dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="anniversary-subject">Subject</Label>
              <Input
                id="anniversary-subject"
                value={anniversarySubject}
                onChange={(e) => setAnniversarySubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anniversary-body">Email body</Label>
              <HtmlRichEditor
                value={anniversaryHtml}
                onChange={setAnniversaryHtml}
                minHeight="min-h-[200px]"
                placeholder="Edit the template as needed"
                testId="anniversary-template-editor"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={anniversaryAuto}
                onChange={(e) => setAnniversaryAuto(e.target.checked)}
              />
              Auto-send on occasion date
            </label>
            <Button
              size="sm"
              disabled={saving === 'ANNIVERSARY'}
              onClick={() => save('ANNIVERSARY')}
              data-testid="save-anniversary-template"
            >
              {saving === 'ANNIVERSARY' ? 'Saving…' : 'Save anniversary template'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
