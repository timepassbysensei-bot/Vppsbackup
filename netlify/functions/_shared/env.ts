/**
 * Server-only environment access. These values are read from the Netlify
 * Functions runtime and MUST NEVER be exposed to the browser. Nothing here is
 * VITE_-prefixed.
 *
 * We read lazily and throw a generic error if a required key is missing so that
 * a misconfigured deploy fails loudly server-side without ever echoing secret
 * values.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    // Do not include the value; only the missing key name.
    throw new Error(`missing_env:${name}`);
  }
  return v;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  // Public URL of this deploy (used for CORS + Supabase URL).
  siteUrl: () => required('VITE_SITE_URL'),
  supabaseUrl: () => required('VITE_SUPABASE_URL'),
  supabaseAnonKey: () => required('VITE_SUPABASE_ANON_KEY'),

  // Server-only secrets.
  serviceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY'),
  geminiApiKey: () => required('GEMINI_API_KEY'),
  resendApiKey: () => optional('RESEND_API_KEY'),
  resendFrom: () => optional('RESEND_FROM_EMAIL'),
  adminEmail: () => optional('ADMIN_NOTIFICATION_EMAIL'),
  turnstileSecret: () => required('TURNSTILE_SECRET_KEY'),

  allowedOrigins: (): string[] => {
    const raw = optional('ALLOWED_ORIGINS');
    const list = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const site = optional('VITE_SITE_URL');
    if (site) list.push(site);
    return [...new Set(list)];
  },
};
