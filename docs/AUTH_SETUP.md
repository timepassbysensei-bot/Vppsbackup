# Authentication setup (e-mail + password)

Staff sign in with **e-mail and password** through Supabase Auth. There is **no
OAuth / Google provider anywhere in this project** — not in the UI, not in the
code, and not in the Supabase configuration. This document replaces the old
`GOOGLE_OAUTH.md`.

Signing in grants **no** access by itself. A new account is created `pending`
and can read nothing until the principal approves it. That rule lives in
Postgres Row Level Security, not in the interface.

---

## 1. Supabase Auth configuration

In **Authentication**:

1. **Providers → Email**: enabled. Confirm e-mail is *optional*; if you enable
   it, teachers must click the link in the confirmation e-mail before their
   first sign-in.
2. **Providers → Google**: **disabled**. Delete the client ID/secret if one was
   ever configured, so a stale OAuth client cannot be used accidentally.
3. **Providers → Email → Password strength**: minimum length 8. The app enforces
   8–72 characters (`passwordField` in `src/lib/validation/schemas.ts`); 72 is
   bcrypt's limit, so anything longer is rejected rather than silently truncated.
4. Leave any other social provider disabled.

There is no "OAuth redirect allowlist" to maintain, because no OAuth flow is
used.

## 2. URL configuration (redirect allowlist)

**Authentication → URL Configuration** must list the origins Supabase may
redirect back to. This is an open-redirect defence, so keep it tight — no
wildcards, no third-party domains.

| Setting | Value |
| --- | --- |
| Site URL | `https://<your-domain>` (your `VITE_SITE_URL`) |
| Redirect URLs | `https://<your-domain>/admin/login` |
| | `https://<your-domain>/admin/reset` |
| | `http://localhost:5173/admin/login` *(local dev only)* |
| | `http://localhost:5173/admin/reset` *(local dev only)* |

These two paths are the only ones the app passes as a redirect target:

- `/admin/login` — where the confirmation e-mail link returns (`AUTH_CALLBACK_URL`).
- `/admin/reset` — where the password-recovery link returns (`PASSWORD_RESET_CALLBACK_URL`).

Both are defined in `src/app/AuthProvider.tsx`. If you change them, update this
table **and** the Supabase redirect allowlist together, or the links will fail.

## 3. Run the migrations

The pending account row is created by a **database trigger**, not by the client:

```
supabase/migrations/0005_auth_signup.sql   -- handle_new_user() trigger
```

Why it must be in the database: RLS on `user_roles` is default-deny and only
`is_principal()` may write it. If the browser could insert its own row, anyone
could approve themselves. So `handle_new_user()` (SECURITY DEFINER) creates:

- a `profiles` row,
- a `user_roles` row hard-coded to **`role='teacher', status='pending'`**,
- an empty `teacher_permissions` row.

It never reads a role or status from client-editable metadata. The migration also
backfills any `auth.users` rows that predate it, so nobody is stuck without a
role row. Make sure `0005` is applied — without it, signup creates an account
that the principal cannot see and approve.

## 4. Bootstrap the principal

There is no in-app way to become principal. Follow
[PRINCIPAL_BOOTSTRAP.md](PRINCIPAL_BOOTSTRAP.md) once: the person registers or is
created normally, then their id is promoted with
`supabase/bootstrap_principal.sql` (service role).

## 5. What each screen does

| Screen | Path | Behaviour |
| --- | --- | --- |
| Sign in | `/admin/login` | `signInWithPassword`. Pending/rejected/suspended users are routed to the waiting screen. |
| Create account | `/admin/login` → *Create account* | `signUp`, then the `0005` trigger creates the pending row. If e-mail confirmation is on, the user is told to confirm first. |
| Forgot password | `/admin/login` → *Forgot password?* | `resetPasswordForEmail` → link to `/admin/reset`. |
| Set new password | `/admin/reset` | `updateUser({ password })` using the short-lived recovery session, then signs out. A missing/invalid session shows "link is invalid or has expired" instead of a form that cannot work. |
| Waiting room | `/admin/pending` | Shows for `pending` / `rejected` / `suspended`. |
| Dashboards | `/admin/teacher`, `/admin/principal` | Approved staff only. |

## 6. Security notes

- The browser never stores authorization in `localStorage`. Session tokens are
  Supabase's; role and status are always re-read from `user_roles`.
- Route guards (`RequireApproved`, `RequirePrincipal`) are **UX only**. Every
  read/write is independently enforced by RLS, and privileged operations by
  Netlify Functions that re-verify the caller with `requirePrincipal()` /
  `requireActiveStaff()`.
- Auth errors are mapped to generic localised messages
  (`authErrorKey` in `src/app/AuthProvider.tsx`) so the UI never reveals whether
  an e-mail address has an account.
- Role changes happen **only** through the `approve-teacher` Function; the
  client cannot write `user_roles`.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| "That e-mail address or password is not correct." | Wrong credentials, or the account was created in a different Supabase project. |
| Signup succeeds but the principal sees no one pending | `0005_auth_signup.sql` was not applied. |
| Confirmation link lands on the site root or errors | `/admin/login` is missing from the Supabase redirect allowlist. |
| Recovery link says it expired | The link was already used, or `/admin/reset` is not allowlisted, or `VITE_SITE_URL` does not match the domain you opened. |
| Teacher stays pending after approval | They need to sign out and back in (or press *Check again*) to pick up the new status. |
