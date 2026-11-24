'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  memberId?: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
};

/** LEADER / ops: notify Admin + Pastor — no automatic unmask. */
export function RequestMemberAccessButton({
  memberId,
  className,
  size = 'sm',
  variant = 'outline',
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post<{ notified: number }>('/member-privacy/request-access', {
        memberId: memberId || undefined,
        reason: reason.trim() || undefined,
      });
      toast.success(
        data.notified > 0
          ? `Access request sent to ${data.notified} Admin/Pastor`
          : 'Access request submitted',
      );
      setOpen(false);
      setReason('');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send access request'));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        size={size}
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        Request access
      </Button>
    );
  }

  return (
    <div className={cnSafe(className, 'space-y-2 rounded-md border border-border p-3')}>
      <p className="text-xs text-muted-foreground">
        Notify church Admin and Pastor. Restricted fields stay masked until they share access.
      </p>
      <Input
        placeholder="Reason (optional)"
        value={reason}
        maxLength={1000}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={() => void submit()}>
          {busy ? 'Sending…' : 'Send request'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setReason('');
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function cnSafe(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' ');
}
