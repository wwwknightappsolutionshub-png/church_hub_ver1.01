'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import {
  emailFormatError,
  filterPhoneTyping,
  flexiblePhoneFormatError,
  parseOptionalFlexiblePhone,
} from '@/lib/contact-validation';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { formatMemberName } from '@/lib/service-unit-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Mode = 'roster' | 'form';
type DeputySlot = 'ASSISTANT' | 'SECRETARY';

interface ChurchMemberOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
}

interface UnitMemberRow {
  memberId: string;
  unitRole: string;
  leaderId: string | null;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  };
}

export function UnitLeadershipModal({
  open,
  onClose,
  unitId,
  variant,
}: {
  open: boolean;
  onClose: () => void;
  unitId: string;
  /** Church staff assign volunteer Unit Admin; Unit Admin assigns deputies. */
  variant: 'add-leader' | 'assign-assistants';
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('roster');
  const [busy, setBusy] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [deputySlot, setDeputySlot] = useState<DeputySlot>('ASSISTANT');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const { data: churchMembers = [] } = useApiQuery<ChurchMemberOption[]>(
    ['membership-members-picker'],
    '/membership/members',
    { enabled: open && variant === 'add-leader' },
  );

  const { data: unitMembers = [] } = useApiQuery<UnitMemberRow[]>(
    ['service-unit-members', unitId],
    `/service-units/${unitId}/members`,
    { enabled: open },
  );

  const takenDeputySlots = useMemo(() => {
    const taken = new Set<DeputySlot>();
    for (const row of unitMembers) {
      if (row.unitRole === 'ASSISTANT') taken.add('ASSISTANT');
      if (row.unitRole === 'SECRETARY') taken.add('SECRETARY');
    }
    return taken;
  }, [unitMembers]);

  const rosterOptions = useMemo(() => {
    if (variant === 'add-leader') {
      const adminIds = new Set(
        unitMembers.filter((r) => r.unitRole === 'UNIT_ADMIN').map((r) => r.memberId),
      );
      return churchMembers.filter((m) => !adminIds.has(m.id));
    }
    return unitMembers
      .filter((r) => r.unitRole === 'MEMBER' || (!r.leaderId && r.unitRole !== 'UNIT_ADMIN'))
      .filter((r) => r.unitRole !== 'ASSISTANT' && r.unitRole !== 'SECRETARY' && r.unitRole !== 'UNIT_ADMIN')
      .map((r) => r.member);
  }, [variant, churchMembers, unitMembers]);

  if (!open) return null;

  const title = variant === 'add-leader' ? 'Add Leader' : 'Assign Assistants';
  const description =
    variant === 'add-leader'
      ? 'Choose who will lead this unit. They receive a welcome email with a link to set their login password.'
      : 'Choose unit members as Assistant and Secretary.';

  const reset = () => {
    setMode('roster');
    setMemberId('');
    setDeputySlot('ASSISTANT');
    setForm({ firstName: '', lastName: '', email: '', phone: '' });
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['service-unit', unitId] });
    queryClient.invalidateQueries({ queryKey: ['service-unit-members', unitId] });
    queryClient.invalidateQueries({ queryKey: ['service-units'] });
    queryClient.invalidateQueries({ queryKey: ['auth-me'] });
  };

  const submit = async () => {
    setBusy(true);
    try {
      if (variant === 'add-leader') {
        if (mode === 'roster' && !memberId) {
          toast.error('Select a church member');
          setBusy(false);
          return;
        }
        if (mode === 'form') {
          if (!form.firstName.trim() || !form.lastName.trim()) {
            toast.error('First name and last name are required');
            setBusy(false);
            return;
          }
          if (!form.email.trim()) {
            toast.error('Email is required so we can send a login invite');
            setBusy(false);
            return;
          }
          const emailErr = emailFormatError(form.email);
          if (emailErr) {
            toast.error(emailErr);
            setBusy(false);
            return;
          }
          const phoneErr = flexiblePhoneFormatError(form.phone);
          if (phoneErr) {
            toast.error(phoneErr);
            setBusy(false);
            return;
          }
        }
        if (mode === 'roster') {
          const selected = rosterOptions.find((m) => m.id === memberId);
          if (!selected?.email?.trim()) {
            toast.error(
              'Selected member needs an email on their profile before they can receive a login invite',
            );
            setBusy(false);
            return;
          }
        }
        const payload =
          mode === 'roster'
            ? { memberId, isUnitAdmin: true, role: 'LEADER' }
            : {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim().toLowerCase(),
                phone: parseOptionalFlexiblePhone(form.phone),
                isUnitAdmin: true,
                role: 'LEADER',
              };
        await api.post(`/service-units/${unitId}/leaders`, payload);
        toast.success('Unit Leader assigned — welcome email sent');
      } else {
        if (takenDeputySlots.has(deputySlot)) {
          toast.error(
            `This unit already has a ${deputySlot === 'ASSISTANT' ? 'Assistant' : 'Secretary'}`,
          );
          setBusy(false);
          return;
        }
        if (!memberId) {
          toast.error('Select a unit member');
          setBusy(false);
          return;
        }
        await api.post(`/service-units/${unitId}/leaders`, {
          memberId,
          isUnitAdmin: false,
          deputyRole: deputySlot,
          role: deputySlot,
        });
        toast.success(
          `${deputySlot === 'ASSISTANT' ? 'Assistant' : 'Secretary'} assigned`,
        );
      }
      invalidate();
      handleClose();
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not save leadership'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <UserPlus className="h-4 w-4" />
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {variant === 'add-leader' ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === 'roster' ? 'default' : 'outline'}
                onClick={() => setMode('roster')}
              >
                From church roster
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'form' ? 'default' : 'outline'}
                onClick={() => setMode('form')}
              >
                New person
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Role to assign</Label>
              <div className="flex flex-wrap gap-2">
                {(['ASSISTANT', 'SECRETARY'] as const).map((slot) => (
                  <Button
                    key={slot}
                    type="button"
                    size="sm"
                    variant={deputySlot === slot ? 'default' : 'outline'}
                    disabled={takenDeputySlots.has(slot) && deputySlot !== slot}
                    onClick={() => setDeputySlot(slot)}
                  >
                    {slot === 'ASSISTANT' ? 'Assistant' : 'Secretary'}
                    {takenDeputySlots.has(slot) ? ' (filled)' : ''}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {variant === 'assign-assistants' || mode === 'roster' ? (
            <div className="space-y-2">
              <Label htmlFor="ul-roster">
                {variant === 'add-leader' ? 'Select church member' : 'Select unit member'}
              </Label>
              <select
                id="ul-roster"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              >
                <option value="">
                  {variant === 'add-leader' ? 'Select church member…' : 'Select unit member…'}
                </option>
                {rosterOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {formatMemberName(m)}
                    {m.email ? ` (${m.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ul-fn">First Name</Label>
                <Input
                  id="ul-fn"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ul-ln">Last Name</Label>
                <Input
                  id="ul-ln"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ul-em">Email</Label>
                <Input
                  id="ul-em"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Required for login invite"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ul-ph">Phone Number</Label>
                <Input
                  id="ul-ph"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="e.g. 07123 456789"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: filterPhoneTyping(e.target.value) }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className={cn(busy && 'opacity-80')}
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {variant === 'add-leader' ? 'Assign Unit Leader' : 'Assign'}
          </Button>
        </div>
      </div>
    </div>
  );
}
