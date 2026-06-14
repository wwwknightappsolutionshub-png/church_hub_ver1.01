'use client';

import type { PublicChurchLandingDto } from '@church-hub/shared-types';
import { Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChurchLandingView } from './ChurchLandingView';

export function ChurchLandingLivePreview({
  data,
  className,
}: {
  data: PublicChurchLandingDto;
  className?: string;
}) {
  return (
    <div
      className={cn('flex h-full min-h-[28rem] flex-col', className)}
      data-testid="church-landing-live-preview"
    >
      <div className="flex shrink-0 items-center gap-2 rounded-t-lg border border-b-0 border-slate-200 bg-slate-900 px-3 py-2 text-white dark:border-slate-700">
        <Monitor className="h-3.5 w-3.5 text-slate-300" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wide">Live preview</span>
        <span className="ml-auto truncate text-[10px] text-slate-400">{data.publicPath}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-lg border border-slate-200 bg-slate-100 shadow-inner dark:border-slate-700 dark:bg-slate-900">
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          data-testid="church-landing-preview-viewport"
        >
          <div className="pointer-events-none origin-top-left scale-[0.38] sm:scale-[0.44] lg:scale-[0.48] xl:scale-[0.5]">
            <div className="w-[263.158%] sm:w-[227.273%] lg:w-[208.333%] xl:w-[200%]">
              <ChurchLandingView data={data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
