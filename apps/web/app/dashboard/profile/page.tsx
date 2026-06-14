'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Briefcase, Loader2, Mail, User } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/app/UserAvatar';
import { ModuleGate } from '@/components/app/ModuleGate';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import {
  EnterpriseContent,
  EnterpriseHero,
  EnterpriseShell,
  EnterpriseTabNav,
} from '@/components/layout/EnterpriseModuleShell';

type Tab = 'details' | 'units' | 'business' | 'community-support' | 'messages';

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  roles: string[];
  serviceUnitMemberships: Array<{ serviceUnit: { id: string; name: string } }>;
  serviceUnitLeaderships: Array<{ serviceUnit: { name: string }; role: string; isUnitAdmin: boolean }>;
  businessProfile?: {
    businessName: string;
    tagline?: string | null;
    description?: string | null;
    category?: string | null;
  } | null;
}

interface Message {
  id: string;
  subject?: string | null;
  body: string;
  readAt?: string | null;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string };
  recipient: { id: string; firstName: string; lastName: string };
}

function ProfilePageContent() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('details');
  const [busy, setBusy] = useState(false);
  const { data: profile, isLoading } = useApiQuery<Profile>(['profile-me'], '/member-profile/me');
  const { data: messages } = useApiQuery<Message[]>(
    ['profile-messages'],
    '/member-profile/messages/inbox',
    { enabled: tab === 'messages' },
  );
  const { data: recipients } = useApiQuery<{
    pastors: Array<{ id: string; firstName: string; lastName: string; email: string }>;
    unitAdmins: Array<{ id: string; firstName: string; lastName: string; email: string }>;
  }>(['profile-recipients', profile?.id ?? ''], `/member-profile/${profile?.id}/message-recipients`, {
    enabled: !!profile?.id && tab === 'messages',
  });

  const [details, setDetails] = useState<Partial<Profile>>({});
  const [business, setBusiness] = useState({ businessName: '', tagline: '', description: '' });
  const [msgForm, setMsgForm] = useState({ recipientId: '', subject: '', body: '' });
  const [supportForm, setSupportForm] = useState({
    requestType: 'JOB_SEARCH' as 'JOB_SEARCH' | 'BUSINESS_SEARCH',
    title: '',
    description: '',
    location: '',
    contactEmail: '',
    contactPhone: '',
    skills: '',
  });
  const { data: mySupportRequests, refetch: refetchSupport } = useApiQuery<
    Array<{ id: string; title: string; status: string; createdAt: string }>
  >(['community-support-mine'], '/community-support/mine', { enabled: tab === 'community-support' });

  if (isLoading || !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const saveDetails = async () => {
    setBusy(true);
    try {
      await api.patch(`/member-profile/${profile.id}`, {
        firstName: details.firstName ?? profile.firstName,
        lastName: details.lastName ?? profile.lastName,
        email: details.email ?? profile.email,
        phone: details.phone ?? profile.phone,
        bio: details.bio ?? profile.bio,
        address: details.address ?? profile.address,
        city: details.city ?? profile.city,
        avatarUrl: details.avatarUrl ?? profile.avatarUrl ?? null,
      });
      toast.success('Profile saved');
      queryClient.invalidateQueries({ queryKey: ['profile-me'] });
    } catch {
      toast.error('Could not save profile');
    } finally {
      setBusy(false);
    }
  };

  const saveBusiness = async () => {
    if (!business.businessName.trim()) return;
    setBusy(true);
    try {
      await api.patch(`/member-profile/${profile.id}/business`, business);
      toast.success('Business profile saved');
      queryClient.invalidateQueries({ queryKey: ['profile-me'] });
    } catch {
      toast.error('Could not save business info');
    } finally {
      setBusy(false);
    }
  };

  const submitCommunitySupport = async () => {
    if (!supportForm.title.trim() || !supportForm.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    setBusy(true);
    try {
      await api.post('/community-support', {
        requestType: supportForm.requestType,
        title: supportForm.title.trim(),
        description: supportForm.description.trim(),
        location: supportForm.location || undefined,
        contactEmail: supportForm.contactEmail || undefined,
        contactPhone: supportForm.contactPhone || undefined,
        skills: supportForm.skills || undefined,
      });
      toast.success('Submitted for approval — admin and pastor were notified');
      setSupportForm({
        requestType: 'JOB_SEARCH',
        title: '',
        description: '',
        location: '',
        contactEmail: '',
        contactPhone: '',
        skills: '',
      });
      refetchSupport();
    } catch {
      toast.error('Could not submit request');
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async () => {
    if (!msgForm.recipientId || !msgForm.body.trim()) return;
    setBusy(true);
    try {
      await api.post('/member-profile/messages', msgForm);
      toast.success('Message sent');
      setMsgForm({ recipientId: '', subject: '', body: '' });
      queryClient.invalidateQueries({ queryKey: ['profile-messages'] });
    } catch {
      toast.error('Could not send message');
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'units', label: 'Service units' },
    { id: 'business', label: 'Business' },
    { id: 'community-support', label: 'Community support' },
    { id: 'messages', label: 'Messages' },
  ];

  return (
    <EnterpriseShell>
      <EnterpriseHero
        eyebrow="Member profile"
        title={`${profile.firstName} ${profile.lastName}`}
        description={MODULE_DESCRIPTIONS.profile}
        badge={
          <UserAvatar
            user={{
              firstName: profile.firstName,
              lastName: profile.lastName,
              avatarUrl: profile.avatarUrl,
            }}
            className="h-16 w-16 border-2 border-slate-600"
            fallbackClassName="text-lg"
          />
        }
        actions={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/dashboard/settings">Account settings</Link>
          </Button>
        }
      />
      <EnterpriseTabNav
        tabs={tabs.map((t) => ({ id: t.id, label: t.label }))}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
        ariaLabel="Profile sections"
      />
      <EnterpriseContent className="!border-0 !bg-transparent !p-0 !shadow-none">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-card">

      {tab === 'details' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Personal details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="First name"
              defaultValue={profile.firstName}
              onChange={(e) => setDetails({ ...details, firstName: e.target.value })}
            />
            <Input
              placeholder="Last name"
              defaultValue={profile.lastName}
              onChange={(e) => setDetails({ ...details, lastName: e.target.value })}
            />
            <Input
              placeholder="Email"
              defaultValue={profile.email ?? ''}
              onChange={(e) => setDetails({ ...details, email: e.target.value })}
            />
            <Input
              placeholder="Phone"
              defaultValue={profile.phone ?? ''}
              onChange={(e) => setDetails({ ...details, phone: e.target.value })}
            />
            <Input
              className="md:col-span-2"
              placeholder="Profile image URL"
              defaultValue={profile.avatarUrl ?? ''}
              onChange={(e) => setDetails({ ...details, avatarUrl: e.target.value })}
            />
            <textarea
              className="md:col-span-2 min-h-[88px] w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Professional / personal bio"
              defaultValue={profile.bio ?? ''}
              onChange={(e) => setDetails({ ...details, bio: e.target.value })}
            />
            <Button onClick={saveDetails} disabled={busy} className="md:col-span-2 w-fit">
              Save details
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === 'units' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service units</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.serviceUnitMemberships.map((m) => (
              <div key={m.serviceUnit.id} className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">{m.serviceUnit.name}</span>
                <Badge variant="outline">Member</Badge>
              </div>
            ))}
            {profile.serviceUnitLeaderships.map((l) => (
              <div key={l.serviceUnit.name} className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">{l.serviceUnit.name}</span>
                <Badge variant="gold">{l.isUnitAdmin ? 'Unit admin' : l.role}</Badge>
              </div>
            ))}
            {profile.serviceUnitMemberships.length === 0 &&
              profile.serviceUnitLeaderships.length === 0 && (
                <p className="text-sm text-muted-foreground">Not in any service units yet.</p>
              )}
          </CardContent>
        </Card>
      )}

      {tab === 'business' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business / professional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Business name"
              defaultValue={profile.businessProfile?.businessName ?? ''}
              onChange={(e) => setBusiness({ ...business, businessName: e.target.value })}
            />
            <Input
              placeholder="Tagline"
              defaultValue={profile.businessProfile?.tagline ?? ''}
              onChange={(e) => setBusiness({ ...business, tagline: e.target.value })}
            />
            <textarea
              className="min-h-[88px] w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Description of services"
              defaultValue={profile.businessProfile?.description ?? ''}
              onChange={(e) => setBusiness({ ...business, description: e.target.value })}
            />
            <Button onClick={saveBusiness} disabled={busy}>
              Save business profile
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === 'community-support' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" />
                Job / business search request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Submit a request for the church community. After admin and pastor approval, it appears
                anonymously on the landing page and Kingdom Konnect Job Board.
              </p>
              <select
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={supportForm.requestType}
                onChange={(e) =>
                  setSupportForm({
                    ...supportForm,
                    requestType: e.target.value as 'JOB_SEARCH' | 'BUSINESS_SEARCH',
                  })
                }
              >
                <option value="JOB_SEARCH">Job search</option>
                <option value="BUSINESS_SEARCH">Business search / opportunity</option>
              </select>
              <Input
                placeholder="Title *"
                value={supportForm.title}
                onChange={(e) => setSupportForm({ ...supportForm, title: e.target.value })}
              />
              <textarea
                className="min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Describe what you are looking for *"
                value={supportForm.description}
                onChange={(e) => setSupportForm({ ...supportForm, description: e.target.value })}
              />
              <Input
                placeholder="Location (optional)"
                value={supportForm.location}
                onChange={(e) => setSupportForm({ ...supportForm, location: e.target.value })}
              />
              <Input
                placeholder="Skills or needs (optional)"
                value={supportForm.skills}
                onChange={(e) => setSupportForm({ ...supportForm, skills: e.target.value })}
              />
              <Input
                placeholder="Contact email (for staff only)"
                value={supportForm.contactEmail}
                onChange={(e) => setSupportForm({ ...supportForm, contactEmail: e.target.value })}
              />
              <Input
                placeholder="Contact phone (for staff only)"
                value={supportForm.contactPhone}
                onChange={(e) => setSupportForm({ ...supportForm, contactPhone: e.target.value })}
              />
              <Button onClick={submitCommunitySupport} disabled={busy}>
                Submit for approval
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your submissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(mySupportRequests ?? []).map((r) => (
                <div key={r.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{r.title}</p>
                  <Badge variant="outline" className="mt-1">
                    {r.status}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
              {(mySupportRequests ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No submissions yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'messages' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" />
                New message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={msgForm.recipientId}
                onChange={(e) => setMsgForm({ ...msgForm, recipientId: e.target.value })}
              >
                <option value="">Send to…</option>
                <optgroup label="Pastor / Admin">
                  {(recipients?.pastors ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} (Pastor)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Service unit admins">
                  {(recipients?.unitAdmins ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} (Unit admin)
                    </option>
                  ))}
                </optgroup>
              </select>
              <Input
                placeholder="Subject"
                value={msgForm.subject}
                onChange={(e) => setMsgForm({ ...msgForm, subject: e.target.value })}
              />
              <textarea
                className="min-h-[88px] w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Message"
                value={msgForm.body}
                onChange={(e) => setMsgForm({ ...msgForm, body: e.target.value })}
              />
              <Button onClick={sendMessage} disabled={busy}>
                Send
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inbox</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[400px] space-y-3 overflow-y-auto">
              {(messages ?? []).map((m) => (
                <div key={m.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{m.subject ?? '(no subject)'}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.sender.firstName} → {m.recipient.firstName} ·{' '}
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-muted-foreground">{m.body}</p>
                </div>
              ))}
              {(messages ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
        </div>
      </EnterpriseContent>
    </EnterpriseShell>
  );
}

export default function ProfilePage() {
  return (
    <ModuleGate gate="profile">
      <ProfilePageContent />
    </ModuleGate>
  );
}
