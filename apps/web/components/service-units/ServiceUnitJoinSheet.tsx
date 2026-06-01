'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ServiceUnitJoinSheetProps {
  unitId: string;
  unitName: string;
  open: boolean;
  defaultValues?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    memberId?: string;
  };
  onClose: () => void;
  onSubmitted: () => void;
}

export function ServiceUnitJoinSheet({
  unitId,
  unitName,
  open,
  defaultValues,
  onClose,
  onSubmitted,
}: ServiceUnitJoinSheetProps) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    firstName: defaultValues?.firstName ?? '',
    lastName: defaultValues?.lastName ?? '',
    email: defaultValues?.email ?? '',
    phone: defaultValues?.phone ?? '',
    motivation: '',
  });

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    setBusy(true);
    try {
      await api.post(`/service-units/${unitId}/join-requests`, {
        ...form,
        memberId: defaultValues?.memberId,
      });
      toast.success('Request sent for approval');
      onSubmitted();
      onClose();
    } catch {
      toast.error('Could not submit request');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl md:inset-x-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-bold">Join {unitName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your request goes to the unit admin, pastor, and church admin for approval.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <Input
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <textarea
            className="min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Why do you want to join this unit?"
            value={form.motivation}
            onChange={(e) => setForm({ ...form, motivation: e.target.value })}
          />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for approval'}
          </Button>
        </form>
      </div>
    </>
  );
}
