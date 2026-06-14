'use client';

import { useState } from 'react';
import { Loader2, Mail, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HtmlRichEditor } from '@/components/ui/HtmlRichEditor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AutomationTemplate {
  id: string;
  code: string;
  name: string;
  subject: string;
  bodyHtml: string;
  isActive: boolean;
  isSystem: boolean;
}

export function AutomationEmailTemplatesPanel() {
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useApiQuery<AutomationTemplate[]>(
    ['automation-email-templates'],
    '/automation/email-templates',
  );
  const [editId, setEditId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editName, setEditName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [busy, setBusy] = useState(false);

  const startEdit = (t: AutomationTemplate) => {
    setEditId(t.id);
    setEditName(t.name);
    setEditSubject(t.subject);
    setEditBody(t.bodyHtml);
  };

  const saveEdit = async () => {
    if (!editId) return;
    setBusy(true);
    try {
      await api.patch(`/automation/email-templates/${editId}`, {
        name: editName,
        subject: editSubject,
        bodyHtml: editBody,
      });
      toast.success('Template saved');
      setEditId(null);
      queryClient.invalidateQueries({ queryKey: ['automation-email-templates'] });
    } catch {
      toast.error('Could not save template');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (t: AutomationTemplate) => {
    try {
      await api.patch(`/automation/email-templates/${t.id}`, { isActive: !t.isActive });
      queryClient.invalidateQueries({ queryKey: ['automation-email-templates'] });
    } catch {
      toast.error('Could not update template');
    }
  };

  const removeTemplate = async (t: AutomationTemplate) => {
    if (t.isSystem) return;
    try {
      await api.delete(`/automation/email-templates/${t.id}`);
      toast.success('Template removed');
      queryClient.invalidateQueries({ queryKey: ['automation-email-templates'] });
    } catch {
      toast.error('Could not delete template');
    }
  };

  const createTemplate = async () => {
    if (!newName.trim() || !newSubject.trim()) {
      toast.error('Name and subject are required');
      return;
    }
    setBusy(true);
    try {
      await api.post('/automation/email-templates', {
        name: newName.trim(),
        subject: newSubject.trim(),
        bodyHtml: '<p>Custom automated email body.</p>',
      });
      toast.success('Template created');
      setShowCreate(false);
      setNewName('');
      setNewSubject('');
      queryClient.invalidateQueries({ queryKey: ['automation-email-templates'] });
    } catch {
      toast.error('Could not create template');
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="automation-email-templates">
      <Card className="border-slate-200/80 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Email Templates Editor
          </CardTitle>
          <CardDescription className="text-white/70">
            WYSIWYG editor for staff welcome, absentee follow-up, new members, weekly digest, and event
            reminders. Use {'{{firstName}}'}, {'{{churchName}}'}, {'{{email}}'}, etc.
          </CardDescription>
        </CardHeader>
      </Card>

      {showCreate ? (
        <Card className="border-dashed">
          <CardContent className="space-y-3 pt-6">
            <label>
              <Label className="text-xs">Template name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </label>
            <label>
              <Label className="text-xs">Subject</Label>
              <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
            </label>
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={busy} onClick={createTemplate}>
                <Plus className="mr-1 h-3 w-3" />
                Create
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New custom template
        </Button>
      )}

      {(templates ?? []).map((t) => (
        <Card key={t.id} className="border-slate-200/80">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-sm font-semibold">{t.name}</CardTitle>
              <CardDescription className="font-mono text-xs">{t.code}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {t.isSystem ? (
                <Badge variant="secondary" className="text-[10px]">
                  Branded default
                </Badge>
              ) : null}
              <Badge variant={t.isActive ? 'default' : 'outline'} className="text-[10px]">
                {t.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {editId === t.id ? (
              <>
                <label>
                  <Label className="text-xs">Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </label>
                <label>
                  <Label className="text-xs">Subject</Label>
                  <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
                </label>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email body (WYSIWYG)</Label>
                  <HtmlRichEditor
                    value={editBody}
                    onChange={setEditBody}
                    minHeight="min-h-[120px] sm:min-h-[160px] md:min-h-[200px]"
                    placeholder="Write the email body…"
                    testId="automation-template-wysiwyg"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" disabled={busy} onClick={saveEdit}>
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditId(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm">
                  <span className="text-muted-foreground">Subject:</span> {t.subject}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => startEdit(t)}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => toggleActive(t)}>
                    {t.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  {!t.isSystem ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => removeTemplate(t)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
