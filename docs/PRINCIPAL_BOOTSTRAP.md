# Principal bootstrap

There is **no** frontend path to become principal — that would be a role-escalation
hole. The first principal is created out-of-band, once.

## Steps

1. The prospective principal signs in once at `/admin/login` with Google. This
   creates their `auth.users` row (and a pending account).
2. In Supabase, find their user id (Authentication → Users, or `auth.users`).
3. Open the SQL editor (which runs as service role) and run
   `supabase/bootstrap_principal.sql`, replacing the placeholder id:

   ```sql
   \set principal_id 'PASTE-THE-UUID-HERE'
   ```

   The script ensures a profile row, upserts `user_roles` to
   `role='principal', status='approved'`, and writes an audit entry.
4. The principal refreshes `/admin/login` and lands on the principal dashboard.

## Why this is safe

- Authorization lives only in `user_roles`, which the browser can never write.
- `is_principal()` (used everywhere) checks `role='principal' AND status='approved'`.
- Adding another principal later is the same manual step, or use the principal
  dashboard's "Approve principal" action (which calls `approve-teacher`).
