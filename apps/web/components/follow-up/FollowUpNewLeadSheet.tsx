'use client';

import { UserPlus, X } from 'lucide-react';
import { useOfflineSync } from '@/lib/hooks/use-offline-sync';
import { OutreachCaptureForm } from '@/components/outreach/OutreachCaptureForm';
import { Button } from '@/components/ui/button';

interface FollowUpNewLeadSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/** Fresh Contact uses the same Field Capture form and Outreach DB path. */
export function FollowUpNewLeadSheet({ open, onClose, onSuccess }: FollowUpNewLeadSheetProps) {
  const { online } = useOfflineSync();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(92dvh,44rem)] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="font-heading text-lg font-bold text-foreground">Add Fresh Contact</p>
              <p className="text-xs text-muted-foreground">
                Same form as Field Capture — saved to Outreach and the follow-up pipeline
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <OutreachCaptureForm
            online={online}
            onSuccess={() => {
              onSuccess();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
