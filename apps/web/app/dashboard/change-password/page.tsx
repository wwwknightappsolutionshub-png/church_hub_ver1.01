'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { applyAuthSessionFromApi } from '@/lib/apply-auth-session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ChangePasswordPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password updated — welcome to Church_Hub');
      await queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      const path = await applyAuthSessionFromApi();
      router.replace(path);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update password'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            Set your new password
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Your account was created with a temporary password from the welcome email. Choose a
            secure password before continuing.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Temporary password</label>
              <Input
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">New password</label>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Confirm new password</label>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save and continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
