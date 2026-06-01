'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Home, Loader2, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FamilyRow {
  id: string;
  name: string;
  headMemberId?: string | null;
  members: Array<{ id: string; firstName: string; lastName: string; status: string }>;
}

interface FamiliesPanelProps {
  canManage: boolean;
  members: Array<{ id: string; firstName: string; lastName: string }>;
}

export function FamiliesPanel({ canManage, members }: FamiliesPanelProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [headId, setHeadId] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: families, isLoading } = useApiQuery<FamilyRow[]>(
    ['membership-families'],
    '/membership/families',
  );

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.post('/membership/families', {
        name: name.trim(),
        headMemberId: headId || undefined,
      });
      toast.success('Family created');
      setName('');
      setHeadId('');
      queryClient.invalidateQueries({ queryKey: ['membership-families'] });
      queryClient.invalidateQueries({ queryKey: ['membership-members'] });
    } catch {
      toast.error('Could not create family');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              New family
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input
                  placeholder="Family name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={headId}
                onChange={(e) => setHeadId(e.target.value)}
              >
                <option value="">Head of family (optional)</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {families?.map((f) => (
          <Card key={f.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="h-4 w-4 text-primary" />
                {f.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {f.members.length} member{f.members.length === 1 ? '' : 's'}
              </p>
              <ul className="space-y-1 text-sm">
                {f.members.map((m) => (
                  <li key={m.id}>
                    {m.firstName} {m.lastName}
                    <span className="ml-1 text-xs text-muted-foreground">({m.status})</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
