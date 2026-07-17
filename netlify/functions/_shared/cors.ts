import { env } from './env.ts';

/**
 * Same-origin allowlist CORS. We never reflect an arbitrary Origin. Only origins
 * present in ALLOWED_ORIGINS (plus VITE_SITE_URL) are permitted. When the origin
 * is not allowed we return no CORS headers, so the browser blocks the response.
 */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const allowed = env.allowedOrigins();
  if (origin && allowed.includes(origin)) {
    return {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-max-age': '600',
      vary: 'Origin',
    };
  }
  return { vary: 'Origin' };
}

/** True when the request originates from an allowed origin (or has no Origin — same-origin/server). */
export function originAllowed(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // same-origin requests may omit Origin
  return env.allowedOrigins().includes(origin);
}
