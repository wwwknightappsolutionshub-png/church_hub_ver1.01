const DEFAULT_MAX_EDGE = 1024;
const DEFAULT_JPEG_QUALITY = 0.88;
const AVATAR_MAX_EDGE = 512;
const AVATAR_JPEG_QUALITY = 0.82;

export interface ResizeImageOptions {
  maxEdge?: number;
  maxBytes?: number;
  quality?: number;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(blob);
  });
}

/** Resize and compress an image file for upload (mobile-friendly). */
export async function resizeImageForUpload(
  file: File,
  options?: ResizeImageOptions,
): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are supported');
  }

  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options?.quality ?? (maxEdge <= AVATAR_MAX_EDGE ? AVATAR_JPEG_QUALITY : DEFAULT_JPEG_QUALITY);
  const maxBytes = options?.maxBytes;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Could not open this image. Try JPEG or PNG.');
  }

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Could not process image');
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const mime = 'image/jpeg';
  let blob = await canvasToBlob(canvas, mime, quality);

  if (maxBytes && blob.size > maxBytes) {
    let q = quality;
    while (q > 0.45 && blob.size > maxBytes) {
      q -= 0.08;
      blob = await canvasToBlob(canvas, mime, q);
    }
    if (blob.size > maxBytes) {
      throw new Error('Photo is too large. Choose a smaller image.');
    }
  }

  return blob;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not compress image'))),
      mime,
      quality,
    );
  });
}
