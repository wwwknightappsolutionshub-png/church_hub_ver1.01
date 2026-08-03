'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Bell,
  ChevronRight,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  Send,
  Smartphone,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { CHANNEL_LABELS, STAGE_BADGE_CLASS, STAGE_LABELS, nextStage, stageStatusLabel } from '@/lib/follow-up';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  ProgressStageDialog,
  type ProgressFormValues,
} from '@/components/follow-up/ProgressStageDialog';
import type { ProgressAdvancePayload } from '@/components/follow-up/FollowUpPipeline';

interface Assignee {
  id: string;
  firstName: string;
  lastName: string;
}

interface Template {
  id: string;
  name: string;
  channel: string;
  subject?: string | null;
  body: string;
}

interface PastoralNote {
  id: string;
  content: string;
  isConfidential: boolean;
  createdAt: string;
  stageAtTime?: string | null;
  kind?: string | null;
  author: { firstName: string; lastName: string };
}

interface FollowUpDetail {
  id: string;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  stage: string;
  notes?: string | null;
  referredBy?: string | null;
  dueAt?: string | null;
  member?: { id: string; firstName: string; lastName: string; email?: string | null } | null;
  assignedTo?: { id: string; firstName: string; lastName: string } | null;
  reminders: Array<{
    id: string;
    remindAt: string;
    sentAt?: string | null;
    channel: string;
    message?: string | null;
  }>;
}

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface FollowUpDetailPanelProps {
  followUp: FollowUpDetail;
  assignees: Assignee[];
  templates: Template[];
  pastoralNotes: PastoralNote[];
  members: MemberOption[];
  canManageMembers: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onAdvance?: (id: string, payload: ProgressAdvancePayload) => void | Promise<void>;
  advancing?: boolean;
}

const channelIcon: Record<string, typeof Smartphone> = {
  SMS: Smartphone,
  WHATSAPP: MessageCircle,
  EMAIL: Mail,
};

function parseOutreachNotes(notes: string): {
  isOutreach: boolean;
  outreachId?: string;
  referredBy?: string;
  body: string;
} {
  const text = notes.trim();
  const outreachMatch = text.match(/Outreach ID:\s*([0-9a-f-]{36})/i);
  const referredMatch = text.match(/Referred by:\s*([^.\n]+)/i);
  const isOutreach = /Created from Outreach capture/i.test(text) || !!outreachMatch;

  let body = text
    .replace(/Created from Outreach capture\.?/gi, '')
    .replace(/Outreach ID:\s*[0-9a-f-]{36}\.?/gi, '')
    .replace(/Referred by:\s*[^.\n]+\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    isOutreach,
    outreachId: outreachMatch?.[1],
    referredBy: referredMatch?.[1]?.trim(),
    body,
  };
}

function OutreachNotesBlock({ notes }: { notes: string }) {
  const parsed = parseOutreachNotes(notes);

  if (!parsed.isOutreach) {
    return (
      <div className="rounded-xl border border-amber-200/80 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/40">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
          Notes
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-950 dark:text-amber-50">
          {notes}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-sky-50 shadow-sm dark:border-indigo-900/60 dark:from-indigo-950/50 dark:via-card dark:to-sky-950/30">
      <div className="border-b border-indigo-100 bg-indigo-600/90 px-4 py-2.5 dark:border-indigo-900/50 dark:bg-indigo-800">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-50">
          Outreach capture notes
        </p>
      </div>
      <div className="space-y-3 p-4">
        {parsed.outreachId ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700/80 dark:text-indigo-300">
              Outreach ID
            </p>
            <p className="mt-0.5 break-all font-mono text-xs text-slate-800 dark:text-slate-100">
              {parsed.outreachId}
            </p>
          </div>
        ) : null}
        {parsed.referredBy ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700/80 dark:text-indigo-300">
              Referred by
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-50">
              {parsed.referredBy}
            </p>
          </div>
        ) : null}
        {parsed.body ? (
          <div className="rounded-lg border border-indigo-100/80 bg-white/90 px-3 py-2.5 dark:border-indigo-900/40 dark:bg-slate-950/40">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700/80 dark:text-indigo-300">
              Prayer / conversation notes
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-900 dark:text-slate-50">
              {parsed.body}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FollowUpDetailPanel({
  followUp,
  assignees,
  templates,
  pastoralNotes,
  members,
  canManageMembers,
  onClose,
  onUpdated,
  onAdvance,
  advancing,
}: FollowUpDetailPanelProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'details' | 'reminders' | 'messages' | 'notes'>('details');
  const [busy, setBusy] = useState(false);
  const [assigneeId, setAssigneeId] = useState(followUp.assignedTo?.id ?? '');
  const [dueAt, setDueAt] = useState(
    followUp.dueAt ? new Date(followUp.dueAt).toISOString().slice(0, 16) : '',
  );
  const [remindAt, setRemindAt] = useState('');
  const [remindChannel, setRemindChannel] = useState('EMAIL');
  const [remindMessage, setRemindMessage] = useState(`Outreach: ${followUp.contactName}`);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [confidential, setConfidential] = useState(true);
  const [linkMemberId, setLinkMemberId] = useState(followUp.member?.id ?? '');
  const [mounted, setMounted] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const saveAssignment = async () => {
    setBusy(true);
    try {
      await api.patch(`/follow-up/${followUp.id}`, {
        assignedToId: assigneeId || null,
        dueAt: dueAt || null,
      });
      toast.success('Assignment updated');
      onUpdated();
    } catch {
      toast.error('Could not update assignment');
    } finally {
      setBusy(false);
    }
  };

  const scheduleReminder = async () => {
    if (!remindAt) return;
    setBusy(true);
    try {
      await api.post(`/follow-up/${followUp.id}/reminders`, {
        remindAt: new Date(remindAt).toISOString(),
        channel: remindChannel,
        message: remindMessage,
        templateId: selectedTemplate || undefined,
      });
      toast.success('Reminder scheduled');
      setRemindAt('');
      onUpdated();
    } catch {
      toast.error('Could not schedule reminder');
    } finally {
      setBusy(false);
    }
  };

  const sendTemplate = async (templateId: string) => {
    setBusy(true);
    try {
      await api.post(`/follow-up/${followUp.id}/send-template`, { templateId });
      toast.success('Message sent');
    } catch {
      toast.error('Could not send — check phone or email on record');
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!noteBody.trim()) return;
    setBusy(true);
    try {
      await api.post('/follow-up/pastoral-notes', {
        followUpId: followUp.id,
        content: noteBody.trim(),
        isConfidential: confidential,
        stageAtTime: followUp.stage,
        kind: 'NOTE',
      });
      setNoteBody('');
      toast.success('Comment saved');
      queryClient.invalidateQueries({ queryKey: ['pastoral-notes', followUp.id] });
      onUpdated();
    } catch {
      toast.error('Could not save comment — pastoral access required');
    } finally {
      setBusy(false);
    }
  };

  const linkToMember = async () => {
    if (!linkMemberId) return;
    setBusy(true);
    try {
      await api.post(`/follow-up/${followUp.id}/link-member`, { memberId: linkMemberId });
      toast.success('Linked to member profile');
      onUpdated();
    } catch {
      toast.error('Could not link member — Member Admin permission required');
    } finally {
      setBusy(false);
    }
  };

  const createMemberFromLead = async () => {
    setBusy(true);
    try {
      await api.post(`/follow-up/${followUp.id}/create-member`);
      toast.success('Member record created and linked');
      onUpdated();
    } catch {
      toast.error('Could not create member — Member Admin permission required');
    } finally {
      setBusy(false);
    }
  };

  const nxt = nextStage(followUp.stage);

  const tabs = [
    { id: 'details' as const, label: 'Details' },
    { id: 'reminders' as const, label: 'Reminders' },
    { id: 'messages' as const, label: 'Templates' },
    { id: 'notes' as const, label: 'Pastoral notes' },
  ];

  const initial = followUp.contactName.charAt(0).toUpperCase();

  if (!mounted) return null;

  return createPortal(
    <>
      <ProgressStageDialog
        open={showAdvance && !!nxt}
        contactName={followUp.contactName}
        nextStage={nxt ?? ''}
        submitting={advancing}
        onClose={() => {
          if (!advancing) setShowAdvance(false);
        }}
        onSubmit={async (values: ProgressFormValues) => {
          if (!nxt || !onAdvance) return;
          await onAdvance(followUp.id, { ...values, stage: nxt });
          setShowAdvance(false);
          onUpdated();
        }}
      />
      <button
        type="button"
        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-label={`${followUp.contactName} details`}
        className="fixed inset-y-0 right-0 z-[110] flex h-[100dvh] w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="shrink-0 border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-md">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-xl font-bold text-foreground">{followUp.contactName}</p>
              <Badge
                className={cn(
                  'mt-2',
                  STAGE_BADGE_CLASS[followUp.stage] ?? 'bg-muted text-muted-foreground',
                )}
              >
                {stageStatusLabel(followUp.stage)}
              </Badge>
              <p className="mt-1 text-xs text-muted-foreground">
                {STAGE_LABELS[followUp.stage] ?? followUp.stage}
              </p>
              {followUp.referredBy?.trim() ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Referred by{' '}
                  <span className="font-medium text-foreground">{followUp.referredBy.trim()}</span>
                </p>
              ) : null}
              {followUp.assignedTo && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Assigned to{' '}
                  <span className="font-medium text-foreground">
                    {followUp.assignedTo.firstName} {followUp.assignedTo.lastName}
                  </span>
                </p>
              )}
              {nxt && onAdvance && (
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  disabled={advancing}
                  onClick={() => setShowAdvance(true)}
                >
                  Advance to next stage
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-muted/30 px-3 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                tab === t.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {tab === 'details' && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              {followUp.contactPhone && <p>Phone: {followUp.contactPhone}</p>}
              {followUp.contactEmail && <p>Email: {followUp.contactEmail}</p>}
              {followUp.notes ? <OutreachNotesBlock notes={followUp.notes} /> : null}
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-primary" />
                Membership
              </p>
              {followUp.member ? (
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    {followUp.member.firstName} {followUp.member.lastName}
                  </p>
                  <Button size="sm" variant="link" className="h-auto p-0" asChild>
                    <Link href={`/dashboard/membership`}>Open in Membership →</Link>
                  </Button>
                </div>
              ) : canManageMembers ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    {followUp.stage === 'JOINED_GROUP'
                      ? 'Convert to Members within 7 days. On day 6 leaders are reminded; on day 7 this contact leaves Joined Group automatically.'
                      : 'Link this lead to an existing member or create a new visitor record.'}
                  </p>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={linkMemberId}
                    onChange={(e) => setLinkMemberId(e.target.value)}
                  >
                    <option value="">Select member…</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busy || !linkMemberId} onClick={linkToMember}>
                      Link member
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={createMemberFromLead}>
                      <UserPlus className="mr-1.5 h-4 w-4" />
                      Create member
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Not linked to membership yet. Ask a Member Admin to connect this lead.
                </p>
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm font-medium">Assigned Manager</p>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.firstName} {a.lastName}
                  </option>
                ))}
              </select>
              <label className="text-xs text-muted-foreground">Follow-up due</label>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
              <Button size="sm" disabled={busy} onClick={saveAssignment}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save assignment'}
              </Button>
            </div>

            {nxt && onAdvance ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-between"
                disabled={advancing}
                onClick={() => setShowAdvance(true)}
              >
                Advance to next stage → {STAGE_LABELS[nxt]}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        )}

        {tab === 'reminders' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Reminders notify the assignee in-app, then email and WhatsApp when contact details exist.
              SMS is used only as a fallback when email is not available.
            </p>
            <ul className="space-y-2">
              {followUp.reminders.map((r) => (
                <li key={r.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge variant={r.sentAt ? 'success' : 'gold'}>
                      {r.sentAt ? 'Sent' : 'Scheduled'} · {r.channel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.remindAt).toLocaleString()}
                    </span>
                  </div>
                  {r.message && <p className="mt-2 text-muted-foreground">{r.message}</p>}
                </li>
              ))}
              {followUp.reminders.length === 0 && (
                <p className="text-sm text-muted-foreground">No reminders yet</p>
              )}
            </ul>

            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Bell className="h-4 w-4 text-primary" />
                Schedule reminder
              </p>
              <Input
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
              />
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={remindChannel}
                onChange={(e) => setRemindChannel(e.target.value)}
              >
                {['EMAIL', 'WHATSAPP', 'SMS'].map((c) => (
                  <option key={c} value={c}>
                    {CHANNEL_LABELS[c]}
                  </option>
                ))}
              </select>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  const tpl = templates.find((t) => t.id === e.target.value);
                  if (tpl) setRemindMessage(tpl.body.replace(/\{\{name\}\}/gi, followUp.contactName));
                }}
              >
                <option value="">Optional template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.channel})
                  </option>
                ))}
              </select>
              <textarea
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={remindMessage}
                onChange={(e) => setRemindMessage(e.target.value)}
              />
              <Button size="sm" disabled={busy || !remindAt} onClick={scheduleReminder}>
                Schedule automated reminder
              </Button>
            </div>
          </div>
        )}

        {tab === 'messages' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              SMS, WhatsApp, and email templates. Use {'{{name}}'} and {'{{church}}'} placeholders.
            </p>
            {templates.map((tpl) => {
              const Icon = channelIcon[tpl.channel] ?? Send;
              return (
                <div key={tpl.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <p className="font-medium text-sm">{tpl.name}</p>
                    </div>
                    <Badge variant="outline">{CHANNEL_LABELS[tpl.channel]}</Badge>
                  </div>
                  {tpl.subject && (
                    <p className="mt-1 text-xs text-muted-foreground">Subject: {tpl.subject}</p>
                  )}
                  <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{tpl.body}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    disabled={busy}
                    onClick={() => sendTemplate(tpl.id)}
                  >
                    Send now
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-4">
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              Confidential notes are visible only to pastoral staff and the author.
            </p>
            <ul className="space-y-2">
              {pastoralNotes.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    'rounded-lg border p-3 text-sm',
                    n.isConfidential ? 'border-primary/20 bg-primary/5' : 'border-border',
                    n.kind === 'ARCHIVE_REQUEST' && 'border-destructive/30 bg-destructive/5',
                  )}
                >
                  <p className="text-xs text-muted-foreground">
                    {n.author.firstName} {n.author.lastName}
                    {n.stageAtTime ? ` · ${STAGE_LABELS[n.stageAtTime] ?? n.stageAtTime}` : ''}
                    {n.kind && n.kind !== 'NOTE' ? ` · ${n.kind.replace(/_/g, ' ').toLowerCase()}` : ''}
                    {n.isConfidential ? ' · Confidential' : ''} ·{' '}
                    {new Date(n.createdAt).toLocaleDateString()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{n.content}</p>
                </li>
              ))}
              {pastoralNotes.length === 0 && (
                <p className="text-sm text-muted-foreground">No journey comments yet</p>
              )}
            </ul>
            <div className="space-y-2 rounded-lg border border-border p-4">
              <textarea
                className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Stage comment, prayer points, discipleship notes…"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confidential}
                  onChange={(e) => setConfidential(e.target.checked)}
                />
                <Lock className="h-3.5 w-3.5" />
                Confidential (restricted)
              </label>
              <Button size="sm" disabled={busy} onClick={addNote}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add comment'}
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </>,
    document.body,
  );
}
