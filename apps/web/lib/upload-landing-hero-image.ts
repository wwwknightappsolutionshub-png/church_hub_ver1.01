import { uploadLandingImage, type LandingImageUploadResult } from '@/lib/upload-landing-image';

export type LandingHeroUploadResult = LandingImageUploadResult;

export async function uploadLandingHeroImage(file: File): Promise<LandingHeroUploadResult> {
  return uploadLandingImage(file, 'hero');
}
