import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';

/**
 * =============================================================================
 * BRANDING — single source of truth for the school's logo & favicon.
 * =============================================================================
 *
 * There are TWO ways to change the favicon, and this module is the one place
 * that knows about both:
 *
 *   1. No-code (recommended for the school): the principal uploads a favicon /
 *      logo from the admin dashboard. It is stored in the public `branding`
 *      storage bucket and recorded in the `branding_assets` table (key =
 *      'favicon' | 'logo'). BrandingEffects applies it at runtime.
 *
 *   2. Developer / default: replace the static files in `/public`
 *      (`favicon.svg`, `mask-icon.svg`) and/or the values in DEFAULT_BRANDING.
 *
 * See docs/CUSTOMIZATION.md for the step-by-step guide.
 */

/** The branding slots allowed by the `branding_assets.key` check constraint. */
export type BrandingKey =
  | 'logo'
  | 'favicon'
  | 'hero'
  | 'principal_photo'
  | 'about_photo'
  | 'og_image'
  | 'fallback';

export const BRANDING_KEYS: readonly BrandingKey[] = [
  'logo',
  'favicon',
  'hero',
  'principal_photo',
  'about_photo',
  'og_image',
  'fallback',
] as const;

export const BRANDING_BUCKET = 'branding';

/**
 * Static fallbacks shipped in `/public`. These render before any query resolves
 * and whenever no uploaded asset exists, so the tab icon is never blank.
 *
 * To rebrand with no database at all, just replace `/public/favicon.svg`.
 */
export const DEFAULT_FAVICON = '/favicon.svg';
export const DEFAULT_MASK_ICON = '/mask-icon.svg';
export const DEFAULT_SITE_NAME = 'View Point Public School';
export const DEFAULT_SITE_DESCRIPTION =
  'View Point Public School, Chas, Bokaro — a co-educational, CBSE-affiliated school for Nursery to Class 10.';

export const DEFAULT_BRANDING: Record<BrandingKey, string | null> = {
  logo: null, // null => header uses the built-in monogram mark
  favicon: DEFAULT_FAVICON,
  hero: null,
  principal_photo: null,
  about_photo: null,
  og_image: null,
  fallback: null,
};

/** Image MIME type inferred from a file extension (defaults to SVG). */
export function mimeForPath(path: string): string {
  const clean = path.split('?')[0] ?? path;
  const ext = clean.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'ico':
      return 'image/x-icon';
    case 'gif':
      return 'image/gif';
    case 'svg':
    default:
      return 'image/svg+xml';
  }
}

/**
 * Resolves a `branding_assets.storage_path` to a public URL.
 * Absolute URLs and root-relative paths are returned untouched.
 */
export function brandingUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (/^https?:\/\//i.test(storagePath) || storagePath.startsWith('/')) return storagePath;
  const { data } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl || null;
}

export interface BrandingAssetRow {
  key: BrandingKey;
  storage_path: string | null;
}

export interface BrandingMap {
  /** Only keys with an actual uploaded asset are present. */
  assets: Partial<Record<BrandingKey, string>>;
  /** Resolved URL per slot, always present (falls back to DEFAULT_BRANDING). */
  resolved: Record<BrandingKey, string | null>;
}

/**
 * Reads the public branding_assets rows. Public read is granted by RLS
 * (`branding_public_read`), so this works for signed-out visitors too.
 */
export function useBranding() {
  return useQuery({
    queryKey: ['branding_assets'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<BrandingMap> => {
      const { data, error } = await supabase.from('branding_assets').select('key, storage_path');
      if (error) throw error;
      const assets: Partial<Record<BrandingKey, string>> = {};
      for (const row of (data ?? []) as BrandingAssetRow[]) {
        const url = brandingUrl(row.storage_path);
        if (url) assets[row.key] = url;
      }
      const resolved = { ...DEFAULT_BRANDING } as Record<BrandingKey, string | null>;
      for (const key of BRANDING_KEYS) {
        if (assets[key]) resolved[key] = assets[key]!;
      }
      return { assets, resolved };
    },
  });
}

/** Convenience hook for a single slot, with its static fallback applied. */
export function useBrandingUrl(key: BrandingKey): string | null {
  const { data } = useBranding();
  return data?.resolved[key] ?? DEFAULT_BRANDING[key];
}
