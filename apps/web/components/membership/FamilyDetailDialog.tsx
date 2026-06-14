'use client';

import { Loader2, Mail, MapPin, Pencil, Phone, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STATUS_LABELS, STATUS_VARIANT } from '@/lib/membership';

interface FamilyDetail {
  id: string;
  name: string;
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  homePhone?: string | null;
  email?: string | null;
  homeCell?: string | null;
  specialOccasion?: string | null;
  specialOccasionDate?: string | null;
  isActive?: boolean;
  headMemberId?: string | null;
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    status: string;
    roles: string[];
    email?: string | null;
    phone?: string | null;
  }>;
  propertyAssignments?: Array<{ definition: { id: string; name: string; description?: string | null } }>;
  customFieldValues?: Array<{
    definition: { label: string; fieldKey: string };
    valueText?: string | null;
  }>;
}

interface Props {
  familyId: string;
  canManage?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onUpdated?: () => void;
}

export function FamilyDetailDialog({ familyId, canManage, onClose, onEdit, onUpdated }: Props) {
  const { data: family, isLoading, refetch } = useApiQuery<FamilyDetail>(
    ['membership-family', familyId],
    `/membership/families/${familyId}`,
  );

  const addressLine = [
    family?.address,
    family?.address2,
    [family?.city, family?.state, family?.zip].filter(Boolean).join(', '),
    family?.country,
  ]
    .filter(Boolean)
    .join(' · ');

  const setInactive = async () => {
    if (!family || family.isActive === false) return;
    if (!window.confirm(`Set "${family.name}" to inactive?`)) return;
    try {
      await api.patch(`/membership/families/${familyId}`, { isActive: false });
      toast.success('Family set to inactive');
      await refetch();
      onUpdated?.();
    } catch {
      toast.error('Could not update family status');
    }
  };

  const setActive = async () => {
    if (!family || family.isActive !== false) return;
    try {
      await api.patch(`/membership/families/${familyId}`, { isActive: true });
      toast.success('Family set to active');
      await refetch();
      onUpdated?.();
    } catch {
      toast.error('Could not update family status');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal
      data-testid="family-detail-dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[95dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-xl sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-xl lg:max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">{family?.name ?? 'Family'}</h2>
            <p className="text-xs text-muted-foreground">Household detail</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : family ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Contact &amp; address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {family.homeCell ? (
                    <p>
                      <span className="text-muted-foreground">Home cell:</span> {family.homeCell}
                    </p>
                  ) : null}
                  {family.specialOccasion ? (
                    <p>
                      <span className="text-muted-foreground">Special occasion:</span> {family.specialOccasion}
                      {family.specialOccasionDate
                        ? ` (${new Date(family.specialOccasionDate).toLocaleDateString()})`
                        : ''}
                    </p>
                  ) : null}
                  {family.homePhone ? (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {family.homePhone}
                    </p>
                  ) : null}
                  {family.email ? (
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {family.email}
                    </p>
                  ) : null}
                  {addressLine ? (
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      {addressLine}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">No address on file</p>
                  )}
                  <Badge variant={family.isActive === false ? 'secondary' : 'default'}>
                    {family.isActive === false ? 'Inactive' : 'Active'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Members ({family.members.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border">
                    {family.members.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <div>
                          <p className="font-medium">
                            {m.firstName} {m.lastName}
                            {family.headMemberId === m.id ? (
                              <span className="ml-2 text-xs text-muted-foreground">(Head)</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[m.email, m.phone].filter(Boolean).join(' · ') || 'No contact'}
                          </p>
                        </div>
                        <Badge variant={STATUS_VARIANT[m.status] ?? 'outline'}>
                          {STATUS_LABELS[m.status] ?? m.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {(family.propertyAssignments?.length ?? 0) > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Properties</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {family.propertyAssignments!.map((p) => (
                      <Badge key={p.definition.id} variant="outline">
                        {p.definition.name}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              )}

              {(family.customFieldValues?.length ?? 0) > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Custom fields</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 sm:grid-cols-2">
                    {family.customFieldValues!.map((cf) => (
                      <div key={cf.definition.fieldKey}>
                        <p className="text-xs text-muted-foreground">{cf.definition.label}</p>
                        <p className="text-sm">{cf.valueText ?? '—'}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Family not found.</p>
          )}
        </div>

        {canManage && family ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
            <Button type="button" variant="outline" size="sm" onClick={onEdit} data-testid="family-edit-button">
              <Pencil className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
            {family.isActive === false ? (
              <Button type="button" variant="secondary" size="sm" onClick={setActive}>
                Set Active
              </Button>
            ) : (
              <Button type="button" variant="secondary" size="sm" onClick={setInactive}>
                Set Inactive
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
