# Netlify deploy

## Settings

The repo's `netlify.toml` already configures:

- `build.command = "npm run build"`, `publish = "dist"`, `functions = "netlify/functions"`.
- SPA fallback redirect (after function routes).
- Security headers: CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy,
  COOP/CORP, X-Frame-Options.

## Steps

1. Connect the GitHub repo to Netlify.
2. Set environment variables (see [ENV_GUIDE](ENV_GUIDE.md)). The `VITE_*`
   values are build-time; the server-only secrets are read by Functions at runtime.
3. Deploy. Functions are served from `/.netlify/functions/<name>`.
4. Add your production origin (and any preview origins) to `ALLOWED_ORIGINS`.
5. In Supabase Auth, add the deployed URL(s) to the OAuth redirect allowlist.

## CSP note

`script-src` includes `https://challenges.cloudflare.com` because the Turnstile
widget loads its `api.js` from there. The browser still never talks to Gemini or
Resend directly — those hosts are intentionally absent from `connect-src`.

## Preview deploys

Use a non-production Supabase project and leave `RESEND_*` unset so no real email
is sent (the alert helper no-ops safely).

## Camera permission

`Permissions-Policy: camera=(self)` is enabled only so teachers can capture
homework photos from their dashboard. Geolocation and microphone are disabled.
