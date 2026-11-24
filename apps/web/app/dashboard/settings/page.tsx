'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  DatabaseBackup,
  GitBranch,
  Loader2,
  LogOut,
  ScrollText,
  Shield,
  User,
  UserCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, clearAuthTokens } from '@/lib/api';
import {
  filterPhoneTyping,
  flexiblePhoneFormatError,
  parseOptionalFlexiblePhone,
} from '@/lib/contact-validation';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import type { ModuleAccess } from '@/lib/hooks/use-module-access';
import { isChurchLeadershipRole } from '@/lib/session-role';
import { accountAvatarUrl, userDisplayName } from '@/lib/user-display';
import { LogoutButton } from '@/components/app/LogoutButton';
import { ProfilePhotoUpload } from '@/components/settings/ProfilePhotoUpload';
import {
  SettingsSection,
  SettingsSideNav,
  type SettingsNavItem,
} from '@/components/settings/SettingsSection';
import { TenantBackupRequestPanel } from '@/components/backups/TenantBackupRequestPanel';
import { MemberFieldAccessEditor } from '@/components/privacy/MemberFieldAccessEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
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
  const { user, member, memberId, canAccessMyProfile, isChurchStaff, userRoles, isLoading } =
    useModuleAccess();
  /** Privacy & Session cards — Church Admin & Pastor only. Profile stays available to all. */
  const showLeadershipPrivacySession = isChurchLeadershipRole(userRoles);
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
    const phoneErr = flexiblePhoneFormatError(form.phone);
    if (phoneErr) {
      toast.error(phoneErr);
      return;
    }

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      nickname: form.nickname.trim() || null,
      phone: parseOptionalFlexiblePhone(form.phone) ?? null,
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

  const navItems: SettingsNavItem[] = [
    { id: 'settings-profile', label: 'Profile' },
    ...(showLeadershipPrivacySession
      ? [
          { id: 'settings-pipeline', label: 'Pipeline' },
          { id: 'settings-privacy', label: 'Privacy' },
          { id: 'settings-field-access', label: 'Field access' },
        ]
      : []),
    ...(isChurchStaff ? [{ id: 'settings-backup', label: 'Backup' }] : []),
    ...(showLeadershipPrivacySession ? [{ id: 'settings-audit', label: 'Audit logs' }] : []),
    ...(showLeadershipPrivacySession ? [{ id: 'settings-session', label: 'Session' }] : []),
    ...(canAccessMyProfile ? [{ id: 'settings-membership', label: 'Membership' }] : []),
  ];

  const [activeId, setActiveId] = useState('settings-profile');
  const navIds = navItems.map((item) => item.id).join('|');

  useEffect(() => {
    if (!navItems.some((item) => item.id === activeId)) {
      setActiveId(navItems[0]?.id ?? 'settings-profile');
    }
    // Keep selection valid when role-gated items appear/disappear.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by navIds
  }, [navIds, activeId]);

  const sectionIndex = Object.fromEntries(
    navItems.map((item, i) => [item.id, String(i + 1).padStart(2, '0')]),
  );

  return (
    <EnterpriseShell>
      <EnterpriseHero
        title="Settings"
        description={MODULE_DESCRIPTIONS.settings}
      />
      <EnterpriseContent bare className="pb-24 md:pb-10">
        <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-10 xl:grid-cols-[15.5rem_minmax(0,1fr)] xl:gap-12">
          <SettingsSideNav items={navItems} activeId={activeId} onSelect={setActiveId} />

          <div className="min-w-0">
            {activeId === 'settings-profile' ? (
              <SettingsSection
                id="settings-profile"
                index={sectionIndex['settings-profile']}
                title="Your profile"
                description="Nickname is shown in the app header and community areas when set."
                icon={<User className="h-4 w-4" aria-hidden />}
                footer={
                  <Button type="button" onClick={save} disabled={busy}>
                    {busy ? 'Saving…' : 'Save profile'}
                  </Button>
                }
              >
                <div className="space-y-6">
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
                        inputMode="tel"
                        placeholder="e.g. 07123 456789"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, phone: filterPhoneTyping(e.target.value) }))
                        }
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
                </div>
              </SettingsSection>
            ) : null}

            {activeId === 'settings-pipeline' && showLeadershipPrivacySession ? (
              <SettingsSection
                id="settings-pipeline"
                index={sectionIndex['settings-pipeline']}
                title="Membership Pipeline"
                description="Templates, activate a base journey, stage labels, and merge product updates for Establishment."
                icon={<GitBranch className="h-4 w-4" aria-hidden />}
              >
                <Button variant="outline" asChild>
                  <Link href="/dashboard/settings/membership-pipeline">Customize pipeline</Link>
                </Button>
              </SettingsSection>
            ) : null}

            {activeId === 'settings-privacy' && showLeadershipPrivacySession ? (
              <SettingsSection
                id="settings-privacy"
                index={sectionIndex['settings-privacy']}
                title="Privacy & data"
                description={
                  <>
                    Download a copy of your account data or request erasure. Legal documents are at{' '}
                    <Link
                      href="/legal/privacy-policy"
                      className="font-medium text-primary hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </>
                }
                icon={<Shield className="h-4 w-4" aria-hidden />}
              >
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const { data } = await api.get('/privacy/export');
                        const blob = new Blob([JSON.stringify(data, null, 2)], {
                          type: 'application/json',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `churchhub-data-export-${new Date().toISOString().slice(0, 10)}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success('Data export downloaded');
                      } catch (err) {
                        toast.error(apiErrorMessage(err));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Download my data
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          'Request permanent erasure of your account? You can choose to erase immediately or queue for review.',
                        )
                      ) {
                        return;
                      }
                      const executeNow = window.confirm(
                        'Erase immediately? Click OK to anonymize now (you will be signed out), or Cancel to submit a request for review.',
                      );
                      setBusy(true);
                      try {
                        await api.post('/privacy/erasure', { executeNow });
                        toast.success(
                          executeNow
                            ? 'Account anonymized. Signing you out…'
                            : 'Erasure request submitted. Our team will process it.',
                        );
                        if (executeNow) {
                          clearAuthTokens();
                          window.location.href = '/login';
                        }
                      } catch (err) {
                        toast.error(apiErrorMessage(err));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Request erasure
                  </Button>
                </div>
              </SettingsSection>
            ) : null}

            {activeId === 'settings-field-access' && showLeadershipPrivacySession ? (
              <SettingsSection
                id="settings-field-access"
                index={sectionIndex['settings-field-access']}
                title="Member field access"
                description="Tighten what Cell Ministers, deputies, and Leaders can see. Hardcoded privacy floor cannot be loosened."
                icon={<Shield className="h-4 w-4" aria-hidden />}
              >
                <MemberFieldAccessEditor
                  queryKey={['member-privacy-catalog']}
                  catalogUrl="/member-privacy/catalog"
                  saveUrl="/member-privacy/church-policies"
                  canWrite={showLeadershipPrivacySession}
                />
              </SettingsSection>
            ) : null}

            {activeId === 'settings-backup' ? (
              <TenantBackupRequestPanel
                enabled={!!isChurchStaff}
                id="settings-backup"
                index={sectionIndex['settings-backup']}
                icon={<DatabaseBackup className="h-4 w-4" aria-hidden />}
              />
            ) : null}

            {activeId === 'settings-audit' && showLeadershipPrivacySession ? (
              <SettingsSection
                id="settings-audit"
                index={sectionIndex['settings-audit']}
                title="Audit & Activity Logs"
                description="Security events, member activity, and follow-up stage history. Export CSV for GDPR accountability."
                icon={<ScrollText className="h-4 w-4" aria-hidden />}
              >
                <Button variant="outline" asChild>
                  <Link href="/dashboard/settings/audit">Open audit logs</Link>
                </Button>
              </SettingsSection>
            ) : null}

            {activeId === 'settings-session' && showLeadershipPrivacySession ? (
              <SettingsSection
                id="settings-session"
                index={sectionIndex['settings-session']}
                title="Session"
                description="Sign out and return to the church home page."
                icon={<LogOut className="h-4 w-4" aria-hidden />}
              >
                <LogoutButton variant="menu" className="max-w-xs" />
              </SettingsSection>
            ) : null}

            {activeId === 'settings-membership' && canAccessMyProfile ? (
              <SettingsSection
                id="settings-membership"
                index={sectionIndex['settings-membership']}
                title="Membership profile"
                description="Service units, business details, and in-app messages live on your membership profile."
                icon={<UserCircle2 className="h-4 w-4" aria-hidden />}
              >
                <Button variant="outline" asChild>
                  <Link href="/dashboard/profile">Open My Profile</Link>
                </Button>
              </SettingsSection>
            ) : null}
          </div>
        </div>
      </EnterpriseContent>
    </EnterpriseShell>
  );
}
