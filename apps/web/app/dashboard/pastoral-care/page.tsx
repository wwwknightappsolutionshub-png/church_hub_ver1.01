'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Heart, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { isPastorRole } from '@/lib/session-role';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type Tab = 'cases' | 'prayer' | 'notes';

export default function PastoralCarePage() {
  const router = useRouter();
  const { userRoles, isLoading: accessLoading } = useModuleAccess();
  const isPastor = isPastorRole(userRoles);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('cases');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!accessLoading && !isPastor) {
      router.replace('/dashboard');
    }
  }, [accessLoading, isPastor, router]);

  const { data: stats } = useApiQuery<{ openCases: number; openPrayers: number; notesCount: number }>(
    ['pastoral-stats'],
    '/pastoral-care/stats',
  );

  const { data: cases, isLoading: casesLoading } = useApiQuery<
    Array<{
      id: string;
      title: string;
      category: string;
      status: string;
      member?: { firstName: string; lastName: string } | null;
      _count: { sessions: number };
    }>
  >(['pastoral-cases'], '/pastoral-care/cases', { enabled: tab === 'cases' });

  const { data: prayers, isLoading: prayersLoading } = useApiQuery<
    Array<{
      id: string;
      title: string;
      status: string;
      details: string;
      member?: { firstName: string; lastName: string } | null;
    }>
  >(['pastoral-prayers'], '/pastoral-care/prayer-requests', { enabled: tab === 'prayer' });

  const { data: notes, isLoading: notesLoading } = useApiQuery<
    Array<{
      id: string;
      content: string;
      createdAt: string;
      isConfidential: boolean;
      author: { firstName: string; lastName: string };
    }>
  >(['pastoral-notes-list'], '/pastoral-care/notes', { enabled: tab === 'notes' });

  const [caseForm, setCaseForm] = useState({ title: '', summary: '' });
  const [prayerForm, setPrayerForm] = useState({ title: '', details: '' });
  const [noteForm, setNoteForm] = useState({ content: '', memberId: '' });
  const [sessionCaseId, setSessionCaseId] = useState<string | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['pastoral-cases'] });
    queryClient.invalidateQueries({ queryKey: ['pastoral-prayers'] });
    queryClient.invalidateQueries({ queryKey: ['pastoral-stats'] });
    queryClient.invalidateQueries({ queryKey: ['pastoral-notes-list'] });
  };

  const createCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseForm.title.trim()) return;
    setBusy(true);
    try {
      await api.post('/pastoral-care/cases', caseForm);
      toast.success('Counseling case opened');
      setCaseForm({ title: '', summary: '' });
      refresh();
    } catch {
      toast.error('Could not create case');
    } finally {
      setBusy(false);
    }
  };

  const createPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerForm.title.trim() || !prayerForm.details.trim()) return;
    setBusy(true);
    try {
      await api.post('/pastoral-care/prayer-requests', prayerForm);
      toast.success('Prayer request logged');
      setPrayerForm({ title: '', details: '' });
      refresh();
    } catch {
      toast.error('Could not save prayer request');
    } finally {
      setBusy(false);
    }
  };

  const logSession = async (caseId: string) => {
    if (!sessionNotes.trim()) return;
    setBusy(true);
    try {
      await api.post(`/pastoral-care/cases/${caseId}/sessions`, { notes: sessionNotes });
      toast.success('Session logged');
      setSessionCaseId(null);
      setSessionNotes('');
      refresh();
    } catch {
      toast.error('Could not log session');
    } finally {
      setBusy(false);
    }
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.content.trim()) return;
    if (!noteForm.memberId.trim()) {
      toast.error('Member ID is required to link a pastoral note');
      return;
    }
    setBusy(true);
    try {
      await api.post('/pastoral-care/notes', {
        content: noteForm.content,
        memberId: noteForm.memberId,
        isConfidential: true,
      });
      toast.success('Pastoral note saved');
      setNoteForm({ content: '', memberId: '' });
    } catch {
      toast.error('Could not save note');
    } finally {
      setBusy(false);
    }
  };

  const markPraying = async (id: string) => {
    try {
      await api.patch(`/pastoral-care/prayer-requests/${id}`, { status: 'PRAYING' });
      refresh();
    } catch {
      toast.error('Update failed');
    }
  };

  const markAnswered = async (id: string) => {
    try {
      await api.patch(`/pastoral-care/prayer-requests/${id}`, { status: 'ANSWERED' });
      toast.success('Marked answered');
      refresh();
    } catch {
      toast.error('Update failed');
    }
  };

  if (accessLoading || !isPastor) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pastoralTabs = [
    { id: 'cases', label: 'Counseling' },
    { id: 'prayer', label: 'Prayer requests' },
    { id: 'notes', label: 'Pastoral notes' },
  ];

  return (
    <DashboardModuleShell
      title="Pastoral Care"
      description="Secure pastoral case management—counseling intake, prayer escalations, and confidential leadership notes."
      badge={
        stats ? (
          <Badge variant="outline" className="border-slate-500 text-slate-200">
            {stats.openCases} cases · {stats.openPrayers} prayers
          </Badge>
        ) : undefined
      }
      tabs={pastoralTabs}
      activeTab={tab}
      onTabChange={(id) => setTab(id as Tab)}
      tabAriaLabel="Pastoral care sections"
    >
      <div className="space-y-6">

        {tab === 'cases' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-4 w-4" />
                  New counseling case
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createCase} className="space-y-2">
                  <Input
                    placeholder="Case title"
                    value={caseForm.title}
                    onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })}
                    required
                  />
                  <Textarea
                    placeholder="Summary (optional)"
                    value={caseForm.summary}
                    onChange={(e) => setCaseForm({ ...caseForm, summary: e.target.value })}
                  />
                  <Button type="submit" disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Open case'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            {casesLoading ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            ) : (
              <div className="space-y-2">
                {cases?.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{c.title}</p>
                      <Badge>{c.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.category}
                      {c.member
                        ? ` · ${c.member.firstName} ${c.member.lastName}`
                        : ''}{' '}
                      · {c._count.sessions} session(s)
                    </p>
                    {sessionCaseId === c.id ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          placeholder="Session notes"
                          value={sessionNotes}
                          onChange={(e) => setSessionNotes(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" disabled={busy} onClick={() => logSession(c.id)}>
                            Save session
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSessionCaseId(null);
                              setSessionNotes('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => setSessionCaseId(c.id)}
                      >
                        Log session
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'prayer' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Heart className="h-4 w-4" />
                  Log prayer request
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createPrayer} className="space-y-2">
                  <Input
                    placeholder="Title"
                    value={prayerForm.title}
                    onChange={(e) => setPrayerForm({ ...prayerForm, title: e.target.value })}
                    required
                  />
                  <Textarea
                    placeholder="Details"
                    value={prayerForm.details}
                    onChange={(e) => setPrayerForm({ ...prayerForm, details: e.target.value })}
                    required
                  />
                  <Button type="submit" disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            {prayersLoading ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            ) : (
              <div className="space-y-2">
                {prayers?.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{p.title}</p>
                      <Badge>{p.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.details}</p>
                    <div className="mt-2 flex gap-2">
                      {p.status === 'OPEN' && (
                        <Button size="sm" variant="outline" onClick={() => markPraying(p.id)}>
                          Start praying
                        </Button>
                      )}
                      {p.status !== 'ANSWERED' && (
                        <Button size="sm" onClick={() => markAnswered(p.id)}>
                          Answered
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Confidential pastoral note</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={addNote} className="space-y-2">
                  <Input
                    placeholder="Member ID (required)"
                    value={noteForm.memberId}
                    onChange={(e) => setNoteForm({ ...noteForm, memberId: e.target.value })}
                    required
                  />
                  <Textarea
                    placeholder="Note content"
                    value={noteForm.content}
                    onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                    required
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Visible to ADMIN, PASTOR, and LEADER only. Marked confidential by default.
                  </p>
                  <Button type="submit" disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save note'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            {notesLoading ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            ) : (
              <div className="space-y-2">
                {notes?.map((n) => (
                  <div key={n.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm">{n.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {n.author.firstName} {n.author.lastName} ·{' '}
                      {new Date(n.createdAt).toLocaleDateString()}
                      {n.isConfidential ? ' · Confidential' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardModuleShell>
  );
}
