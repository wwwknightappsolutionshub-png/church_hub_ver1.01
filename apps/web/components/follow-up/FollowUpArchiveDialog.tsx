'use client';

import { useEffect, useState } from 'react';
import { Archive, Ban, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type Mode = 'archive' | 'dnd' | 'decline';

interface FollowUpArchiveDialogProps {
  open: boolean;
  mode: Mode;
  contactName: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void | Promise<void>;
}

const COPY: Record<Mode, { title: string; description: string; label: string; cta: string }> = {
  archive: {
    title: 'Archive lead',
    description:
      'Leaves the membership journey. Cannot be restored — email re-contact only from Archived Leads.',
    label: 'Reason for archiving',
    cta: 'Archive',
  },
  dnd: {
    title: 'Request archive (DND)',
    description:
      'Unit leader / pastor will get an in-app alert and a red flag on this card. Comment is required.',
    label: 'Why should this lead be archived?',
    cta: 'Send request',
  },
  decline: {
    title: 'Decline archive request',
    description: 'Keep this lead in the pipeline. Optionally leave a note for the team.',
    label: 'Note (optional)',
    cta: 'Decline request',
  },
};

export function FollowUpArchiveDialog({
  open,
  mode,
  contactName,
  submitting,
  onClose,
  onSubmit,
}: FollowUpArchiveDialogProps) {
  const [reason, setReason] = useState('');
  const copy = COPY[mode];

  useEffect(() => {
    if (open) setReason('');
  }, [open, mode]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (mode !== 'decline' && trimmed.length < 3) {
      toast.error('Please enter a reason (at least 3 characters)');
      return;
    }
    await onSubmit(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold">{copy.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {contactName} — {copy.description}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={submitting}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form className="space-y-4" onSubmit={(e) => void submit(e)}>
          <div className="space-y-2">
            <label className="text-sm font-medium">{copy.label}</label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              required={mode !== 'decline'}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={submitting} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={mode === 'decline' ? 'default' : 'destructive'}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.cta}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ArchiveIconButton({
  title,
  onClick,
}: {
  title: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Archive className="h-3.5 w-3.5" />
      <span className="sr-only">{title}</span>
    </Button>
  );
}

export function DndIconButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
      title="Archive"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Ban className="mr-1 h-3.5 w-3.5" />
      DND
    </Button>
  );
}
