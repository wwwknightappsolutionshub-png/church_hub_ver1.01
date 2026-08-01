'use client';

import { useMemo, useState } from 'react';
import {
  MEMBERSHIP_IMPORT_FIELDS,
  MEMBERSHIP_IMPORT_FIELD_LABELS,
  type MembershipImportColumnMapping,
  type MembershipImportOptions,
  type MembershipImportPreviewResponse,
  suggestColumnMapping,
} from '@church-hub/shared-types';
import { Download, FileUp, Loader2, Play, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Step = 'upload' | 'map' | 'preview' | 'done';

const ACTION_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'success'> = {
  CREATE: 'success',
  UPDATE: 'default',
  SKIP: 'secondary',
  ERROR: 'outline',
};

export function MembershipImportWizard({
  onComplete,
  apiBase = '/membership/import',
  templateFilename = 'churchhub-member-import-template.csv',
}: {
  onComplete?: () => void;
  apiBase?: string;
  templateFilename?: string;
}) {
  const [step, setStep] = useState<Step>('upload');
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<MembershipImportColumnMapping>>({});
  const [options, setOptions] = useState<MembershipImportOptions>({
    mode: 'MEMBERS',
    updateExisting: true,
    skipDuplicatesInFile: true,
  });
  const [preview, setPreview] = useState<MembershipImportPreviewResponse | null>(null);
  const [commitSummary, setCommitSummary] = useState<Record<string, number> | null>(null);

  const requiredMapped = mapping.firstName && mapping.lastName;

  const downloadTemplate = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const url = `${API_URL}/api/v1${apiBase}/template.csv`;
    const a = document.createElement('a');
    a.href = token ? `${url}?_=${Date.now()}` : url;
    if (token) {
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.blob())
        .then((blob) => {
          const obj = URL.createObjectURL(blob);
          a.href = obj;
          a.download = templateFilename;
          a.click();
          URL.revokeObjectURL(obj);
        })
        .catch(() => toast.error('Could not download template'));
    } else {
      a.download = templateFilename;
      a.click();
    }
  };

  const handleUpload = async (file: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post<{
        jobId: string;
        headers: string[];
        suggestedMapping: Partial<MembershipImportColumnMapping>;
      }>(`${apiBase}/upload`, fd);
      setJobId(data.jobId);
      setHeaders(data.headers);
      setMapping({ ...suggestColumnMapping(data.headers), ...data.suggestedMapping });
      setStep('map');
      toast.success(`Uploaded ${data.headers.length ? 'file' : ''} — map columns next`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  };

  const runPreview = async () => {
    if (!jobId || !requiredMapped) {
      toast.error('Map first and last name columns');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<MembershipImportPreviewResponse>(`${apiBase}/preview`, {
        jobId,
        columnMapping: mapping,
        options,
      });
      setPreview(data);
      setStep('preview');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Preview failed'));
    } finally {
      setBusy(false);
    }
  };

  const runCommit = async () => {
    if (!jobId) return;
    setBusy(true);
    try {
      const { data } = await api.post<{ summary: Record<string, number> }>(`${apiBase}/commit`, {
        jobId,
      });
      setCommitSummary(data.summary);
      setStep('done');
      toast.success('Import committed');
      onComplete?.();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Commit failed'));
    } finally {
      setBusy(false);
    }
  };

  const downloadErrorReport = () => {
    if (!preview?.rows.length) return;
    const errorRows = preview.rows.filter((r) => r.action === 'ERROR' || r.error);
    const cols = ['rowIndex', 'action', 'error', ...headers];
    const lines = [
      cols.join(','),
      ...errorRows.map((r) =>
        cols
          .map((c) => {
            if (c === 'rowIndex') return String(r.rowIndex);
            if (c === 'action') return r.action ?? '';
            if (c === 'error') return `"${(r.error ?? '').replace(/"/g, '""')}"`;
            return `"${(r.raw[c] ?? '').replace(/"/g, '""')}"`;
          })
          .join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'import-errors.csv';
    a.click();
  };

  const previewSample = useMemo(
    () => preview?.rows.slice(0, 50) ?? [],
    [preview],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className={step === 'upload' ? 'font-medium text-foreground' : ''}>1. Upload</span>
        <span>→</span>
        <span className={step === 'map' ? 'font-medium text-foreground' : ''}>2. Map</span>
        <span>→</span>
        <span className={step === 'preview' ? 'font-medium text-foreground' : ''}>3. Preview</span>
        <span>→</span>
        <span className={step === 'done' ? 'font-medium text-foreground' : ''}>4. Done</span>
      </div>

      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export contacts from your previous system as CSV, or use our template. Supports members,
              households, attendance history, and class codes in one file.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="mr-1.5 h-4 w-4" />
                Download template
              </Button>
            </div>
            <label
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-10 transition-colors hover:bg-muted/40',
                busy && 'pointer-events-none opacity-60',
              )}
            >
              <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Choose CSV file (max 5MB)</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload(f);
                  e.target.value = '';
                }}
              />
            </label>
            {busy && <Loader2 className="mx-auto h-6 w-6 animate-spin" />}
          </CardContent>
        </Card>
      )}

      {step === 'map' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Map columns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Import mode</Label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={options.mode}
                  onChange={(e) =>
                    setOptions((o) => ({
                      ...o,
                      mode: e.target.value as MembershipImportOptions['mode'],
                    }))
                  }
                >
                  <option value="MEMBERS">Members (profiles)</option>
                  <option value="LEADS">Outreach leads only</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={options.updateExisting}
                  onChange={(e) => setOptions((o) => ({ ...o, updateExisting: e.target.checked }))}
                />
                Update existing (match email/phone)
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {MEMBERSHIP_IMPORT_FIELDS.map((field) => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {MEMBERSHIP_IMPORT_FIELD_LABELS[field]}
                    {(field === 'firstName' || field === 'lastName') && ' *'}
                  </Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={mapping[field] ?? ''}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        [field]: e.target.value || undefined,
                      }))
                    }
                  >
                    <option value="">— skip —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button type="button" disabled={busy || !requiredMapped} onClick={() => void runPreview()}>
                {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}
                Preview import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{preview.rowCounts.create} new</Badge>
              <Badge variant="default">{preview.rowCounts.update} update</Badge>
              <Badge variant="secondary">{preview.rowCounts.skip} skip</Badge>
              <Badge variant="outline">{preview.rowCounts.error} errors</Badge>
            </div>
            <div className="max-h-80 overflow-auto rounded-md border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-2 py-1">#</th>
                    <th className="px-2 py-1">Action</th>
                    <th className="px-2 py-1">Name</th>
                    <th className="px-2 py-1">Email</th>
                    <th className="px-2 py-1">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {previewSample.map((r) => (
                    <tr key={r.rowIndex} className="border-t">
                      <td className="px-2 py-1">{r.rowIndex + 1}</td>
                      <td className="px-2 py-1">
                        {r.action && (
                          <Badge variant={ACTION_VARIANT[r.action] ?? 'outline'} className="text-[10px]">
                            {r.action}
                          </Badge>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        {r.mapped.firstName} {r.mapped.lastName}
                      </td>
                      <td className="px-2 py-1">{r.mapped.email ?? '—'}</td>
                      <td className="px-2 py-1 text-muted-foreground">{r.error ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.rows.length > 50 && (
              <p className="text-xs text-muted-foreground">Showing first 50 of {preview.rows.length} rows.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('map')}>
                Back
              </Button>
              {preview.rowCounts.error > 0 && (
                <Button type="button" variant="outline" onClick={downloadErrorReport}>
                  Download error report
                </Button>
              )}
              <Button
                type="button"
                disabled={busy || preview.rowCounts.create + preview.rowCounts.update === 0}
                onClick={() => void runCommit()}
              >
                {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                Commit import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'done' && commitSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Created: {commitSummary.created ?? 0}</p>
            <p>Updated: {commitSummary.updated ?? 0}</p>
            <p>Skipped: {commitSummary.skipped ?? 0}</p>
            <p>Failed: {commitSummary.failed ?? 0}</p>
            {(commitSummary.familiesCreated ?? 0) > 0 && (
              <p>Families created: {commitSummary.familiesCreated}</p>
            )}
            {(commitSummary.attendanceRecorded ?? 0) > 0 && (
              <p>Attendance rows: {commitSummary.attendanceRecorded}</p>
            )}
            {(commitSummary.classesEnrolled ?? 0) > 0 && (
              <p>Class enrollments: {commitSummary.classesEnrolled}</p>
            )}
            {(commitSummary.followUpsCreated ?? 0) > 0 && (
              <p>Outreach leads: {commitSummary.followUpsCreated}</p>
            )}
            <Button
              type="button"
              className="mt-4"
              onClick={() => {
                setStep('upload');
                setJobId(null);
                setPreview(null);
                setCommitSummary(null);
              }}
            >
              Import another file
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
