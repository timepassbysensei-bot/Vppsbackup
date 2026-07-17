import { env } from './env.ts';
import { logError, logInternal } from './logger.ts';

/**
 * Minimal admin email alert via Resend. This is a SHARED INTERNAL MODULE, not a
 * public HTTP endpoint, so there is no open email relay to abuse. The alert body
 * is deliberately minimal: it NEVER contains complaint text, phone numbers, or
 * any other PII — it only tells the principal to check the dashboard.
 *
 * If Resend is not configured (e.g. preview deploys), it silently no-ops so the
 * primary write still succeeds.
 */
export async function notifyAdmin(subject: string, text: string): Promise<void> {
  const apiKey = env.resendApiKey();
  const from = env.resendFrom();
  const to = env.adminEmail();

  if (!apiKey || !from || !to) {
    logInternal('notify:skipped_unconfigured');
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: `[VPPS] ${subject}`,
        text,
      }),
    });
    if (!res.ok) {
      logError('notify:resend_non_ok', new Error(`status_${res.status}`));
    }
  } catch (e) {
    // Never let a failed notification break the primary operation.
    logError('notify:resend_error', e);
  }
}
