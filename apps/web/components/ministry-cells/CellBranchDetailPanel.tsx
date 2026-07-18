'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  ChevronDown,
  MessageSquare,
  Send,
  Users,
} from 'lucide-react';
import { BranchAnalyticsPanel } from '@/components/ministry-cells/BranchAnalyticsPanel';
import { BranchLeaderSelect } from '@/components/ministry-cells/BranchLeaderSelect';
import { BranchMembersPanel } from '@/components/ministry-cells/BranchMembersPanel';
import { CellBranchMembersSheet } from '@/components/ministry-cells/CellBranchMembersSheet';
import { CellPrayerPanel } from '@/components/ministry-cells/CellPrayerPanel';
import type { BranchDetail, FormDef, MinistryCellsContext, TeachingResource } from '@/components/ministry-cells/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type WorkspaceSection = 'overview' | 'members' | 'weekly' | 'connect' | 'analytics';

export type WeeklyAttendanceForm = {
  meetingDate: string;
  maleCount: string;
  femaleCount: string;
  boysCount: string;
  girlsCount: string;
  testifiersCount: string;
  firstTimersCount: string;
};

export function CellBranchDetailPanel({
  ctx,
  branchDetail,
  selectedBranchId,
  forms,
  teaching,
  messages,
  editBranchOpen,
  editName,
  editLocation,
  editLeaderId,
  branchSaving,
  weeklyForm,
  reportFormId,
  messageBody,
  onClose,
  onEditToggle,
  onEditName,
  onEditLocation,
  onEditLeaderId,
  onSaveBranch,
  onWeeklyFormChange,
  onReportFormId,
  onRecordAttendance,
  onSubmitReport,
  onMessageBody,
  onSendMessage,
  onChanged,
  incidentCount = 0,
  branchOptions = [],
  onSwitchBranch,
}: {
  ctx: MinistryCellsContext;
  branchDetail: BranchDetail;
  selectedBranchId: string;
  forms: FormDef[];
  teaching: TeachingResource[];
  messages: Array<{
    id: string;
    body: string;
    fromUser: { firstName: string; lastName: string };
    toUser: { firstName: string; lastName: string };
  }>;
  editBranchOpen: boolean;
  editName: string;
  editLocation: string;
  editLeaderId: string;
  branchSaving: boolean;
  weeklyForm: WeeklyAttendanceForm;
  reportFormId: string;
  messageBody: string;
  onClose?: () => void;
  onEditToggle: () => void;
  onEditName: (v: string) => void;
  onEditLocation: (v: string) => void;
  onEditLeaderId: (v: string) => void;
  onSaveBranch: (e: React.FormEvent) => void;
  onWeeklyFormChange: (patch: Partial<WeeklyAttendanceForm>) => void;
  onReportFormId: (v: string) => void;
  onRecordAttendance: () => void;
  onSubmitReport: () => void;
  onMessageBody: (v: string) => void;
  onSendMessage: () => void;
  onChanged: () => void;
  incidentCount?: number;
  branchOptions?: { id: string; name: string }[];
  onSwitchBranch?: (id: string) => void;
}) {
  const [rosterOpen, setRosterOpen] = useState(false);
  const [section, setSection] = useState<WorkspaceSection>('overview');

  const createdLabel = branchDetail.createdAt
    ? new Date(branchDetail.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const sections: { id: WorkspaceSection; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: 'Members' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'connect', label: 'Connect' },
    { id: 'analytics', label: 'Analytics' },
  ];

  const demoTotal =
    (Number(weeklyForm.maleCount) || 0) +
    (Number(weeklyForm.femaleCount) || 0) +
    (Number(weeklyForm.boysCount) || 0) +
    (Number(weeklyForm.girlsCount) || 0);

  const weeklyFields: { key: keyof WeeklyAttendanceForm; label: string }[] = [
    { key: 'maleCount', label: 'Male' },
    { key: 'femaleCount', label: 'Female' },
    { key: 'boysCount', label: 'Boys' },
    { key: 'girlsCount', label: 'Girls' },
    { key: 'testifiersCount', label: 'Testifiers' },
    { key: 'firstTimersCount', label: 'First Timers' },
  ];

  const stats = [
    { label: 'Members', value: branchDetail.memberCount },
    { label: 'Incidents', value: incidentCount, alert: incidentCount > 0 },
    { label: 'Open prayers', value: branchDetail.openPrayers },
    {
      label: 'Last attendance',
      value: branchDetail.latestAttendance ? branchDetail.latestAttendance.presentCount : '—',
    },
  ];

  return (
    <div className={cn('space-y-4', onClose && 'pb-[env(safe-area-inset-bottom)]')}>
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div className="min-w-0 space-y-2">
            {onClose && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2 h-8 gap-1.5 px-2 text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={onClose}
              >
                <ArrowLeft className="h-4 w-4" />
                All cells
              </Button>
            )}
            <div>
              <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">{branchDetail.name}</h2>
              <p className="mt-1 text-sm text-slate-400">
                {branchDetail.location ?? 'No location'}
                {branchDetail.leader ? ` · ${branchDetail.leader.name}` : ''}
                {createdLabel ? ` · Since ${createdLabel}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.map(({ label, value, alert }) => (
                <div
                  key={label}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-center',
                    alert ? 'bg-red-500/20' : 'bg-white/10',
                  )}
                >
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
                  <p className={cn('text-lg font-bold tabular-nums', alert && 'text-red-300')}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {branchOptions.length > 1 && onSwitchBranch && (
              <div className="relative w-full sm:w-48">
                <select
                  className="h-9 w-full appearance-none rounded-lg border border-white/20 bg-white/10 pl-3 pr-8 text-sm text-white"
                  value={selectedBranchId}
                  onChange={(e) => onSwitchBranch(e.target.value)}
                  aria-label="Switch branch"
                >
                  {branchOptions.map((b) => (
                    <option key={b.id} value={b.id} className="text-foreground">
                      {b.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            )}
            {ctx.canManage && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9 bg-white/15 text-white hover:bg-white/25"
                onClick={onEditToggle}
              >
                {editBranchOpen ? 'Cancel edit' : 'Edit branch'}
              </Button>
            )}
          </div>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto border-t border-white/10 px-2 pb-2 pt-1 sm:px-4"
          aria-label="Branch workspace sections"
        >
          {sections.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm',
                section === id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {editBranchOpen && ctx.canManage && section === 'overview' && (
        <Card className="border-primary/20 shadow-sm">
          <CardContent className="pt-4">
            <form onSubmit={onSaveBranch} className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={editName} onChange={(e) => onEditName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input id="edit-location" value={editLocation} onChange={(e) => onEditLocation(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <BranchLeaderSelect
                  id="edit-leader"
                  value={editLeaderId}
                  onChange={onEditLeaderId}
                  enabled={ctx.canManage}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" size="sm" disabled={branchSaving}>
                  Save branch
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className={cn(section !== 'overview' && 'hidden')} aria-hidden={section !== 'overview'}>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Branch overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                {branchDetail.leader?.name ?? 'Leader unassigned'}
              </Badge>
              {branchDetail.leader?.email && (
                <Badge variant="secondary">{branchDetail.leader.email}</Badge>
              )}
              {branchDetail.openIncidents > 0 && (
                <Badge variant="destructive">
                  {branchDetail.openIncidents} open incident{branchDetail.openIncidents === 1 ? '' : 's'}
                </Badge>
              )}
              {branchDetail.latestAttendance && (
                <Badge variant="secondary" className="gap-1">
                  <CalendarCheck className="h-3 w-3" />
                  Last attendance: {branchDetail.latestAttendance.presentCount}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className={cn(section !== 'members' && 'hidden')} aria-hidden={section !== 'members'}>
        <Card className="shadow-sm">
          <CardContent className="pt-4">
            <BranchMembersPanel
              branchId={selectedBranchId}
              members={branchDetail.members}
              canManage={ctx.canManage || ctx.role === 'cellLeader'}
              onChanged={onChanged}
              onOpenFullRoster={branchDetail.memberCount > 0 ? () => setRosterOpen(true) : undefined}
            />
          </CardContent>
        </Card>
      </div>

      <div className={cn(section !== 'weekly' && 'hidden')} aria-hidden={section !== 'weekly'}>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly reporting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="meeting-date">Date</Label>
              <Input
                id="meeting-date"
                type="date"
                className="mt-1 h-10 max-w-xs"
                value={weeklyForm.meetingDate}
                onChange={(e) => onWeeklyFormChange({ meetingDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {weeklyFields.map(({ key, label }) => (
                <div key={key}>
                  <Label htmlFor={`weekly-${key}`}>{label}</Label>
                  <Input
                    id={`weekly-${key}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="mt-1 h-10"
                    value={weeklyForm[key]}
                    onChange={(e) => onWeeklyFormChange({ [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Total present:{' '}
                <span className="font-semibold text-foreground tabular-nums">{demoTotal}</span>
              </p>
              <Button type="button" variant="outline" className="h-10" onClick={onRecordAttendance}>
                Record attendance
              </Button>
            </div>
            {forms.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <select
                  className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm sm:max-w-xs"
                  value={reportFormId}
                  onChange={(e) => onReportFormId(e.target.value)}
                  aria-label="Report form"
                >
                  <option value="">Select report form</option>
                  {forms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <Button type="button" className="h-10" onClick={onSubmitReport} disabled={!reportFormId}>
                  Send report
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className={cn(section !== 'connect' && 'hidden')} aria-hidden={section !== 'connect'}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                Message {ctx.role === 'cellLeader' ? 'leadership' : 'cell leader'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-2 text-sm">
                {messages.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No messages yet.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="rounded-md bg-background p-2 shadow-sm">
                      <p className="text-xs text-muted-foreground">
                        {m.fromUser.firstName} → {m.toUser.firstName}
                      </p>
                      <p className="mt-0.5">{m.body}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={messageBody}
                  onChange={(e) => onMessageBody(e.target.value)}
                  placeholder="Write a message…"
                  rows={3}
                  className="min-h-[80px] flex-1 resize-none"
                />
                <Button
                  type="button"
                  className="h-auto shrink-0 self-end gap-1 px-3 py-2"
                  onClick={onSendMessage}
                  disabled={!messageBody.trim()}
                >
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-4">
              <CellPrayerPanel
                branchId={selectedBranchId}
                canManageStatus={ctx.canManage}
                onChanged={onChanged}
              />
            </CardContent>
          </Card>
        </div>

        {teaching.length > 0 && (
          <Card className="mt-4 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4" />
                Teaching manual
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {teaching.map((t) => (
                <div key={t.id} className="rounded-lg border border-border/60 p-3 text-sm">
                  <p className="font-medium">{t.title}</p>
                  {t.description && <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className={cn(section !== 'analytics' && 'hidden')} aria-hidden={section !== 'analytics'}>
        {section === 'analytics' ? <BranchAnalyticsPanel branchId={selectedBranchId} /> : null}
      </div>

      {rosterOpen && (
        <CellBranchMembersSheet
          branchId={selectedBranchId}
          branchName={branchDetail.name}
          memberCount={branchDetail.memberCount}
          onClose={() => setRosterOpen(false)}
        />
      )}
    </div>
  );
}
