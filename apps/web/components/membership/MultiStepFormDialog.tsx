'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MultiStepDefinition {
  id: string;
  label: string;
  shortLabel?: string;
  description?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  steps: MultiStepDefinition[];
  step: number;
  onStepChange: (index: number) => void;
  onClose: () => void;
  onSubmit?: () => void;
  onBeforeNext?: () => boolean;
  submitLabel?: string;
  saving?: boolean;
  children: ReactNode;
  testId?: string;
  extraActions?: ReactNode;
  size?: 'default' | 'wide';
  variant?: 'default' | 'corporate';
}

export function MultiStepFormDialog({
  title,
  subtitle,
  steps,
  step,
  onStepChange,
  onClose,
  onSubmit,
  onBeforeNext,
  submitLabel = 'Save',
  saving,
  children,
  testId,
  extraActions,
  size = 'wide',
  variant = 'default',
}: Props) {
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const corporate = variant === 'corporate';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const goNext = () => {
    if (onBeforeNext && !onBeforeNext()) return;
    onStepChange(step + 1);
  };

  const stepButtons = (vertical = false) =>
    steps.map((s, i) => {
      const done = i < step;
      const active = i === step;
      return (
        <li key={s.id} className={vertical ? 'w-full' : 'shrink-0'}>
          <button
            type="button"
            onClick={() => {
              if (i <= step) onStepChange(i);
            }}
            disabled={i > step}
            className={cn(
              vertical
                ? 'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition'
                : 'rounded-full px-2.5 py-1 text-[11px] font-medium transition sm:px-3 sm:text-xs',
              corporate && vertical
                ? active
                  ? 'bg-slate-900 text-white shadow-sm'
                  : done
                    ? 'bg-slate-100 text-slate-800 hover:bg-slate-200/80'
                    : 'text-slate-500 hover:bg-slate-100'
                : active
                  ? corporate
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'bg-primary text-primary-foreground'
                  : done
                    ? corporate
                      ? 'bg-white/20 text-white hover:bg-white/25'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                    : corporate
                      ? 'bg-white/10 text-white/50'
                      : 'bg-muted/40 text-muted-foreground',
            )}
          >
            {corporate && vertical ? (
              <>
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    active
                      ? 'bg-slate-900 text-white'
                      : done
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600',
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-tight">{s.label}</span>
                  {s.description ? (
                    <span className="mt-0.5 block text-xs text-slate-500">{s.description}</span>
                  ) : null}
                </span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.shortLabel ?? i + 1}</span>
              </>
            )}
          </button>
        </li>
      );
    });

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal
      data-testid={testId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'flex max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden sm:max-h-[min(92dvh,920px)] sm:rounded-xl sm:shadow-2xl',
          corporate
            ? 'border-0 sm:border sm:border-slate-200/80'
            : 'rounded-t-2xl border-0 border-border bg-background sm:rounded-xl sm:border sm:shadow-xl',
          size === 'wide'
            ? 'sm:max-w-[min(100%,42rem)] md:max-w-4xl lg:max-w-5xl'
            : 'sm:max-w-lg md:max-w-2xl',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            'flex shrink-0 items-center justify-between px-4 py-3 sm:px-6',
            corporate
              ? 'border-b border-white/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white'
              : 'border-b border-border bg-background',
          )}
        >
          <div className="min-w-0 pr-2">
            <h2
              className={cn(
                'truncate text-base font-semibold sm:text-xl',
                corporate ? 'font-display tracking-tight text-white' : '',
              )}
            >
              {title}
            </h2>
            <p
              className={cn(
                'text-xs sm:text-sm',
                corporate ? 'text-white/70' : 'text-muted-foreground',
              )}
            >
              {subtitle ?? `Step ${step + 1} of ${steps.length}: ${steps[step]?.label}`}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className={corporate ? 'text-white hover:bg-white/10 hover:text-white' : ''}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {corporate ? (
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <aside className="hidden shrink-0 border-b border-slate-200 bg-slate-50 lg:flex lg:w-60 lg:flex-col lg:border-b-0 lg:border-r xl:w-64">
              <div className="bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-4 text-white lg:min-h-[220px]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  Progress
                </p>
                <p className="mt-1 text-sm font-medium">{steps[step]?.label}</p>
              </div>
              <ol className="space-y-1 p-3">{stepButtons(true)}</ol>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-2 lg:hidden">
                <ol className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {stepButtons(false)}
                </ol>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-slate-50/80 to-background px-4 py-4 sm:px-6 sm:py-5">
                {children}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-border px-2 py-2 sm:px-6">
              <ol className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {stepButtons(false)}
              </ol>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
              {children}
            </div>
          </>
        )}

        <div
          className={cn(
            'flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6',
            corporate
              ? 'border-slate-200 bg-white'
              : 'border-border bg-background',
          )}
        >
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex flex-wrap gap-2">
            {extraActions}
            {!isFirst ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => onStepChange(step - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            ) : null}
            {!isLast ? (
              <Button
                type="button"
                size="sm"
                onClick={goNext}
                className={corporate ? 'bg-slate-900 hover:bg-slate-800' : ''}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={onSubmit}
                className={corporate ? 'bg-slate-900 hover:bg-slate-800' : ''}
              >
                {saving ? 'Saving…' : submitLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
