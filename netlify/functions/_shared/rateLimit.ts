/**
 * Best-effort in-memory fixed-window rate limiter, keyed by client IP + bucket.
 *
 * NOTE ON DURABILITY: Netlify Functions are stateless and horizontally scaled,
 * so this map is per-instance and resets on cold start. It stops casual abuse
 * and accidental floods but is NOT a hard guarantee. For strong limits back this
 * with a shared store (e.g. Upstash Redis or a Supabase table). See
 * docs/SECURITY_CHECKLIST.md.
 */

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Max requests allowed within the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Logical bucket name to keep unrelated endpoints independent. */
  bucket: string;
}

export function rateLimit(ip: string, opts: RateLimitOptions): boolean {
  const key = `${opts.bucket}:${ip}`;
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }
  if (existing.count >= opts.max) {
    return false;
  }
  existing.count += 1;
  return true;
}

/** Extract a best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const xf = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]!.trim();
  return 'unknown';
}
