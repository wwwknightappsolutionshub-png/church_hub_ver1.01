'use client';

import { Label } from '@/components/ui/label';
import { useApiQuery } from '@/lib/hooks/use-api-query';

export interface LeaderCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface BranchLeaderSelectProps {
  value: string;
  onChange: (userId: string) => void;
  id?: string;
  label?: string;
  disabled?: boolean;
  enabled?: boolean;
}

export function BranchLeaderSelect({
  value,
  onChange,
  id = 'leaderUserId',
  label = 'Cell leader',
  disabled,
  enabled = true,
}: BranchLeaderSelectProps) {
  const { data: candidates = [], isLoading } = useApiQuery<LeaderCandidate[]>(
    ['ministry-cells', 'leader-candidates'],
    '/ministry-cells/leader-candidates',
    { enabled },
  );

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="mt-1 flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isLoading}
      >
        <option value="">Unassigned</option>
        {candidates.map((u) => (
          <option key={u.id} value={u.id}>
            {u.firstName} {u.lastName}
            {u.email ? ` (${u.email})` : ''}
          </option>
        ))}
      </select>
      {isLoading && (
        <p className="mt-1 text-xs text-muted-foreground">Loading users…</p>
      )}
      {!isLoading && candidates.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          No church user accounts found. Invite staff or link members to user accounts first.
        </p>
      )}
    </div>
  );
}
