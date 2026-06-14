'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarHeart, Home, Loader2, MapPin, Plus, Search, Sparkles, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import type {
  ChildrenRegistrationCatalogDto,
  ChildrenRegistrationFamilyOptionDto,
  ChildrenRegistrationGuardianOptionDto,
  RegisterChildWizardDto,
} from '@church-hub/shared-types';
import type { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { deptToolsApiBase } from '@/lib/dept-module-catalog';
import { addressFieldLabel } from '@/lib/membership/address-labels';
import { MultiStepFormDialog } from '@/components/membership/MultiStepFormDialog';
import { CustomFieldsFormSection } from '@/components/membership/CustomFieldsFormSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const WIZARD_STEPS = [
  { id: 'personal', label: 'Personal & Class', shortLabel: '1' },
  { id: 'family', label: 'Family Tree', shortLabel: '2' },
  { id: 'preview', label: 'Preview', shortLabel: '3' },
] as const;

const GUARDIAN_RELATIONS = [
  { value: 'FATHER', label: 'Father' },
  { value: 'MOTHER', label: 'Mother' },
  { value: 'GUARDIAN', label: 'Guardian' },
  { value: 'PARENT', label: 'Parent' },
] as const;

type GuardianRow = {
  key: string;
  mode: 'existing' | 'new';
  relation: string;
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type WizardForm = {
  firstName: string;
  lastName: string;
  middleName: string;
  gender: 'UNKNOWN' | 'MALE' | 'FEMALE';
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  cellPhone: string;
  homePhone: string;
  classGroup: string;
  schoolName: string;
  gradeLevel: string;
  notes: string;
  classificationId: string;
  familyMode: 'existing' | 'new';
  familyId: string;
  familyRoleId: string;
  familyName: string;
  homeCell: string;
  specialOccasion: string;
  specialOccasionDate: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  familyHomePhone: string;
  familyEmail: string;
  propertyIds: string[];
  familyCustomFields: Record<string, string | boolean | null>;
  guardians: GuardianRow[];
};

const emptyGuardian = (): GuardianRow => ({
  key: crypto.randomUUID(),
  mode: 'existing',
  relation: 'PARENT',
  memberId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
});

const emptyForm = (): WizardForm => ({
  firstName: '',
  lastName: '',
  middleName: '',
  gender: 'UNKNOWN',
  birthMonth: '',
  birthDay: '',
  birthYear: '',
  cellPhone: '',
  homePhone: '',
  classGroup: '',
  schoolName: '',
  gradeLevel: '',
  notes: '',
  classificationId: '',
  familyMode: 'existing',
  familyId: '',
  familyRoleId: '',
  familyName: '',
  homeCell: '',
  specialOccasion: '',
  specialOccasionDate: '',
  address: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  familyHomePhone: '',
  familyEmail: '',
  propertyIds: [],
  familyCustomFields: {},
  guardians: [],
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

function suggestedClassFromDob(month: string, day: string, year: string): string {
  const dob = buildDateOfBirth(month, day, year);
  if (!dob) return '';
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const md = now.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && now.getDate() < birth.getDate())) age -= 1;
  if (age >= 3 && age <= 5) return 'AGES_3_5';
  if (age >= 6 && age <= 9) return 'AGES_6_9';
  if (age >= 10 && age <= 12) return 'AGES_10_12';
  return '';
}

function PreviewRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="min-w-36 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export function ChildrenAddChildWizard({
  unitId,
  onClose,
  onSaved,
}: {
  unitId: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const registrationBase = `${deptToolsApiBase(unitId)}/children/registration`;

  const [catalog, setCatalog] = useState<ChildrenRegistrationCatalogDto | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [familySearch, setFamilySearch] = useState('');
  const [familyResults, setFamilyResults] = useState<ChildrenRegistrationFamilyOptionDto[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [guardianResults, setGuardianResults] = useState<ChildrenRegistrationGuardianOptionDto[]>([]);

  const setField = <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const { data } = await api.get<ChildrenRegistrationCatalogDto>(`${registrationBase}/catalog`);
      setCatalog(data);
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not load registration form'));
      onClose();
    } finally {
      setLoadingCatalog(false);
    }
  }, [onClose, registrationBase]);

  const searchFamilies = useCallback(
    async (query: string) => {
      setFamilyLoading(true);
      try {
        const { data } = await api.get<{ items: ChildrenRegistrationFamilyOptionDto[] }>(
          `${registrationBase}/families`,
          { params: query ? { search: query } : undefined },
        );
        setFamilyResults(data.items);
      } catch {
        toast.error('Could not search families');
      } finally {
        setFamilyLoading(false);
      }
    },
    [registrationBase],
  );

  const searchGuardians = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setGuardianResults([]);
        return;
      }
      try {
        const { data } = await api.get<{ items: ChildrenRegistrationGuardianOptionDto[] }>(
          `${registrationBase}/guardians`,
          { params: { search: query } },
        );
        setGuardianResults(data.items);
      } catch {
        toast.error('Could not search guardians');
      }
    },
    [registrationBase],
  );

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (step !== 1) return;
    const timer = setTimeout(() => {
      void searchFamilies(familySearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [familySearch, searchFamilies, step]);

  useEffect(() => {
    const suggested = suggestedClassFromDob(form.birthMonth, form.birthDay, form.birthYear);
    if (suggested && !form.classGroup) {
      setField('classGroup', suggested);
    }
  }, [form.birthMonth, form.birthDay, form.birthYear, form.classGroup]);

  useEffect(() => {
    if (form.familyMode === 'new' && !form.familyName && form.lastName) {
      setField('familyName', `${form.lastName} Family`);
    }
  }, [form.familyMode, form.familyName, form.lastName]);

  const selectedFamily = useMemo(
    () => familyResults.find((f) => f.id === form.familyId) ?? null,
    [familyResults, form.familyId],
  );

  const classLabel =
    catalog?.classGroups.find((g) => g.value === form.classGroup)?.label ?? form.classGroup;

  const validateStep = (index: number): boolean => {
    if (index === 0) {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        toast.error('First and last name are required');
        return false;
      }
      if (!form.classGroup) {
        toast.error('Select a church class for the child');
        return false;
      }
      return true;
    }
    if (index === 1) {
      if (form.familyMode === 'existing' && !form.familyId) {
        toast.error('Select a family from the list or create a new household');
        return false;
      }
      if (form.familyMode === 'new' && !form.familyName.trim()) {
        toast.error('Family name is required');
        return false;
      }
      return true;
    }
    return true;
  };

  const buildPayload = (): RegisterChildWizardDto => ({
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    middleName: form.middleName.trim() || undefined,
    gender: form.gender,
    dateOfBirth: buildDateOfBirth(form.birthMonth, form.birthDay, form.birthYear),
    cellPhone: form.cellPhone.trim() || undefined,
    homePhone: form.homePhone.trim() || undefined,
    classGroup: form.classGroup as RegisterChildWizardDto['classGroup'],
    schoolName: form.schoolName.trim() || undefined,
    gradeLevel: form.gradeLevel.trim() || undefined,
    notes: form.notes.trim() || undefined,
    classificationId: form.classificationId || null,
    familyMode: form.familyMode,
    familyId: form.familyMode === 'existing' ? form.familyId : undefined,
    familyRoleId: form.familyRoleId || null,
    newFamily:
      form.familyMode === 'new'
        ? {
            name: form.familyName.trim(),
            homeCell: form.homeCell.trim() || undefined,
            specialOccasion: form.specialOccasion.trim() || undefined,
            specialOccasionDate: form.specialOccasionDate || null,
            address: form.address.trim() || undefined,
            address2: form.address2.trim() || undefined,
            city: form.city.trim() || undefined,
            state: form.state.trim() || undefined,
            zip: form.zip.trim() || undefined,
            country: form.country.trim() || undefined,
            homePhone: form.familyHomePhone.trim() || undefined,
            email: form.familyEmail.trim() || undefined,
            propertyIds: form.propertyIds,
            customFields: form.familyCustomFields,
          }
        : undefined,
    guardians: form.guardians
      .filter((g) => (g.mode === 'existing' ? g.memberId : g.firstName.trim() && g.lastName.trim()))
      .map((g) => ({
        mode: g.mode,
        relation: g.relation,
        memberId: g.mode === 'existing' ? g.memberId : undefined,
        firstName: g.mode === 'new' ? g.firstName.trim() : undefined,
        lastName: g.mode === 'new' ? g.lastName.trim() : undefined,
        email: g.mode === 'new' ? g.email.trim() || undefined : undefined,
        phone: g.mode === 'new' ? g.phone.trim() || undefined : undefined,
      })),
  });

  const submit = async () => {
    setSaving(true);
    try {
      await api.post(`${registrationBase}/submit`, buildPayload());
      toast.success('Child registered for Children\'s Church');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not register child'));
    } finally {
      setSaving(false);
    }
  };

  const addGuardianFromFamily = (member: ChildrenRegistrationFamilyOptionDto['members'][number]) => {
    setForm((prev) => ({
      ...prev,
      guardians: [
        ...prev.guardians.filter((g) => g.memberId !== member.id),
        {
          key: crypto.randomUUID(),
          mode: 'existing',
          relation: 'PARENT',
          memberId: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: '',
          phone: '',
        },
      ],
    }));
  };

  const toggleProperty = (id: string) => {
    setForm((prev) => ({
      ...prev,
      propertyIds: prev.propertyIds.includes(id)
        ? prev.propertyIds.filter((x) => x !== id)
        : [...prev.propertyIds, id],
    }));
  };

  if (loadingCatalog || !catalog) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentStepId = WIZARD_STEPS[step]?.id ?? 'personal';

  return (
    <MultiStepFormDialog
      title="Add Child — Children's Church"
      steps={WIZARD_STEPS.map((s) => ({ ...s }))}
      step={step}
      onStepChange={setStep}
      onBeforeNext={() => validateStep(step)}
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Register Child"
      saving={saving}
      testId="children-add-child-wizard"
    >
      {currentStepId === 'personal' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Personal details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">First name *</span>
                <Input value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Last name *</span>
                <Input value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Middle name</span>
                <Input value={form.middleName} onChange={(e) => setField('middleName', e.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Gender</span>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.gender}
                  onChange={(e) => setField('gender', e.target.value as WizardForm['gender'])}
                >
                  <option value="UNKNOWN">Unknown</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Birth month</span>
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
                        {new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' })}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Birth day</span>
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
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Birth year</span>
                <Input
                  value={form.birthYear}
                  onChange={(e) => setField('birthYear', e.target.value)}
                  placeholder="YYYY"
                  maxLength={4}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Classification</span>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.classificationId}
                  onChange={(e) => setField('classificationId', e.target.value)}
                >
                  <option value="">—</option>
                  {catalog.classifications.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Mobile phone</span>
                <Input type="tel" value={form.cellPhone} onChange={(e) => setField('cellPhone', e.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Home phone</span>
                <Input type="tel" value={form.homePhone} onChange={(e) => setField('homePhone', e.target.value)} />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Church class &amp; education</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs text-muted-foreground">Children&apos;s Church class *</span>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.classGroup}
                  onChange={(e) => setField('classGroup', e.target.value)}
                >
                  <option value="">Select class</option>
                  {catalog.classGroups.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label} ({g.ages})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">School name</span>
                <Input value={form.schoolName} onChange={(e) => setField('schoolName', e.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Grade / class level</span>
                <Input value={form.gradeLevel} onChange={(e) => setField('gradeLevel', e.target.value)} />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs text-muted-foreground">Notes</span>
                <textarea
                  className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                />
              </label>
            </CardContent>
          </Card>
        </div>
      )}

      {currentStepId === 'family' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={form.familyMode === 'existing' ? 'default' : 'outline'}
              onClick={() => setField('familyMode', 'existing')}
            >
              Link to existing family
            </Button>
            <Button
              type="button"
              size="sm"
              variant={form.familyMode === 'new' ? 'default' : 'outline'}
              onClick={() => setField('familyMode', 'new')}
            >
              Create new household
            </Button>
          </div>

          {form.familyMode === 'existing' ? (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-4 w-4" />
                  Search families by surname
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={familySearch}
                  onChange={(e) => setFamilySearch(e.target.value)}
                  placeholder="Type a surname or family name…"
                />
                <div className="max-h-56 overflow-y-auto rounded-md border border-border">
                  {familyLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : familyResults.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No families found. Try another surname.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {familyResults.map((family) => (
                        <li key={family.id}>
                          <button
                            type="button"
                            className={cn(
                              'flex w-full flex-col gap-1 px-3 py-2 text-left hover:bg-muted/50',
                              form.familyId === family.id && 'bg-primary/10',
                            )}
                            onClick={() => {
                              setField('familyId', family.id);
                              setFamilyResults([family]);
                            }}
                          >
                            <span className="font-medium">{family.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {[family.city, family.homePhone, family.email].filter(Boolean).join(' · ') ||
                                'No contact on file'}
                            </span>
                            {family.members.length > 0 ? (
                              <span className="text-xs text-muted-foreground">
                                Members:{' '}
                                {family.members
                                  .map((m) => `${m.firstName} ${m.lastName}${m.familyRole ? ` (${m.familyRole})` : ''}`)
                                  .join(', ')}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {selectedFamily ? (
                  <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-3">
                    <p className="mb-2 text-sm font-medium">Selected: {selectedFamily.name}</p>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Tap a member below to add them as a parent/guardian link.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedFamily.members.map((m) => (
                        <Button
                          key={m.id}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addGuardianFromFamily(m)}
                        >
                          <Users className="mr-1 h-3 w-3" />
                          {m.firstName} {m.lastName}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Home className="h-4 w-4" />
                    Household identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-1 block text-xs text-muted-foreground">Family name *</span>
                    <Input value={form.familyName} onChange={(e) => setField('familyName', e.target.value)} />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="mb-1 block text-xs text-muted-foreground">Home cell</span>
                    <Input value={form.homeCell} onChange={(e) => setField('homeCell', e.target.value)} />
                  </label>
                  <label>
                    <span className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3" />
                      Special occasion
                    </span>
                    <Input value={form.specialOccasion} onChange={(e) => setField('specialOccasion', e.target.value)} />
                  </label>
                  <label>
                    <span className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarHeart className="h-3 w-3" />
                      Date of occasion
                    </span>
                    <Input
                      type="date"
                      value={form.specialOccasionDate}
                      onChange={(e) => setField('specialOccasionDate', e.target.value)}
                    />
                  </label>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Contact</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-xs text-muted-foreground">Home phone</span>
                    <Input
                      type="tel"
                      value={form.familyHomePhone}
                      onChange={(e) => setField('familyHomePhone', e.target.value)}
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs text-muted-foreground">Email</span>
                    <Input
                      type="email"
                      value={form.familyEmail}
                      onChange={(e) => setField('familyEmail', e.target.value)}
                    />
                  </label>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {(['address', 'address2'] as const).map((key) => (
                    <label key={key} className="sm:col-span-2">
                      <span className="mb-1 block text-xs text-muted-foreground">
                        {key === 'address' ? 'Address line 1' : 'Address line 2'}
                      </span>
                      <Input
                        value={key === 'address' ? form.address : form.address2}
                        onChange={(e) => setField(key, e.target.value)}
                      />
                    </label>
                  ))}
                  {(['city', 'state', 'zip', 'country'] as const).map((key) => (
                    <label key={key}>
                      <span className="mb-1 block text-xs text-muted-foreground">{addressFieldLabel(key)}</span>
                      <Input
                        value={form[key]}
                        onChange={(e) => setField(key, e.target.value)}
                      />
                    </label>
                  ))}
                </CardContent>
              </Card>
              {(catalog.familyProperties.length > 0 || catalog.familyCustomFields.length > 0) && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Properties &amp; custom fields</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {catalog.familyProperties.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {catalog.familyProperties.map((p) => (
                          <label key={p.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={form.propertyIds.includes(p.id)}
                              onChange={() => toggleProperty(p.id)}
                            />
                            {p.name}
                          </label>
                        ))}
                      </div>
                    ) : null}
                    {catalog.familyCustomFields.length > 0 ? (
                      <CustomFieldsFormSection
                        fields={catalog.familyCustomFields}
                        values={form.familyCustomFields}
                        onChange={(fieldKey, value) =>
                          setForm((prev) => ({
                            ...prev,
                            familyCustomFields: { ...prev.familyCustomFields, [fieldKey]: value },
                          }))
                        }
                      />
                    ) : null}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Child&apos;s role in household</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="block max-w-md">
                <span className="mb-1 block text-xs text-muted-foreground">Family role</span>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.familyRoleId}
                  onChange={(e) => setField('familyRoleId', e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {catalog.familyRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">Parent / guardian links</CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setForm((prev) => ({ ...prev, guardians: [...prev.guardians, emptyGuardian()] }))}
              >
                <Plus className="h-3 w-3" />
                Add link
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.guardians.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Optional: link parents or guardians from the selected family or search the database.
                </p>
              ) : null}
              {form.guardians.map((guardian, index) => (
                <div key={guardian.key} className="rounded-lg border border-border p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={guardian.mode === 'existing' ? 'default' : 'outline'}
                        onClick={() =>
                          setForm((prev) => {
                            const next = [...prev.guardians];
                            next[index] = { ...next[index], mode: 'existing' };
                            return { ...prev, guardians: next };
                          })
                        }
                      >
                        Existing member
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={guardian.mode === 'new' ? 'default' : 'outline'}
                        onClick={() =>
                          setForm((prev) => {
                            const next = [...prev.guardians];
                            next[index] = { ...next[index], mode: 'new', memberId: '' };
                            return { ...prev, guardians: next };
                          })
                        }
                      >
                        New person
                      </Button>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Remove guardian"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          guardians: prev.guardians.filter((g) => g.key !== guardian.key),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-xs text-muted-foreground">Relation</span>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={guardian.relation}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.guardians];
                            next[index] = { ...next[index], relation: e.target.value };
                            return { ...prev, guardians: next };
                          })
                        }
                      >
                        {GUARDIAN_RELATIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {guardian.mode === 'existing' ? (
                      <label className="sm:col-span-2">
                        <span className="mb-1 block text-xs text-muted-foreground">Search member</span>
                        <Input
                          placeholder="Search by name…"
                          onChange={(e) => {
                            void searchGuardians(e.target.value);
                          }}
                        />
                        {guardian.memberId ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Selected: {guardian.firstName} {guardian.lastName}
                          </p>
                        ) : null}
                        {guardianResults.length > 0 ? (
                          <ul className="mt-2 max-h-32 overflow-y-auto rounded-md border border-border">
                            {guardianResults.map((m) => (
                              <li key={m.id}>
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                                  onClick={() =>
                                    setForm((prev) => {
                                      const next = [...prev.guardians];
                                      next[index] = {
                                        ...next[index],
                                        memberId: m.id,
                                        firstName: m.firstName,
                                        lastName: m.lastName,
                                      };
                                      return { ...prev, guardians: next };
                                    })
                                  }
                                >
                                  {m.firstName} {m.lastName}
                                  {m.email ? ` · ${m.email}` : ''}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </label>
                    ) : (
                      <>
                        <label>
                          <span className="mb-1 block text-xs text-muted-foreground">First name</span>
                          <Input
                            value={guardian.firstName}
                            onChange={(e) =>
                              setForm((prev) => {
                                const next = [...prev.guardians];
                                next[index] = { ...next[index], firstName: e.target.value };
                                return { ...prev, guardians: next };
                              })
                            }
                          />
                        </label>
                        <label>
                          <span className="mb-1 block text-xs text-muted-foreground">Last name</span>
                          <Input
                            value={guardian.lastName}
                            onChange={(e) =>
                              setForm((prev) => {
                                const next = [...prev.guardians];
                                next[index] = { ...next[index], lastName: e.target.value };
                                return { ...prev, guardians: next };
                              })
                            }
                          />
                        </label>
                        <label>
                          <span className="mb-1 block text-xs text-muted-foreground">Phone</span>
                          <Input
                            type="tel"
                            value={guardian.phone}
                            onChange={(e) =>
                              setForm((prev) => {
                                const next = [...prev.guardians];
                                next[index] = { ...next[index], phone: e.target.value };
                                return { ...prev, guardians: next };
                              })
                            }
                          />
                        </label>
                        <label>
                          <span className="mb-1 block text-xs text-muted-foreground">Email</span>
                          <Input
                            type="email"
                            value={guardian.email}
                            onChange={(e) =>
                              setForm((prev) => {
                                const next = [...prev.guardians];
                                next[index] = { ...next[index], email: e.target.value };
                                return { ...prev, guardians: next };
                              })
                            }
                          />
                        </label>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {currentStepId === 'preview' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Personal, class &amp; education</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <PreviewRow label="Name" value={[form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ')} />
                <PreviewRow label="Gender" value={form.gender === 'UNKNOWN' ? undefined : form.gender} />
                <PreviewRow
                  label="Date of birth"
                  value={buildDateOfBirth(form.birthMonth, form.birthDay, form.birthYear)}
                />
                <PreviewRow label="Church class" value={classLabel} />
                <PreviewRow label="School" value={form.schoolName} />
                <PreviewRow label="Grade" value={form.gradeLevel} />
                <PreviewRow label="Mobile" value={form.cellPhone} />
                <PreviewRow label="Home phone" value={form.homePhone} />
                <PreviewRow label="Notes" value={form.notes} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Family tree</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <PreviewRow
                  label="Household"
                  value={
                    form.familyMode === 'existing'
                      ? selectedFamily?.name ?? catalog.families.find((f) => f.id === form.familyId)?.name
                      : form.familyName
                  }
                />
                <PreviewRow
                  label="Mode"
                  value={form.familyMode === 'existing' ? 'Existing family' : 'New household'}
                />
                {form.familyMode === 'new' ? (
                  <>
                    <PreviewRow label="Address" value={[form.address, form.city, form.state, form.zip].filter(Boolean).join(', ')} />
                    <PreviewRow label="Family phone" value={form.familyHomePhone} />
                    <PreviewRow label="Family email" value={form.familyEmail} />
                  </>
                ) : null}
                <PreviewRow
                  label="Family role"
                  value={catalog.familyRoles.find((r) => r.id === form.familyRoleId)?.name}
                />
              </dl>
              {form.guardians.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Parent / guardian links</p>
                  <ul className="space-y-1 text-sm">
                    {form.guardians.map((g) => (
                      <li key={g.key}>
                        {GUARDIAN_RELATIONS.find((r) => r.value === g.relation)?.label ?? g.relation}:{' '}
                        {g.firstName} {g.lastName}
                        {g.mode === 'new' ? ' (new)' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </MultiStepFormDialog>
  );
}
