# View Point Public School — website + secure admin

Public website and role-based admin for **View Point Public School** (Chas, Bokaro).
Built per the project blueprint with a single, non-negotiable rule:

> **Authorization is enforced in Postgres Row Level Security (RLS) and in
> server-side Netlify Functions. Frontend route hiding is UX, never security.**

Unknown facts are treated as editable settings, never invented — the CBSE
affiliation number, WhatsApp, fees, and final domain are blank/editable by design.

## Architecture

```
Browser (React SPA, public + /admin)
  │  anon key only, RLS-guarded reads/writes
  ▼
Supabase (Postgres + Auth + Storage)
  ▲
  │  service-role key ONLY here
Netlify Functions (privileged server ops)
  → Gemini (Sensei) · Resend (email) · Turnstile verify
```

- One app, one auth system, role-based dashboards (`/admin/teacher`, `/admin/principal`).
- The browser never holds the service-role / Gemini / Resend keys.
- Any privileged operation goes through a Netlify Function that re-checks auth + authorization.

## Stack

React + TypeScript (strict) · Vite · Tailwind · React Router · React Hook Form ·
Zod · TanStack Query · Radix primitives · Lucide icons · i18next (en/hi) ·
Supabase · Netlify Functions.

## Quick start

```bash
npm install
cp .env.example .env          # fill in the VITE_* values (see docs/ENV_GUIDE.md)
npm run dev                   # http://localhost:5173
```

Provision the backend first — see **[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)**.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck (app + functions + node) then production build |
| `npm run typecheck` | All three TypeScript projects |
| `npm run lint` | ESLint (zero warnings) |
| `npm test` | Vitest unit/component/security tests |
| `npm run test:e2e` | Playwright e2e + axe accessibility |
| `npm run test:rls` | (see `tests/rls/README.md` for the DB harness) |

## Repository layout

```
src/                    React SPA (public + admin)
  app/                  router, providers, layout, guards, auth
  pages/public/         /, about, academics, notices, homework, ...
  pages/admin/          login, pending, teacher, principal
  components/           header, footer, alert bar, Sensei widget, Turnstile, ui/
  lib/                  supabase (anon), api, i18n (en/hi), validation (shared Zod), hooks
  styles/tokens.css     design tokens (edit colors here)
netlify/functions/      privileged server ops (service-role lives here only)
  _shared/              handler, auth, cors, rateLimit, supabase, sensei-config, ...
supabase/migrations/    0001_schema · 0002_rls · 0003_storage · 0004_functions
supabase/seed.sql       verified facts + clearly-marked demo data
tests/                  unit · integration · e2e · rls · security
docs/                   setup, deploy, security, staff guides (EN/HI)
```

## Documentation

- [Local development](docs/LOCAL_DEV.md) · [Customization & branding](docs/CUSTOMIZATION.md)
- [Supabase setup](docs/SUPABASE_SETUP.md) · [Google OAuth](docs/GOOGLE_OAUTH.md)
- [Environment variables](docs/ENV_GUIDE.md) · [Netlify deploy](docs/NETLIFY_DEPLOY.md)
- [RLS explainer](docs/RLS_EXPLAINER.md) · [Storage policies](docs/STORAGE_POLICIES.md)
- [Principal bootstrap](docs/PRINCIPAL_BOOTSTRAP.md) · [Teacher approval](docs/TEACHER_APPROVAL.md)
- [Sensei FAQ updates](docs/SENSEI_FAQ.md) · [Timing updates](docs/TIMING_UPDATE.md)
- [Security checklist](docs/SECURITY_CHECKLIST.md) · [Privacy checklist](docs/PRIVACY_CHECKLIST.md)
- [Testing guide](docs/TESTING_GUIDE.md)
- Staff guides: [Teacher](docs/TEACHER_GUIDE.md) · [Principal](docs/PRINCIPAL_GUIDE.md)

## Facts still awaiting confirmation

These are intentionally blank/editable and must be filled by the school, never guessed:
CBSE affiliation number · final domain · principal's message text · approved photos ·
map URL · WhatsApp is intentionally **not** present.

> No system is 100% secure; this project minimizes risk through defense-in-depth.
> Do not claim legal compliance without formal review.
