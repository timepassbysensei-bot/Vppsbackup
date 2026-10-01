import { supabase } from './supabase';
import { compressImage, validateImageFile, type CompressOptions } from './image';

/**
 * uploads.ts — shared compress-then-upload pipeline used by every image-uploading
 * module (homework, gallery, achievements, Student of the Month, birthday,
 * notices). Keeping it in one place means compression, validation and error
 * handling behave identically everywhere.
 *
 * Progress note: supabase-js v2 does not expose byte-level upload progress, so
 * `onStage` reports the real pipeline stages (validating → compressing →
 * uploading → done). The UI shows an indeterminate bar during `uploading`.
 */

export type UploadStage = 'validating' | 'compressing' | 'uploading' | 'done';

export interface UploadedAsset {
  bucket: string;
  path: string;
  /** Public URL for buckets that are public; null for private buckets. */
  publicUrl: string | null;
  width: number;
  height: number;
  sizeBytes: number;
  originalBytes: number;
  mime: string;
  fallback: boolean;
}

export interface UploadImageOptions extends CompressOptions {
  /** Bucket is public by default; pass false for private buckets. */
  publicBucket?: boolean;
  onStage?: (stage: UploadStage) => void;
}

function randomName(ext: string): string {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${id}.${ext}`;
}

/** Throws a human-readable Error when validation fails so callers can surface it. */
export async function compressAndUploadImage(
  bucket: string,
  folder: string,
  file: File,
  options: UploadImageOptions = {},
): Promise<UploadedAsset> {
  const { publicBucket = true, onStage, ...compressOpts } = options;
  onStage?.('validating');
  const check = validateImageFile(file);
  if (!check.ok) throw new Error(check.reason ?? 'Invalid image.');

  onStage?.('compressing');
  const compressed = await compressImage(file, compressOpts);

  const safeFolder = folder.replace(/^\/+|\/+$/g, '');
  const path = `${safeFolder ? `${safeFolder}/` : ''}${randomName(compressed.ext)}`;

  onStage?.('uploading');
  const { error } = await supabase.storage.from(bucket).upload(path, compressed.blob, {
    contentType: compressed.mime,
    upsert: false,
  });
  if (error) {
    URL.revokeObjectURL(compressed.previewUrl);
    throw error;
  }

  onStage?.('done');
  const publicUrl = publicBucket ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;
  URL.revokeObjectURL(compressed.previewUrl);

  return {
    bucket,
    path,
    publicUrl,
    width: compressed.width,
    height: compressed.height,
    sizeBytes: compressed.compressedBytes,
    originalBytes: compressed.originalBytes,
    mime: compressed.mime,
    fallback: compressed.fallback,
  };
}

export function publicUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith('/')) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl || null;
}

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
] as const;

export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

/** Uploads a non-image document (PDF/Word/Excel/text) unchanged. */
export async function uploadDocument(
  bucket: string,
  folder: string,
  file: File,
  options: { publicBucket?: boolean; onStage?: (stage: UploadStage) => void } = {},
): Promise<UploadedAsset> {
  const { publicBucket = true, onStage } = options;
  onStage?.('validating');
  const type = file.type || '';
  if (!ALLOWED_DOCUMENT_TYPES.includes(type as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
    throw new Error('Please choose a PDF, Word, Excel or text file.');
  }
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error('That file is too large (maximum 15 MB).');

  const safeFolder = folder.replace(/^\/+|\/+$/g, '');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const path = `${safeFolder ? `${safeFolder}/` : ''}${randomName(ext)}`;
  onStage?.('uploading');
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: type, upsert: false });
  if (error) throw error;
  onStage?.('done');
  return {
    bucket,
    path,
    publicUrl: publicBucket ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null,
    width: 0,
    height: 0,
    sizeBytes: file.size,
    originalBytes: file.size,
    mime: type,
    fallback: true,
  };
}

/** Best-effort object removal. Never throws (deletion must not block the UI). */
export async function removeObject(bucket: string, path: string | null | undefined): Promise<void> {
  if (!path) return;
  try {
    await supabase.storage.from(bucket).remove([path]);
  } catch {
    /* ignore — the DB row is the source of truth */
  }
}
