'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

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

type RtpLineItem = {
  id: string;
  description: string;
  quantity: string;
  unitCost: string;
  websiteUrl: string;
};

type RtpRequestRow = {
  id: string;
  title: string;
  status: 'SUBMITTED' | 'PROCESSING' | 'APPROVED' | 'REJECTED';
  fieldValues: Record<string, unknown>;
  createdAt: string;
  submittedBy?: { firstName: string; lastName: string };
};

const HIDDEN_ITEM_KEYS = new Set(['item_description', 'quantity', 'unit_cost']);

function fieldOptions(field: RtpField): string[] {
  if (Array.isArray(field.options)) return field.options.map(String);
  return [];
}

function emptyLine(): RtpLineItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: '',
    quantity: '1',
    unitCost: '',
    websiteUrl: '',
  };
}

function lineTotal(item: RtpLineItem): number {
  const qty = Number(item.quantity);
  const cost = Number(item.unitCost);
  if (!Number.isFinite(qty) || !Number.isFinite(cost)) return 0;
  return Math.round(qty * cost * 100) / 100;
}

function statusBadgeClass(status: RtpRequestRow['status']) {
  switch (status) {
    case 'SUBMITTED':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'PROCESSING':
      return 'bg-sky-100 text-sky-900 border-sky-200';
    case 'APPROVED':
      return 'bg-emerald-100 text-emerald-900 border-emerald-200';
    case 'REJECTED':
      return 'bg-rose-100 text-rose-900 border-rose-200';
    default:
      return '';
  }
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const [lineItems, setLineItems] = useState<RtpLineItem[]>([emptyLine()]);
  const [busy, setBusy] = useState(false);
  const [remindingId, setRemindingId] = useState<string | null>(null);
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
  const estimatedTotal = useMemo(
    () => Math.round(lineItems.reduce((sum, item) => sum + lineTotal(item), 0) * 100) / 100,
    [lineItems],
  );

  useEffect(() => {
    setValues((prev) => {
      const next = formatMoney(estimatedTotal);
      if (prev.estimated_total === next) return prev;
      return { ...prev, estimated_total: next };
    });
  }, [estimatedTotal]);

  const setValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const updateLine = (id: string, patch: Partial<RtpLineItem>) => {
    setLineItems((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const validateStep = () => {
    if (!current) return true;
    if (current.key === 'items') {
      const valid = lineItems.filter((i) => i.description.trim());
      if (valid.length === 0) {
        toast.error('Add at least one item with a description');
        return false;
      }
      for (const [idx, item] of valid.entries()) {
        const qty = Number(item.quantity);
        if (!Number.isFinite(qty) || qty <= 0) {
          toast.error(`Item ${idx + 1}: quantity must be greater than 0`);
          return false;
        }
      }
      return true;
    }
    for (const field of current.fields) {
      if (HIDDEN_ITEM_KEYS.has(field.fieldKey) || field.fieldKey === 'estimated_total') continue;
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
      const payloadItems = lineItems
        .filter((i) => i.description.trim())
        .map((i) => ({
          description: i.description.trim(),
          quantity: Number(i.quantity) || 0,
          unitCost: Number(i.unitCost) || 0,
          websiteUrl: i.websiteUrl.trim(),
          lineTotal: lineTotal(i),
        }));
      await api.post(`/rtp/units/${unitId}/requests`, {
        title: values.request_title?.trim() || undefined,
        fieldValues: {
          ...values,
          estimated_total: estimatedTotal,
          line_items: payloadItems,
        },
      });
      toast.success('RTP submitted — pastors and church admins have been notified');
      setValues({});
      setLineItems([emptyLine()]);
      setStep(0);
      await requestsQuery.refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not submit RTP'));
    } finally {
      setBusy(false);
    }
  };

  const remind = async (requestId: string) => {
    setRemindingId(requestId);
    try {
      await api.post(`/rtp/requests/${requestId}/remind`);
      toast.success('Reminder sent to pastors and church admins');
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not send reminder'));
    } finally {
      setRemindingId(null);
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

  const renderGenericFields = (sectionFields: RtpField[]) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {sectionFields
        .filter((f) => !HIDDEN_ITEM_KEYS.has(f.fieldKey))
        .map((field) => {
          const opts = fieldOptions(field);
          const isComputedTotal = field.fieldKey === 'estimated_total';
          const common = {
            id: field.fieldKey,
            value: isComputedTotal
              ? formatMoney(estimatedTotal)
              : (values[field.fieldKey] ?? ''),
            onChange: (
              e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
            ) => {
              if (isComputedTotal) return;
              setValue(field.fieldKey, e.target.value);
            },
            readOnly: isComputedTotal,
            disabled: isComputedTotal,
          };
          return (
            <label
              key={field.id}
              className={field.fieldType === 'TEXTAREA' ? 'sm:col-span-2' : undefined}
            >
              <span className="mb-1 block text-xs text-muted-foreground">
                {field.label}
                {field.isRequired && !isComputedTotal ? ' *' : ''}
                {isComputedTotal ? ' (from items)' : ''}
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
                    isComputedTotal
                      ? 'text'
                      : field.fieldType === 'NUMBER' || field.fieldType === 'CURRENCY'
                        ? 'number'
                        : field.fieldType === 'DATE'
                          ? 'date'
                          : 'text'
                  }
                  step={field.fieldType === 'CURRENCY' ? '0.01' : undefined}
                  className={cn(isComputedTotal && 'bg-muted/50 font-medium')}
                />
              )}
            </label>
          );
        })}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Request to Purchase (RTP)
          </CardTitle>
          <CardDescription>
            Submit a multi-step purchase request for {unitName}. Leadership reviews it on Admin /
            Pastor Reports; you can track status and send reminders below.
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

                  {current.key === 'items' ? (
                    <div className="space-y-3">
                      {lineItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="space-y-3 rounded-lg border border-border bg-card p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Item {index + 1}
                            </p>
                            {lineItems.length > 1 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 text-destructive"
                                onClick={() =>
                                  setLineItems((rows) => rows.filter((r) => r.id !== item.id))
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <label className="block">
                            <span className="mb-1 block text-xs text-muted-foreground">
                              Item / service description *
                            </span>
                            <textarea
                              rows={2}
                              value={item.description}
                              onChange={(e) => updateLine(item.id, { description: e.target.value })}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                          </label>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label>
                              <span className="mb-1 block text-xs text-muted-foreground">
                                Quantity *
                              </span>
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                value={item.quantity}
                                onChange={(e) => updateLine(item.id, { quantity: e.target.value })}
                              />
                            </label>
                            <label>
                              <span className="mb-1 block text-xs text-muted-foreground">
                                Estimated unit cost
                              </span>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={item.unitCost}
                                onChange={(e) => updateLine(item.id, { unitCost: e.target.value })}
                              />
                            </label>
                            <label className="sm:col-span-2">
                              <span className="mb-1 block text-xs text-muted-foreground">
                                Website link (product / service provider)
                              </span>
                              <Input
                                type="url"
                                placeholder="https://"
                                value={item.websiteUrl}
                                onChange={(e) =>
                                  updateLine(item.id, { websiteUrl: e.target.value })
                                }
                              />
                            </label>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Line total: {formatMoney(lineTotal(item))}
                          </p>
                        </div>
                      ))}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => setLineItems((rows) => [...rows, emptyLine()])}
                        >
                          <Plus className="h-4 w-4" />
                          Add another item
                        </Button>
                        <p className="text-sm font-medium">
                          Running total: {formatMoney(estimatedTotal)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    renderGenericFields(current.fields)
                  )}
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
          <CardDescription>
            Track SLA status and remind pastors or church admins when a request is waiting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(requestsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No RTP requests yet.</p>
          ) : (
            (requestsQuery.data ?? []).map((r) => {
              const canRemind = r.status === 'SUBMITTED' || r.status === 'PROCESSING';
              const items = Array.isArray(r.fieldValues?.line_items)
                ? (r.fieldValues.line_items as Array<Record<string, unknown>>)
                : [];
              const total = Number(r.fieldValues?.estimated_total);
              return (
                <div key={r.id} className="rounded-lg border border-border px-3 py-2.5 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{r.title}</p>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px]', statusBadgeClass(r.status))}
                        >
                          {r.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()}
                        {r.submittedBy
                          ? ` · ${r.submittedBy.firstName} ${r.submittedBy.lastName}`
                          : ''}
                        {Number.isFinite(total) ? ` · Total ${formatMoney(total)}` : ''}
                        {items.length > 0 ? ` · ${items.length} item${items.length === 1 ? '' : 's'}` : ''}
                      </p>
                    </div>
                    {canRemind && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1 shrink-0"
                        disabled={remindingId === r.id}
                        onClick={() => void remind(r.id)}
                      >
                        {remindingId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Bell className="h-3.5 w-3.5" />
                        )}
                        Remind Pastor / Admin
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
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
