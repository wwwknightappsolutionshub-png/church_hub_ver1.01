'use client';

import { useMemo, useState } from 'react';
import {
  OUTREACH_IMPORT_FIELDS,
  OUTREACH_IMPORT_FIELD_LABELS,
  suggestOutreachColumnMapping,
  type OutreachImportColumnMapping,
  type OutreachImportOptions,
  type OutreachImportPreviewResponse,
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
const API_BASE = '/outreach/import';

type Step = 'upload' | 'map' | 'preview' | 'done';

export function OutreachImportWizard({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState<Step>('upload');
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<OutreachImportColumnMapping>>({});
  const [options, setOptions] = useState<OutreachImportOptions>({
    skipDuplicatesInFile: true,
    skipExistingPhone: true,
  });
  const [preview, setPreview] = useState<OutreachImportPreviewResponse | null>(null);
  const [commitSummary, setCommitSummary] = useState<Record<string, number> | null>(null);

  const requiredMapped = Boolean(mapping.firstName && mapping.phone);

  const downloadTemplate = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const url = `${API_URL}/api/v1${API_BASE}/template.csv`;
    const a = document.createElement('a');
    a.download = 'churchhub-outreach-import-template.csv';
    if (token) {
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.blob())
        .then((blob) => {
          const obj = URL.createObjectURL(blob);
          a.href = obj;
          a.click();
          URL.revokeObjectURL(obj);
        })
        .catch(() => toast.error('Could not download template'));
    } else {
      a.href = url;
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
        suggestedMapping: Partial<OutreachImportColumnMapping>;
      }>(`${API_BASE}/upload`, fd);
      setJobId(data.jobId);
      setHeaders(data.headers);
      setMapping({ ...suggestOutreachColumnMapping(data.headers), ...data.suggestedMapping });
      setStep('map');
      toast.success('Uploaded — map columns next');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  };

  const runPreview = async () => {
    if (!jobId || !requiredMapped) {
      toast.error('Map first name and phone columns');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<OutreachImportPreviewResponse>(`${API_BASE}/preview`, {
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
      const { data } = await api.post<{ summary: Record<string, number> }>(`${API_BASE}/commit`, {
        jobId,
      });
      setCommitSummary(data.summary);
      setStep('done');
      toast.success('Outreach contacts imported');
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
    a.download = 'outreach-import-errors.csv';
    a.click();
  };

  const previewSample = useMemo(() => preview?.rows.slice(0, 50) ?? [], [preview]);

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
            <CardTitle className="text-base">Upload outreach CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import new contacts with the same fields as the capture form — including phone, minister
              (referred by), notes/comments, and address details.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-1.5 h-4 w-4" />
              Download template
            </Button>
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={options.skipDuplicatesInFile}
                onChange={(e) =>
                  setOptions((o) => ({ ...o, skipDuplicatesInFile: e.target.checked }))
                }
              />
              Skip duplicate phones within this file
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={options.skipExistingPhone}
                onChange={(e) =>
                  setOptions((o) => ({ ...o, skipExistingPhone: e.target.checked }))
                }
              />
              Skip phones that already exist in outreach
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {OUTREACH_IMPORT_FIELDS.map((field) => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {OUTREACH_IMPORT_FIELD_LABELS[field]}
                    {(field === 'firstName' || field === 'phone') && ' *'}
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
                    <th className="px-2 py-1">Phone</th>
                    <th className="px-2 py-1">Minister</th>
                    <th className="px-2 py-1">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {previewSample.map((r) => (
                    <tr key={r.rowIndex} className="border-t">
                      <td className="px-2 py-1">{r.rowIndex + 1}</td>
                      <td className="px-2 py-1">
                        <Badge variant={r.action === 'CREATE' ? 'success' : 'outline'}>
                          {r.action ?? '—'}
                        </Badge>
                      </td>
                      <td className="px-2 py-1">
                        {r.mapped.firstName} {r.mapped.lastName}
                      </td>
                      <td className="px-2 py-1">{r.mapped.phone}</td>
                      <td className="px-2 py-1">{r.mapped.referredBy}</td>
                      <td className="max-w-[12rem] truncate px-2 py-1 text-muted-foreground">
                        {r.error ?? r.mapped.notes ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('map')}>
                Back
              </Button>
              {preview.rowCounts.error > 0 && (
                <Button type="button" variant="outline" onClick={downloadErrorReport}>
                  Download errors
                </Button>
              )}
              <Button
                type="button"
                disabled={busy || preview.rowCounts.create === 0}
                onClick={() => void runCommit()}
              >
                {busy ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1 h-4 w-4" />
                )}
                Import {preview.rowCounts.create} contact(s)
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
          <CardContent className="space-y-3 text-sm">
            <p>
              Created <strong>{commitSummary.created ?? 0}</strong>, skipped{' '}
              <strong>{commitSummary.skipped ?? 0}</strong>, failed{' '}
              <strong>{commitSummary.failed ?? 0}</strong>.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep('upload');
                setJobId(null);
                setPreview(null);
                setCommitSummary(null);
                setMapping({});
                setHeaders([]);
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
