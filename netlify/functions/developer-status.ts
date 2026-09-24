import { guard } from './_shared/handler.ts';
import { json } from './_shared/json.ts';
import { DEVELOPER } from '../../src/lib/developer.ts';
import { logInternal } from './_shared/logger.ts';

/**
 * Developer-credit availability probe.
 *
 * The footer must never wait for this, and DNS alone proves nothing (a domain can
 * resolve while serving nothing, a parking page or someone else's content). So we
 * do a real, bounded HTTP fetch of the primary URL and only report it as usable
 * when it answers 2xx with HTML that contains the configured marker.
 *
 * Results are cached in the (warm) function instance for `cacheTtlMs`, so at most
 * one probe per instance per TTL window is performed no matter how many visitors
 * load a page.
 */

interface Status {
  url: string;
  reachable: boolean;
  reason: 'ok' | 'http_error' | 'not_html' | 'marker_missing' | 'unreachable';
  checkedAt: string;
}

let cached: { status: Status; expires: number } | null = null;

function isHtml(contentType: string | null): boolean {
  if (!contentType) return false;
  const type = contentType.toLowerCase();
  return type.includes('text/html') || type.includes('application/xhtml');
}

async function probe(url: string): Promise<Status> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEVELOPER.probeTimeoutMs);
  const checkedAt = new Date().toISOString();

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { accept: 'text/html', 'user-agent': 'vpps-developer-credit-check/1.0' },
    });

    if (!res.ok) {
      return { url: DEVELOPER.fallbackUrl, reachable: false, reason: 'http_error', checkedAt };
    }
    if (!isHtml(res.headers.get('content-type'))) {
      return { url: DEVELOPER.fallbackUrl, reachable: false, reason: 'not_html', checkedAt };
    }

    const body = (await res.text()).slice(0, 200_000).toLowerCase();
    if (!body.includes(DEVELOPER.marker.toLowerCase())) {
      // Answers, but it is not demonstrably the developer's own site.
      return { url: DEVELOPER.fallbackUrl, reachable: false, reason: 'marker_missing', checkedAt };
    }

    return { url: DEVELOPER.primaryUrl, reachable: true, reason: 'ok', checkedAt };
  } catch {
    return { url: DEVELOPER.fallbackUrl, reachable: false, reason: 'unreachable', checkedAt };
  } finally {
    clearTimeout(timer);
  }
}

export default guard(
  'developer-status',
  { rateLimit: { max: 60, windowMs: 60_000, bucket: 'developer-status' }, requireJson: false },
  async () => {
    if (cached && cached.expires > Date.now()) {
      return json(200, cached.status, { 'cache-control': 'public, max-age=3600' });
    }

    const status = await probe(DEVELOPER.primaryUrl);
    cached = { status, expires: Date.now() + DEVELOPER.cacheTtlMs };

    logInternal('developer-status:checked', { reachable: status.reachable, reason: status.reason });
    return json(200, status, { 'cache-control': 'public, max-age=3600' });
  },
);
