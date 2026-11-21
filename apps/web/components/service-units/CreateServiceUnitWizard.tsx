'use client';

import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { formatMemberName } from '@/lib/service-unit-utils';
import { MultiStepFormDialog } from '@/components/membership/MultiStepFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type MemberMode = 'roster' | 'new' | 'import';

interface ChurchMemberOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
}

export type StagedUnitMember = {
  key: string;
  source: 'roster' | 'new' | 'import';
  memberId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
};

type StagedLeader = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
} | null;

const STEPS = [
  {
    id: 'unit',
    label: 'Unit details',
    shortLabel: 'Unit',
    description: 'Name and purpose',
  },
  {
    id: 'members',
    label: 'Add members',
    shortLabel: 'Members',
    description: 'Optional roster',
  },
  {
    id: 'leader',
    label: 'Unit admin',
    shortLabel: 'Leader',
    description: 'Optional manager',
  },
  {
    id: 'preview',
    label: 'Preview',
    shortLabel: 'Preview',
    description: 'Confirm and create',
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function CreateServiceUnitWizard({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [unitForm, setUnitForm] = useState({
    name: '',
    description: '',
    activities: '',
  });
  const [memberMode, setMemberMode] = useState<MemberMode>('roster');
  const [rosterMemberId, setRosterMemberId] = useState('');
  const [newPerson, setNewPerson] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [members, setMembers] = useState<StagedUnitMember[]>([]);
  /** null = skipped; object = include unit admin on create */
  const [leader, setLeader] = useState<StagedLeader>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [leaderForm, setLeaderForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [leaderSkipped, setLeaderSkipped] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importFailures, setImportFailures] = useState<Array<{ rowIndex: number; reason: string }>>(
    [],
  );

  const { data: churchMembers = [] } = useApiQuery<ChurchMemberOption[]>(
    ['membership-members-picker'],
    '/membership/members',
    { enabled: open },
  );

  const stagedMemberIds = useMemo(
    () => new Set(members.map((m) => m.memberId).filter(Boolean) as string[]),
    [members],
  );

  const availableMembers = useMemo(
    () => churchMembers.filter((m) => !stagedMemberIds.has(m.id)),
    [churchMembers, stagedMemberIds],
  );

  if (!open) return null;

  const reset = () => {
    setStep(0);
    setUnitForm({ name: '', description: '', activities: '' });
    setMemberMode('roster');
    setRosterMemberId('');
    setNewPerson({ firstName: '', lastName: '', email: '', phone: '' });
    setMembers([]);
    setLeader({ firstName: '', lastName: '', email: '', phone: '' });
    setLeaderForm({ firstName: '', lastName: '', email: '', phone: '' });
    setLeaderSkipped(false);
    setImportFailures([]);
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validateStep = (index: number): boolean => {
    if (index === 0) {
      if (!unitForm.name.trim()) {
        toast.error('Unit name is required');
        return false;
      }
      return true;
    }
    if (index === 2 && !leaderSkipped) {
      if (!leaderForm.firstName.trim() || !leaderForm.lastName.trim()) {
        toast.error('Enter first name and surname, or click Skip leader');
        return false;
      }
      setLeader({
        firstName: leaderForm.firstName.trim(),
        lastName: leaderForm.lastName.trim(),
        email: leaderForm.email.trim(),
        phone: leaderForm.phone.trim(),
      });
    }
    return true;
  };

  const addFromRoster = () => {
    if (!rosterMemberId) {
      toast.error('Select a church member');
      return;
    }
    const m = churchMembers.find((c) => c.id === rosterMemberId);
    if (!m) {
      toast.error('Member not found');
      return;
    }
    if (stagedMemberIds.has(m.id)) {
      toast.error('Already added');
      return;
    }
    setMembers((prev) => [
      ...prev,
      {
        key: newKey(),
        source: 'roster',
        memberId: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email ?? undefined,
      },
    ]);
    setRosterMemberId('');
  };

  const addNewPerson = () => {
    if (!newPerson.firstName.trim() || !newPerson.lastName.trim()) {
      toast.error('First name and surname are required');
      return;
    }
    setMembers((prev) => [
      ...prev,
      {
        key: newKey(),
        source: 'new',
        firstName: newPerson.firstName.trim(),
        lastName: newPerson.lastName.trim(),
        email: newPerson.email.trim() || undefined,
        phone: newPerson.phone.trim() || undefined,
      },
    ]);
    setNewPerson({ firstName: '', lastName: '', email: '', phone: '' });
  };

  const downloadTemplate = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const url = `${API_URL}/api/v1/service-units/member-import-template.csv`;
    if (!token) {
      toast.error('Sign in required to download the template');
      return;
    }
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('download failed');
        return r.blob();
      })
      .then((blob) => {
        const obj = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = obj;
        a.download = 'service-unit-members-import-template.csv';
        a.click();
        URL.revokeObjectURL(obj);
      })
      .catch(() => toast.error('Could not download template'));
  };

  const handleImportFile = async (file: File) => {
    setImportBusy(true);
    setImportFailures([]);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post<{
        rows: Array<{ firstName: string; lastName: string; email?: string; phone?: string }>;
        failures: Array<{ rowIndex: number; reason: string }>;
      }>('/service-units/members/import/preview', fd);
      const next = (data.rows ?? []).map((r) => ({
        key: newKey(),
        source: 'import' as const,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        phone: r.phone,
      }));
      setMembers((prev) => [...prev, ...next]);
      setImportFailures(data.failures ?? []);
      toast.success(
        next.length
          ? `Added ${next.length} member${next.length === 1 ? '' : 's'} from file`
          : 'No valid rows found in file',
      );
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not import file'));
    } finally {
      setImportBusy(false);
    }
  };

  const skipLeader = () => {
    setLeaderSkipped(true);
    setLeader(null);
    setLeaderForm({ firstName: '', lastName: '', email: '', phone: '' });
    setStep(3);
  };

  const createUnit = async () => {
    if (!unitForm.name.trim()) {
      toast.error('Unit name is required');
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      const payload: {
        name: string;
        description?: string;
        activities?: string;
        members?: Array<{
          memberId?: string;
          firstName?: string;
          lastName?: string;
          email?: string;
          phone?: string;
        }>;
        leader?: {
          firstName: string;
          lastName: string;
          email?: string;
          phone?: string;
        } | null;
      } = {
        name: unitForm.name.trim(),
        description: unitForm.description.trim() || undefined,
        activities: unitForm.activities.trim() || undefined,
      };

      if (members.length) {
        payload.members = members.map((m) =>
          m.memberId
            ? { memberId: m.memberId }
            : {
                firstName: m.firstName,
                lastName: m.lastName,
                email: m.email,
                phone: m.phone,
              },
        );
      }

      if (
        !leaderSkipped &&
        leaderForm.firstName.trim() &&
        leaderForm.lastName.trim()
      ) {
        payload.leader = {
          firstName: leaderForm.firstName.trim(),
          lastName: leaderForm.lastName.trim(),
          email: leaderForm.email.trim() || undefined,
          phone: leaderForm.phone.trim() || undefined,
        };
      }

      await api.post('/service-units/with-setup', payload);
      toast.success(`“${unitForm.name.trim()}” created`);
      reset();
      onCreated();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not create service unit'));
    } finally {
      setSaving(false);
    }
  };

  const previewLeader =
    !leaderSkipped && leaderForm.firstName.trim() && leaderForm.lastName.trim()
      ? {
          firstName: leaderForm.firstName.trim(),
          lastName: leaderForm.lastName.trim(),
          email: leaderForm.email.trim(),
          phone: leaderForm.phone.trim(),
        }
      : null;

  return (
    <MultiStepFormDialog
      title={
        step === 0
          ? 'You Are About To Create A New Service Unit'
          : step === 1
            ? 'Add Members To This Unit'
            : step === 2
              ? 'Add A Leader To Manage This Unit'
              : 'Preview'
      }
      subtitle={`Step ${step + 1} of ${STEPS.length}`}
      steps={STEPS}
      step={step}
      onStepChange={(i) => {
        if (i > step && !validateStep(step)) return;
        if (step === 2 && !leaderSkipped && leaderForm.firstName.trim()) {
          setLeader({
            firstName: leaderForm.firstName.trim(),
            lastName: leaderForm.lastName.trim(),
            email: leaderForm.email.trim(),
            phone: leaderForm.phone.trim(),
          });
        }
        setStep(i);
      }}
      onClose={handleClose}
      onBeforeNext={() => validateStep(step)}
      onSubmit={() => void createUnit()}
      submitLabel="Create Unit"
      saving={saving}
      variant="corporate"
      testId="create-service-unit-wizard"
      extraActions={
        step === 1 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setMembers([]);
              setImportFailures([]);
              setStep(2);
            }}
          >
            Skip members
          </Button>
        ) : step === 2 ? (
          <Button type="button" variant="outline" size="sm" onClick={skipLeader}>
            Skip leader
          </Button>
        ) : null
      }
    >
      {step === 0 ? (
        <div className="mx-auto max-w-xl space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the unit details. You can add members and a unit admin in the next steps, or skip
            them and finish with an empty unit.
          </p>
          <div className="space-y-2">
            <Label htmlFor="su-name">Unit Name</Label>
            <Input
              id="su-name"
              value={unitForm.name}
              onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Choir"
              maxLength={120}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-desc">Short Description Of The Unit</Label>
            <Input
              id="su-desc"
              value={unitForm.description}
              onChange={(e) => setUnitForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief purpose of this unit"
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-act">Activities or roles performed in the church</Label>
            <Input
              id="su-act"
              value={unitForm.activities}
              onChange={(e) => setUnitForm((f) => ({ ...f, activities: e.target.value }))}
              placeholder="e.g. Worship leading, rehearsals"
              maxLength={1000}
            />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Add someone from the church roster, create a new congregant, or import from an Excel /
            CSV file. You can skip this step and add people later.
          </p>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ['roster', 'From church roster'],
                ['new', 'Create new person'],
                ['import', 'Import Directory'],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={memberMode === id ? 'default' : 'outline'}
                onClick={() => setMemberMode(id)}
              >
                {label}
              </Button>
            ))}
          </div>

          {memberMode === 'roster' ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="su-roster">Select church member</Label>
                <select
                  id="su-roster"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={rosterMemberId}
                  onChange={(e) => setRosterMemberId(e.target.value)}
                >
                  <option value="">Select church member…</option>
                  {availableMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {formatMemberName(m)}
                      {m.email ? ` (${m.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="button" onClick={addFromRoster} className="gap-1">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          ) : null}

          {memberMode === 'new' ? (
            <div className="space-y-3 rounded-lg border border-border bg-background p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="np-fn">First Name</Label>
                  <Input
                    id="np-fn"
                    value={newPerson.firstName}
                    onChange={(e) => setNewPerson((p) => ({ ...p, firstName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="np-ln">Surname</Label>
                  <Input
                    id="np-ln"
                    value={newPerson.lastName}
                    onChange={(e) => setNewPerson((p) => ({ ...p, lastName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="np-em">Email</Label>
                  <Input
                    id="np-em"
                    type="email"
                    value={newPerson.email}
                    onChange={(e) => setNewPerson((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="np-ph">Phone Number</Label>
                  <Input
                    id="np-ph"
                    value={newPerson.phone}
                    onChange={(e) => setNewPerson((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
              <Button type="button" onClick={addNewPerson} className="gap-1">
                <UserPlus className="h-4 w-4" />
                Add person
              </Button>
            </div>
          ) : null}

          {memberMode === 'import' ? (
            <div className="space-y-3 rounded-lg border border-dashed border-border bg-background p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 space-y-2 text-sm">
                  <p className="font-medium text-foreground">Import from Excel or CSV</p>
                  <p className="text-muted-foreground">
                    Download the sample, fill First Name / Last Name / Email / Phone, then upload a
                    .xlsx or .csv file.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" size="sm" variant="outline" onClick={downloadTemplate}>
                      <Download className="mr-1.5 h-4 w-4" />
                      Download sample
                    </Button>
                    <label className="inline-flex">
                      <input
                        type="file"
                        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="sr-only"
                        disabled={importBusy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (f) void handleImportFile(f);
                        }}
                      />
                      <span
                        className={cn(
                          'inline-flex h-8 cursor-pointer items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground',
                          importBusy && 'pointer-events-none opacity-60',
                        )}
                      >
                        {importBusy ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        Upload file
                      </span>
                    </label>
                  </div>
                  {importFailures.length > 0 ? (
                    <ul className="mt-2 max-h-28 space-y-1 overflow-auto text-xs text-destructive">
                      {importFailures.slice(0, 8).map((f) => (
                        <li key={`${f.rowIndex}-${f.reason}`}>
                          Row {f.rowIndex}: {f.reason}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-border">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Staged members ({members.length})
            </div>
            {members.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                No members staged yet — you can continue without adding any.
              </p>
            ) : (
              <ul className="max-h-48 divide-y divide-border overflow-auto">
                {members.map((m) => (
                  <li
                    key={m.key}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.source}
                        {m.email ? ` · ${m.email}` : ''}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setMembers((prev) => prev.filter((x) => x.key !== m.key))}
                      aria-label={`Remove ${m.firstName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mx-auto max-w-xl space-y-4">
          <p className="text-sm text-muted-foreground">
            Assign a Unit Admin to manage this unit. We will find or create them in the membership
            database from the details below. Use Skip leader if you will assign one later.
          </p>
          {leaderSkipped ? (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
              <p className="text-muted-foreground">Leader step skipped.</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  setLeaderSkipped(false);
                  setLeader({ firstName: '', lastName: '', email: '', phone: '' });
                }}
              >
                Add a unit admin instead
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ld-fn">First Name</Label>
                <Input
                  id="ld-fn"
                  value={leaderForm.firstName}
                  onChange={(e) => setLeaderForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ld-ln">Surname</Label>
                <Input
                  id="ld-ln"
                  value={leaderForm.lastName}
                  onChange={(e) => setLeaderForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ld-em">Email</Label>
                <Input
                  id="ld-em"
                  type="email"
                  value={leaderForm.email}
                  onChange={(e) => setLeaderForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ld-ph">Phone Number</Label>
                <Input
                  id="ld-ph"
                  value={leaderForm.phone}
                  onChange={(e) => setLeaderForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mx-auto max-w-xl space-y-5">
          <p className="text-sm text-muted-foreground">
            Review what will be created. Nothing is saved until you click Create Unit.
          </p>
          <section className="space-y-2 rounded-lg border border-border bg-background p-4">
            <h3 className="text-sm font-semibold">Unit</h3>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{unitForm.name.trim() || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Description</dt>
                <dd>{unitForm.description.trim() || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Activities</dt>
                <dd>{unitForm.activities.trim() || '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-2 rounded-lg border border-border bg-background p-4">
            <h3 className="text-sm font-semibold">Members ({members.length})</h3>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">None — can be added later.</p>
            ) : (
              <ul className="max-h-40 space-y-1 overflow-auto text-sm">
                {members.map((m) => (
                  <li key={m.key}>
                    {m.firstName} {m.lastName}
                    {m.email ? ` · ${m.email}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2 rounded-lg border border-border bg-background p-4">
            <h3 className="text-sm font-semibold">Unit admin</h3>
            {previewLeader && previewLeader.firstName && previewLeader.lastName ? (
              <p className="text-sm">
                {previewLeader.firstName} {previewLeader.lastName}
                {previewLeader.email ? ` · ${previewLeader.email}` : ''}
                {previewLeader.phone ? ` · ${previewLeader.phone}` : ''}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Skipped — can be assigned later.</p>
            )}
          </section>
        </div>
      ) : null}
    </MultiStepFormDialog>
  );
}
