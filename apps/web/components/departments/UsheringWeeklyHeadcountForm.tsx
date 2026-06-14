'use client';

import { useMemo, useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface HeadcountRow {
  id: string;
  weekStart: string;
  male: number;
  female: number;
  babies: number;
  children: number;
  totalAttendees: number;
}

interface Props {
  unitId: string;
  canManage: boolean;
  onSaved?: () => void;
}

function weekStartLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function UsheringWeeklyHeadcountForm({ unitId, canManage, onSaved }: Props) {
  const apiBase = `/service-units/departments/${unitId}`;
  const [male, setMale] = useState('');
  const [female, setFemale] = useState('');
  const [babies, setBabies] = useState('');
  const [children, setChildren] = useState('');
  const [totalAttendees, setTotalAttendees] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: rows, isLoading, refetch } = useApiQuery<HeadcountRow[]>(
    ['ushering-headcounts', unitId],
    `${apiBase}/ushering-headcounts?weeks=8`,
  );

  const autoTotal = useMemo(() => {
    const parts = [male, female, babies, children].map((v) => parseInt(v, 10) || 0);
    return parts.reduce((a, b) => a + b, 0);
  }, [male, female, babies, children]);

  const submit = async () => {
    if (!canManage) return;
    setSaving(true);
    try {
      await api.post(`${apiBase}/ushering-headcounts`, {
        male: parseInt(male, 10) || 0,
        female: parseInt(female, 10) || 0,
        babies: parseInt(babies, 10) || 0,
        children: parseInt(children, 10) || 0,
        totalAttendees: totalAttendees.trim()
          ? parseInt(totalAttendees, 10) || 0
          : autoTotal,
      });
      toast.success('Weekly attendance headcount saved');
      setMale('');
      setFemale('');
      setBabies('');
      setChildren('');
      setTotalAttendees('');
      await refetch();
      onSaved?.();
    } catch {
      toast.error('Could not save headcount');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/20" data-testid="ushering-weekly-headcount-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Weekly attendance report
        </CardTitle>
        <CardDescription>
          Record sanctuary headcounts for this week. Totals feed the Congregants overview weekly attendance flow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ['male', 'Male', male, setMale],
                ['female', 'Female', female, setFemale],
                ['babies', 'Babies', babies, setBabies],
                ['children', 'Children', children, setChildren],
                ['totalAttendees', 'Total Attendees', totalAttendees, setTotalAttendees],
              ] as const
            ).map(([key, label, value, setter]) => (
              <label key={key}>
                <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={value}
                  placeholder={key === 'totalAttendees' && !value ? String(autoTotal) : '0'}
                  onChange={(e) => setter(e.target.value)}
                  data-testid={`ushering-headcount-${key}`}
                />
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unit admin access is required to submit headcounts.</p>
        )}

        {canManage ? (
          <Button type="button" size="sm" disabled={saving} onClick={submit} data-testid="ushering-headcount-save">
            {saving ? 'Saving…' : 'Save this week'}
          </Button>
        ) : null}

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (rows ?? []).length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Week</th>
                  <th className="px-3 py-2">Male</th>
                  <th className="px-3 py-2">Female</th>
                  <th className="px-3 py-2">Babies</th>
                  <th className="px-3 py-2">Children</th>
                  <th className="px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{weekStartLabel(r.weekStart)}</td>
                    <td className="px-3 py-2 tabular-nums">{r.male}</td>
                    <td className="px-3 py-2 tabular-nums">{r.female}</td>
                    <td className="px-3 py-2 tabular-nums">{r.babies}</td>
                    <td className="px-3 py-2 tabular-nums">{r.children}</td>
                    <td className="px-3 py-2 font-medium tabular-nums">{r.totalAttendees}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
