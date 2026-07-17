import { supabase } from './supabase';

/**
 * Calls a same-origin Netlify Function. Automatically attaches the current
 * Supabase access token (if signed in) so privileged Functions can verify the
 * caller server-side.
 */
export async function callFunction<T = unknown>(
  name: string,
  body?: unknown,
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`/.netlify/functions/${name}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });

  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new FunctionError(res.status, json?.error ?? 'request_failed');
  }
  return json;
}

export class FunctionError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}
