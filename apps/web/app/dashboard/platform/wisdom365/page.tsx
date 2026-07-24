'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, ChevronLeft, Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { enterpriseHeroChipClass } from '@/components/layout/EnterpriseModuleShell';
import { Wisdom365VariantEditor, type VariantRow } from '@/components/platform/wisdom365/Wisdom365VariantEditor';
import { Wisdom365ContentManager } from '@/components/platform/wisdom365/Wisdom365ContentManager';
import { Wisdom365SubscriptionsTab } from '@/components/platform/wisdom365/Wisdom365SubscriptionsTab';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPence } from '@/lib/wisdom365-api';

interface DashboardStats {
  variantCount: number;
  contentCount: number;
  activeSubscriptions: number;
  pendingSubscriptions: number;
  totalRevenuePence: number;
  churchesAvailable: number;
}

interface ProductConfig {
  licensePricePence: number;
  multiLicenseDiscountPercent: number;
  multiLicenseMinCount: number;
  currency: string;
  subscriptionDurationDays: number;
  isActive: boolean;
}

interface ChurchAvail {
  churchId: string;
  name: string;
  slug: string;
  isAvailable: boolean;
  notes: string | null;
}

export default function PlatformWisdom365Page() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isPlatformAdmin, isLoading: authLoading } = useModuleAccess();

  const { data: dashboard } = useApiQuery<DashboardStats>(
    ['platform-w365-dashboard'],
    '/platform/wisdom365/dashboard',
    { enabled: isPlatformAdmin },
  );

  const { data: product, refetch: refetchProduct } = useApiQuery<ProductConfig>(
    ['platform-w365-product'],
    '/platform/wisdom365/product-config',
    { enabled: isPlatformAdmin },
  );

  const { data: variants, refetch: refetchVariants } = useApiQuery<VariantRow[]>(
    ['platform-w365-variants'],
    '/platform/wisdom365/variants',
    { enabled: isPlatformAdmin },
  );

  const { data: churches, refetch: refetchChurches } = useApiQuery<ChurchAvail[]>(
    ['platform-w365-churches'],
    '/platform/wisdom365/churches',
    { enabled: isPlatformAdmin },
  );

  const [productForm, setProductForm] = useState<ProductConfig | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);

  useEffect(() => {
    if (!authLoading && !isPlatformAdmin) router.replace('/dashboard');
  }, [authLoading, isPlatformAdmin, router]);

  useEffect(() => {
    if (product) setProductForm(product);
  }, [product]);

  const saveProduct = async () => {
    if (!productForm) return;
    setSavingProduct(true);
    try {
      await api.put('/platform/wisdom365/product-config', productForm);
      toast.success('Product config saved');
      void refetchProduct();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Request failed'));
    } finally {
      setSavingProduct(false);
    }
  };

  const toggleChurch = async (churchId: string, isAvailable: boolean) => {
    try {
      await api.patch(`/platform/wisdom365/churches/${churchId}/availability`, { isAvailable });
      toast.success(isAvailable ? 'Church enabled' : 'Church disabled');
      void refetchChurches();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Request failed'));
    }
  };

  const refreshVariants = () => {
    void refetchVariants();
    void queryClient.invalidateQueries({ queryKey: ['platform-w365-variants'] });
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <DashboardModuleShell
      title="Wisdom365+ Management"
      description={MODULE_DESCRIPTIONS.platformWisdom365}
      actions={
        <Button variant="outline" size="sm" className={enterpriseHeroChipClass} asChild>
          <Link href="/dashboard/platform">
            <ChevronLeft className="mr-1 h-4 w-4" /> Platform
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{dashboard?.activeSubscriptions ?? '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Content entries</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{dashboard?.contentCount ?? '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Revenue (paid)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {dashboard ? formatPence(dashboard.totalRevenuePence) : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Churches available</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{dashboard?.churchesAvailable ?? '—'}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="product">
          <TabsList className="flex h-auto flex-wrap gap-1">
            <TabsTrigger value="product">Pricing</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="content">Content repo</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="churches">Churches</TabsTrigger>
          </TabsList>

          <TabsContent value="product" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" /> Product & pricing
                </CardTitle>
                <CardDescription>
                  Set the annual license price for all Wisdom365+ journeys (Business Owners, Students,
                  Youths, Kids, Husbands, Wives). Checkout, landing pages, and marketing emails use this
                  price automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {productForm && (
                  <>
                    <label className="text-sm sm:col-span-2">
                      Price per license (per year)
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        <div className="relative w-full max-w-[200px]">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            £
                          </span>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            className="pl-7"
                            value={(productForm.licensePricePence / 100).toFixed(
                              productForm.licensePricePence % 100 === 0 ? 0 : 2,
                            )}
                            onChange={(e) => {
                              const pounds = parseFloat(e.target.value);
                              const pence = Number.isFinite(pounds)
                                ? Math.round(pounds * 100)
                                : 0;
                              setProductForm({
                                ...productForm,
                                licensePricePence: Math.max(0, pence),
                              });
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Displayed as{' '}
                          <strong className="text-foreground">
                            {formatPence(productForm.licensePricePence, productForm.currency)}
                          </strong>{' '}
                          / license / year
                        </span>
                      </div>
                    </label>
                    <label className="text-sm">
                      Currency
                      <Input
                        className="mt-1 uppercase"
                        value={productForm.currency}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            currency: e.target.value.toUpperCase().slice(0, 3) || 'GBP',
                          })
                        }
                      />
                    </label>
                    <label className="text-sm">
                      Multi-license discount (%)
                      <Input
                        type="number"
                        className="mt-1"
                        value={productForm.multiLicenseDiscountPercent}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            multiLicenseDiscountPercent: parseInt(e.target.value, 10) || 0,
                          })
                        }
                      />
                    </label>
                    <label className="text-sm">
                      Min licenses for discount
                      <Input
                        type="number"
                        className="mt-1"
                        value={productForm.multiLicenseMinCount}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            multiLicenseMinCount: parseInt(e.target.value, 10) || 2,
                          })
                        }
                      />
                    </label>
                    <label className="text-sm">
                      Subscription duration (days)
                      <Input
                        type="number"
                        className="mt-1"
                        value={productForm.subscriptionDurationDays}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            subscriptionDurationDays: parseInt(e.target.value, 10) || 365,
                          })
                        }
                      />
                    </label>
                  </>
                )}
                <div className="sm:col-span-2">
                  <Button onClick={saveProduct} disabled={savingProduct}>
                    {savingProduct ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save product config
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variants" className="mt-4">
            {variants && <Wisdom365VariantEditor variants={variants} onSaved={refreshVariants} />}
          </TabsContent>

          <TabsContent value="content" className="mt-4">
            {variants && <Wisdom365ContentManager variants={variants} />}
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-4">
            <Wisdom365SubscriptionsTab />
          </TabsContent>

          <TabsContent value="churches" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" /> Church availability
                </CardTitle>
                <CardDescription>Control which churches can offer Wisdom365+</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {churches?.map((c) => (
                  <div
                    key={c.churchId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.slug}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={c.isAvailable ? 'destructive' : 'default'}
                      className={c.isAvailable ? undefined : 'font-semibold'}
                      onClick={() => void toggleChurch(c.churchId, !c.isAvailable)}
                    >
                      {c.isAvailable ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardModuleShell>
  );
}
