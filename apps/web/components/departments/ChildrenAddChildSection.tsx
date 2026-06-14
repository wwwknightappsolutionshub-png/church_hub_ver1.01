'use client';

import { useState } from 'react';
import { FileUp, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { deptToolsApiBase } from '@/lib/dept-module-catalog';
import { LazyMembershipImportWizard } from '@/lib/membership-lazy';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChildrenAddChildWizard } from '@/components/departments/ChildrenAddChildWizard';

export function ChildrenAddChildSection({
  unitId,
  onRegistered,
}: {
  unitId: string;
  onRegistered?: () => void;
}) {
  const importBase = `${deptToolsApiBase(unitId)}/children/registration/import`;

  const [showWizard, setShowWizard] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Register children</CardTitle>
          <CardDescription>
            Add a child in three steps — personal &amp; class details, family tree, then preview. Or bulk
            upload a CSV. New children are tagged for Children&apos;s Church automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" className="gap-2" onClick={() => setShowWizard(true)}>
            <UserPlus className="h-4 w-4" />
            Add Child
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={() => setShowBulkImport(true)}>
            <FileUp className="h-4 w-4" />
            Bulk upload
          </Button>
        </CardContent>
      </Card>

      {showWizard ? (
        <ChildrenAddChildWizard
          unitId={unitId}
          onClose={() => setShowWizard(false)}
          onSaved={onRegistered}
        />
      ) : null}

      {showBulkImport ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-xl border border-border bg-background shadow-lg sm:rounded-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold">Bulk upload children</h2>
                <p className="text-xs text-muted-foreground">
                  Imported members are tagged for Children&apos;s Church and assigned a class when
                  date of birth is provided.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowBulkImport(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <LazyMembershipImportWizard
                apiBase={importBase}
                templateFilename="churchhub-children-import-template.csv"
                onComplete={() => {
                  setShowBulkImport(false);
                  toast.success('Bulk import complete');
                  onRegistered?.();
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
