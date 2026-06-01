'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LandingModal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-modal-title"
        className={cn(
          'relative z-10 flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-xl sm:rounded-2xl',
          'pb-[env(safe-area-inset-bottom)]',
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <h2 id="landing-modal-title" className="font-heading text-lg font-bold pr-8">
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            className="absolute right-2 top-2 h-11 w-11 touch-manipulation sm:right-3 sm:top-3"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      </div>
    </div>
  );
}
