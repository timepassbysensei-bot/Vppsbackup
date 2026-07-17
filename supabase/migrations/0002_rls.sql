-- =============================================================================
-- 0002_rls.sql — Row Level Security for View Point Public School
--
-- Principle: DEFAULT DENY. RLS is enabled on every application table.
-- Authorization derives ONLY from `user_roles` / `teacher_permissions` /
-- `teacher_class_assignments` — never from JWT email or client-supplied claims.
-- Helper predicates are SECURITY DEFINER so policies can read the role tables
-- without triggering recursive RLS.
--
-- Anything requiring the service-role key (submissions from anon, birthday
-- display without DOB, role changes) is handled in Netlify Functions, NOT here.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on ALL application tables
-- -----------------------------------------------------------------------------
alter table profiles                     enable row level security;
alter table user_roles                   enable row level security;
alter table teacher_permissions          enable row level security;
alter table classes                      enable row level security;
alter table sections                     enable row level security;
alter table teacher_class_assignments    enable row level security;
alter table school_settings              enable row level security;
alter table branding_assets              enable row level security;
alter table timing_schedules             enable row level security;
alter table timing_shift_assignments     enable row level security;
alter table public_notices               enable row level security;
alter table class_notices                enable row level security;
alter table calendar_events              enable row level security;
alter table homework_uploads             enable row level security;
alter table homework_versions            enable row level security;
alter table student_spotlights           enable row level security;
alter table birthday_profiles            enable row level security;
alter table resources                    enable row level security;
alter table parent_messages              enable row level security;
alter table parent_message_assignments   enable row level security;
alter table parent_message_status_history enable row level security;
alter table parent_message_access_logs   enable row level security;
alter table admission_enquiries          enable row level security;
alter table consent_records              enable row level security;
alter table internal_teacher_notices     enable row level security;
alter table internal_notice_reads        enable row level security;
alter table teacher_leave_requests       enable row level security;
alter table leave_decisions              enable row level security;
alter table chatbot_faqs                 enable row level security;
alter table chatbot_settings             enable row level security;
alter table media_assets                 enable row level security;
alter table audit_logs                   enable row level security;

-- =============================================================================
-- Helper predicates (SECURITY DEFINER, STABLE)
-- =============================================================================
create or replace function is_principal() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from user_roles r
    where r.user_id = auth.uid() and r.role = 'principal' and r.status = 'approved');
$$;

create or replace function is_active_teacher() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from user_roles r
    where r.user_id = auth.uid()
      and r.role in ('teacher', 'principal') and r.status = 'approved');
$$;

create or replace function teacher_can(perm text) returns boolean
  language sql security definer stable set search_path = public as $$
  select is_principal() or exists (
    select 1 from teacher_permissions p
    where p.user_id = auth.uid()
      and case perm
        when 'public_notices' then p.can_public_notices
        when 'birthdays' then p.can_birthdays
        when 'resources' then p.can_resources
        when 'spotlight' then p.can_spotlight
        else false end);
$$;

create or replace function teacher_owns_class(c uuid, s uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select is_principal() or exists (
    select 1 from teacher_class_assignments a
    where a.user_id = auth.uid() and a.class_id = c
      and (a.section_id = s or a.section_id is null));
$$;

-- =============================================================================
-- REFERENCE DATA — classes & sections are public read; only principal writes
-- =============================================================================
create policy classes_read on classes for select to anon, authenticated using (true);
create policy classes_admin on classes for all to authenticated
  using (is_principal()) with check (is_principal());

create policy sections_read on sections for select to anon, authenticated using (true);
create policy sections_admin on sections for all to authenticated
  using (is_principal()) with check (is_principal());

-- Assignments: teacher can read own; principal manages all.
create policy tca_read on teacher_class_assignments for select to authenticated
  using (user_id = auth.uid() or is_principal());
create policy tca_admin on teacher_class_assignments for all to authenticated
  using (is_principal()) with check (is_principal());

-- =============================================================================
-- ANONYMOUS / PUBLIC READS
-- =============================================================================
create policy notices_public_read on public_notices for select to anon, authenticated
  using (is_published and audience = 'public' and not is_deleted
    and (effective_date is null or effective_date <= current_date)
    and (expiry_date is null or expiry_date >= current_date));

create policy class_notices_public_read on class_notices for select to anon, authenticated
  using (is_published and not is_deleted
    and (expiry_date is null or expiry_date >= current_date));

create policy events_public_read on calendar_events for select to anon, authenticated
  using (is_published and visibility = 'public');

-- Homework is visible only inside the retention window (server also enforces).
create policy homework_public_read on homework_uploads for select to anon, authenticated
  using (is_published and not is_deleted
    and homework_date >= current_date
      - (select homework_retention_days from school_settings limit 1));

create policy spotlight_public_read on student_spotlights for select to anon, authenticated
  using (is_published);

create policy resources_public_read on resources for select to anon, authenticated
  using (is_published and is_public);

-- Expose the single settings row publicly. It must contain NO secrets.
create policy settings_public_read on school_settings for select to anon, authenticated
  using (true);

create policy branding_public_read on branding_assets for select to anon, authenticated
  using (true);

-- Chatbot config/FAQs are read publicly so the widget can render; content is
-- assumed public and curated. Writes are principal-only.
create policy faqs_public_read on chatbot_faqs for select to anon, authenticated
  using (is_active);
create policy chatbot_settings_read on chatbot_settings for select to anon, authenticated
  using (true);

-- IMPORTANT: birthday_profiles has NO anon/authenticated SELECT policy (default
-- deny). Public birthday display is served ONLY via the birthdays-today Netlify
-- Function (service role), which returns display_name/class/greeting/month +
-- photo, and NEVER the dob. This prevents anon from ever reading the full date.

-- Teacher may VIEW active timings (read only). Full timing management below.
create policy timing_read on timing_schedules for select to anon, authenticated
  using (state = 'active');
create policy timing_shift_read on timing_shift_assignments for select to anon, authenticated
  using (exists (select 1 from timing_schedules t
    where t.id = timing_shift_assignments.schedule_id and t.state = 'active'));

-- =============================================================================
-- CONTENT WRITES — scoped teachers + principal
-- =============================================================================
create policy notices_write on public_notices for all to authenticated
  using (teacher_can('public_notices'))
  with check (teacher_can('public_notices'));

create policy class_notices_write on class_notices for all to authenticated
  using (teacher_owns_class(class_id, section_id))
  with check (teacher_owns_class(class_id, section_id));

create policy events_write on calendar_events for all to authenticated
  using (is_active_teacher()) with check (is_active_teacher());

create policy homework_write on homework_uploads for all to authenticated
  using (teacher_owns_class(class_id, section_id))
  with check (teacher_owns_class(class_id, section_id));

-- Homework version history: readable/insertable by the owning teacher & principal.
create policy hw_versions_rw on homework_versions for all to authenticated
  using (is_principal() or exists (
    select 1 from homework_uploads h
    where h.id = homework_versions.homework_id
      and teacher_owns_class(h.class_id, h.section_id)))
  with check (is_principal() or exists (
    select 1 from homework_uploads h
    where h.id = homework_versions.homework_id
      and teacher_owns_class(h.class_id, h.section_id)));

create policy birthdays_write on birthday_profiles for all to authenticated
  using (teacher_can('birthdays')) with check (teacher_can('birthdays'));

create policy resources_write on resources for all to authenticated
  using (teacher_can('resources')) with check (teacher_can('resources'));

create policy spotlight_write on student_spotlights for all to authenticated
  using (teacher_can('spotlight')) with check (teacher_can('spotlight'));

-- =============================================================================
-- PRINCIPAL-ONLY administration
-- =============================================================================
create policy settings_admin on school_settings for update to authenticated
  using (is_principal()) with check (is_principal());
create policy branding_admin on branding_assets for all to authenticated
  using (is_principal()) with check (is_principal());
create policy timing_admin on timing_schedules for all to authenticated
  using (is_principal()) with check (is_principal());
create policy timing_shift_admin on timing_shift_assignments for all to authenticated
  using (is_principal()) with check (is_principal());
create policy roles_admin on user_roles for all to authenticated
  using (is_principal()) with check (is_principal());
create policy perms_admin on teacher_permissions for all to authenticated
  using (is_principal()) with check (is_principal());
create policy faqs_admin on chatbot_faqs for all to authenticated
  using (is_principal()) with check (is_principal());
create policy chatbot_settings_admin on chatbot_settings for all to authenticated
  using (is_principal()) with check (is_principal());

-- Teachers may read their own role/permission rows (never write them).
create policy roles_self_read on user_roles for select to authenticated
  using (user_id = auth.uid() or is_principal());
create policy perms_self_read on teacher_permissions for select to authenticated
  using (user_id = auth.uid() or is_principal());

-- =============================================================================
-- PARENT MESSAGES — principal all; teacher only if actively assigned
-- =============================================================================
create policy pm_principal on parent_messages for all to authenticated
  using (is_principal()) with check (is_principal());
create policy pm_assigned_read on parent_messages for select to authenticated
  using (exists (select 1 from parent_message_assignments a
    where a.message_id = parent_messages.id and a.teacher_id = auth.uid()
      and a.revoked_at is null));
-- NO anon policy: submission happens via the submit-parent-message Function.

-- Assignments: principal manages; assigned teacher may read own assignment.
create policy pm_assign_principal on parent_message_assignments for all to authenticated
  using (is_principal()) with check (is_principal());
create policy pm_assign_self_read on parent_message_assignments for select to authenticated
  using (teacher_id = auth.uid() or is_principal());

create policy pm_status_read on parent_message_status_history for select to authenticated
  using (is_principal() or exists (select 1 from parent_message_assignments a
    where a.message_id = parent_message_status_history.message_id
      and a.teacher_id = auth.uid() and a.revoked_at is null));
create policy pm_status_insert on parent_message_status_history for insert to authenticated
  with check (is_principal() or exists (select 1 from parent_message_assignments a
    where a.message_id = parent_message_status_history.message_id
      and a.teacher_id = auth.uid() and a.revoked_at is null));

create policy pm_access_read on parent_message_access_logs for select to authenticated
  using (is_principal());
create policy pm_access_insert on parent_message_access_logs for insert to authenticated
  with check (auth.uid() is not null);

-- =============================================================================
-- LEAVE — teacher sees only own; principal sees all
-- =============================================================================
create policy leave_own on teacher_leave_requests for select to authenticated
  using (teacher_id = auth.uid() or is_principal());
create policy leave_insert on teacher_leave_requests for insert to authenticated
  with check (teacher_id = auth.uid());
create policy leave_cancel on teacher_leave_requests for update to authenticated
  using (teacher_id = auth.uid() and status = 'Pending')
  with check (teacher_id = auth.uid());
create policy leave_decide on teacher_leave_requests for update to authenticated
  using (is_principal()) with check (is_principal());
create policy leave_decisions_principal on leave_decisions for all to authenticated
  using (is_principal()) with check (is_principal());
-- Requesting teacher can read the decision note on their own request.
create policy leave_decisions_own_read on leave_decisions for select to authenticated
  using (exists (select 1 from teacher_leave_requests r
    where r.id = leave_decisions.request_id and r.teacher_id = auth.uid()));

-- =============================================================================
-- INTERNAL NOTICES — staff read, principal write
-- =============================================================================
create policy internal_read on internal_teacher_notices for select to authenticated
  using (is_active_teacher());
create policy internal_write on internal_teacher_notices for all to authenticated
  using (is_principal()) with check (is_principal());
create policy internal_reads_self on internal_notice_reads for all to authenticated
  using (teacher_id = auth.uid() or is_principal())
  with check (teacher_id = auth.uid());

-- =============================================================================
-- ADMISSIONS — principal-only read; no anon read; insert via Function
-- =============================================================================
create policy adm_principal on admission_enquiries for all to authenticated
  using (is_principal()) with check (is_principal());
-- consent_records: principal read; inserts happen server-side (service role).
create policy consent_principal_read on consent_records for select to authenticated
  using (is_principal());

-- =============================================================================
-- MEDIA ASSETS — staff read; owner/principal write
-- =============================================================================
create policy media_read on media_assets for select to authenticated
  using (is_active_teacher());
create policy media_write on media_assets for insert to authenticated
  with check (uploaded_by = auth.uid() and is_active_teacher());

-- =============================================================================
-- AUDIT LOGS — append-only; principal read; NOBODY updates/deletes
-- =============================================================================
create policy audit_read on audit_logs for select to authenticated
  using (is_principal());
create policy audit_insert on audit_logs for insert to authenticated
  with check (auth.uid() is not null);
-- (No update/delete policy => impossible for any non-service role.)

-- =============================================================================
-- PROFILES — self read/update; principal read all
-- =============================================================================
create policy profile_self on profiles for select to authenticated
  using (id = auth.uid() or is_principal());
create policy profile_self_upd on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profile_self_insert on profiles for insert to authenticated
  with check (id = auth.uid());
