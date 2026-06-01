'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Wisdom365VariantSlug } from '@church-hub/shared-types';
import {
  assignWisdom365Variants,
  fetchFamilyChildren,
  fetchWisdom365Catalog,
  type Wisdom365CatalogResponse,
  type FamilyChild,
} from '@/lib/wisdom365-api';
import { Wisdom365Hero } from '@/components/wisdom365/Wisdom365Hero';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function Wisdom365AssignPage() {
  const router = useRouter();
  const params = useSearchParams();
  const subscriptionId = params.get('subscriptionId') ?? '';

  const [catalog, setCatalog] = useState<Wisdom365CatalogResponse | null>(null);
  const [selected, setSelected] = useState<Wisdom365VariantSlug[]>([]);
  const [children, setChildren] = useState<FamilyChild[]>([]);
  const [kidsChildId, setKidsChildId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [cat, kids] = await Promise.all([fetchWisdom365Catalog(), fetchFamilyChildren()]);
        setCatalog(cat);
        setChildren(kids);
        const subId = subscriptionId || cat.me.unassignedSubscriptionId || cat.me.pendingSubscriptionId || '';
        if (!subId && cat.me.unassignedLicenses === 0 && cat.me.entitlements.length > 0) {
          router.replace('/dashboard/wisdom365');
        }
      } catch {
        toast.error('Could not load assignment data');
      } finally {
        setLoading(false);
      }
    })();
  }, [subscriptionId, router]);

  const effectiveSubId =
    subscriptionId || catalog?.me.unassignedSubscriptionId || catalog?.me.pendingSubscriptionId || '';

  const maxSelect = catalog?.me.unassignedLicenses ?? 0;

  const toggle = (slug: Wisdom365VariantSlug) => {
    setSelected((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= maxSelect) {
        toast.message(`You can assign up to ${maxSelect} journey(s) with your current licenses`);
        return prev;
      }
      return [...prev, slug];
    });
  };

  const needsKids = selected.includes('KIDS');

  const handleAssign = async () => {
    if (!effectiveSubId || selected.length === 0) return;
    if (needsKids && !kidsChildId) {
      toast.error('Select a child for the Kids journey');
      return;
    }
    setBusy(true);
    try {
      const child = children.find((c) => c.id === kidsChildId);
      await assignWisdom365Variants({
        subscriptionId: effectiveSubId,
        variantSlugs: selected,
        kidsGrants: needsKids && child
          ? [{ childMemberId: child.id, childDisplayName: child.displayName }]
          : undefined,
      });
      toast.success('Journeys provisioned!');
      router.push('/dashboard/wisdom365');
    } catch {
      toast.error('Assignment failed');
    } finally {
      setBusy(false);
    }
  };

  const assignedSlugs = useMemo(
    () => new Set(catalog?.me.entitlements.map((e) => e.variant.slug) ?? []),
    [catalog],
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Wisdom365Hero
        description={`Assign up to ${maxSelect} license(s) to your chosen life journeys.`}
      />
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Assign your licenses</CardTitle>
            <CardDescription>
              Select {maxSelect} journey{maxSelect !== 1 ? 's' : ''} to activate. Already assigned
              journeys are shown below.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {catalog?.variants.map((v) => {
              const already = assignedSlugs.has(v.slug);
              const isSelected = selected.includes(v.slug);
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={already}
                  onClick={() => toggle(v.slug as Wisdom365VariantSlug)}
                  className={cn(
                    'relative overflow-hidden rounded-xl border text-left transition',
                    already && 'opacity-50',
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-500/40'
                      : 'border-border hover:border-amber-500/50',
                  )}
                >
                  <div className="relative h-24">
                    <Image src={v.imageUrl} alt="" fill className="object-cover" sizes="200px" />
                    {isSelected && (
                      <div className="absolute right-2 top-2 rounded-full bg-amber-500 p-1 text-slate-950">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm">{v.name}</p>
                    {already && (
                      <p className="text-xs text-muted-foreground">Already assigned</p>
                    )}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {needsKids && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parent-managed: select child</CardTitle>
              <CardDescription>
                The Kids journey is enabled by a parent for a child in your family.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {children.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No children found in your family profile. Link family members in My Profile first.
                </p>
              ) : (
                children.map((c) => (
                  <label
                    key={c.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-3',
                      kidsChildId === c.id && 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20',
                    )}
                  >
                    <input
                      type="radio"
                      name="kids-child"
                      checked={kidsChildId === c.id}
                      onChange={() => setKidsChildId(c.id)}
                    />
                    <span className="text-sm font-medium">{c.displayName}</span>
                  </label>
                ))
              )}
            </CardContent>
          </Card>
        )}

        <Button
          className="h-12 w-full bg-amber-500 text-slate-950 hover:bg-amber-400"
          disabled={busy || selected.length === 0 || !effectiveSubId}
          onClick={handleAssign}
        >
          {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
          Provision {selected.length} journey{selected.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}
