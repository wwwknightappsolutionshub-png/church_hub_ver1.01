'use client';

import { LandingImageUploadField } from '@/components/church-landing/LandingImageUploadField';

export function HeroSlideImageField({
  imageUrl,
  disabled,
  onImageUrlChange,
}: {
  imageUrl: string;
  disabled?: boolean;
  onImageUrlChange: (url: string) => void;
}) {
  return (
    <LandingImageUploadField
      label="Slide image"
      imageUrl={imageUrl}
      disabled={disabled}
      onImageUrlChange={onImageUrlChange}
      slot="hero"
      previewClassName="aspect-[21/9] w-full object-cover"
      hint="JPEG, PNG, or WebP from your gallery or camera. Images are resized for fast loading."
    />
  );
}
