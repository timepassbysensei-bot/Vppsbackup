# RLS explainer

Row Level Security is the authorization backbone. Every application table has
RLS **enabled** with a **default deny** posture, so if no policy grants access,
the answer is "no rows".

## Where authority comes from

Never from the JWT email or any client-supplied claim. Authority is read from:

- `user_roles(role, status)` — the authoritative role store.
- `teacher_permissions` — per-permission flags for cross-cutting content.
- `teacher_class_assignments` — which class/section a teacher owns.

Four `SECURITY DEFINER` helpers encapsulate this so policies stay readable and
avoid recursive RLS while reading the role tables:

```sql
is_principal()                 -- approved principal?
is_active_teacher()            -- approved teacher or principal?
teacher_can('public_notices')  -- has a specific permission (principal always true)
teacher_owns_class(c, s)       -- owns this class/section (section null = all)
```

## Reading patterns

- **Public reads** (`anon`, `authenticated`) are allowed only for genuinely
  public rows, e.g. published, non-deleted notices within their date window;
  homework only inside the retention window; the settings row (which holds no
  secrets). Guessing a draft UUID returns zero rows because the predicate
  requires `is_published and not is_deleted`.
- **`birthday_profiles` has no anon read policy at all.** Public birthday display
  is served only by the `birthdays-today` Function via the `public_birthdays()`
  RPC, which returns display fields and never the DOB.
- **Private tables** (parent messages, admissions, leave, internal notices,
  audit) have no anon policy. Teachers see parent messages only when actively
  assigned; leave only their own; audit is principal-read and append-only
  (no update/delete policy exists, so it is immutable to any non-service role).

## Writing patterns

- Content writes are scoped: `notices_write` needs `teacher_can('public_notices')`;
  `homework_write`/`class_notices_write` need `teacher_owns_class(...)`.
- Principal-only administration (settings, timings, roles, permissions) is
  gated by `is_principal()`.
- Role/status changes never happen from the browser — only the `approve-teacher`
  Function writes `user_roles`, after re-verifying `is_principal()` server-side.

## How it's verified

`tests/rls/` contains a local Postgres harness (`shim.sql` + `assert.sh`) that
impersonates anon/teacher/principal and asserts the test-matrix outcomes. The
authoritative check runs the same matrix against a real Supabase project using
anon/teacher/principal JWTs — see [TESTING_GUIDE](TESTING_GUIDE.md).
