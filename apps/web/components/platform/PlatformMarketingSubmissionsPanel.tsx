'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type SubmissionRow = {
  id: string;
  type: 'CONTACT' | 'FEEDBACK';
  status: 'NEW' | 'READ' | 'ARCHIVED';
  name: string;
  email: string;
  organization: string | null;
  subject: string | null;
  message: string;
  rating: number | null;
  internalNotes: string | null;
  createdAt: string;
  handledAt: string | null;
  handledBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

const TYPE_LABEL = { CONTACT: 'Contact', FEEDBACK: 'Feedback' } as const;
const STATUS_LABEL = { NEW: 'New', READ: 'Read', ARCHIVED: 'Archived' } as const;

export function PlatformMarketingSubmissionsPanel({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  const queryPath = useMemo(() => {
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    const qs = params.toString();
    return `/platform/marketing/submissions${qs ? `?${qs}` : ''}`;
  }, [typeFilter, statusFilter]);

  const { data: rows = [], isLoading } = useApiQuery<SubmissionRow[]>(
    ['platform-marketing-submissions', typeFilter, statusFilter],
    queryPath,
  );

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      status?: SubmissionRow['status'];
      internalNotes?: string | null;
    }) => {
      const { data } = await api.patch(`/platform/marketing/submissions/${payload.id}`, {
        status: payload.status,
        internalNotes: payload.internalNotes,
      });
      return data as SubmissionRow;
    },
    onSuccess: (data) => {
      toast.success('Submission updated');
      setNotesDraft(data.internalNotes ?? '');
      qc.invalidateQueries({ queryKey: ['platform-marketing-submissions'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not update submission')),
  });

  const openRow = (row: SubmissionRow) => {
    setSelectedId(row.id);
    setNotesDraft(row.internalNotes ?? '');
    if (canWrite && row.status === 'NEW') {
      updateMutation.mutate({ id: row.id, status: 'READ' });
    }
  };

  const newCount = rows.filter((r) => r.status === 'NEW').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          <option value="CONTACT">Contact</option>
          <option value="FEEDBACK">Feedback</option>
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="READ">Read</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <Badge variant="outline">{rows.length} submissions</Badge>
        {newCount > 0 ? <Badge>{newCount} new</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inbox</CardTitle>
            <CardDescription>Public contact & feedback from church-hub.online</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[560px] space-y-1 overflow-y-auto p-2">
            {isLoading ? (
              <p className="px-2 py-4 text-sm text-muted-foreground">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="px-2 py-4 text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openRow(row)}
                  className={`flex w-full flex-col rounded-lg border px-3 py-2 text-left text-sm transition hover:bg-muted ${
                    selected?.id === row.id
                      ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20'
                      : 'border-transparent'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{row.name}</span>
                    {row.status === 'NEW' ? <Badge className="text-[10px]">New</Badge> : null}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {TYPE_LABEL[row.type]} · {new Date(row.createdAt).toLocaleString()}
                  </span>
                  <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {row.subject ?? row.message}
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          {selected ? (
            <>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{selected.name}</CardTitle>
                  <Badge variant="outline">{TYPE_LABEL[selected.type]}</Badge>
                  <Badge variant="secondary">{STATUS_LABEL[selected.status]}</Badge>
                </div>
                <CardDescription>
                  {selected.email}
                  {selected.organization ? ` · ${selected.organization}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selected.subject ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Subject
                    </p>
                    <p className="text-sm">{selected.subject}</p>
                  </div>
                ) : null}
                {selected.rating != null ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Rating
                    </p>
                    <p className="text-sm">{selected.rating}/5</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Message
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{selected.message}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="internal-notes">Internal notes</Label>
                  <Textarea
                    id="internal-notes"
                    rows={3}
                    value={notesDraft}
                    disabled={!canWrite}
                    onChange={(e) => setNotesDraft(e.target.value)}
                  />
                </div>
                {canWrite ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({
                          id: selected.id,
                          internalNotes: notesDraft,
                        })
                      }
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Save notes
                    </Button>
                    {selected.status !== 'ARCHIVED' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={updateMutation.isPending}
                        onClick={() =>
                          updateMutation.mutate({
                            id: selected.id,
                            status: 'ARCHIVED',
                            internalNotes: notesDraft,
                          })
                        }
                      >
                        Archive
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={updateMutation.isPending}
                        onClick={() =>
                          updateMutation.mutate({
                            id: selected.id,
                            status: 'NEW',
                            internalNotes: notesDraft,
                          })
                        }
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                ) : null}
                {selected.handledBy ? (
                  <p className="text-xs text-muted-foreground">
                    Handled by {selected.handledBy.firstName} {selected.handledBy.lastName}
                    {selected.handledAt
                      ? ` · ${new Date(selected.handledAt).toLocaleString()}`
                      : ''}
                  </p>
                ) : null}
              </CardContent>
            </>
          ) : (
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Select a submission to view details.
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
