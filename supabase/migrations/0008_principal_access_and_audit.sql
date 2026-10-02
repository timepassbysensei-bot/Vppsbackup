-- =============================================================================
-- 0008_principal_access_and_audit.sql
-- Round-4 regression fix: principal supervisory access + audit + safe backfill
-- =============================================================================
--
-- Three separate concerns, all additive and idempotent. Nothing here is required
-- for the dashboard to render — the client fix is independent — so applying this
-- migration can never break a running site.
--
-- -----------------------------------------------------------------------------
-- 1. WHY REGISTERED TEACHERS CAN BE MISSING FROM PENDING REGISTRATIONS
-- -----------------------------------------------------------------------------
-- The initial (pending) role row is created by the `handle_new_user` trigger on
-- `auth.users` (0005_auth_signup.sql). Any account created while that trigger was
-- absent — before 0005 was applied, or created out-of-band from the Supabase
-- dashboard / Admin API — has an auth user but NO `profiles` row and NO
-- `user_roles` row. Every dashboard query reads `user_roles`, so such an account
-- is invisible to Pending Registrations and to the Staff Roster.
--
-- The trigger is correct going forward; this migration repairs the existing
-- accounts. The repair is purely additive:
--
--   * rows are inserted ONLY where they are missing (`on conflict do nothing`)
--   * an existing role/status/profile is NEVER overwritten, so nobody is
--     demoted, promoted, or re-registered
--   * the inserted row is teacher/pending, which grants NO access at all —
--     every RLS helper (is_active_teacher / teacher_can / teacher_owns_class)
--     treats `pending` as no access
--   * one append-only `audit_logs` entry is written per repaired account
--
-- The same repair is also available on demand, from the dashboard, through the
-- principal-only `repair-registrations` Netlify Function (which uses the
-- service-role key and never exposes `auth.users` to the browser).
--
-- -----------------------------------------------------------------------------
-- 2. WHY THE BADGE SAID 1 WHILE THE PAGE SAID "NO ONE IS WAITING"
-- -----------------------------------------------------------------------------
-- `user_roles` has TWO foreign keys into `profiles` (`user_id` and
-- `approved_by`). The Pending Registrations page embedded the profile with
-- `profiles(full_name, email)`, which is therefore ambiguous and rejected by
-- PostgREST (PGRST201). The query threw; the panel only checked `isLoading`, so
-- the error was rendered as the empty state, while the badge (a plain count that
-- never errored) showed the true count of 1.
--
-- That is fixed in the client: one shared query (`src/lib/hooks/useStaff.ts`)
-- now feeds the badge, the list and the roster, it joins profiles in memory
-- instead of embedding them, and a failed query renders an explicit error state
-- with Retry instead of an empty state. No SQL change is needed for it.
--
-- -----------------------------------------------------------------------------
-- 3. PRINCIPAL SUPERVISORY ACCESS — NO RLS CHANGE IS NEEDED
-- -----------------------------------------------------------------------------
-- The principal can already use every teacher tool, because the SECURITY DEFINER
-- helpers in 0002_rls.sql short-circuit on the principal:
--
--   teacher_owns_class(c, s) / teacher_can(perm)  ->  `is_principal() or ...`
--   is_active_teacher()                           ->  role in ('teacher','principal')
--
-- So `homework_write`, `class_notices_write`, `spotlight_own*/principal`,
-- `birthdays_write`, `leave_*` and `internal_*` all permit an approved principal,
-- and the principal's scope is ALL classes rather than their own assignments.
-- The client-side teacher dashboard mirrors that by treating an approved
-- principal as scoped to every class and section; an ordinary teacher stays
-- restricted to `teacher_class_assignments`. No policy is added or widened here.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 3a. Audit coverage for content created through the teacher tools
-- -----------------------------------------------------------------------------
-- Homework and class notices were the only teacher-authored content without an
-- audit trigger, so a principal acting through the teacher tools left no trail.
-- These reuse the generic append-only `audit_row_change()` helper from 0001,
-- which records tg_table_name + operation and the acting `auth.uid()`.
do $$
declare
  t text;
  tables text[] := array['homework_uploads', 'class_notices'];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_%1$s_audit on %1$s;', t);
    execute format(
      'create trigger trg_%1$s_audit after insert or update or delete on %1$s
         for each row execute function audit_row_change();', t);
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- 3b. Backfill accounts that predate the signup trigger
-- -----------------------------------------------------------------------------
-- Idempotent: re-running changes nothing once every account has its rows.
insert into profiles (id, email)
select u.id, u.email
from auth.users u
on conflict (id) do nothing;

insert into teacher_permissions (user_id)
select u.id
from auth.users u
on conflict (user_id) do nothing;

-- Only the rows actually created here are audited, so the log records the real
-- number of repaired accounts rather than every account in the project.
with created as (
  insert into user_roles (user_id, role, status)
  select u.id, 'teacher', 'pending'
  from auth.users u
  on conflict (user_id) do nothing
  returning user_id
)
insert into audit_logs (actor, action, content_type, content_id, summary)
select
  null,
  'registration_repaired',
  'user_role',
  created.user_id,
  'backfill (0008): missing role row recreated as teacher/pending'
from created;


-- =============================================================================
-- VERIFY (run manually if you want to confirm the state)
-- =============================================================================
--   -- Accounts still missing a role row: must return 0 rows.
--   select u.id, u.email
--   from auth.users u
--   left join public.user_roles r on r.user_id = u.id
--   where r.user_id is null;
--
--   -- Pending registrations the principal should see:
--   select r.created_at, p.full_name, p.email, r.role, r.status
--   from public.user_roles r
--   join public.profiles p on p.id = r.user_id
--   where r.status = 'pending'
--   order by r.created_at;
