'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { uploadLandingImage, type LandingImageSlot } from '@/lib/upload-landing-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function LandingImageUploadField({
  label,
  imageUrl,
  disabled,
  onImageUrlChange,
  slot,
  previewClassName = 'aspect-video w-full object-cover',
  placeholder = 'https://… or upload from device',
  hint = 'JPEG, PNG, or WebP from your gallery or camera. Images are stored on the server when you save & publish.',
  testId,
}: {
  label: string;
  imageUrl?: string;
  disabled?: boolean;
  onImageUrlChange: (url: string) => void;
  slot: LandingImageSlot;
  previewClassName?: string;
  placeholder?: string;
  hint?: string;
  testId?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    setUploading(true);
    try {
      const { url } = await uploadLandingImage(file, slot);
      onImageUrlChange(url);
      toast.success('Image uploaded — save & publish to apply');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload image');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div data-testid={testId}>
      <Label>{label}</Label>
      {imageUrl ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className={cn(previewClassName)} />
        </div>
      ) : null}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={imageUrl ?? ''}
          disabled={disabled}
          onChange={(e) => onImageUrlChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Upload from device
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
