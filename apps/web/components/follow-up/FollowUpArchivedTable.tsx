'use client';

import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { STAGE_LABELS } from '@/lib/follow-up';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ArchivedLead {
  id: string;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  stage: string;
  archiveReason?: string | null;
  archivedAt?: string | null;
  archivedBy?: { firstName: string; lastName: string } | null;
}

interface FollowUpArchivedTableProps {
  items: ArchivedLead[];
  canRecontact: boolean;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onRecontacted?: () => void;
}

export function FollowUpArchivedTable({
  items,
  canRecontact,
  onSelect,
  selectedId,
  onRecontacted,
}: FollowUpArchivedTableProps) {
  const [emailFor, setEmailFor] = useState<ArchivedLead | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const openEmail = (item: ArchivedLead) => {
    if (!item.contactEmail) {
      toast.error('No email on this lead');
      return;
    }
    setEmailFor(item);
    setSubject(`Following up — ${item.contactName}`);
    setBody(`Hi ${item.contactName.split(' ')[0] || item.contactName},\n\n`);
  };

  const send = async () => {
    if (!emailFor) return;
    setSending(true);
    try {
      await api.post(`/follow-up/${emailFor.id}/recontact`, { subject, body });
      toast.success('Email sent');
      setEmailFor(null);
      onRecontacted?.();
    } catch {
      toast.error('Could not send email');
    } finally {
      setSending(false);
    }
  };

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        No archived leads yet. Archived contacts leave the pipeline and appear here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Last stage</th>
              <th className="px-4 py-3 font-semibold">Reason</th>
              <th className="px-4 py-3 font-semibold">Archived</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className={cn(
                  'border-b border-border/70',
                  selectedId === item.id && 'bg-primary/5',
                )}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="font-medium text-foreground hover:underline"
                    onClick={() => onSelect(item.id)}
                  >
                    {item.contactName}
                  </button>
                  {item.contactEmail && (
                    <p className="text-xs text-muted-foreground">{item.contactEmail}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{STAGE_LABELS[item.stage] ?? item.stage}</Badge>
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">
                  {item.archiveReason || '—'}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {item.archivedAt
                    ? new Date(item.archivedAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                  {item.archivedBy && (
                    <span className="block">
                      by {item.archivedBy.firstName} {item.archivedBy.lastName}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {canRecontact && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!item.contactEmail}
                      onClick={() => openEmail(item)}
                    >
                      <Mail className="mr-1.5 h-3.5 w-3.5" />
                      Email
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {emailFor && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !sending && setEmailFor(null)}
        >
          <div
            className="w-full max-w-md space-y-3 rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading text-lg font-bold">Re-contact by email</h3>
            <p className="text-sm text-muted-foreground">
              {emailFor.contactName} · {emailFor.contactEmail}
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Archived leads stay archived — this only sends an email.
            </p>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={sending} onClick={() => setEmailFor(null)}>
                Cancel
              </Button>
              <Button type="button" disabled={sending} onClick={() => void send()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send email'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
