/**
 * =============================================================================
 * image.ts — client-side image compression for school uploads
 * =============================================================================
 *
 * Phones used by staff produce 4–12 MB photos straight from the camera. Uploading
 * those unchanged is slow on school Wi-Fi and wasteful in Supabase Storage, so
 * every image upload (homework photos, gallery, achievements, birthday / Student
 * of the Month photos, notices) is passed through `compressImage` first.
 *
 * What it does:
 *   • corrects EXIF orientation (photos taken sideways on a phone)
 *   • resizes so the longest edge is at most `maxEdge` (default 1600px), which
 *     still keeps handwritten notebook pages legible
 *   • re-encodes to WebP where the browser supports it, else JPEG
 *   • reports original vs compressed byte sizes so the UI can show the saving
 *   • falls back to the ORIGINAL file whenever anything at all fails, so a
 *     browser without canvas/createImageBitmap can still upload
 *
 * It is deliberately dependency-free and safe to import in tests (no DOM access
 * at module load). Server-side / Storage validation is layered on top via the
 * bucket `file_size_limit` + `allowed_mime_types` in migration 0007.
 */

/** Types we accept from a file picker. `image/*` is not trusted. */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

/** Hard cap on the *original* file, before compression. */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB
/** Cap on the compressed output (should always be far below this). */
export const MAX_COMPRESSED_BYTES = 3 * 1024 * 1024; // 3 MB

export interface CompressOptions {
  /** Longest edge of the output. */
  maxEdge?: number;
  /** 0–1 encoder quality. 0.82 keeps notebook text readable. */
  quality?: number;
  /** Try WebP first (falls back to JPEG automatically when unsupported). */
  preferWebp?: boolean;
}

export interface CompressedImage {
  /** The blob actually uploaded. */
  blob: Blob;
  /** A File wrapper (so callers can pass it straight to supabase.storage). */
  file: File;
  /** Object URL for previewing. Caller should revoke when done. */
  previewUrl: string;
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
  mime: string;
  /** True when compression could not run and the original was kept. */
  fallback: boolean;
  /** Human-readable extension for the stored filename. */
  ext: string;
}

export interface ImageValidation {
  ok: boolean;
  /** Short, user-facing reason when `ok` is false. */
  reason?: string;
}

/** Cheap pre-flight validation before we spend time decoding. */
export function validateImageFile(file: File): ImageValidation {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    // Some Android pickers report an empty type for camera captures; accept those
    // by extension so phone uploads keep working, but reject anything else.
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext)) {
      return { ok: false, reason: 'Please choose a JPG, PNG, WebP or HEIC image.' };
    }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: 'That image is too large (maximum 20 MB before compression).' };
  }
  return { ok: true };
}

/** Formats bytes as "1.4 MB" / "820 KB" for the before/after readout. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function extForMime(mime: string): string {
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/png') return 'png';
  return 'jpg';
}

/** Picks the best output MIME the canvas actually supports. */
function pickOutputMime(canvas: HTMLCanvasElement, preferWebp: boolean): string {
  if (!preferWebp || typeof canvas.toDataURL !== 'function') return 'image/jpeg';
  try {
    const webp = canvas.toDataURL('image/webp');
    if (webp.startsWith('data:image/webp')) return 'image/webp';
  } catch {
    /* canvas may throw on tainted data — ignore and use JPEG */
  }
  return 'image/jpeg';
}

/** URL.createObjectURL that never throws (jsdom/tests, restricted contexts). */
function safeObjectUrl(blob: Blob): string {
  try {
    return URL.createObjectURL(blob);
  } catch {
    return '';
  }
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== 'function') {
      resolve(null);
      return;
    }
    try {
      canvas.toBlob((blob) => resolve(blob), mime, quality);
    } catch {
      resolve(null);
    }
  });
}

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  /** Cleanup for the ImageBitmap path. */
  close?: () => void;
}

/** Decodes the file, preferring createImageBitmap so EXIF orientation is applied. */
async function decode(file: File): Promise<Decoded | null> {
  const bitmapFn = (globalThis as { createImageBitmap?: typeof createImageBitmap }).createImageBitmap;
  if (typeof bitmapFn === 'function') {
    try {
      const bitmap = await bitmapFn(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      /* fall through to the <img> path */
    }
  }

  // Fallback decoder used by browsers without createImageBitmap (and jsdom).
  if (typeof Image === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return null;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode_failed'));
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      close: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

/**
 * Compresses an image file. Never throws for a valid image: on any internal
 * failure it returns the original file flagged `fallback: true`.
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<CompressedImage> {
  const { maxEdge = 1600, quality = 0.82, preferWebp = true } = opts;
  const originalBytes = file.size;

  const passthrough = (): CompressedImage => ({
    blob: file,
    file,
    previewUrl: safeObjectUrl(file),
    width: 0,
    height: 0,
    originalBytes,
    compressedBytes: originalBytes,
    mime: file.type || 'image/jpeg',
    fallback: true,
    ext: file.name.split('.').pop()?.toLowerCase() || 'jpg',
  });

  let decoded: Decoded | null = null;
  try {
    decoded = await decode(file);
  } catch {
    decoded = null;
  }
  if (!decoded) return passthrough();

  try {
    const scale = Math.min(1, maxEdge / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return passthrough();
    ctx.drawImage(decoded.source, 0, 0, width, height);

    const mime = pickOutputMime(canvas, preferWebp);
    const blob = await toBlob(canvas, mime, quality);
    if (!blob) return passthrough();

    // If the "compressed" result is somehow larger (tiny already-optimised image),
    // keep the original instead.
    if (blob.size >= originalBytes && file.type === mime) return passthrough();

    const ext = extForMime(mime);
    const outFile = new File([blob], `compressed.${ext}`, { type: mime });
    return {
      blob,
      file: outFile,
      previewUrl: safeObjectUrl(blob),
      width,
      height,
      originalBytes,
      compressedBytes: blob.size,
      mime,
      fallback: false,
      ext,
    };
  } catch {
    return passthrough();
  } finally {
    decoded.close?.();
  }
}
