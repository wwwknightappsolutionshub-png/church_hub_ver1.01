'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bus, Church, Crown, MapPinned, Shield, Users, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import {
  CreateChurchStaffSchema,
  UpdateChurchStaffSchema,
} from '@church-hub/shared-types';
import { MultiStepFormDialog } from '@/components/membership/MultiStepFormDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { filterPhoneTyping, flexiblePhoneFormatError } from '@/lib/contact-validation';
import { cn } from '@/lib/utils';

export type AccessTypeId =
  | 'admin'
  | 'unit_leader'
  | 'pastor'
  | 'provincial_wsf'
  | 'wsf_leader'
  | 'bus_coordinator'
  | 'leader';

export interface StaffWizardInitial {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  roles: string[];
  serviceUnitIds: string[];
}

export interface ServiceUnitOption {
  id: string;
  name: string;
  description?: string | null;
}

export const ROLE_DISPLAY: Record<
  string,
  { label: string; description: string }
> = {
  ADMIN: {
    label: 'Admin',
    description: 'Full church administration across modules and settings.',
  },
  PASTOR: {
    label: 'Church Pastor',
    description: 'Pastoral oversight with broad church-wide access.',
  },
  LEADER: {
    label: 'Unit Leader',
    description: 'Leads a single service unit with unit-scoped tools.',
  },
  PROVINCIAL_LEADER: {
    label: 'Provincial WSF Leader',
    description: 'Oversees WSF / cell provinces and branch leaders.',
  },
  MEMBER: {
    label: 'WSF Leader',
    description: 'Fellowship / cell leadership without church-wide admin.',
  },
  DRIVER: {
    label: 'Bus Coordinator',
    description: 'Coordinates bus ministry routes and related tools.',
  },
};

export const ACCESS_TYPES: Array<{
  id: AccessTypeId;
  label: string;
  role: string;
  needsUnit: boolean;
  description: string;
  icon: typeof Shield;
}> = [
  {
    id: 'admin',
    label: 'Admin',
    role: 'ADMIN',
    needsUnit: false,
    description:
      'Full access to church administration — staff, membership, modules, and settings across the entire system.',
    icon: Shield,
  },
  {
    id: 'unit_leader',
    label: 'Unit Leader',
    role: 'LEADER',
    needsUnit: true,
    description:
      'Leads one service unit only. Can manage that unit’s members, schedules, attendance, and unit admin tools — not church-wide staff controls.',
    icon: Users,
  },
  {
    id: 'pastor',
    label: 'Church Pastor',
    role: 'PASTOR',
    needsUnit: false,
    description:
      'Pastoral oversight with broad access across ministry modules. Can manage most staff except creating other pastor accounts.',
    icon: Church,
  },
  {
    id: 'provincial_wsf',
    label: 'Provincial WSF Leader',
    role: 'PROVINCIAL_LEADER',
    needsUnit: false,
    description:
      'Oversees Winning Soul Fellowship (WSF) at the provincial level — provinces, branches, and cell leadership structure.',
    icon: MapPinned,
  },
  {
    id: 'wsf_leader',
    label: 'WSF Leader',
    role: 'MEMBER',
    needsUnit: false,
    description:
      'Leads a local WSF / fellowship cell. Access is focused on discipleship and cell participation, not church-wide administration.',
    icon: Crown,
  },
  {
    id: 'bus_coordinator',
    label: 'Bus Coordinator',
    role: 'DRIVER',
    needsUnit: false,
    description:
      'Coordinates bus ministry operations — routes, riders, and transportation tools for church services and events.',
    icon: Bus,
  },
  {
    id: 'leader',
    label: 'Leader',
    role: 'LEADER',
    needsUnit: true,
    description:
      'General ministry leadership tied to one service unit. Same unit-scoped privileges as Unit Leader for the assigned department.',
    icon: UserCog,
  },
];

export function accessTypeFromRoles(roles: string[]): AccessTypeId {
  if (roles.includes('ADMIN')) return 'admin';
  if (roles.includes('PASTOR')) return 'pastor';
  if (roles.includes('PROVINCIAL_LEADER')) return 'provincial_wsf';
  if (roles.includes('DRIVER')) return 'bus_coordinator';
  if (roles.includes('LEADER')) return 'unit_leader';
  if (roles.includes('MEMBER')) return 'wsf_leader';
  return 'admin';
}

export function formatRoleLabel(roleName: string) {
  return ROLE_DISPLAY[roleName]?.label ?? roleName.replaceAll('_', ' ');
}

interface Props {
  mode: 'create' | 'edit';
  initial?: StaffWizardInitial | null;
  serviceUnits: ServiceUnitOption[];
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export function StaffAccountWizard({
  mode,
  initial,
  serviceUnits,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [password, setPassword] = useState('');
  const [accessType, setAccessType] = useState<AccessTypeId>(
    accessTypeFromRoles(initial?.roles ?? ['ADMIN']),
  );
  const [serviceUnitId, setServiceUnitId] = useState(
    initial?.serviceUnitIds?.[0] ?? '',
  );

  useEffect(() => {
    setStep(0);
    setPassword('');
  }, [mode, initial?.id]);

  const selectedAccess = ACCESS_TYPES.find((a) => a.id === accessType)!;
  const displayName =
    [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || 'this person';

  const unitOptions = useMemo(
    () =>
      serviceUnits.filter(
        (u) => u.name.trim().toLowerCase() !== 'uncategorized',
      ),
    [serviceUnits],
  );

  const steps = useMemo(() => {
    const base = [
      { id: 'details', label: 'Details', shortLabel: '1', description: 'Name & contact' },
      {
        id: 'access',
        label: 'Access type',
        shortLabel: '2',
        description: 'What they can do',
      },
    ];
    if (selectedAccess.needsUnit) {
      base.push({
        id: 'unit',
        label: 'Service unit',
        shortLabel: '3',
        description: 'Unit to oversee',
      });
    }
    return base;
  }, [selectedAccess.needsUnit]);

  // If access type no longer needs a unit and we're past the last step, clamp.
  useEffect(() => {
    if (step > steps.length - 1) setStep(steps.length - 1);
  }, [step, steps.length]);

  const onBeforeNext = () => {
    if (step === 0) {
      if (!firstName.trim() || !lastName.trim()) {
        toast.error('Enter first and last name');
        return false;
      }
      if (!email.trim() || !email.includes('@')) {
        toast.error('Enter a valid email');
        return false;
      }
      const phoneErr = flexiblePhoneFormatError(phone);
      if (phoneErr) {
        toast.error(phoneErr);
        return false;
      }
      if (mode === 'edit' && password.trim() && password.trim().length < 8) {
        toast.error('Password must be at least 8 characters');
        return false;
      }
      return true;
    }
    if (step === 1) {
      if (!accessType) {
        toast.error('Select an access type');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (selectedAccess.needsUnit && !serviceUnitId) {
      toast.error('Select the service unit they will oversee');
      return;
    }

    const roles = [selectedAccess.role];
    const serviceUnitIds = selectedAccess.needsUnit && serviceUnitId ? [serviceUnitId] : [];

    if (mode === 'create') {
      const payload = {
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        roles,
        ...(serviceUnitIds.length ? { serviceUnitIds } : {}),
      };
      const parsed = CreateChurchStaffSchema.safeParse(payload);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? 'Check the form fields');
        return;
      }
      await onSubmit(parsed.data);
      return;
    }

    const payload: Record<string, unknown> = {
      email: email.trim().toLowerCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
      roles,
      serviceUnitIds,
    };
    if (password.trim()) payload.password = password.trim();
    const parsed = UpdateChurchStaffSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Check the form fields');
      return;
    }
    await onSubmit(parsed.data);
  };

  return (
    <MultiStepFormDialog
      title={mode === 'edit' ? 'Edit staff account' : 'Add staff'}
      subtitle={
        step === 0
          ? 'Enter their name and contact details'
          : step === 1
            ? `What access type are you assigning to ${displayName}?`
            : `Which service unit will ${displayName} be overseeing as leader?`
      }
      steps={steps}
      step={step}
      onStepChange={setStep}
      onClose={onClose}
      onBeforeNext={onBeforeNext}
      onSubmit={() => void handleSubmit()}
      saving={saving}
      submitLabel={mode === 'edit' ? 'Save changes' : 'Create account'}
      size="wide"
      variant="corporate"
      testId="staff-account-wizard"
    >
      {step === 0 ? (
        <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="staff-wizard-first-name">First name</Label>
            <Input
              id="staff-wizard-first-name"
              className="mt-1.5"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
          </div>
          <div>
            <Label htmlFor="staff-wizard-last-name">Last name</Label>
            <Input
              id="staff-wizard-last-name"
              className="mt-1.5"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="staff-wizard-email">Email</Label>
            <Input
              id="staff-wizard-email"
              type="email"
              className="mt-1.5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Email identifies the account — each person may lead at most one service unit.
            </p>
          </div>
          <div>
            <Label htmlFor="staff-wizard-phone">Phone</Label>
            <Input
              id="staff-wizard-phone"
              type="tel"
              inputMode="tel"
              className="mt-1.5"
              value={phone}
              onChange={(e) => setPhone(filterPhoneTyping(e.target.value))}
              autoComplete="tel"
              placeholder="e.g. 07123 456789"
            />
          </div>
          {mode === 'create' ? (
            <div className="rounded-lg border border-border bg-slate-50 px-3 py-3 text-xs leading-relaxed text-muted-foreground sm:col-span-2">
              A secure set-password link will be emailed to this address. Passwords are never sent
              in plaintext.
            </div>
          ) : (
            <div>
              <Label htmlFor="staff-wizard-password">New password (optional)</Label>
              <Input
                id="staff-wizard-password"
                type="password"
                className="mt-1.5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                placeholder="Leave blank to keep current"
              />
            </div>
          )}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="mx-auto grid max-w-3xl gap-3">
          <p className="text-sm text-muted-foreground">
            Choose one access type for <span className="font-medium text-foreground">{displayName}</span>.
            Each option explains what they can do in the system.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ACCESS_TYPES.map((option) => {
              const Icon = option.icon;
              const selected = accessType === option.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setAccessType(option.id);
                      if (!option.needsUnit) setServiceUnitId('');
                    }}
                    className={cn(
                      'flex h-full w-full flex-col gap-2 rounded-xl border p-4 text-left transition',
                      selected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                        : 'border-border bg-white hover:border-slate-400 hover:bg-slate-50',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg',
                          selected ? 'bg-white/15' : 'bg-slate-100 text-slate-700',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold">{option.label}</span>
                    </span>
                    <span
                      className={cn(
                        'text-xs leading-relaxed',
                        selected ? 'text-white/80' : 'text-muted-foreground',
                      )}
                    >
                      {option.description}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {step === 2 && selectedAccess.needsUnit ? (
        <div className="mx-auto max-w-3xl space-y-4">
          <p className="text-sm text-muted-foreground">
            Pick exactly one unit from Service Unit Hub. {displayName} cannot lead more than one
            unit.
          </p>
          {!unitOptions.length ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No service units yet. Create units in Service Unit Hub first.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {unitOptions.map((unit) => {
                const selected = serviceUnitId === unit.id;
                return (
                  <li key={unit.id}>
                    <button
                      type="button"
                      onClick={() => setServiceUnitId(unit.id)}
                      className={cn(
                        'flex h-full w-full flex-col gap-1 rounded-xl border px-3 py-3 text-left transition',
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                          : 'border-border bg-white hover:border-slate-400 hover:bg-slate-50',
                      )}
                    >
                      <span className="text-sm font-semibold leading-snug">{unit.name}</span>
                      {unit.description ? (
                        <span
                          className={cn(
                            'line-clamp-2 text-xs',
                            selected ? 'text-white/75' : 'text-muted-foreground',
                          )}
                        >
                          {unit.description}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </MultiStepFormDialog>
  );
}
