/**
 * =============================================================================
 * DEVELOPER BRANDING — the person who built this website.
 * =============================================================================
 *
 * Change the three values below to re-brand the footer credit for another
 * project. Nothing else has to be touched: the footer, the availability check
 * (`netlify/functions/developer-status.ts`) and the docs all read from here.
 *
 * This file must stay dependency-free — a Netlify Function imports it too.
 *
 * IMPORTANT: DNS resolution is NOT proof that a domain is live, owned or
 * pointing at the right site. So the primary URL is only used after an actual
 * HTTP fetch confirms the site answers with HTML that contains `marker`.
 */

export interface DeveloperBranding {
  /** Display name shown in the footer credit. */
  name: string;
  /** Preferred destination, checked at runtime before it is linked. */
  primaryUrl: string;
  /** Used when the primary URL is not reachable/verifiable. */
  fallbackUrl: string;
  /**
   * Text the primary site must contain for the availability check to pass.
   * Set this to something that appears on your own site (your name, a slogan).
   * If your site does not contain it, the fallback URL is used instead.
   */
  marker: string;
  /** How long an availability result is reused (function + browser cache). */
  cacheTtlMs: number;
  /** Abort the availability probe after this long, so it can never hang. */
  probeTimeoutMs: number;
}

export const DEVELOPER: DeveloperBranding = {
  name: 'Ravi Dey',
  primaryUrl: 'https://ravidey.com',
  fallbackUrl: 'https://ravidey.netlify.app',
  marker: 'Ravi Dey',
  cacheTtlMs: 6 * 60 * 60_000,
  probeTimeoutMs: 4000,
};

/**
 * What the footer links to *immediately*, before any check has resolved.
 * The link never waits for the network — see `useDeveloperUrl()`.
 */
export const DEVELOPER_URL = DEVELOPER.primaryUrl;

/** Host (without protocol) of a URL, for display next to the credit. */
export function developerHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
}
