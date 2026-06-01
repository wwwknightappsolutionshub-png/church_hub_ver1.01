'use client';

import { Loader2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Assignee {
  id: string;
  firstName: string;
  lastName: string;
}

interface FollowUpNewLeadSheetProps {
  open: boolean;
  form: {
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    assignedToId: string;
    dueAt: string;
  };
  assignees: Assignee[];
  creating: boolean;
  onChange: (form: FollowUpNewLeadSheetProps['form']) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function FollowUpNewLeadSheet({
  open,
  form,
  assignees,
  creating,
  onChange,
  onClose,
  onSubmit,
}: FollowUpNewLeadSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="font-heading text-lg font-bold text-foreground">Add new lead</p>
              <p className="text-xs text-muted-foreground">Starts at New Lead in the pipeline</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <Input
            placeholder="Full name *"
            value={form.contactName}
            onChange={(e) => onChange({ ...form, contactName: e.target.value })}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Phone"
              value={form.contactPhone}
              onChange={(e) => onChange({ ...form, contactPhone: e.target.value })}
            />
            <Input
              type="email"
              placeholder="Email"
              value={form.contactEmail}
              onChange={(e) => onChange({ ...form, contactEmail: e.target.value })}
            />
          </div>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={form.assignedToId}
            onChange={(e) => onChange({ ...form, assignedToId: e.target.value })}
          >
            <option value="">Assign to team member…</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.firstName} {a.lastName}
              </option>
            ))}
          </select>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Follow-up due (optional)
            </label>
            <Input
              type="datetime-local"
              value={form.dueAt}
              onChange={(e) => onChange({ ...form, dueAt: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={creating} className="flex-1 shadow-brand">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add to pipeline'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
