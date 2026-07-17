/**
 * Structured internal logging. NEVER logs secrets, tokens, request bodies with
 * PII, complaint text, or leave reasons. Only shapes/metadata.
 */
const SENSITIVE = /(key|token|secret|authorization|password|phone|dob|reason|body)/i;

function redact(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = SENSITIVE.test(k) ? '[redacted]' : v;
  }
  return out;
}

export function logInternal(event: string, meta: Record<string, unknown> = {}): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...redact(meta) }));
}

export function logError(event: string, err: unknown, meta: Record<string, unknown> = {}): void {
  const message = err instanceof Error ? err.message : 'unknown_error';
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ ts: new Date().toISOString(), event, message, ...redact(meta) }));
}
