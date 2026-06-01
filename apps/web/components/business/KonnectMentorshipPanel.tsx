'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Handshake, Loader2, Plus, Sparkles, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { isChurchLeadershipRole } from '@/lib/session-role';
import { MENTORSHIP_FOCUS, MENTORSHIP_STATUS } from '@/lib/konnect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PublicMentor {
  id: string;
  specialty: string;
  missionStatement: string;
  createdAt: string;
}

interface MenteeRequestRow {
  id: string;
  requestedMentorType: string;
  goals: string;
  memberLabel: string;
  createdAt: string;
}

interface MentorApplication {
  id: string;
  specialty: string;
  missionStatement: string;
  status: string;
  createdAt: string;
  member: { firstName: string; lastName: string; email?: string | null };
}

interface MentorshipLink {
  id: string;
  focusArea?: string | null;
  goals?: string | null;
  status: string;
  mentor: { firstName: string; lastName: string };
  mentee: { firstName: string; lastName: string };
}

interface KonnectMember {
  id: string;
  firstName: string;
  lastName: string;
}

export function KonnectMentorshipPanel() {
  const queryClient = useQueryClient();
  const { userRoles } = useModuleAccess();
  const isAdmin = isChurchLeadershipRole(userRoles);

  const mentors = useApiQuery<PublicMentor[]>(['konnect-public-mentors'], '/business/mentors');
  const menteeRequests = useApiQuery<MenteeRequestRow[]>(
    ['konnect-mentee-requests'],
    '/business/mentee-requests',
  );
  const applications = useApiQuery<MentorApplication[]>(
    ['konnect-mentor-apps'],
    '/business/mentor-applications?status=PENDING',
    { enabled: isAdmin },
  );
  const links = useApiQuery<MentorshipLink[]>(['konnect-mentorships'], '/business/mentorships');
  const members = useApiQuery<KonnectMember[]>(['konnect-members'], '/business/members', {
    enabled: isAdmin,
  });

  const [showMentorForm, setShowMentorForm] = useState(false);
  const [showMenteeForm, setShowMenteeForm] = useState(false);
  const [showAdminMentor, setShowAdminMentor] = useState(false);
  const [busy, setBusy] = useState(false);

  const [mentorApply, setMentorApply] = useState<{
    specialty: string;
    missionStatement: string;
    yearsExperience: string;
    availability: string;
    whyMentor: string;
    background: string;
  }>({
    specialty: MENTORSHIP_FOCUS[0],
    missionStatement: '',
    yearsExperience: '',
    availability: '',
    whyMentor: '',
    background: '',
  });

  const [menteePost, setMenteePost] = useState<{
    requestedMentorType: string;
    goals: string;
  }>({
    requestedMentorType: MENTORSHIP_FOCUS[0],
    goals: '',
  });

  const [adminMentor, setAdminMentor] = useState<{
    memberId: string;
    specialty: string;
    missionStatement: string;
  }>({
    memberId: '',
    specialty: MENTORSHIP_FOCUS[0],
    missionStatement: '',
  });

  const [connectGoals, setConnectGoals] = useState<Record<string, string>>({});
  const [mentorSuccess, setMentorSuccess] = useState(false);
  const [menteeSuccess, setMenteeSuccess] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['konnect-public-mentors'] });
    queryClient.invalidateQueries({ queryKey: ['konnect-mentee-requests'] });
    queryClient.invalidateQueries({ queryKey: ['konnect-mentor-apps'] });
    queryClient.invalidateQueries({ queryKey: ['konnect-mentorships'] });
  };

  const submitMentorApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const mission = mentorApply.missionStatement.trim();
    if (mission.length < 10) {
      const msg = 'Mission statement must be at least 10 characters.';
      setBanner({ type: 'error', text: msg });
      toast.error(msg, { id: 'mentor-apply' });
      return;
    }
    setBusy(true);
    setMentorSuccess(false);
    setBanner(null);
    const loadingId = toast.loading('Saving your mentor application…', { id: 'mentor-apply' });
    try {
      const { data } = await api.post<{ id: string }>('/business/mentor-applications', {
        specialty: mentorApply.specialty,
        missionStatement: mission,
        ...(mentorApply.yearsExperience.trim()
          ? { yearsExperience: mentorApply.yearsExperience.trim() }
          : {}),
        ...(mentorApply.availability.trim()
          ? { availability: mentorApply.availability.trim() }
          : {}),
        ...(mentorApply.whyMentor.trim() ? { whyMentor: mentorApply.whyMentor.trim() } : {}),
        ...(mentorApply.background.trim() ? { background: mentorApply.background.trim() } : {}),
      });
      const ref = data?.id?.slice(0, 8) ?? 'saved';
      const okMsg = `Application saved successfully (ref ${ref}). Admin and pastor have been notified.`;
      setMentorSuccess(true);
      setBanner({ type: 'success', text: okMsg });
      toast.success('Application submitted successfully', { id: loadingId, duration: 8000 });
      setMentorApply({
        specialty: MENTORSHIP_FOCUS[0],
        missionStatement: '',
        yearsExperience: '',
        availability: '',
        whyMentor: '',
        background: '',
      });
      invalidate();
      window.setTimeout(() => {
        setShowMentorForm(false);
        setMentorSuccess(false);
      }, 3500);
    } catch (err) {
      const msg = apiErrorMessage(err, 'Could not submit application');
      setBanner({ type: 'error', text: msg });
      toast.error(msg, { id: loadingId, duration: 8000 });
    } finally {
      setBusy(false);
    }
  };

  const submitMenteeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const goals = menteePost.goals.trim();
    if (goals.length < 10) {
      const msg = 'Please describe your goals (at least 10 characters).';
      setBanner({ type: 'error', text: msg });
      toast.error(msg, { id: 'mentee-request' });
      return;
    }
    setBusy(true);
    setMenteeSuccess(false);
    setBanner(null);
    const loadingId = toast.loading('Posting your mentor request…', { id: 'mentee-request' });
    try {
      const { data } = await api.post<{ id: string }>('/business/mentee-requests', {
        requestedMentorType: menteePost.requestedMentorType,
        goals,
      });
      const ref = data?.id?.slice(0, 8) ?? 'saved';
      const okMsg = `Your mentor request was saved (ref ${ref}). It is now visible to members with your name hidden.`;
      setMenteeSuccess(true);
      setBanner({ type: 'success', text: okMsg });
      toast.success('Request posted successfully', { id: loadingId, duration: 8000 });
      setMenteePost({ requestedMentorType: MENTORSHIP_FOCUS[0], goals: '' });
      setShowMenteeForm(false);
      invalidate();
      window.setTimeout(() => setMenteeSuccess(false), 8000);
    } catch (err) {
      const msg = apiErrorMessage(err, 'Could not post request');
      setBanner({ type: 'error', text: msg });
      toast.error(msg, { id: loadingId, duration: 8000 });
    } finally {
      setBusy(false);
    }
  };

  const connectToMentor = async (mentorId: string) => {
    setBusy(true);
    try {
      await api.post(`/business/mentors/${mentorId}/connect`, {
        goals: connectGoals[mentorId]?.trim() || undefined,
      });
      toast.success('Connection request sent');
      invalidate();
    } catch {
      toast.error('Could not request connection');
    } finally {
      setBusy(false);
    }
  };

  const approveApplication = async (id: string) => {
    try {
      await api.patch(`/business/mentor-applications/${id}/approve`);
      toast.success('Mentor approved — listed anonymously');
      invalidate();
    } catch {
      toast.error('Approve failed');
    }
  };

  const createAdminMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMentor.memberId) return;
    setBusy(true);
    try {
      await api.post('/business/mentors', adminMentor);
      toast.success('Mentor profile created');
      setShowAdminMentor(false);
      invalidate();
    } catch {
      toast.error('Could not create mentor');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {banner && (
        <div
          role="alert"
          className={cn(
            'rounded-lg border px-4 py-3 text-sm font-medium',
            banner.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100'
              : 'border-red-300 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-100',
          )}
        >
          {banner.text}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/40">
        <p className="text-base font-bold text-slate-900 dark:text-slate-100">
          Interested in becoming a mentor? Submit your application — our team will review it.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Approved mentors are shown anonymously (specialty & mission only). Admin and pastor receive email and
          in-app alerts.
        </p>
        <Button className="mt-3" size="sm" onClick={() => setShowMentorForm(true)}>
          <Sparkles className="mr-1.5 h-4 w-4" />
          Apply to be a mentor
        </Button>
      </div>

      {showMentorForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => {
              setShowMentorForm(false);
              setMentorSuccess(false);
            }}
          />
          <Card
            className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto border-slate-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-lg">Mentor questionnaire</CardTitle>
            </CardHeader>
            <CardContent>
              {mentorSuccess && (
                <div
                  role="status"
                  className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                >
                  Application submitted successfully. Thank you — we will review and respond soon.
                </div>
              )}
              <form noValidate onSubmit={submitMentorApplication} className="space-y-3">
                <select
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={mentorApply.specialty}
                  onChange={(e) => setMentorApply({ ...mentorApply, specialty: e.target.value })}
                >
                  {MENTORSHIP_FOCUS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <textarea
                  className="min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Mission statement — how you will serve mentees (min. 10 characters)"
                  value={mentorApply.missionStatement}
                  onChange={(e) => setMentorApply({ ...mentorApply, missionStatement: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {mentorApply.missionStatement.trim().length}/10 characters minimum
                </p>
                <Input
                  placeholder="Years of experience"
                  value={mentorApply.yearsExperience}
                  onChange={(e) => setMentorApply({ ...mentorApply, yearsExperience: e.target.value })}
                />
                <Input
                  placeholder="Availability (e.g. evenings, monthly)"
                  value={mentorApply.availability}
                  onChange={(e) => setMentorApply({ ...mentorApply, availability: e.target.value })}
                />
                <textarea
                  className="min-h-[60px] w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Why do you want to mentor?"
                  value={mentorApply.whyMentor}
                  onChange={(e) => setMentorApply({ ...mentorApply, whyMentor: e.target.value })}
                />
                <textarea
                  className="min-h-[60px] w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Background & relevant experience"
                  value={mentorApply.background}
                  onChange={(e) => setMentorApply({ ...mentorApply, background: e.target.value })}
                />
                <Button type="submit" className="w-full" disabled={busy || mentorSuccess}>
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mentorSuccess ? (
                    'Submitted'
                  ) : (
                    'Submit to admin & pastor'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading text-lg font-semibold">Available mentors</h3>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setShowAdminMentor((v) => !v)}>
              <Plus className="mr-1 h-4 w-4" />
              Admin: add mentor
            </Button>
          )}
        </div>
        {showAdminMentor && isAdmin && (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={createAdminMentor} className="grid gap-3 sm:grid-cols-2">
                <select
                  className="h-10 rounded-md border px-3 text-sm sm:col-span-2"
                  value={adminMentor.memberId}
                  onChange={(e) => setAdminMentor({ ...adminMentor, memberId: e.target.value })}
                  required
                >
                  <option value="">Select member…</option>
                  {(members.data ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border px-3 text-sm"
                  value={adminMentor.specialty}
                  onChange={(e) => setAdminMentor({ ...adminMentor, specialty: e.target.value })}
                >
                  {MENTORSHIP_FOCUS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Mission statement"
                  value={adminMentor.missionStatement}
                  onChange={(e) => setAdminMentor({ ...adminMentor, missionStatement: e.target.value })}
                  required
                />
                <Button type="submit" disabled={busy} className="sm:col-span-2">
                  Create mentor profile
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        {mentors.isLoading ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(mentors.data ?? []).map((m) => (
              <Card key={m.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Anonymous mentor</CardTitle>
                  <Badge variant="secondary">{m.specialty}</Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>{m.missionStatement}</p>
                  <Input
                    placeholder="Optional note for your request"
                    value={connectGoals[m.id] ?? ''}
                    onChange={(e) => setConnectGoals({ ...connectGoals, [m.id]: e.target.value })}
                  />
                  <Button size="sm" disabled={busy} onClick={() => connectToMentor(m.id)}>
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Request connection
                  </Button>
                </CardContent>
              </Card>
            ))}
            {!mentors.data?.length && (
              <p className="text-sm text-muted-foreground md:col-span-2">
                No approved mentors yet. Apply above or check back soon.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading text-lg font-semibold">Members seeking mentors</h3>
          <Button size="sm" variant="outline" onClick={() => setShowMenteeForm(true)}>
            Post what you need
          </Button>
        </div>
        {showMenteeForm && (
          <Card className="border-slate-200">
            <CardContent className="pt-6">
              {menteeSuccess && (
                <div
                  role="status"
                  className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
                >
                  Your request was saved and is now visible to the community (name hidden).
                </div>
              )}
              <form noValidate onSubmit={submitMenteeRequest} className="space-y-3">
                <select
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={menteePost.requestedMentorType}
                  onChange={(e) => setMenteePost({ ...menteePost, requestedMentorType: e.target.value })}
                >
                  {MENTORSHIP_FOCUS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <textarea
                  className="min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Your goals — what you hope to achieve (min. 10 characters)"
                  value={menteePost.goals}
                  onChange={(e) => setMenteePost({ ...menteePost, goals: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {menteePost.goals.trim().length}/10 characters minimum
                </p>
                <p className="text-xs text-muted-foreground">
                  Your name will appear masked (e.g. J*** S***) to other members.
                </p>
                <Button type="submit" disabled={busy || menteeSuccess}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : menteeSuccess ? 'Posted' : 'Post request'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {(menteeRequests.data ?? []).map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-2 pt-6 text-sm">
                <p className="font-medium">{r.memberLabel}</p>
                <Badge variant="outline">{r.requestedMentorType}</Badge>
                <p className="text-muted-foreground">{r.goals}</p>
              </CardContent>
            </Card>
          ))}
          {!menteeRequests.data?.length && (
            <p className="text-sm text-muted-foreground">No open mentee requests yet.</p>
          )}
        </div>
      </section>

      {isAdmin && (applications.data?.length ?? 0) > 0 && (
        <section className="space-y-3 rounded-lg border border-amber-200/60 bg-amber-50/30 p-4 dark:bg-amber-950/20">
          <h3 className="font-heading text-base font-semibold">Pending mentor applications (admin)</h3>
          {applications.data?.map((app) => (
            <Card key={app.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-4 text-sm">
                <div>
                  <p className="font-medium">
                    {app.member.firstName} {app.member.lastName} · {app.specialty}
                  </p>
                  <p className="text-muted-foreground">{app.missionStatement}</p>
                </div>
                <Button size="sm" onClick={() => approveApplication(app.id)}>
                  Approve (anonymous listing)
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <section className="space-y-4">
        <h3 className="font-heading text-lg font-semibold">Active mentorship links</h3>
        {links.isLoading ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(links.data ?? []).map((link) => (
              <Card key={link.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Handshake className="h-4 w-4 text-violet-600" />
                    {isAdmin ? `${link.mentor.firstName} → ${link.mentee.firstName}` : 'Mentorship'}
                  </CardTitle>
                  <Badge variant="outline">{MENTORSHIP_STATUS[link.status] ?? link.status}</Badge>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {link.focusArea && <p>{link.focusArea}</p>}
                  {link.goals && <p>{link.goals}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
