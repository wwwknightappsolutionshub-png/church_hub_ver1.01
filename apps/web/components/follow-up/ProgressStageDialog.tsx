'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { STAGE_LABELS, STAGE_SHORT } from '@/lib/follow-up';

export interface ProgressFormValues {
  whatWasDone: string;
  whatNext: string;
  dueAt: string;
}

interface ProgressStageDialogProps {
  open: boolean;
  contactName: string;
  nextStage: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: ProgressFormValues) => void | Promise<void>;
}

export function ProgressStageDialog({
  open,
  contactName,
  nextStage,
  submitting,
  onClose,
  onSubmit,
}: ProgressStageDialogProps) {
  const [whatWasDone, setWhatWasDone] = useState('');
  const [whatNext, setWhatNext] = useState('');
  const [dueAt, setDueAt] = useState('');

  useEffect(() => {
    if (open) {
      setWhatWasDone('');
      setWhatNext('');
      setDueAt('');
    }
  }, [open]);

  if (!open) return null;

  const stageLabel = STAGE_SHORT[nextStage] ?? STAGE_LABELS[nextStage] ?? nextStage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ whatWasDone, whatNext, dueAt });
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-stage-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="progress-stage-title" className="font-heading text-lg font-bold">
              Advance to next stage
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {contactName} → {stageLabel}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-1.5">
            <Label htmlFor="what-was-done">What was done</Label>
            <textarea
              id="what-was-done"
              className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Describe the contact / action taken…"
              value={whatWasDone}
              onChange={(e) => setWhatWasDone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="what-next">What should be done next</Label>
            <textarea
              id="what-next"
              className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Next follow-up action…"
              value={whatNext}
              onChange={(e) => setWhatNext(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="when-due">When it should be done</Label>
            <Input
              id="when-due"
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
