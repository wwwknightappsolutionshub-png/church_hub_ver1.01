'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarHeart, Home, Loader2, MapPin, Phone, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { MembershipRegistryCatalogDto } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { CustomFieldsFormSection } from '@/components/membership/CustomFieldsFormSection';
import { MultiStepFormDialog } from '@/components/membership/MultiStepFormDialog';
import { FieldLabel, WizardSection } from '@/components/membership/WizardFormSection';
import { addressFieldLabel } from '@/lib/membership/address-labels';

const STEPS = [
  {
    id: 'household',
    label: 'Household',
    shortLabel: '1',
    description: 'Family name, home cell, and special occasions',
  },
  {
    id: 'contact',
    label: 'Contact',
    shortLabel: '2',
    description: 'Household phone and email for directories',
  },
  {
    id: 'address',
    label: 'Address',
    shortLabel: '3',
    description: 'Mailing address for maps and mailings',
  },
  {
    id: 'extras',
    label: 'Properties & Fields',
    shortLabel: '4',
    description: 'Registry properties and custom fields',
  },
] as const;

interface FamilyEditorDialogProps {
  familyId?: string | null;
  onClose: () => void;
  onSaved: (familyId?: string) => void;
  catalogPath?: string;
  createPath?: string;
  patchPath?: string;
  dialogTitle?: string;
  submitLabel?: string;
}

export function FamilyEditorDialog({
  familyId,
  onClose,
  onSaved,
  catalogPath = '/membership/registry/catalog',
  createPath = '/membership/families',
  patchPath,
  dialogTitle,
  submitLabel,
}: FamilyEditorDialogProps) {
  const isEdit = Boolean(familyId);
  const [catalog, setCatalog] = useState<MembershipRegistryCatalogDto | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [name, setName] = useState('');
  const [homeCell, setHomeCell] = useState('');
  const [specialOccasion, setSpecialOccasion] = useState('');
  const [specialOccasionDate, setSpecialOccasionDate] = useState('');
  const [address, setAddress] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');
  const [homePhone, setHomePhone] = useState('');
  const [email, setEmail] = useState('');
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, string | boolean | null>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<MembershipRegistryCatalogDto>(catalogPath)
      .then((res) => setCatalog(res.data))
      .catch(() => toast.error('Could not load family form settings'));
  }, [catalogPath]);

  useEffect(() => {
    if (!familyId) return;
    setLoading(true);
    api
      .get<Record<string, unknown>>(`/membership/families/${familyId}`)
      .then((res) => {
        const f = res.data;
        setName(String(f.name ?? ''));
        setHomeCell(String(f.homeCell ?? ''));
        setSpecialOccasion(String(f.specialOccasion ?? ''));
        setSpecialOccasionDate(
          f.specialOccasionDate
            ? new Date(String(f.specialOccasionDate)).toISOString().slice(0, 10)
            : '',
        );
        setAddress(String(f.address ?? ''));
        setAddress2(String(f.address2 ?? ''));
        setCity(String(f.city ?? ''));
        setState(String(f.state ?? ''));
        setZip(String(f.zip ?? ''));
        setCountry(String(f.country ?? ''));
        setHomePhone(String(f.homePhone ?? ''));
        setEmail(String(f.email ?? ''));
        setPropertyIds(
          Array.isArray(f.propertyAssignments)
            ? (
                f.propertyAssignments as Array<{ definitionId?: string; definition?: { id: string } }>
              ).map((p) => p.definition?.id ?? p.definitionId ?? '')
            : [],
        );
      })
      .catch(() => toast.error('Could not load family'))
      .finally(() => setLoading(false));
  }, [familyId]);

  const toggleProperty = (id: string) => {
    setPropertyIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const payload = useMemo(
    () => ({
      name: name.trim(),
      homeCell,
      specialOccasion,
      specialOccasionDate: specialOccasionDate || null,
      address,
      address2,
      city,
      state,
      zip,
      country,
      homePhone,
      email,
      propertyIds,
      customFields,
    }),
    [
      name,
      homeCell,
      specialOccasion,
      specialOccasionDate,
      address,
      address2,
      city,
      state,
      zip,
      country,
      homePhone,
      email,
      propertyIds,
      customFields,
    ],
  );

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Family name is required');
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      if (isEdit && familyId) {
        await api.patch(patchPath ?? `/membership/families/${familyId}`, payload);
        toast.success('Family updated');
        onSaved(familyId);
      } else {
        const res = await api.post<{ id: string }>(createPath, payload);
        toast.success('Family created');
        onSaved(res.data.id);
      }
      onClose();
    } catch {
      toast.error(isEdit ? 'Could not update family' : 'Could not create family');
    } finally {
      setSaving(false);
    }
  };

  const hasExtras =
    (catalog?.familyProperties.length ?? 0) > 0 || (catalog?.familyCustomFields.length ?? 0) > 0;

  const visibleSteps = useMemo(
    () => (hasExtras ? STEPS : STEPS.filter((s) => s.id !== 'extras')),
    [hasExtras],
  );

  const currentStepId = visibleSteps[Math.min(step, visibleSteps.length - 1)]?.id ?? 'household';

  if (loading) {
    const overlay = (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
    return typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay;
  }

  return (
    <MultiStepFormDialog
      title={dialogTitle ?? (isEdit ? 'Edit Family' : 'Add New Family')}
      subtitle="Complete each step to register a household in your church directory"
      steps={visibleSteps.map((s) => ({ ...s }))}
      step={Math.min(step, visibleSteps.length - 1)}
      onStepChange={setStep}
      onBeforeNext={() => {
        if (step === 0 && !name.trim()) {
          toast.error('Family name is required');
          return false;
        }
        return true;
      }}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={submitLabel ?? (isEdit ? 'Save Family' : 'Add Family')}
      saving={saving}
      testId="family-editor-dialog"
      variant="corporate"
      extraActions={
        saving ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : undefined
      }
    >
      <div className="space-y-4">
        {currentStepId === 'household' && (
          <>
            <WizardSection
              title="Household identity"
              description="How this family appears in the congregants registry"
              icon={Home}
            >
              <label className="block">
                <FieldLabel required>Family name</FieldLabel>
                <Input required value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            </WizardSection>
            <WizardSection title="Fellowship & occasions" icon={Sparkles}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <FieldLabel>Home cell</FieldLabel>
                  <Input
                    value={homeCell}
                    onChange={(e) => setHomeCell(e.target.value)}
                    placeholder="Cell group or home fellowship name"
                  />
                </label>
                <label>
                  <FieldLabel>Special occasion</FieldLabel>
                  <Input
                    value={specialOccasion}
                    onChange={(e) => setSpecialOccasion(e.target.value)}
                    placeholder="e.g. Family dedication"
                  />
                </label>
                <label>
                  <FieldLabel>Date of occasion</FieldLabel>
                  <Input
                    type="date"
                    value={specialOccasionDate}
                    onChange={(e) => setSpecialOccasionDate(e.target.value)}
                  />
                </label>
              </div>
            </WizardSection>
          </>
        )}

        {currentStepId === 'contact' && (
          <WizardSection
            title="Household contact"
            description="Shared phone and email for this family"
            icon={Phone}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <FieldLabel>Home phone</FieldLabel>
                <Input type="tel" value={homePhone} onChange={(e) => setHomePhone(e.target.value)} />
              </label>
              <label>
                <FieldLabel>Email</FieldLabel>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
            </div>
          </WizardSection>
        )}

        {currentStepId === 'address' && (
          <WizardSection
            title="Mailing address"
            description="Used on directories, maps, and pastoral visits"
            icon={MapPin}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {(['address', 'address2'] as const).map((key) => (
                <label key={key} className="sm:col-span-2">
                  <FieldLabel>{key === 'address' ? 'Address line 1' : 'Address line 2'}</FieldLabel>
                  <Input
                    value={key === 'address' ? address : address2}
                    onChange={(e) => (key === 'address' ? setAddress(e.target.value) : setAddress2(e.target.value))}
                  />
                </label>
              ))}
              {(['city', 'state', 'zip', 'country'] as const).map((key) => (
                <label key={key}>
                  <FieldLabel>{addressFieldLabel(key)}</FieldLabel>
                  <Input
                    value={
                      key === 'city' ? city : key === 'state' ? state : key === 'zip' ? zip : country
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (key === 'city') setCity(v);
                      else if (key === 'state') setState(v);
                      else if (key === 'zip') setZip(v);
                      else setCountry(v);
                    }}
                  />
                </label>
              ))}
            </div>
          </WizardSection>
        )}

        {currentStepId === 'extras' && (
          <>
            {(catalog?.familyProperties.length ?? 0) > 0 && (
              <WizardSection title="Properties" icon={CalendarHeart}>
                <div className="flex flex-wrap gap-3">
                  {catalog!.familyProperties.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={propertyIds.includes(p.id)}
                        onChange={() => toggleProperty(p.id)}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </WizardSection>
            )}
            {(catalog?.familyCustomFields.length ?? 0) > 0 && (
              <WizardSection title="Custom fields">
                <CustomFieldsFormSection
                  fields={catalog!.familyCustomFields}
                  values={customFields}
                  onChange={(fieldKey, value) =>
                    setCustomFields((prev) => ({ ...prev, [fieldKey]: value }))
                  }
                />
              </WizardSection>
            )}
          </>
        )}
      </div>
    </MultiStepFormDialog>
  );
}
