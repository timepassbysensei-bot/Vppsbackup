import { json } from './json.ts';
import { corsHeaders, originAllowed } from './cors.ts';
import { rateLimit, clientIp, type RateLimitOptions } from './rateLimit.ts';
import { logError } from './logger.ts';

const MAX_BODY_BYTES = 20_000;

export interface GuardOptions {
  rateLimit: RateLimitOptions;
  /** Set false only for endpoints that legitimately accept no body. */
  requireJson?: boolean;
}

type Parsed = { body: unknown; req: Request; ip: string };

/**
 * Hardening wrapper applied to EVERY function:
 *  - method check (POST only) + OPTIONS preflight
 *  - same-origin allowlist CORS
 *  - content-type check
 *  - body-size cap
 *  - per-IP rate limit
 *  - generic errors (never leak internals) + structured internal logs
 *
 * Per-endpoint auth/authorization and Zod validation happen INSIDE `fn`.
 */
export function guard(name: string, opts: GuardOptions, fn: (p: Parsed) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const cors = corsHeaders(req);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (req.method !== 'POST') {
      return json(405, { error: 'method_not_allowed' }, cors);
    }
    if (!originAllowed(req)) {
      return json(403, { error: 'forbidden_origin' }, cors);
    }

    const requireJson = opts.requireJson !== false;
    if (requireJson && !req.headers.get('content-type')?.includes('application/json')) {
      return json(415, { error: 'unsupported_media_type' }, cors);
    }

    const ip = clientIp(req);
    if (!rateLimit(ip, opts.rateLimit)) {
      return json(429, { error: 'rate_limited' }, cors);
    }

    let raw = '';
    try {
      raw = await req.text();
    } catch {
      return json(400, { error: 'bad_request' }, cors);
    }
    if (raw.length > MAX_BODY_BYTES) {
      return json(413, { error: 'payload_too_large' }, cors);
    }

    let body: unknown = undefined;
    if (requireJson) {
      try {
        body = JSON.parse(raw);
      } catch {
        return json(400, { error: 'invalid_json' }, cors);
      }
    }

    try {
      const res = await fn({ body, req, ip });
      // Ensure CORS headers ride along on the function response.
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (e) {
      logError(`${name}:unhandled`, e, { ip });
      return json(500, { error: 'server_error' }, cors);
    }
  };
}
