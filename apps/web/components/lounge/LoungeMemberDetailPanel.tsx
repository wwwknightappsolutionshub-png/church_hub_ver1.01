'use client';

import { cn } from '@/lib/utils';
import type { LoungeMember } from './LoungeCanvas';

function membershipLabel(status?: string) {
  if (!status) return 'Member';
  const labels: Record<string, string> = {
    VISITOR: 'Visitor',
    NEW_MEMBER: 'New Member',
    ACTIVE_MEMBER: 'Active Member',
    DISCIPLED: 'Discipled',
  };
  return labels[status] ?? status.replace(/_/g, ' ');
}

function friendshipHint(member: LoungeMember | null) {
  if (!member) return null;
  if (member.id.startsWith('demo-')) return 'Preview roster — connect when live members join';
  if (!member.canConnect) return 'Request unavailable for this member';
  return 'Ready — tap the member on the floor to connect';
}

interface LoungeMemberDetailPanelProps {
  member: LoungeMember | null;
  connecting?: boolean;
  className?: string;
}

export function LoungeMemberDetailPanel({ member, connecting, className }: LoungeMemberDetailPanelProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-20 flex h-[38%] min-h-[80px] flex-col justify-end px-4 pb-4 pt-3 sm:px-6',
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="mx-auto w-full max-w-2xl rounded-lg border border-white/10 bg-slate-900/40 px-4 py-3 backdrop-blur-sm">
        {member ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    member.isOnline ? 'lounge-presence-green' : 'lounge-presence-orange',
                  )}
                />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Member intelligence
                </span>
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium uppercase tracking-wide',
                  member.isOnline ? 'text-emerald-300/90' : 'text-orange-300/90',
                )}
              >
                {member.isOnline ? 'Available' : 'Unavailable'}
              </span>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
              <div className="rounded-md bg-slate-950/30 px-2.5 py-2">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Membership
                </dt>
                <dd className="mt-1 font-medium text-slate-50">
                  {membershipLabel(member.membershipStatus)}
                </dd>
              </div>
              <div className="rounded-md bg-slate-950/30 px-2.5 py-2">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Service unit
                </dt>
                <dd className="mt-1 font-medium text-slate-50">
                  {member.serviceUnits.length > 0 ? member.serviceUnits.join(' · ') : '—'}
                </dd>
              </div>
              <div className="rounded-md bg-slate-950/30 px-2.5 py-2">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Friendship request
                </dt>
                <dd className="mt-1 font-medium text-amber-100/95">
                  {connecting ? 'Sending request…' : friendshipHint(member)}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-center text-xs leading-relaxed text-slate-400">
            Guide your marker on the floor toward a member. Their profile appears here in the briefing
            panel — no names on the floor.
          </p>
        )}
      </div>
    </div>
  );
}
