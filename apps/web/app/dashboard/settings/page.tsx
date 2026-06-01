'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import type { ModuleAccess } from '@/lib/hooks/use-module-access';
import { accountAvatarUrl, userDisplayName } from '@/lib/user-display';
import { LogoutButton } from '@/components/app/LogoutButton';
import { ProfilePhotoUpload } from '@/components/settings/ProfilePhotoUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnterpriseContent, EnterpriseHero, EnterpriseShell } from '@/components/layout/EnterpriseModuleShell';

interface AccountForm {
  firstName: string;
  lastName: string;
  nickname: string;
  phone: string;
  avatarUrl: string;
}

type SavedProfile = {
  firstName: string;
  lastName: string;
  nickname?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
};

function apiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const detail = err.response?.data?.message;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.join(', ');
    if (err.response?.status === 404) {
      return 'Profile API is unavailable — restart the API server and run database migrations.';
    }
  }
  return 'Could not save profile';
}

function formFromSources(
  user: NonNullable<ModuleAccess['user']>,
  member: ModuleAccess['member'],
): AccountForm {
  return {
    firstName: user.firstName ?? member?.firstName ?? '',
    lastName: user.lastName ?? member?.lastName ?? '',
    nickname: user.nickname ?? member?.nickname ?? '',
    phone: user.phone ?? member?.phone ?? '',
    avatarUrl: accountAvatarUrl(user, member) ?? '',
  };
}

function formFromSaved(saved: SavedProfile): AccountForm {
  return {
    firstName: saved.firstName,
    lastName: saved.lastName,
    nickname: saved.nickname ?? '',
    phone: saved.phone ?? '',
    avatarUrl: saved.avatarUrl ?? '',
  };
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, member, memberId, canAccessMyProfile, isLoading } = useModuleAccess();
  const [busy, setBusy] = useState(false);
  const formHydrated = useRef(false);
  const [form, setForm] = useState<AccountForm>({
    firstName: '',
    lastName: '',
    nickname: '',
    phone: '',
    avatarUrl: '',
  });

  useEffect(() => {
    if (!user || formHydrated.current) return;
    formHydrated.current = true;
    setForm(formFromSources(user, member));
  }, [user, member]);

  const mergeSavedIntoCache = (saved: SavedProfile) => {
    queryClient.setQueryData<ModuleAccess>(['auth-me'], (prev) => {
      if (!prev?.user) return prev;
      const avatar = saved.avatarUrl ?? null;
      return {
        ...prev,
        user: {
          ...prev.user,
          firstName: saved.firstName,
          lastName: saved.lastName,
          nickname: saved.nickname ?? null,
          phone: saved.phone ?? null,
          avatarUrl: avatar,
        },
        member: prev.member
          ? {
              ...prev.member,
              firstName: saved.firstName,
              lastName: saved.lastName,
              nickname: saved.nickname ?? null,
              phone: saved.phone ?? null,
              avatarUrl: avatar,
            }
          : prev.member,
      };
    });
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const persistAvatar = async (url: string) => {
    const value = url.trim() || null;
    if (memberId) {
      const { data } = await api.patch(`/member-profile/${memberId}`, { avatarUrl: value });
      const saved: SavedProfile = {
        firstName: data.firstName,
        lastName: data.lastName,
        nickname: data.nickname ?? null,
        phone: data.phone ?? null,
        avatarUrl: data.avatarUrl ?? value,
      };
      setForm((f) => ({ ...f, avatarUrl: saved.avatarUrl ?? '' }));
      mergeSavedIntoCache(saved);
    } else {
      try {
        const { data } = await api.patch('/auth/account', { avatarUrl: value });
        const saved: SavedProfile = {
          firstName: data.firstName,
          lastName: data.lastName,
          nickname: data.nickname ?? null,
          phone: data.phone ?? null,
          avatarUrl: data.avatarUrl ?? value,
        };
        setForm((f) => ({ ...f, avatarUrl: saved.avatarUrl ?? '' }));
        mergeSavedIntoCache(saved);
      } catch (err) {
        if (err instanceof AxiosError && err.response?.status === 404) {
          throw new Error('Photo upload saved, but profile sync needs an API restart.');
        }
        throw err;
      }
    }
    toast.success('Profile photo updated');
  };

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      nickname: form.nickname.trim() || null,
      phone: form.phone.trim() || null,
      avatarUrl: form.avatarUrl.trim() || null,
    };

    setBusy(true);
    try {
      let saved: SavedProfile;

      if (memberId) {
        const { data } = await api.patch(`/member-profile/${memberId}`, payload);
        saved = {
          firstName: data.firstName,
          lastName: data.lastName,
          nickname: data.nickname ?? payload.nickname,
          phone: data.phone ?? payload.phone,
          avatarUrl: data.avatarUrl ?? payload.avatarUrl,
        };
      } else {
        try {
          const { data } = await api.patch('/auth/account', payload);
          saved = {
            firstName: data.firstName,
            lastName: data.lastName,
            nickname: data.nickname ?? payload.nickname,
            phone: data.phone ?? payload.phone,
            avatarUrl: data.avatarUrl ?? payload.avatarUrl,
          };
        } catch (err) {
          if (err instanceof AxiosError && err.response?.status === 404) {
            throw new Error('Profile save is unavailable — restart the API server.');
          }
          throw err;
        }
      }

      setForm(formFromSaved(saved));
      mergeSavedIntoCache(saved);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const previewUser = {
    ...user,
    firstName: form.firstName,
    lastName: form.lastName,
    nickname: form.nickname,
    avatarUrl: form.avatarUrl || null,
  };

  return (
    <EnterpriseShell>
      <EnterpriseHero
        title="Settings"
        description="Account preferences and profile presentation synchronized across church modules and your membership record."
      />
      <EnterpriseContent className="space-y-6 pb-24 md:pb-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Your profile
          </CardTitle>
          <CardDescription>
            Nickname is shown in the app header and community areas when set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-heading text-lg font-semibold">
              {userDisplayName(previewUser, member)}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          <ProfilePhotoUpload
            displayUser={previewUser}
            avatarUrl={form.avatarUrl}
            disabled={busy}
            onAvatarUrlChange={(url) => setForm((f) => ({ ...f, avatarUrl: url }))}
            onAutoSaved={persistAvatar}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <details className="md:col-span-2 rounded-lg border border-border px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Advanced: paste image URL
              </summary>
              <Input
                className="mt-2"
                placeholder="https://…"
                value={form.avatarUrl}
                onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
              />
            </details>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nickname
              </label>
              <Input
                placeholder="How you want to be called"
                maxLength={32}
                value={form.nickname}
                onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Phone
              </label>
              <Input
                type="tel"
                placeholder="Optional"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                First name
              </label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Last name
              </label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Email
              </label>
              <Input value={user.email} disabled className="bg-muted/50" />
            </div>
          </div>

          <Button type="button" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
          <CardDescription>Sign out and return to the church home page.</CardDescription>
        </CardHeader>
        <CardContent>
          <LogoutButton variant="menu" className="max-w-xs" />
        </CardContent>
      </Card>

      {canAccessMyProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Membership profile</CardTitle>
            <CardDescription>
              Service units, business details, and in-app messages live on your membership profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/dashboard/profile">Open My Profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      </EnterpriseContent>
    </EnterpriseShell>
  );
}
