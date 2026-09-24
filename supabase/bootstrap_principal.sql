-- =============================================================================
-- bootstrap_principal.sql — one-off, SERVICE-ROLE ONLY
--
-- There is deliberately NO frontend path to claim the principal role. To create
-- the first principal:
--   1. Have the person register once at /admin/login ("Create account", e-mail +
--      password), or create the user directly in Supabase. Either way the
--      handle_new_user trigger (0005_auth_signup.sql) creates their auth.users
--      row plus a pending profiles/user_roles row — never an approved one.
--   2. Find their user id (email is in auth.users).
--   3. Run THIS script in the Supabase SQL editor (service role) with their id.
--
-- Never expose this operation through the app. Re-run only when adding another
-- principal out-of-band.
-- =============================================================================

-- Replace with the target user's UUID (from auth.users / profiles).
\set principal_id '00000000-0000-0000-0000-000000000000'

-- Ensure a profile exists (no-op if the app already created it).
insert into profiles (id, email)
select u.id, u.email from auth.users u where u.id = :'principal_id'
on conflict (id) do nothing;

-- Promote to approved principal. Authorization is stored ONLY here (user_roles).
insert into user_roles (user_id, role, status, approved_at)
values (:'principal_id', 'principal', 'approved', now())
on conflict (user_id) do update
  set role = 'principal', status = 'approved', approved_at = now();

-- Record the bootstrap in the append-only audit log.
insert into audit_logs (actor, action, content_type, content_id, summary)
values (:'principal_id', 'principal_bootstrap', 'user_role', :'principal_id', 'manual bootstrap');
