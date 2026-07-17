# Testing guide

## Layers

| Layer | Tool | Location |
| --- | --- | --- |
| Unit / schema | Vitest | `tests/unit/` |
| Component | Vitest + Testing Library + jsdom | `tests/integration/` |
| Security (injection, validation) | Vitest | `tests/security/` |
| RLS (authorization) | Postgres harness + Supabase JWTs | `tests/rls/` |
| E2E + a11y | Playwright + axe | `tests/e2e/` |

## Run

```bash
npm test            # unit + component + security
npm run test:e2e    # requires a running dev server + valid env
```

## RLS — local harness (fast, deterministic)

`tests/rls/` recreates just enough of Supabase (`auth.uid()`, roles, storage)
on a vanilla Postgres, then impersonates actors via `SET ROLE` + a session GUC.
`assert.sh` checks the authorization matrix and exits non-zero on any failure.
See `tests/rls/README.md`.

## RLS — real Supabase (authoritative)

Create three JWTs from your (preview) project: anon, an approved teacher, and the
principal. Then assert the matrix:

1. Anon cannot list teacher profiles / birthdays / parent messages / admissions /
   internal notices / leave.
2. Pending + suspended teachers are blocked from all data.
3. Teacher cannot self-promote, open principal data, read another's leave, read
   unassigned messages, reassign messages, change timings, or delete audit logs.
4. Assigned teacher reads only assigned messages.
5. Draft notices are not retrievable by guessed UUID.
6. Private files are not directly openable; `signed-file` gates them.
7. Homework is hidden after retention; Nursery homework works without a section;
   Classes 1–10 require a valid section where configured.

## Security tests to include

Stored/reflected XSS, malicious/duplicate-extension filenames, fake MIME,
oversized files, path traversal, unauthorized object access, role escalation,
open redirects, missing/reused Turnstile token, chatbot flooding, prompt
injection + system-prompt extraction, secret scan of the built bundle, and
security-header/CSP validation.

## Workflow tests

Google registration → approval → suspension; homework upload; notice
publication; timing activation; message assignment + revocation; leave
submit/approve/reject; birthday text-only & photo; spotlight replacement;
admissions auto open/close (Asia/Kolkata).
