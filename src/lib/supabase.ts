import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * The browser ONLY ever uses the anon key. Every read/write it performs is
 * guarded by Row Level Security in Postgres. There is no service-role key in
 * the bundle; privileged operations go through Netlify Functions.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
