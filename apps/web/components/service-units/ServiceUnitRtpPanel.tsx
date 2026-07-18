'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList, Loader2, Plus, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { isChurchAdminRole } from '@/lib/session-role';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type RtpFieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'CURRENCY';

type RtpField = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: RtpFieldType;
  sectionKey: string;
  sectionLabel: string;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
  options?: string[] | unknown;
};

type RtpRequestRow = {
  id: string;
  title: string;
  status: 'SUBMITTED' | 'PROCESSING' | 'APPROVED' | 'REJECTED';
  fieldValues: Record<string, unknown>;
  createdAt: string;
  submittedBy?: { firstName: string; lastName: string };
};

function fieldOptions(field: RtpField): string[] {
  if (Array.isArray(field.options)) return field.options.map(String);
  return [];
}

export function ServiceUnitRtpPanel({
  unitId,
  unitName,
}: {
  unitId: string;
  unitName: string;
}) {
  const { userRoles } = useModuleAccess();
  const isAdmin = isChurchAdminRole(userRoles);
  const fieldsQuery = useApiQuery<RtpField[]>(['rtp-fields'], '/rtp/form-fields');
  const requestsQuery = useApiQuery<RtpRequestRow[]>(
    ['rtp-unit-requests', unitId],
    `/rtp/units/${unitId}/requests`,
  );

  const fields = fieldsQuery.data ?? [];
  const sections = useMemo(() => {
    const map = new Map<string, { key: string; label: string; fields: RtpField[] }>();
    for (const f of fields) {
      const existing = map.get(f.sectionKey);
      if (existing) existing.fields.push(f);
      else map.set(f.sectionKey, { key: f.sectionKey, label: f.sectionLabel, fields: [f] });
    }
    return [...map.values()];
  }, [fields]);

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [newField, setNewField] = useState({
    fieldKey: '',
    label: '',
    fieldType: 'TEXT' as RtpFieldType,
    sectionKey: 'overview',
    sectionLabel: '1. Request overview',
    isRequired: false,
    options: '',
  });

  const current = sections[step];
  const isLast = step >= Math.max(sections.length - 1, 0);

  const setValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = () => {
    if (!current) return true;
    for (const field of current.fields) {
      if (!field.isRequired) continue;
      if (!String(values[field.fieldKey] ?? '').trim()) {
        toast.error(`${field.label} is required`);
        return false;
      }
    }
    return true;
  };

  const submit = async () => {
    if (!validateStep()) return;
    setBusy(true);
    try {
      await api.post(`/rtp/units/${unitId}/requests`, {
        title: values.request_title?.trim() || undefined,
        fieldValues: values,
      });
      toast.success('RTP submitted — pastors and church admins have been notified');
      setValues({});
      setStep(0);
      await requestsQuery.refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not submit RTP'));
    } finally {
      setBusy(false);
    }
  };

  const createField = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/rtp/form-fields', {
        ...newField,
        options: newField.options
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      toast.success('RTP field added');
      setNewField({
        fieldKey: '',
        label: '',
        fieldType: 'TEXT',
        sectionKey: 'overview',
        sectionLabel: '1. Request overview',
        isRequired: false,
        options: '',
      });
      await fieldsQuery.refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not add field'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Request to Purchase (RTP)
          </CardTitle>
          <CardDescription>
            Multi-step purchase request for {unitName}. After submit, church admin and pastors are
            reminded every 15 minutes until they mark it Received (status becomes Processing), then
            track through to Approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fieldsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading form…
            </div>
          ) : sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No RTP form fields configured yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {sections.map((s, i) => (
                  <Badge key={s.key} variant={i === step ? 'default' : 'outline'} className="text-[10px]">
                    {s.label}
                  </Badge>
                ))}
              </div>

              {current && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                  <p className="text-sm font-medium">{current.label}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {current.fields.map((field) => {
                      const opts = fieldOptions(field);
                      const common = {
                        id: field.fieldKey,
                        value: values[field.fieldKey] ?? '',
                        onChange: (
                          e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
                        ) => setValue(field.fieldKey, e.target.value),
                      };
                      return (
                        <label
                          key={field.id}
                          className={field.fieldType === 'TEXTAREA' ? 'sm:col-span-2' : undefined}
                        >
                          <span className="mb-1 block text-xs text-muted-foreground">
                            {field.label}
                            {field.isRequired ? ' *' : ''}
                          </span>
                          {field.fieldType === 'TEXTAREA' ? (
                            <textarea
                              {...common}
                              rows={3}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                          ) : field.fieldType === 'SELECT' ? (
                            <select
                              {...common}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="">Select…</option>
                              {opts.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              {...common}
                              type={
                                field.fieldType === 'NUMBER' || field.fieldType === 'CURRENCY'
                                  ? 'number'
                                  : field.fieldType === 'DATE'
                                    ? 'date'
                                    : 'text'
                              }
                              step={field.fieldType === 'CURRENCY' ? '0.01' : undefined}
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={step === 0 || busy}
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                {!isLast ? (
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!validateStep()) return;
                      setStep((s) => s + 1);
                    }}
                    className="gap-1"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" disabled={busy} onClick={() => void submit()} className="gap-2">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit RTP
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submitted requests</CardTitle>
          <CardDescription>Track SLA status for this unit&apos;s purchase requests.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(requestsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No RTP requests yet.</p>
          ) : (
            (requestsQuery.data ?? []).map((r) => (
              <div key={r.id} className="rounded-lg border border-border px-3 py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{r.title}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {r.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString()}
                  {r.submittedBy
                    ? ` · ${r.submittedBy.firstName} ${r.submittedBy.lastName}`
                    : ''}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4" />
                Customize RTP fields
              </CardTitle>
              <CardDescription>
                Church admin only — add fields and sections for the wizard sample form.
              </CardDescription>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowBuilder((v) => !v)}>
              {showBuilder ? 'Hide' : 'Configure'}
            </Button>
          </CardHeader>
          {showBuilder && (
            <CardContent>
              <form onSubmit={createField} className="grid gap-3 sm:grid-cols-2">
                <label>
                  <Label>Field key</Label>
                  <Input
                    value={newField.fieldKey}
                    onChange={(e) => setNewField({ ...newField, fieldKey: e.target.value })}
                    placeholder="e.g. vendor_quote"
                    required
                  />
                </label>
                <label>
                  <Label>Label</Label>
                  <Input
                    value={newField.label}
                    onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                    required
                  />
                </label>
                <label>
                  <Label>Type</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newField.fieldType}
                    onChange={(e) =>
                      setNewField({ ...newField, fieldType: e.target.value as RtpFieldType })
                    }
                  >
                    {(['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'SELECT', 'CURRENCY'] as const).map(
                      (t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  <Label>Section key</Label>
                  <Input
                    value={newField.sectionKey}
                    onChange={(e) => setNewField({ ...newField, sectionKey: e.target.value })}
                    required
                  />
                </label>
                <label className="sm:col-span-2">
                  <Label>Section label</Label>
                  <Input
                    value={newField.sectionLabel}
                    onChange={(e) => setNewField({ ...newField, sectionLabel: e.target.value })}
                    required
                  />
                </label>
                {newField.fieldType === 'SELECT' && (
                  <label className="sm:col-span-2">
                    <Label>Options (comma-separated)</Label>
                    <Input
                      value={newField.options}
                      onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                    />
                  </label>
                )}
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={newField.isRequired}
                    onChange={(e) => setNewField({ ...newField, isRequired: e.target.checked })}
                  />
                  Required
                </label>
                <Button type="submit" disabled={busy} className="gap-2 sm:col-span-2">
                  <Plus className="h-4 w-4" />
                  Add field
                </Button>
              </form>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
