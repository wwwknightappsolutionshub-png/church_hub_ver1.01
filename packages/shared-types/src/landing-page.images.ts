/** Max length for stored http(s) image URLs (not inline base64). */
export const LANDING_IMAGE_URL_MAX_LENGTH = 2048;

export function isInlineImageUrl(url: string | null | undefined): boolean {
  const t = url?.trim() ?? '';
  return t.startsWith('data:') || t.startsWith('blob:');
}

/** Keep http(s) or relative URLs; drop inline blobs and oversized strings. */
export function sanitizeLandingImageUrl(url: string | null | undefined): string | null {
  const t = url?.trim();
  if (!t || isInlineImageUrl(t)) return null;
  if (t.length > LANDING_IMAGE_URL_MAX_LENGTH) {
    return t.slice(0, LANDING_IMAGE_URL_MAX_LENGTH);
  }
  return t;
}

export function assertLandingSaveableImages(content: {
  heroSlides?: { imageUrl?: string }[];
  hero?: { imageUrl?: string };
  about?: { pastorImageUrl?: string };
  announcements?: { imageUrl?: string }[];
}): void {
  const inline: string[] = [];
  for (const slide of content.heroSlides ?? []) {
    if (isInlineImageUrl(slide.imageUrl)) inline.push('hero carousel');
  }
  if (isInlineImageUrl(content.hero?.imageUrl)) inline.push('hero');
  if (isInlineImageUrl(content.about?.pastorImageUrl)) inline.push('about photo');
  for (const a of content.announcements ?? []) {
    if (isInlineImageUrl(a.imageUrl)) inline.push('announcements');
  }
  if (inline.length) {
    const unique = [...new Set(inline)];
    throw new Error(
      `Images in ${unique.join(', ')} must be uploaded using "Upload from device" (not embedded). Re-upload, then save again. If upload fails, restart the API.`,
    );
  }
}
