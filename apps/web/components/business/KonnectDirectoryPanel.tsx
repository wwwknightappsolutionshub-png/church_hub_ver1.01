'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2, Plus, Search, Star } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { BUSINESS_CATEGORIES, VERIFICATION_LABELS } from '@/lib/konnect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface MemberRef {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
}

interface Listing {
  id: string;
  title: string;
  itemType: string;
  price?: string | null;
  currency: string;
}

interface BusinessProfile {
  id: string;
  businessName: string;
  tagline?: string | null;
  description?: string | null;
  category?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  verificationStatus: string;
  isFeatured: boolean;
  servicesOffered?: string[];
  member: MemberRef;
  listings?: Listing[];
}

interface KonnectMember {
  id: string;
  firstName: string;
  lastName: string;
  businessProfile?: { id: string } | null;
}

export function KonnectDirectoryPanel() {
  const queryClient = useQueryClient();
  const { memberId, isChurchStaff } = useModuleAccess();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    memberId: string;
    businessName: string;
    tagline: string;
    category: string;
    description: string;
    website: string;
    phone: string;
    email: string;
  }>({
    memberId: '',
    businessName: '',
    tagline: '',
    category: BUSINESS_CATEGORIES[0],
    description: '',
    website: '',
    phone: '',
    email: '',
  });

  const params = new URLSearchParams();
  if (verifiedOnly) params.set('verified', 'true');
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  const url = `/business/profiles${params.toString() ? `?${params}` : ''}`;

  const profiles = useApiQuery<BusinessProfile[]>(['konnect-profiles', search, category, String(verifiedOnly)], url);
  const members = useApiQuery<KonnectMember[]>(['konnect-members'], '/business/members');

  useEffect(() => {
    if (memberId && !form.memberId) {
      setForm((f) => ({ ...f, memberId }));
    }
  }, [memberId, form.memberId]);

  const createProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.memberId || !form.businessName.trim()) return;
    setSaving(true);
    try {
      await api.post('/business/profiles', {
        memberId: form.memberId,
        businessName: form.businessName.trim(),
        tagline: form.tagline || undefined,
        category: form.category,
        description: form.description || undefined,
        website: form.website || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
      });
      toast.success('Business profile submitted for verification');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['konnect-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['konnect-stats'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create profile — member may already have one'));
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = async (id: string, isFeatured: boolean) => {
    try {
      await api.patch(`/business/profiles/${id}/feature`, { isFeatured: !isFeatured });
      queryClient.invalidateQueries({ queryKey: ['konnect-profiles'] });
    } catch {
      toast.error('Could not update featured status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search businesses…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {BUSINESS_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
          Verified only
        </label>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add business
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
            <form onSubmit={createProfile} className="contents">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:col-span-2"
                value={form.memberId}
                onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                required
              >
                <option value="">Select member…</option>
                {(members.data ?? [])
                  .filter((m) => !m.businessProfile || m.id === memberId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
              </select>
              <Input placeholder="Business name *" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {BUSINESS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Input placeholder="Tagline" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
              <Input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <textarea
                className="min-h-[80px] rounded-md border border-input px-3 py-2 text-sm sm:col-span-2"
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <Button type="submit" disabled={saving} className="sm:col-span-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for verification'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {profiles.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(profiles.data ?? []).map((p) => (
            <Card key={p.id} className={p.isFeatured ? 'border-amber-300/60 shadow-md' : 'shadow-sm'}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{p.businessName}</CardTitle>
                  <div className="flex gap-1">
                    {p.isFeatured && (
                      <Badge variant="gold" className="gap-0.5">
                        <Star className="h-3 w-3" />
                        Featured
                      </Badge>
                    )}
                    <Badge variant={p.verificationStatus === 'VERIFIED' ? 'success' : 'outline'}>
                      {VERIFICATION_LABELS[p.verificationStatus] ?? p.verificationStatus}
                    </Badge>
                  </div>
                </div>
                {p.tagline && <p className="text-sm text-muted-foreground">{p.tagline}</p>}
                <p className="text-xs text-muted-foreground">
                  {p.member.firstName} {p.member.lastName} · {p.category ?? 'General'}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {p.description && <p className="line-clamp-2 text-muted-foreground">{p.description}</p>}
                <p>{(p.listings ?? []).length} marketplace listing(s)</p>
                <div className="flex flex-wrap gap-2">
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary text-xs hover:underline">
                      Website <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {p.phone && <span className="text-xs">{p.phone}</span>}
                </div>
                {isChurchStaff && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleFeatured(p.id, p.isFeatured)}>
                    {p.isFeatured ? 'Remove featured' : 'Mark featured'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
