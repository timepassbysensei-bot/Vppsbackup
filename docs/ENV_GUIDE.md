# Environment variables

Two tiers. Getting this split right is a security control, not a formality.

## Frontend-safe (compiled into the browser bundle — PUBLIC)

Anything with the `VITE_` prefix is embedded in the JavaScript that ships to
visitors. Only put values here that are safe to be public.

| Name | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (RLS still guards every row) |
| `VITE_SITE_URL` | Canonical site URL (the domain is unconfirmed — never hard-code it) |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile **public** site key |

## Server-only (Netlify environment — NEVER `VITE_`-prefixed)

These live only in the Functions runtime and must never reach the browser.

| Name | Purpose |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Full DB access — Functions only |
| `GEMINI_API_KEY` | Sensei chatbot (server-side proxy only) |
| `RESEND_API_KEY` | Minimal email alerts |
| `RESEND_FROM_EMAIL` | Verified sender address |
| `ADMIN_NOTIFICATION_EMAIL` | Where alerts are sent |
| `TURNSTILE_SECRET_KEY` | Server-side Turnstile verification |
| `ALLOWED_ORIGINS` | Optional CORS allowlist (defaults to `VITE_SITE_URL`) |

## Rules

- Never commit a filled-in `.env`. Only `.env.example` (names only) is committed.
- The build has been verified to contain **none** of the server-only names or
  values (`npm run build` then grep `dist/` — see [SECURITY_CHECKLIST](SECURITY_CHECKLIST.md)).
- Preview deploys should use a **non-production** Supabase project and disabled
  real email (leave `RESEND_*` unset — `notifyAdmin` then no-ops safely).
