import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.ts';

/**
 * Service-role client. Bypasses RLS — use ONLY inside Functions and ONLY after
 * the caller has been authenticated and authorized for the exact action.
 */
export function adminClient(): SupabaseClient {
  return createClient(env.supabaseUrl(), env.serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Anon client (no user token). Runs under the `anon` RLS role, so it can only
 * ever read rows that are genuinely public. Used by the chatbot for grounding.
 */
export function anonClient(): SupabaseClient {
  return createClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Anon client bound to a specific end-user access token. All queries run under
 * that user's RLS context — useful when a Function wants to act *as the user*
 * rather than god-mode. We never elevate here.
 */
export function userClient(accessToken: string): SupabaseClient {
  return createClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
