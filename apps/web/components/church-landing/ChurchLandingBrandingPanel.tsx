'use client';

import { useRef, useState } from 'react';
import { Globe, ImageIcon, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { buildDefaultLandingPublicDomain } from '@church-hub/shared-types';
import { uploadChurchLogo } from '@/lib/upload-church-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type ChurchLandingBrandingState = {
  publicDomain: string;
  logoUrl: string | null;
};

export function ChurchLandingBrandingPanel({
  slug,
  defaultPublicDomain,
  branding,
  onChange,
  disabled,
}: {
  slug: string;
  defaultPublicDomain: string;
  branding: ChurchLandingBrandingState;
  onChange: (next: ChurchLandingBrandingState) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const fallbackDefault = defaultPublicDomain || buildDefaultLandingPublicDomain(slug);

  const handleLogoFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    setUploading(true);
    try {
      const { url } = await uploadChurchLogo(file);
      onChange({ ...branding, logoUrl: url });
      toast.success('Logo uploaded — save & publish to apply');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload logo');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4" data-testid="church-landing-branding">
      <h2 className="text-sm font-semibold">Public URL & logo</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Set the domain visitors use to find your church site and the logo shown in the header.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor="landing-public-domain" className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Preferred public domain
          </Label>
          <Input
            id="landing-public-domain"
            value={branding.publicDomain}
            disabled={disabled}
            placeholder={fallbackDefault}
            onChange={(e) => onChange({ ...branding, publicDomain: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Default:{' '}
            <code className="rounded bg-muted px-1">{fallbackDefault}</code>
            <br />
            Leave blank on save to use the default. Point DNS to Church Hub when using a custom
            domain.
          </p>
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            Landing page logo
          </Label>
          <div className="flex items-start gap-4">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
                No logo
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <Input
                value={branding.logoUrl ?? ''}
                disabled={disabled}
                placeholder="https://… or upload an image"
                onChange={(e) =>
                  onChange({ ...branding, logoUrl: e.target.value.trim() || null })
                }
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => void handleLogoFile(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload logo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
