'use client';

import type { ChurchLandingContent } from '@church-hub/shared-types';
import { buildDefaultCommunitySupportSection } from '@church-hub/shared-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CommunitySupportAdminPanel } from './CommunitySupportAdminPanel';

export function ChurchLandingCommunitySupportTab({
  draft,
  onChange,
}: {
  draft: ChurchLandingContent;
  onChange: (next: ChurchLandingContent) => void;
}) {
  const section = draft.communitySupport ?? buildDefaultCommunitySupportSection();

  const patch = (patch: Partial<typeof section>) => {
    onChange({ ...draft, communitySupport: { ...section, ...patch } });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4 rounded-xl border border-border p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={section.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
          />
          Show Community Support section on landing page
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Section title</Label>
            <Input
              value={section.title ?? ''}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </div>
          <div>
            <Label>Section subtitle</Label>
            <Input
              value={section.subtitle ?? ''}
              onChange={(e) => patch({ subtitle: e.target.value })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Approved requests appear in a full-width 4-column sliding ticker. Member names are never shown publicly.
        </p>
      </div>

      <div>
        <h3 className="mb-3 font-semibold">Pending approvals</h3>
        <CommunitySupportAdminPanel />
      </div>
    </div>
  );
}
