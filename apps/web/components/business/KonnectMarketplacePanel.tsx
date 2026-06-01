'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface MarketplaceItem {
  id: string;
  title: string;
  description?: string | null;
  itemType: string;
  price?: string | null;
  currency: string;
  business: { id: string; businessName: string; category?: string | null; phone?: string | null; email?: string | null };
}

interface BusinessProfile {
  id: string;
  businessName: string;
  verificationStatus: string;
}

export function KonnectMarketplacePanel() {
  const queryClient = useQueryClient();
  const { isChurchStaff } = useModuleAccess();
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const params = new URLSearchParams();
  if (typeFilter) params.set('type', typeFilter);
  if (search) params.set('search', search);
  const url = `/business/marketplace${params.toString() ? `?${params}` : ''}`;

  const items = useApiQuery<MarketplaceItem[]>(['konnect-marketplace', typeFilter, search], url);
  const profiles = useApiQuery<BusinessProfile[]>(['konnect-verified-biz'], '/business/profiles?verified=true');
  const myProfile = useApiQuery<{ id: string; businessName: string; verificationStatus?: string } | null>(
    ['konnect-my-profile'],
    '/business/my-profile',
  );

  const businessOptions = useMemo(() => {
    const verified = profiles.data ?? [];
    const mine = myProfile.data;
    if (mine && !verified.some((p) => p.id === mine.id)) {
      return [
        { id: mine.id, businessName: `${mine.businessName}${mine.verificationStatus !== 'VERIFIED' ? ' (pending)' : ''}` },
        ...verified,
      ];
    }
    return verified;
  }, [profiles.data, myProfile.data]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ businessId: '', title: '', description: '', itemType: 'SERVICE', price: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (myProfile.data?.id && !form.businessId) {
      setForm((f) => ({ ...f, businessId: myProfile.data!.id }));
    }
  }, [myProfile.data, form.businessId]);

  const createListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessId || !form.title.trim()) return;
    setSaving(true);
    try {
      await api.post(`/business/profiles/${form.businessId}/listings`, {
        title: form.title.trim(),
        description: form.description || undefined,
        itemType: form.itemType,
        price: form.price ? parseFloat(form.price) : undefined,
      });
      toast.success('Listing published');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['konnect-marketplace'] });
      queryClient.invalidateQueries({ queryKey: ['konnect-stats'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create listing'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Input className="max-w-xs" placeholder="Search listings…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Services & products</option>
          <option value="SERVICE">Services</option>
          <option value="PRODUCT">Products</option>
        </select>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add listing
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
            <form onSubmit={createListing} className="contents">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:col-span-2"
                value={form.businessId}
                onChange={(e) => setForm({ ...form, businessId: e.target.value })}
                required
              >
                <option value="">Your business…</option>
                {businessOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.businessName}
                  </option>
                ))}
              </select>
              <Input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.itemType}
                onChange={(e) => setForm({ ...form, itemType: e.target.value })}
              >
                <option value="SERVICE">Service</option>
                <option value="PRODUCT">Product</option>
              </select>
              <Input placeholder="Price (GBP)" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <Input className="sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Button type="submit" disabled={saving} className="sm:col-span-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish listing'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {items.isLoading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(items.data ?? []).map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                    {item.title}
                  </CardTitle>
                  <Badge variant="outline">{item.itemType}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.business.businessName}</p>
              </CardHeader>
              <CardContent className="text-sm">
                {item.description && <p className="text-muted-foreground">{item.description}</p>}
                {item.price && (
                  <p className="mt-2 font-semibold">
                    {item.currency} {item.price}
                  </p>
                )}
                <p className="mt-2 text-xs">
                  Contact: {item.business.email ?? item.business.phone ?? 'See directory'}
                </p>
                {isChurchStaff && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 h-7 gap-1 text-xs text-destructive"
                    onClick={async () => {
                      if (!confirm('Remove this listing?')) return;
                      try {
                        await api.delete(`/business/listings/${item.id}`);
                        toast.success('Listing removed');
                        queryClient.invalidateQueries({ queryKey: ['konnect-marketplace'] });
                      } catch (err) {
                        toast.error(apiErrorMessage(err, 'Could not remove listing'));
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
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
