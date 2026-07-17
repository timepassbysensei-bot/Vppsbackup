# Security checklist

Defense-in-depth. Route hiding is UX; the real controls are RLS + Functions.
Run this list before every production deploy.

## Build & secrets
- [ ] `npm run typecheck` and `npm run lint` are clean.
- [ ] `npm test` passes (unit + security).
- [ ] `npm run build` succeeds.
- [ ] Grep the bundle for secrets — must be empty:
  ```bash
  grep -rniE 'service_role|SERVICE_ROLE_KEY|GEMINI_API_KEY|RESEND_API_KEY|TURNSTILE_SECRET|generativelanguage|api\.resend\.com' dist/
  ```
- [ ] No `VITE_`-prefixed secret. No source maps shipped (`build.sourcemap=false`).

## Authorization (RLS)
- [ ] Verify across anon / pending / teacher / suspended / principal / service.
- [ ] Anon cannot read: profiles, birthday_profiles, parent_messages,
      admission_enquiries, internal notices, leave.
- [ ] Pending/suspended teachers get nothing (`is_active_teacher()` false).
- [ ] Teacher cannot self-promote, open the principal dashboard's data,
      read another's leave, read unassigned messages, change timings, or delete
      audit logs.
- [ ] Draft/soft-deleted rows are not retrievable by guessed UUID.
- [ ] Run `tests/rls/assert.sh` (local) and the JWT matrix (real Supabase).

## Storage
- [ ] Private buckets have no anon policy; signed URLs are short-lived (60s).
- [ ] `signed-file` re-checks row ownership before signing; rejects `..` paths.
- [ ] Uploads use random filenames from a validated signature, not client names.

## Functions
- [ ] Every function: POST-only, content-type + body-size caps, rate limit,
      Zod validation, generic errors, structured logs (no secrets/PII).
- [ ] `approve-teacher` re-verifies `is_principal()` server-side.
- [ ] `birthdays-today` never returns dob/year/age.
- [ ] Same-origin CORS allowlist; no wildcard reflection.

## Chatbot (Sensei)
- [ ] System prompt lives only in `netlify/functions/_shared/sensei-config.ts`.
- [ ] Injection/extraction attempts are refused; context is passed as untrusted data.
- [ ] Rate-limited; graceful FAQ fallback with buttons on limits.

## Uploads & input
- [ ] Validate MIME by signature, block double extensions, cap file size.
- [ ] Test stored/reflected XSS, path traversal, fake MIME, oversized files.

## Headers / transport
- [ ] CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP/CORP present.
- [ ] `connect-src` does NOT include Gemini/Resend (browser never calls them).
- [ ] OAuth redirect allowlist restricted to known origins.

## Turnstile
- [ ] Missing/invalid/reused tokens are rejected (fail closed).

## Rate limiting durability
- [ ] The in-memory limiter is best-effort (per-instance). For strong limits,
      back it with a shared store (Upstash/Supabase). Documented, not silently assumed.
