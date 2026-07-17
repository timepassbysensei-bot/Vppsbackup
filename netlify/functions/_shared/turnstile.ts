import { env } from './env.ts';
import { logError } from './logger.ts';

/**
 * Verifies a Cloudflare Turnstile token server-side. Tokens are single-use;
 * Cloudflare rejects reused or stale tokens, so replay is handled upstream.
 */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;
  try {
    const form = new URLSearchParams();
    form.set('secret', env.turnstileSecret());
    form.set('response', token);
    if (ip && ip !== 'unknown') form.set('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (e) {
    logError('turnstile:verify_failed', e);
    return false;
  }
}
