'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import type {
  CongregantClassificationDto,
  CustomFieldDefinitionDto,
  FamilyRoleDefinitionDto,
  MembershipCustomFieldTypeDto,
  MembershipRegistryCatalogDto,
  PropertyDefinitionDto,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type SettingsSection =
  | 'classifications'
  | 'familyRoles'
  | 'memberFields'
  | 'familyFields'
  | 'memberProperties'
  | 'familyProperties';

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'classifications', label: 'Classifications' },
  { id: 'familyRoles', label: 'Family Roles' },
  { id: 'memberFields', label: 'Member Custom Fields' },
  { id: 'familyFields', label: 'Family Custom Fields' },
  { id: 'memberProperties', label: 'Member Properties' },
  { id: 'familyProperties', label: 'Family Properties' },
];

const FIELD_TYPES: MembershipCustomFieldTypeDto[] = [
  'TEXT',
  'NUMBER',
  'DATE',
  'BOOLEAN',
  'PHONE',
  'LINK',
];

function slugKey(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

interface Props {
  onChanged?: () => void;
}

export function MembershipRegistrySettingsPanel({ onChanged }: Props) {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<SettingsSection>('classifications');
  const { data, isLoading } = useApiQuery<MembershipRegistryCatalogDto>(
    ['membership-admin-catalog'],
    '/membership/registry/admin-catalog',
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['membership-admin-catalog'] });
    queryClient.invalidateQueries({ queryKey: ['membership-registry-catalog'] });
    onChanged?.();
  };

  return (
    <div className="space-y-4" data-testid="membership-registry-settings">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5" />
            Membership Registry Settings
          </CardTitle>
          <CardDescription>
            Manage congregant classifications, family roles, custom fields, and properties for your
            church.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Registry sections">
            {SECTIONS.map(({ id, label }) => (
              <Button
                key={id}
                size="sm"
                variant={section === id ? 'default' : 'outline'}
                role="tab"
                aria-selected={section === id}
                data-testid={`registry-settings-tab-${id}`}
                onClick={() => setSection(id)}
              >
                {label}
              </Button>
            ))}
          </div>

          {isLoading || !data ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading registry…
            </div>
          ) : (
            <>
              {section === 'classifications' && (
                <ClassificationsSection items={data.classifications} onChanged={refresh} />
              )}
              {section === 'familyRoles' && (
                <FamilyRolesSection items={data.familyRoles} onChanged={refresh} />
              )}
              {section === 'memberFields' && (
                <CustomFieldsSection
                  kind="member"
                  items={data.memberCustomFields}
                  onChanged={refresh}
                />
              )}
              {section === 'familyFields' && (
                <CustomFieldsSection
                  kind="family"
                  items={data.familyCustomFields}
                  onChanged={refresh}
                />
              )}
              {section === 'memberProperties' && (
                <PropertiesSection kind="member" items={data.memberProperties} onChanged={refresh} />
              )}
              {section === 'familyProperties' && (
                <PropertiesSection kind="family" items={data.familyProperties} onChanged={refresh} />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClassificationsSection({
  items,
  onChanged,
}: {
  items: CongregantClassificationDto[];
  onChanged: () => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!code.trim() || !name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/membership/registry/classifications', {
        code: code.trim(),
        name: name.trim(),
      });
      setCode('');
      setName('');
      toast.success('Classification added');
      onChanged();
    } catch {
      toast.error('Could not add classification');
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: string, data: Record<string, unknown>) => {
    try {
      await api.patch(`/membership/registry/classifications/${id}`, data);
      onChanged();
    } catch {
      toast.error('Could not update classification');
    }
  };

  return (
    <RegistryTable
      testId="classifications-table"
      columns={['Code', 'Name', 'Sort', 'Status', 'Actions']}
      addForm={
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Code</span>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MEMBER" />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Member" />
          </label>
          <Button size="sm" onClick={add} disabled={saving}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      }
      rows={items.map((row) => (
        <tr key={row.id} data-testid={`classification-row-${row.code}`}>
          <td className="px-3 py-2 font-mono text-sm">{row.code}</td>
          <td className="px-3 py-2">
            <InlineText
              value={row.name}
              onSave={(v) => patch(row.id, { name: v })}
            />
          </td>
          <td className="px-3 py-2">
            <InlineNumber value={row.sortOrder} onSave={(v) => patch(row.id, { sortOrder: v })} />
          </td>
          <td className="px-3 py-2">
            <ActiveBadge active={row.isActive && !row.isInactive} />
          </td>
          <td className="px-3 py-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => patch(row.id, { isActive: !(row.isActive && !row.isInactive) })}
            >
              {row.isActive && !row.isInactive ? 'Deactivate' : 'Activate'}
            </Button>
          </td>
        </tr>
      ))}
    />
  );
}

function FamilyRolesSection({
  items,
  onChanged,
}: {
  items: FamilyRoleDefinitionDto[];
  onChanged: () => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!code.trim() || !name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/membership/registry/family-roles', { code: code.trim(), name: name.trim() });
      setCode('');
      setName('');
      toast.success('Family role added');
      onChanged();
    } catch {
      toast.error('Could not add family role');
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: string, data: Record<string, unknown>) => {
    try {
      await api.patch(`/membership/registry/family-roles/${id}`, data);
      onChanged();
    } catch {
      toast.error('Could not update family role');
    }
  };

  return (
    <RegistryTable
      testId="family-roles-table"
      columns={['Code', 'Name', 'Sort', 'Status', 'Actions']}
      addForm={
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Code</span>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="HEAD" />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Head" />
          </label>
          <Button size="sm" onClick={add} disabled={saving}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      }
      rows={items.map((row) => (
        <tr key={row.id} data-testid={`family-role-row-${row.code}`}>
          <td className="px-3 py-2 font-mono text-sm">{row.code}</td>
          <td className="px-3 py-2">
            <InlineText value={row.name} onSave={(v) => patch(row.id, { name: v })} />
          </td>
          <td className="px-3 py-2">
            <InlineNumber value={row.sortOrder} onSave={(v) => patch(row.id, { sortOrder: v })} />
          </td>
          <td className="px-3 py-2">
            <ActiveBadge active={row.isActive} />
          </td>
          <td className="px-3 py-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => patch(row.id, { isActive: !row.isActive })}
            >
              {row.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </td>
        </tr>
      ))}
    />
  );
}

function CustomFieldsSection({
  kind,
  items,
  onChanged,
}: {
  kind: 'member' | 'family';
  items: CustomFieldDefinitionDto[];
  onChanged: () => void;
}) {
  const [label, setLabel] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState<MembershipCustomFieldTypeDto>('TEXT');
  const [saving, setSaving] = useState(false);
  const base = kind === 'member' ? 'member-custom-fields' : 'family-custom-fields';

  const add = async () => {
    const key = (fieldKey || slugKey(label)).trim();
    if (!key || !label.trim()) {
      toast.error('Label and field key are required');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/membership/registry/${base}`, { fieldKey: key, label: label.trim(), fieldType });
      setLabel('');
      setFieldKey('');
      toast.success('Custom field added');
      onChanged();
    } catch {
      toast.error('Could not add custom field');
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: string, data: Record<string, unknown>) => {
    try {
      await api.patch(`/membership/registry/${base}/${id}`, data);
      onChanged();
    } catch {
      toast.error('Could not update custom field');
    }
  };

  return (
    <RegistryTable
      testId={`${kind}-custom-fields-table`}
      columns={['Key', 'Label', 'Type', 'Required', 'Sort', 'Status', 'Actions']}
      addForm={
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Label</span>
            <Input
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (!fieldKey) setFieldKey(slugKey(e.target.value));
              }}
              placeholder="Envelope number"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Field key</span>
            <Input value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Type</span>
            <select
              className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as MembershipCustomFieldTypeDto)}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" onClick={add} disabled={saving}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      }
      rows={items.map((row) => (
        <tr key={row.id} data-testid={`custom-field-row-${row.fieldKey}`}>
          <td className="px-3 py-2 font-mono text-sm">{row.fieldKey}</td>
          <td className="px-3 py-2">
            <InlineText value={row.label} onSave={(v) => patch(row.id, { label: v })} />
          </td>
          <td className="px-3 py-2 text-sm">{row.fieldType}</td>
          <td className="px-3 py-2">
            <input
              type="checkbox"
              checked={row.isRequired}
              onChange={(e) => patch(row.id, { isRequired: e.target.checked })}
            />
          </td>
          <td className="px-3 py-2">
            <InlineNumber value={row.sortOrder} onSave={(v) => patch(row.id, { sortOrder: v })} />
          </td>
          <td className="px-3 py-2">
            <ActiveBadge active={row.isActive} />
          </td>
          <td className="px-3 py-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => patch(row.id, { isActive: !row.isActive })}
            >
              {row.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </td>
        </tr>
      ))}
    />
  );
}

function PropertiesSection({
  kind,
  items,
  onChanged,
}: {
  kind: 'member' | 'family';
  items: PropertyDefinitionDto[];
  onChanged: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const base = kind === 'member' ? 'member-properties' : 'family-properties';

  const add = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/membership/registry/${base}`, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
      toast.success('Property added');
      onChanged();
    } catch {
      toast.error('Could not add property');
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: string, data: Record<string, unknown>) => {
    try {
      await api.patch(`/membership/registry/${base}/${id}`, data);
      onChanged();
    } catch {
      toast.error('Could not update property');
    }
  };

  return (
    <RegistryTable
      testId={`${kind}-properties-table`}
      columns={['Name', 'Description', 'Sort', 'Status', 'Actions']}
      addForm={
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Newsletter" />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Description</span>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <Button size="sm" onClick={add} disabled={saving}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      }
      rows={items.map((row) => (
        <tr key={row.id} data-testid={`property-row-${row.name.replace(/\s+/g, '-')}`}>
          <td className="px-3 py-2">
            <InlineText value={row.name} onSave={(v) => patch(row.id, { name: v })} />
          </td>
          <td className="px-3 py-2">
            <InlineText
              value={row.description ?? ''}
              onSave={(v) => patch(row.id, { description: v || null })}
            />
          </td>
          <td className="px-3 py-2">
            <InlineNumber value={row.sortOrder} onSave={(v) => patch(row.id, { sortOrder: v })} />
          </td>
          <td className="px-3 py-2">
            <ActiveBadge active={row.isActive} />
          </td>
          <td className="px-3 py-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => patch(row.id, { isActive: !row.isActive })}
            >
              {row.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </td>
        </tr>
      ))}
    />
  );
}

function RegistryTable({
  testId,
  columns,
  addForm,
  rows,
}: {
  testId: string;
  columns: string[];
  addForm: React.ReactNode;
  rows: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {addForm}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-sm" data-testid={testId}>
          <thead className="border-b border-border bg-muted/40">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{rows}</tbody>
        </table>
      </div>
    </div>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? 'default' : 'secondary'}>{active ? 'Active' : 'Inactive'}</Badge>
  );
}

function InlineText({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  return (
    <Input
      data-inline="text"
      className="h-8"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() && draft !== value) onSave(draft.trim());
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

function InlineNumber({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  return (
    <Input
      type="number"
      className="h-8 w-20"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = Number(draft);
        if (!Number.isNaN(n) && n !== value) onSave(n);
      }}
    />
  );
}
