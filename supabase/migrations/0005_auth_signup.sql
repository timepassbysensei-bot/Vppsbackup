-- =============================================================================
-- 0005_auth_signup.sql — self-service teacher registration (e-mail + password)
-- =============================================================================
--
-- Staff authenticate with **e-mail + password only** through Supabase Auth.
-- There is no OAuth provider in this project.
--
-- WHY THIS MIGRATION EXISTS
-- RLS on `user_roles` is default-deny: only `is_principal()` may insert or
-- update it. That is deliberate — no signed-in user may ever grant themselves a
-- role or an approval status. But it also means a brand-new account has no way
-- to obtain its initial (pending) row from the client.
--
-- So the initial row is created HERE, in the database, by a trigger on
-- auth.users. The trigger:
--
--   * hard-codes role = 'teacher' and status = 'pending'
--   * NEVER reads a role/status/claim from user metadata (which is
--     client-editable and therefore untrusted)
--   * is idempotent (`on conflict do nothing`), so it cannot clobber an existing
--     principal/teacher row if it ever runs twice
--
-- An account created this way can read nothing: every content table grants
-- access only to `is_principal()`, `is_active_teacher()` or `teacher_can(...)`,
-- none of which are true for a pending teacher. Approval happens exclusively
-- through the `approve-teacher` Netlify Function, which re-verifies the caller
-- server-side. This mirrors `docs/SECURITY_CHECKLIST.md`: authorization lives in
-- Postgres, never in the client.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Signup trigger
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER so the insert succeeds despite RLS. `search_path` is pinned
-- to `public` (with pg_temp implicitly last) so the function cannot be hijacked
-- by a shadowing object.
create or replace function handle_new_user() returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  -- Profile row. `full_name` is the only piece taken from signup metadata, and
  -- it is purely cosmetic — it is never used for an authorization decision.
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;

  -- Authoritative role row. Always teacher + pending, whatever the client sent.
  insert into user_roles (user_id, role, status)
  values (new.id, 'teacher', 'pending')
  on conflict (user_id) do nothing;

  -- Permission row, all flags off. The principal grants these at approval time.
  insert into teacher_permissions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- A trigger function never needs to be callable directly from the API.
revoke all on function handle_new_user() from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. Backfill accounts that predate this migration
-- -----------------------------------------------------------------------------
-- Any auth.users row created before the trigger existed (or by an out-of-band
-- invite) gets the same treatment, so it can be approved instead of being stuck
-- without a role row. Existing rows are left exactly as they are.
insert into profiles (id, email)
select u.id, u.email
from auth.users u
on conflict (id) do nothing;

insert into user_roles (user_id, role, status)
select u.id, 'teacher', 'pending'
from auth.users u
on conflict (user_id) do nothing;

insert into teacher_permissions (user_id)
select u.id
from auth.users u
on conflict (user_id) do nothing;


-- =============================================================================
-- NOTES FOR THE SCHOOL / DEVELOPER
-- =============================================================================
-- * To make someone a principal, follow docs/PRINCIPAL_BOOTSTRAP.md. There is
--   intentionally no in-app path to the principal role.
-- * If Supabase Auth is configured to require e-mail confirmation, the account
--   cannot sign in until the link is clicked — the trigger still runs at signup
--   time, so the pending row is ready for the principal either way.
-- * Deleting an auth.users row cascades to profiles -> user_roles
--   -> teacher_permissions.
