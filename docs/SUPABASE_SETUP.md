# Supabase setup

Provision a Supabase project, then apply the SQL in order. Everything is plain
SQL so you can paste it into the Supabase SQL editor or run it with the CLI.

## 1. Create the project

1. Create a new Supabase project. Note the **Project URL** and the **anon** and
   **service_role** keys (Project Settings → API).
2. Put the URL + anon key into your `.env` (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`) and the service_role key into the Netlify
   environment only (`SUPABASE_SERVICE_ROLE_KEY`). See [ENV_GUIDE](ENV_GUIDE.md).

## 2. Run the migrations (in order)

```
supabase/migrations/0001_schema.sql     -- tables, types, triggers, audit
supabase/migrations/0002_rls.sql        -- enable RLS + all policies
supabase/migrations/0003_storage.sql    -- buckets + storage policies
supabase/migrations/0004_functions.sql  -- public_birthdays() RPC
```

With the Supabase CLI:

```bash
supabase db push        # or: psql "$DATABASE_URL" -f supabase/migrations/000X_*.sql
```

## 3. Seed

`supabase/seed.sql` has two sections:

- **Section A — verified facts** (safe for production): classes/sections, the
  `school_settings` row with confirmed facts, branding slots, the active timing
  schedule, and chatbot config.
- **Section B — demo content** (development only): unpublished, clearly marked
  `[DEMO]`. Do **not** run Section B in production.

## 4. Google OAuth

Enable Google as an auth provider — see [GOOGLE_OAUTH.md](GOOGLE_OAUTH.md).

## 5. Bootstrap the principal

There is no in-app way to become principal. Follow
[PRINCIPAL_BOOTSTRAP.md](PRINCIPAL_BOOTSTRAP.md) once.

## 6. Verify security

Run the RLS harness (`tests/rls/`) and the [TESTING_GUIDE](TESTING_GUIDE.md)
matrix against anon / pending / teacher / suspended / principal roles.
