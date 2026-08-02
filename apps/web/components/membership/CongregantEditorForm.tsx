'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Loader2, MapPin, Phone, Users } from 'lucide-react';
import { toast } from 'sonner';
import type {
  CongregantEditorPayloadDto,
  MembershipRegistryCatalogDto,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CustomFieldsFormSection } from '@/components/membership/CustomFieldsFormSection';
import { MultiStepFormDialog } from '@/components/membership/MultiStepFormDialog';
import { FieldLabel, WizardSection } from '@/components/membership/WizardFormSection';
import { addressFieldLabel } from '@/lib/membership/address-labels';
import { filterPhoneTyping } from '@/lib/contact-validation';
import { cn } from '@/lib/utils';

const CONGREGANT_STEPS = [
  {
    id: 'identity',
    label: 'Name & Identity',
    shortLabel: '1',
    description: 'Legal name and gender',
  },
  {
    id: 'family',
    label: 'Birth & Family',
    shortLabel: '2',
    description: 'Household and family role',
  },
  {
    id: 'contact',
    label: 'Contact & Address',
    shortLabel: '3',
    description: 'Email, phone, and residence',
  },
  {
    id: 'service-groups',
    label: 'Service Groups',
    shortLabel: '4',
    description: 'Units and cell membership',
  },
  {
    id: 'registry',
    label: 'Classification & Notes',
    shortLabel: '5',
    description: 'Status, properties, notes',
  },
] as const;

interface FamilyOption {
  id: string;
  name: string;
}

interface CongregantEditorFormProps {
  memberId?: string | null;
  families: FamilyOption[];
  onClose: () => void;
  onSaved: (id: string) => void;
  catalogPath?: string;
  createMemberPath?: string;
  patchMemberPath?: string;
  defaultFamilyId?: string;
  /** Pre-select and lock this cell branch on create. */
  defaultCellBranchId?: string;
  lockCellBranch?: boolean;
  /** Pre-select and lock these service units on create. */
  defaultServiceUnitIds?: string[];
  lockServiceUnit?: boolean;
  dialogTitle?: string;
  submitLabel?: string;
  addAnotherLabel?: string;
}

type FormState = CongregantEditorPayloadDto & {
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  familyChoice: string;
  serviceUnitIds: string[];
  cellBranchId: string;
};

const emptyForm = (): FormState => ({
  firstName: '',
  lastName: '',
  title: '',
  middleName: '',
  suffix: '',
  gender: 'UNKNOWN',
  email: '',
  workEmail: '',
  homePhone: '',
  workPhone: '',
  cellPhone: '',
  birthMonth: '',
  birthDay: '',
  birthYear: '',
  hideAge: false,
  membershipDate: '',
  friendDate: '',
  classificationId: '',
  familyChoice: '0',
  familyRoleId: '',
  address: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  facebook: '',
  twitter: '',
  linkedIn: '',
  notes: '',
  specialOccasion: '',
  specialOccasionDate: '',
  customFields: {},
  propertyIds: [],
  serviceUnitIds: [],
  cellBranchId: '',
});

function buildDateOfBirth(month: string, day: string, year: string): string | undefined {
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);
  if (!y || !m || !d) return undefined;
  const iso = new Date(y, m - 1, d);
  if (Number.isNaN(iso.getTime())) return undefined;
  return iso.toISOString().slice(0, 10);
}

function hasPhone(form: FormState): boolean {
  return Boolean(form.cellPhone?.trim() || form.homePhone?.trim() || form.workPhone?.trim());
}

export function CongregantEditorForm({
  memberId,
  families,
  onClose,
  onSaved,
  catalogPath = '/membership/registry/catalog',
  createMemberPath = '/membership/members',
  patchMemberPath,
  defaultFamilyId,
  defaultCellBranchId,
  lockCellBranch = false,
  defaultServiceUnitIds,
  lockServiceUnit = false,
  dialogTitle,
  submitLabel,
  addAnotherLabel = 'Save & Add Another',
}: CongregantEditorFormProps) {
  const [catalog, setCatalog] = useState<MembershipRegistryCatalogDto | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!memberId);

  useEffect(() => {
    api
      .get<MembershipRegistryCatalogDto>(catalogPath)
      .then((res) => setCatalog(res.data))
      .catch(() => toast.error('Could not load congregant form settings'));
  }, [catalogPath]);

  useEffect(() => {
    if (!defaultFamilyId || memberId) return;
    setForm((prev) => ({ ...prev, familyChoice: defaultFamilyId }));
  }, [defaultFamilyId, memberId]);

  useEffect(() => {
    if (!defaultCellBranchId || memberId) return;
    setForm((prev) => ({ ...prev, cellBranchId: defaultCellBranchId }));
  }, [defaultCellBranchId, memberId]);

  useEffect(() => {
    if (!defaultServiceUnitIds?.length || memberId) return;
    setForm((prev) => ({
      ...prev,
      serviceUnitIds: Array.from(
        new Set([...(prev.serviceUnitIds ?? []), ...defaultServiceUnitIds]),
      ),
    }));
  }, [defaultServiceUnitIds, memberId]);

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    api
      .get<Record<string, unknown>>(`/membership/members/${memberId}`)
      .then((res) => {
        const m = res.data;
        const dob = m.dateOfBirth ? new Date(String(m.dateOfBirth)) : null;
        const unitMemberships = Array.isArray(m.serviceUnitMemberships)
          ? (m.serviceUnitMemberships as Array<{ serviceUnitId?: string }>).map(
              (row) => row.serviceUnitId ?? '',
            )
          : [];
        const cellMembership = m.cellBranchMembership as { branchId?: string } | null | undefined;
        setForm({
          ...emptyForm(),
          firstName: String(m.firstName ?? ''),
          lastName: String(m.lastName ?? ''),
          title: String(m.title ?? ''),
          middleName: String(m.middleName ?? ''),
          suffix: String(m.suffix ?? ''),
          gender: (m.gender as FormState['gender']) ?? 'UNKNOWN',
          email: String(m.email ?? ''),
          workEmail: String(m.workEmail ?? ''),
          homePhone: String(m.homePhone ?? ''),
          workPhone: String(m.workPhone ?? ''),
          cellPhone: String(m.cellPhone ?? ''),
          birthMonth: dob ? String(dob.getMonth() + 1).padStart(2, '0') : '',
          birthDay: dob ? String(dob.getDate()).padStart(2, '0') : '',
          birthYear: dob ? String(dob.getFullYear()) : '',
          hideAge: Boolean(m.hideAge),
          membershipDate: m.membershipDate
            ? new Date(String(m.membershipDate)).toISOString().slice(0, 10)
            : '',
          friendDate: m.friendDate
            ? new Date(String(m.friendDate)).toISOString().slice(0, 10)
            : '',
          classificationId: String((m.classification as { id?: string })?.id ?? m.classificationId ?? ''),
          familyChoice: String(m.familyId ?? '0'),
          familyRoleId: String((m.familyRole as { id?: string })?.id ?? m.familyRoleId ?? ''),
          address: String(m.address ?? ''),
          address2: String(m.address2 ?? ''),
          city: String(m.city ?? ''),
          state: String(m.state ?? ''),
          zip: String(m.zip ?? ''),
          country: String(m.country ?? ''),
          facebook: String(m.facebook ?? ''),
          twitter: String(m.twitter ?? ''),
          linkedIn: String(m.linkedIn ?? ''),
          notes: String(m.notes ?? ''),
          specialOccasion: String(m.specialOccasion ?? ''),
          specialOccasionDate: m.specialOccasionDate
            ? new Date(String(m.specialOccasionDate)).toISOString().slice(0, 10)
            : '',
          propertyIds: Array.isArray(m.propertyAssignments)
            ? (
                m.propertyAssignments as Array<{ definitionId?: string; definition?: { id: string } }>
              ).map((p) => p.definition?.id ?? p.definitionId ?? '')
            : [],
          serviceUnitIds: unitMemberships.filter(Boolean),
          cellBranchId: String(cellMembership?.branchId ?? ''),
        });
      })
      .finally(() => setLoading(false));
  }, [memberId]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleProperty = (id: string) => {
    setForm((prev) => {
      const ids = prev.propertyIds ?? [];
      return {
        ...prev,
        propertyIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
      };
    });
  };

  const toggleServiceUnit = (unitId: string) => {
    if (lockServiceUnit && defaultServiceUnitIds?.includes(unitId)) return;
    setForm((prev) => {
      const ids = prev.serviceUnitIds ?? [];
      return {
        ...prev,
        serviceUnitIds: ids.includes(unitId) ? ids.filter((x) => x !== unitId) : [...ids, unitId],
      };
    });
  };

  const payload = useMemo((): CongregantEditorPayloadDto => {
    const familyChoice = form.familyChoice;
    return {
      title: form.title,
      firstName: form.firstName.trim(),
      middleName: form.middleName,
      lastName: form.lastName.trim(),
      suffix: form.suffix,
      gender: form.gender,
      email: (form.email ?? '').trim(),
      workEmail: form.workEmail,
      homePhone: form.homePhone,
      workPhone: form.workPhone,
      cellPhone: form.cellPhone,
      phone: form.cellPhone || form.homePhone || form.workPhone,
      dateOfBirth: buildDateOfBirth(form.birthMonth, form.birthDay, form.birthYear),
      hideAge: form.hideAge,
      membershipDate: form.membershipDate || undefined,
      friendDate: form.friendDate || undefined,
      classificationId: form.classificationId || null,
      familyId: familyChoice !== '0' && familyChoice !== '-1' ? familyChoice : null,
      createFamily: familyChoice === '-1',
      familyRoleId: familyChoice !== '0' ? form.familyRoleId || null : null,
      address: (form.address ?? '').trim(),
      address2: form.address2,
      city: form.city,
      state: form.state,
      zip: (form.zip ?? '').trim(),
      country: form.country,
      facebook: form.facebook,
      twitter: form.twitter,
      linkedIn: form.linkedIn,
      notes: form.notes,
      specialOccasion: form.specialOccasion || undefined,
      specialOccasionDate: form.specialOccasionDate || undefined,
      customFields: form.customFields,
      propertyIds: form.propertyIds,
      serviceUnitIds: form.serviceUnitIds,
      cellBranchId: form.cellBranchId || null,
      requireContactFields: true,
    };
  }, [form]);

  const validateStep = (current: number): boolean => {
    const stepId = CONGREGANT_STEPS[current]?.id;
    if (stepId === 'identity') {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        toast.error('First name and last name are required');
        return false;
      }
      return true;
    }
    if (stepId === 'contact') {
      if (!(form.email ?? '').trim()) {
        toast.error('Email is required');
        return false;
      }
      if (!hasPhone(form)) {
        toast.error('At least one phone number is required');
        return false;
      }
      if (!(form.address ?? '').trim()) {
        toast.error('Address is required');
        return false;
      }
      if (!(form.zip ?? '').trim()) {
        toast.error('Post code is required');
        return false;
      }
      return true;
    }
    return true;
  };

  const validateSubmit = (): boolean => {
    if (!validateStep(0)) {
      setStep(0);
      return false;
    }
    if (!validateStep(2)) {
      setStep(2);
      return false;
    }
    return true;
  };

  const submit = async (addAnother = false) => {
    if (!validateSubmit()) return;
    setSaving(true);
    try {
      if (memberId) {
        await api.patch(patchMemberPath ?? `/membership/members/${memberId}`, payload);
        toast.success('Congregant updated');
        onSaved(memberId);
        if (!addAnother) onClose();
      } else {
        const res = await api.post<{ id: string }>(createMemberPath, payload);
        toast.success('Congregant created');
        onSaved(res.data.id);
        if (addAnother) {
          setForm({
            ...(defaultFamilyId ? { ...emptyForm(), familyChoice: defaultFamilyId } : emptyForm()),
            ...(defaultCellBranchId ? { cellBranchId: defaultCellBranchId } : {}),
            ...(defaultServiceUnitIds?.length
              ? { serviceUnitIds: [...defaultServiceUnitIds] }
              : {}),
          });
          setStep(0);
        } else {
          onClose();
        }
      }
    } catch {
      toast.error('Could not save congregant');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    const overlay = (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
      </div>
    );
    return typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay;
  }

  const currentStepId = CONGREGANT_STEPS[step]?.id ?? 'identity';
  const serviceUnits = catalog?.serviceUnits ?? [];
  const cellBranches = catalog?.cellBranches ?? [];

  return (
    <MultiStepFormDialog
      title={dialogTitle ?? (memberId ? 'Edit Congregant' : 'Add New Congregant')}
      subtitle="Complete each step to register a congregant in your church directory"
      steps={[...CONGREGANT_STEPS]}
      step={step}
      onStepChange={setStep}
      onBeforeNext={() => validateStep(step)}
      onClose={onClose}
      onSubmit={() => submit(false)}
      submitLabel={submitLabel ?? (memberId ? 'Save Congregant' : 'Add Congregant')}
      saving={saving}
      testId="congregant-editor-form"
      variant="corporate"
      extraActions={
        !memberId ? (
          <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={() => submit(true)}>
            {addAnotherLabel}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {currentStepId === 'identity' && (
          <WizardSection title="Name & Identity" description="How this person appears in church records">
            <div className="grid gap-3 sm:grid-cols-6">
              <label className="sm:col-span-1">
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={form.title ?? ''}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder="Mr., Mrs., Dr."
                />
              </label>
              <label className="sm:col-span-2">
                <FieldLabel required>First Name</FieldLabel>
                <Input
                  required
                  value={form.firstName}
                  onChange={(e) => setField('firstName', e.target.value)}
                />
              </label>
              <label className="sm:col-span-1">
                <FieldLabel>Middle</FieldLabel>
                <Input
                  value={form.middleName ?? ''}
                  onChange={(e) => setField('middleName', e.target.value)}
                />
              </label>
              <label className="sm:col-span-1">
                <FieldLabel required>Last Name</FieldLabel>
                <Input
                  required
                  value={form.lastName}
                  onChange={(e) => setField('lastName', e.target.value)}
                />
              </label>
              <label className="sm:col-span-1">
                <FieldLabel>Suffix</FieldLabel>
                <Input
                  value={form.suffix ?? ''}
                  onChange={(e) => setField('suffix', e.target.value)}
                  placeholder="Jr., Sr."
                />
              </label>
              <label className="sm:col-span-2">
                <FieldLabel>Gender</FieldLabel>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.gender ?? 'UNKNOWN'}
                  onChange={(e) => setField('gender', e.target.value as FormState['gender'])}
                >
                  <option value="UNKNOWN">—</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </label>
            </div>
          </WizardSection>
        )}

        {currentStepId === 'family' && (
          <WizardSection
            title="Birth & Family"
            description="Optional birth date and household assignment"
            icon={Users}
          >
            <div className="grid gap-3 sm:grid-cols-6">
              <label className="sm:col-span-1">
                <FieldLabel>Birth Month</FieldLabel>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.birthMonth}
                  onChange={(e) => setField('birthMonth', e.target.value)}
                >
                  <option value="">—</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const v = String(i + 1).padStart(2, '0');
                    return (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="sm:col-span-1">
                <FieldLabel>Day</FieldLabel>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.birthDay}
                  onChange={(e) => setField('birthDay', e.target.value)}
                >
                  <option value="">—</option>
                  {Array.from({ length: 31 }, (_, i) => {
                    const v = String(i + 1).padStart(2, '0');
                    return (
                      <option key={v} value={v}>
                        {i + 1}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="sm:col-span-1">
                <FieldLabel>Year</FieldLabel>
                <Input
                  value={form.birthYear}
                  onChange={(e) => setField('birthYear', e.target.value)}
                  placeholder="YYYY"
                  maxLength={4}
                />
              </label>
              <label className="flex items-end gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.hideAge ?? false}
                  onChange={(e) => setField('hideAge', e.target.checked)}
                />
                <span className="text-sm text-slate-700">Hide age on directory</span>
              </label>
              <label className="sm:col-span-3">
                <FieldLabel>Family</FieldLabel>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.familyChoice}
                  onChange={(e) => setField('familyChoice', e.target.value)}
                >
                  <option value="0">Unassigned</option>
                  <option value="-1">Create a new family (using last name)</option>
                  <option disabled>-----------------------</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-3">
                <FieldLabel>Family Role</FieldLabel>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.familyRoleId ?? ''}
                  disabled={form.familyChoice === '0'}
                  onChange={(e) => setField('familyRoleId', e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {(catalog?.familyRoles ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </WizardSection>
        )}

        {currentStepId === 'contact' && (
          <>
            <WizardSection
              title="Contact Information"
              description="Primary email and phone numbers"
              icon={Phone}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <FieldLabel required>Email</FieldLabel>
                  <Input
                    type="email"
                    required
                    value={form.email ?? ''}
                    onChange={(e) => setField('email', e.target.value)}
                  />
                </label>
                <label>
                  <FieldLabel>Work Email</FieldLabel>
                  <Input
                    type="email"
                    value={form.workEmail ?? ''}
                    onChange={(e) => setField('workEmail', e.target.value)}
                  />
                </label>
                <label>
                  <FieldLabel required>Mobile Phone</FieldLabel>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={form.cellPhone ?? ''}
                    onChange={(e) => setField('cellPhone', filterPhoneTyping(e.target.value))}
                    placeholder="UK mobile e.g. 07123 456789"
                  />
                </label>
                <label>
                  <FieldLabel>Home Phone</FieldLabel>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={form.homePhone ?? ''}
                    onChange={(e) => setField('homePhone', filterPhoneTyping(e.target.value))}
                  />
                </label>
                <label className="sm:col-span-2">
                  <FieldLabel>Work Phone</FieldLabel>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={form.workPhone ?? ''}
                    onChange={(e) => setField('workPhone', filterPhoneTyping(e.target.value))}
                  />
                </label>
              </div>
            </WizardSection>

            <WizardSection
              title="Residential Address"
              description="Required for directory and pastoral follow-up"
              icon={MapPin}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {(['address', 'address2', 'city', 'state', 'zip', 'country'] as const).map((key) => (
                  <label
                    key={key}
                    className={key === 'address' || key === 'address2' ? 'sm:col-span-2' : ''}
                  >
                    <FieldLabel required={key === 'address' || key === 'zip'}>
                      {addressFieldLabel(key)}
                    </FieldLabel>
                    <Input
                      required={key === 'address' || key === 'zip'}
                      value={form[key] ?? ''}
                      onChange={(e) => setField(key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </WizardSection>
          </>
        )}

        {currentStepId === 'service-groups' && (
          <WizardSection
            title="Service Groups"
            description="Assign department units and cell ministry membership"
            icon={Building2}
          >
            <div className="space-y-5">
              <div>
                <FieldLabel>Unit Member</FieldLabel>
                <p className="mb-2 text-xs text-slate-500">
                  {lockServiceUnit && defaultServiceUnitIds?.length
                    ? 'This congregant will be added to the current service unit (you may also assign additional units).'
                    : 'Select one or more department / service units this person belongs to.'}
                </p>
                {serviceUnits.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                    No service units are configured for this church yet.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    {serviceUnits.map((unit) => {
                      const checked = form.serviceUnitIds.includes(unit.id);
                      return (
                        <label
                          key={unit.id}
                          className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition',
                            checked
                              ? 'border-slate-900 bg-slate-900/5'
                              : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            disabled={
                              lockServiceUnit && defaultServiceUnitIds?.includes(unit.id)
                            }
                            onChange={() => toggleServiceUnit(unit.id)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-slate-900">{unit.name}</span>
                            {unit.departmentCode ? (
                              <Badge variant="secondary" className="mt-1 text-[10px]">
                                {unit.departmentLabel ?? unit.departmentCode}
                              </Badge>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <FieldLabel>Cell Membership</FieldLabel>
                <p className="mb-2 text-xs text-slate-500">
                  {lockCellBranch && defaultCellBranchId
                    ? 'This congregant will be added to the current branch/cell.'
                    : 'Assign this person to a home cell / ministry group (one per congregant).'}
                </p>
                {cellBranches.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                    No cell groups are configured for this church yet.
                  </p>
                ) : (
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-70"
                    value={form.cellBranchId}
                    onChange={(e) => setField('cellBranchId', e.target.value)}
                    disabled={lockCellBranch}
                  >
                    {!lockCellBranch ? <option value="">No cell assignment</option> : null}
                    {cellBranches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </WizardSection>
        )}

        {currentStepId === 'registry' && (
          <>
            <WizardSection title="Classification & Dates">
              <div className="grid gap-3 sm:grid-cols-3">
                <label>
                  <FieldLabel>Classification</FieldLabel>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.classificationId ?? ''}
                    onChange={(e) => setField('classificationId', e.target.value)}
                  >
                    <option value="">—</option>
                    {(catalog?.classifications ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <FieldLabel>Friend Date</FieldLabel>
                  <Input
                    type="date"
                    value={form.friendDate ?? ''}
                    onChange={(e) => setField('friendDate', e.target.value)}
                  />
                </label>
                <label>
                  <FieldLabel>Membership Date</FieldLabel>
                  <Input
                    type="date"
                    value={form.membershipDate ?? ''}
                    onChange={(e) => setField('membershipDate', e.target.value)}
                  />
                </label>
                <label className="sm:col-span-2">
                  <FieldLabel>Special Occasion</FieldLabel>
                  <Input
                    value={form.specialOccasion ?? ''}
                    onChange={(e) => setField('specialOccasion', e.target.value)}
                    placeholder="e.g. Wedding anniversary, baptism"
                  />
                </label>
                <label>
                  <FieldLabel>Date of Occasion</FieldLabel>
                  <Input
                    type="date"
                    value={form.specialOccasionDate ?? ''}
                    onChange={(e) => setField('specialOccasionDate', e.target.value)}
                  />
                </label>
              </div>
            </WizardSection>

            {(catalog?.memberProperties.length ?? 0) > 0 && (
              <WizardSection title="Properties">
                <div className="flex flex-wrap gap-3">
                  {catalog!.memberProperties.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(form.propertyIds ?? []).includes(p.id)}
                        onChange={() => toggleProperty(p.id)}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </WizardSection>
            )}

            {(catalog?.memberCustomFields.length ?? 0) > 0 && (
              <WizardSection title="Custom Fields">
                <CustomFieldsFormSection
                  fields={catalog!.memberCustomFields}
                  values={form.customFields ?? {}}
                  onChange={(fieldKey, value) =>
                    setField('customFields', { ...form.customFields, [fieldKey]: value })
                  }
                />
              </WizardSection>
            )}

            <WizardSection title="Notes">
              <textarea
                className={cn(
                  'flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                )}
                value={form.notes ?? ''}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Pastoral notes, follow-up reminders, or other context"
              />
            </WizardSection>
          </>
        )}
      </div>
    </MultiStepFormDialog>
  );
}
