'use client';

import { CellRemindersPanel } from '@/components/ministry-cells/CellRemindersPanel';
import { TeachingManualPanel } from '@/components/ministry-cells/TeachingManualPanel';
import type { FormDef, TeachingResource } from '@/components/ministry-cells/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MinistryCellsSetupPanel({
  forms,
  teaching,
  branchOptions,
  onSeedForms,
  onChanged,
}: {
  forms: FormDef[];
  teaching: TeachingResource[];
  branchOptions: { id: string; name: string }[];
  onSeedForms: () => void;
  onChanged: () => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card className="shadow-sm lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-4 py-2.5">
          <CardTitle className="text-sm font-semibold">Church-wide forms</CardTitle>
          <Button size="sm" variant="outline" className="h-8" onClick={onSeedForms}>
            Seed defaults
          </Button>
        </CardHeader>
        <CardContent className="max-h-64 space-y-1.5 overflow-y-auto px-4 pb-3 pt-0">
          {forms.map((f) => (
            <div key={f.id} className="rounded-lg border border-border/60 p-3 text-sm">
              <p className="font-medium">{f.name}</p>
              <p className="text-xs text-muted-foreground">{f.kind}</p>
            </div>
          ))}
          {forms.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No forms yet. Seed defaults to add weekly report and incident forms.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm lg:col-span-1">
        <CardHeader className="px-4 py-2.5">
          <CardTitle className="text-sm font-semibold">Teaching manual</CardTitle>
        </CardHeader>
        <CardContent className="max-h-64 overflow-y-auto px-4 pb-3 pt-0">
          <TeachingManualPanel resources={teaching} onChanged={onChanged} />
        </CardContent>
      </Card>

      <Card className="shadow-sm lg:col-span-1">
        <CardHeader className="px-4 py-2.5">
          <CardTitle className="text-sm font-semibold">Reminder scheduler</CardTitle>
        </CardHeader>
        <CardContent className="max-h-64 overflow-y-auto px-4 pb-3 pt-0">
          <CellRemindersPanel branches={branchOptions} />
        </CardContent>
      </Card>
    </div>
  );
}
