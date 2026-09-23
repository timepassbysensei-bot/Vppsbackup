import { useEffect } from 'react';
import { useSettings } from '@/lib/hooks/useSettings';
import { env } from '@/lib/env';
import {
  useBranding,
  DEFAULT_FAVICON,
  DEFAULT_MASK_ICON,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_NAME,
  mimeForPath,
} from '@/lib/branding';

/**
 * BrandingEffects — a render-less component that keeps the document head in
 * sync with the school's settings + branding assets.
 *
 * Why runtime instead of hard-coding in index.html?
 *  - The school name, tagline, favicon and share image are editable from the
 *    admin dashboard, so the static index.html can only ever be a fallback.
 *  - It updates the SAME <link>/<meta> tags declared in index.html (matched via
 *    the `data-vpps-*` attributes) instead of appending duplicates, so browsers,
 *    mobile home-screen icons, and saved bookmarks all pick up one consistent
 *    value.
 *
 * Everything here degrades gracefully: if Supabase is unreachable or no asset is
 * uploaded, the static /public defaults stay in place.
 */
export function BrandingEffects() {
  const { data: settings } = useSettings();
  const { data: branding } = useBranding();

  useEffect(() => {
    const favicon = branding?.resolved.favicon ?? DEFAULT_FAVICON;
    const faviconType = mimeForPath(favicon);
    // Safari pinned tabs need a monochrome SVG; reuse an SVG favicon if provided.
    const maskIcon = faviconType === 'image/svg+xml' ? favicon : DEFAULT_MASK_ICON;
    const ogImage = branding?.resolved.og_image ?? favicon;
    const brandColor = cssVar('--color-navy') || '#10243f';

    // --- Favicon set (desktop, browser tabs, mobile, bookmarks) --------------
    for (const el of document.querySelectorAll<HTMLLinkElement>('link[data-vpps-favicon]')) {
      el.href = favicon;
      // The SVG link keeps its declared type; raster uploads override it.
      if (faviconType !== 'image/svg+xml') el.type = faviconType;
    }
    for (const el of document.querySelectorAll<HTMLLinkElement>('link[data-vpps-apple-touch-icon]')) {
      el.href = favicon;
    }
    for (const el of document.querySelectorAll<HTMLLinkElement>('link[data-vpps-mask-icon]')) {
      el.href = maskIcon;
      el.setAttribute('color', brandColor);
    }
    for (const el of document.querySelectorAll<HTMLMetaElement>('meta[data-vpps-theme-color]')) {
      el.content = brandColor;
    }

    // --- Document title + share metadata -------------------------------------
    const name = settings?.name_en?.trim() || DEFAULT_SITE_NAME;
    document.title = name;

    const description =
      settings?.homepage_intro_en?.trim() || settings?.tagline?.trim() || DEFAULT_SITE_DESCRIPTION;

    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:site_name', name);
    upsertMeta('property', 'og:title', name);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', env.siteUrl);
    if (ogImage) upsertMeta('property', 'og:image', ogImage);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'application-name', name);
  }, [settings, branding]);

  return null;
}

/** Reads a CSS custom property from :root (keeps index.css the color source of truth). */
function cssVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}
