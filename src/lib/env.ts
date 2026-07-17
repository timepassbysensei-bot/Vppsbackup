/**
 * Frontend environment. Only VITE_-prefixed values exist here, and they are all
 * PUBLIC by design. The service-role / Gemini / Resend / Turnstile-secret keys
 * are NEVER referenced from frontend code — they live only in Functions.
 */
export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  // The final domain is UNCONFIRMED; always read it from here, never hard-code.
  siteUrl: (import.meta.env.VITE_SITE_URL as string) || window.location.origin,
  turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined,
};

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  // Fail fast in development if the anon config is missing.
  // eslint-disable-next-line no-console
  console.warn('[vpps] Supabase env vars are not set. Copy .env.example to .env.');
}
