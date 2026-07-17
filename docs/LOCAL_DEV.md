# Local development

## Prerequisites
- Node 20+ and npm 10+.
- A Supabase project (or a local Supabase stack) — see [SUPABASE_SETUP](SUPABASE_SETUP.md).

## Run the app

```bash
npm install
cp .env.example .env     # fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SITE_URL
npm run dev              # http://localhost:5173
```

Without valid Supabase env the pages render but data queries fail — the console
warns you. Public data appears once the migrations + seed (Section A) are applied.

## Run Functions locally

```bash
npm i -g netlify-cli
netlify dev              # serves the SPA + Functions with your .env
```

Set the server-only secrets in your shell/`.env` for `netlify dev`
(`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `TURNSTILE_SECRET_KEY`, ...). See
[ENV_GUIDE](ENV_GUIDE.md).

## Useful commands

```bash
npm run typecheck   # app + functions + node projects
npm run lint
npm test            # vitest
npm run test:e2e    # playwright (needs a running server)
```

## RLS harness (no cloud)

See `tests/rls/README.md` to validate the security model against a local
Postgres with Supabase shims.
