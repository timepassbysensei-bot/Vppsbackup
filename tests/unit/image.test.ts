import { describe, expect, it } from 'vitest';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  compressImage,
  formatBytes,
  validateImageFile,
} from '@/lib/image';

function fileOf(bytes: number, type: string, name = 'photo.jpg'): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('formatBytes', () => {
  it('renders bytes, kilobytes and megabytes', () => {
    expect(formatBytes(0)).toBe('0 KB');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });

  it('never throws on bad input', () => {
    expect(formatBytes(Number.NaN)).toBe('0 KB');
    expect(formatBytes(-5)).toBe('0 KB');
  });
});

describe('validateImageFile', () => {
  it('accepts an allowed image type under the size limit', () => {
    expect(validateImageFile(fileOf(1024, 'image/jpeg')).ok).toBe(true);
  });

  it('accepts a camera capture reported with an empty MIME type by extension', () => {
    expect(validateImageFile(fileOf(1024, '', 'IMG_0001.jpg')).ok).toBe(true);
  });

  it('rejects a non-image', () => {
    const res = validateImageFile(fileOf(1024, 'text/plain', 'notes.txt'));
    expect(res.ok).toBe(false);
    expect(res.reason).toBeTruthy();
  });

  it('rejects a file larger than the cap', () => {
    const res = validateImageFile(fileOf(MAX_IMAGE_BYTES + 1, 'image/jpeg'));
    expect(res.ok).toBe(false);
  });

  it('exposes the accepted types', () => {
    expect(ALLOWED_IMAGE_TYPES).toContain('image/webp');
  });
});

describe('compressImage', () => {
  it('falls back to the original when the browser cannot decode (jsdom)', async () => {
    const original = fileOf(4096, 'image/jpeg');
    const out = await compressImage(original);
    expect(out.fallback).toBe(true);
    expect(out.compressedBytes).toBe(original.size);
    expect(out.blob.size).toBe(original.size);
  });

  it('honours a custom max edge without throwing', async () => {
    const out = await compressImage(fileOf(2048, 'image/png'), { maxEdge: 800, quality: 0.7 });
    expect(typeof out.compressedBytes).toBe('number');
    expect(out.mime).toBeTruthy();
  });
});
