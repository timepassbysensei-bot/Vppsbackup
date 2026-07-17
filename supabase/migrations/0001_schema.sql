-- =============================================================================
-- 0001_schema.sql — View Point Public School
-- Core schema: identity/roles, settings, timing, content, private comms,
-- internal/staff, chatbot/audit. UUID PKs, FKs, checks, indexes,
-- created/updated/by columns, soft-delete, updated_at + audit triggers.
--
-- RULE: Authorization is NEVER stored in user-editable profile metadata.
-- The authoritative role/permission store is `user_roles` + `teacher_permissions`.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Reusable trigger helpers
-- -----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Generic append-only audit trigger. Records a compact summary of writes to
-- sensitive tables. Never records secrets, complaint bodies, or leave reasons.
create or replace function audit_row_change() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  v_action text := lower(tg_op);
  v_id uuid;
begin
  begin
    if tg_op = 'DELETE' then
      v_id := old.id;
    else
      v_id := new.id;
    end if;
  exception when others then
    v_id := null;
  end;

  insert into audit_logs(actor, action, content_type, content_id, summary)
  values (
    auth.uid(),
    tg_table_name || '_' || v_action,
    tg_table_name,
    v_id,
    tg_op
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

-- =============================================================================
-- ROLES / IDENTITY
-- =============================================================================
create type app_role as enum ('principal', 'teacher');
create type approval_status as enum ('pending', 'approved', 'rejected', 'suspended');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,               -- mirror only; NEVER used for authz decisions
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_roles (              -- authoritative role store
  user_id uuid primary key references profiles(id) on delete cascade,
  role app_role not null default 'teacher',
  status approval_status not null default 'pending',
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table teacher_permissions (
  user_id uuid primary key references profiles(id) on delete cascade,
  can_public_notices boolean not null default false,
  can_birthdays boolean not null default false,
  can_resources boolean not null default false,
  can_spotlight boolean not null default false,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,          -- 'Nursery','1'..'10'
  requires_section boolean not null default true,
  sort_order int not null
);

create table sections (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  name text not null,                 -- 'A','B'
  unique (class_id, name)
);

create table teacher_class_assignments (
  user_id uuid references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  section_id uuid references sections(id) on delete cascade, -- null = Nursery/all
  primary key (user_id, class_id, section_id)
);

-- =============================================================================
-- SETTINGS / BRANDING
-- =============================================================================
create table school_settings (          -- single row
  id uuid primary key default gen_random_uuid(),
  name_en text, name_hi text, tagline text,
  address text, phone text, email text, office_hours text,
  established_year int, principal_name text,
  affiliation text, affiliation_number text,        -- nullable, editable
  facilities jsonb not null default '[]',
  facebook_url text, instagram_url text, map_url text,
  admission_mode text not null default 'automatic'
    check (admission_mode in ('automatic', 'open', 'closed')),
  public_fee_message text,
  homepage_intro_en text, homepage_intro_hi text,
  about_en text, about_hi text, mission_en text, mission_hi text,
  vision_en text, vision_hi text,
  principal_message_en text, principal_message_hi text,
  privacy_contact text, default_language text not null default 'en',
  homework_retention_days int not null default 7
    check (homework_retention_days in (1, 7, 30)),
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

create table branding_assets (
  key text primary key check (key in
    ('logo', 'favicon', 'hero', 'principal_photo', 'about_photo', 'og_image', 'fallback')),
  storage_path text,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- TIMING
-- =============================================================================
create table timing_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  morning_start time, morning_end time, day_start time, day_end time,
  effective_date date, end_date date,
  state text not null default 'draft' check (state in ('draft', 'active', 'inactive')),
  is_override boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one active, non-override ("normal") schedule at any time.
create unique index one_active_normal on timing_schedules(state)
  where state = 'active' and is_override = false;

create table timing_shift_assignments (
  schedule_id uuid references timing_schedules(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  shift text not null check (shift in ('morning', 'day')),
  primary key (schedule_id, class_id)
);

-- =============================================================================
-- CONTENT
-- =============================================================================
create table public_notices (
  id uuid primary key default gen_random_uuid(),
  title_en text not null, title_hi text,
  summary_en text, summary_hi text, content_en text, content_hi text,
  category text not null check (category in
    ('General', 'Holiday', 'Examination', 'Academic', 'Admission', 'Event',
     'Parent Meeting', 'Emergency', 'Transport', 'Timing Change', 'Other')),
  priority text not null default 'normal' check (priority in ('normal', 'high', 'urgent')),
  audience text not null default 'public' check (audience in ('public', 'internal')),
  effective_date date, expiry_date date, published_at timestamptz,
  is_pinned boolean not null default false,
  is_urgent boolean not null default false,
  is_published boolean not null default false,
  attachment_path text,
  created_by uuid references profiles(id), updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz, is_deleted boolean not null default false
);
create index idx_notices_public on public_notices(is_published, audience, is_deleted, effective_date);

create table class_notices (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id),
  section_id uuid references sections(id),
  title_en text not null, title_hi text, content_en text, content_hi text,
  category text not null default 'General',
  attachment_path text, expiry_date date,
  is_published boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false
);
create index idx_class_notices_lookup on class_notices(class_id, section_id, is_published, is_deleted);

create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  title_en text not null, title_hi text, desc_en text, desc_hi text,
  event_type text not null check (event_type in
    ('Holiday', 'Examination', 'Parent Meeting', 'School Event', 'Competition',
     'Admission', 'Academic Deadline', 'Timing Change', 'Other')),
  start_date date not null, end_date date, start_time time, end_time time,
  all_day boolean not null default true,
  class_id uuid references classes(id), section_id uuid references sections(id),
  visibility text not null default 'public' check (visibility in ('public', 'internal')),
  location text, attachment_path text,
  is_published boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_events_public on calendar_events(is_published, visibility, start_date);

create table homework_uploads (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id),
  section_id uuid references sections(id),
  homework_date date not null,
  image_path text, notes_en text, notes_hi text,
  is_published boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false
);
create index idx_hw_lookup on homework_uploads(class_id, section_id, homework_date, is_deleted);

create table homework_versions (      -- private replacement history
  id uuid primary key default gen_random_uuid(),
  homework_id uuid references homework_uploads(id) on delete cascade,
  image_path text, notes_en text, notes_hi text,
  replaced_by uuid references profiles(id),
  replaced_at timestamptz not null default now()
);

create table student_spotlights (
  id uuid primary key default gen_random_uuid(),
  award_title text not null, display_name text not null,
  class_id uuid references classes(id), section_id uuid references sections(id),
  photo_path text, writeup_en text, writeup_hi text,
  month int check (month between 1 and 12), year int,
  is_published boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Exactly one published Student of the Month.
create unique index one_published_spotlight on student_spotlights(is_published) where is_published;

create table birthday_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  class_id uuid references classes(id), section_id uuid references sections(id),
  dob date not null,               -- PRIVATE. Never exposed whole to anon.
  photo_path text, greeting_en text, greeting_hi text,
  publish_mode text not null default 'none'
    check (publish_mode in ('text_only', 'with_photo', 'none')),
  created_by uuid references profiles(id), updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table resources (
  id uuid primary key default gen_random_uuid(),
  title_en text not null, title_hi text, desc_en text, desc_hi text,
  category text not null check (category in
    ('Admission Forms', 'Syllabus', 'Examination Schedules', 'Holiday Calendar',
     'Leave Templates', 'Circulars', 'Policies', 'Other')),
  academic_session text, file_path text, file_size bigint, file_type text,
  version int not null default 1, published_at timestamptz,
  is_published boolean not null default false, is_public boolean not null default false,
  created_by uuid references profiles(id), updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- PRIVATE COMMUNICATION
-- =============================================================================
create table parent_messages (
  id uuid primary key default gen_random_uuid(),
  student_name text not null, sender_name text not null,
  phone text not null, class_id uuid references classes(id),
  section_id uuid references sections(id), body text not null,
  status text not null default 'New' check (status in
    ('New', 'Opened', 'Assigned', 'In Review', 'Resolved', 'Archived', 'Spam')),
  internal_note text, is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table parent_message_assignments (
  message_id uuid references parent_messages(id) on delete cascade,
  teacher_id uuid references profiles(id) on delete cascade,
  granted_by uuid references profiles(id), granted_at timestamptz not null default now(),
  revoked_at timestamptz, primary key (message_id, teacher_id)
);

create table parent_message_status_history (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references parent_messages(id) on delete cascade,
  old_status text, new_status text, changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);

create table parent_message_access_logs (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references parent_messages(id) on delete cascade,
  actor uuid references profiles(id), action text, at timestamptz not null default now()
);

create table admission_enquiries (
  id uuid primary key default gen_random_uuid(),
  student_name text not null, guardian_name text not null,
  phone text not null, email text, class_applying text not null,
  current_school text, message text, consent boolean not null,
  created_at timestamptz not null default now(), is_deleted boolean not null default false
);

create table consent_records (
  id uuid primary key default gen_random_uuid(),
  context text not null, ref_id uuid, consented_at timestamptz not null default now()
);

-- =============================================================================
-- INTERNAL / STAFF
-- =============================================================================
create table internal_teacher_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null, content text not null,
  priority text not null default 'normal',
  attachment_path text, published_at timestamptz, expiry_date date,
  ack_required boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table internal_notice_reads (
  notice_id uuid references internal_teacher_notices(id) on delete cascade,
  teacher_id uuid references profiles(id) on delete cascade,
  read_at timestamptz not null default now(), primary key (notice_id, teacher_id)
);

create table teacher_leave_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  start_date date not null, end_date date not null,
  half_day boolean not null default false,
  days numeric generated always as
    (case when half_day then 0.5 else (end_date - start_date) + 1 end) stored,
  reason text,                 -- PRIVATE
  attachment_path text,
  status text not null default 'Pending'
    check (status in ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table leave_decisions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references teacher_leave_requests(id) on delete cascade,
  decision text not null check (decision in ('Approved', 'Rejected')),
  decided_by uuid references profiles(id), decided_at timestamptz not null default now(),
  note text
);

-- =============================================================================
-- CHATBOT / AUDIT
-- =============================================================================
create table chatbot_faqs (
  id uuid primary key default gen_random_uuid(),
  topic text not null, question_en text, answer_en text,
  question_hi text, answer_hi text, is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table chatbot_settings (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default true, disclaimer text,
  updated_at timestamptz not null default now()
);

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null, path text not null, purpose text,
  uploaded_by uuid references profiles(id), size bigint, sha256 text,
  created_at timestamptz not null default now()
);

create table audit_logs (           -- append-only
  id uuid primary key default gen_random_uuid(),
  actor uuid references profiles(id), action text not null,
  content_type text, content_id uuid,
  class_id uuid, section_id uuid, summary text,
  at timestamptz not null default now()
);
create index idx_audit_at on audit_logs(at desc);

-- =============================================================================
-- updated_at triggers (every table that has an updated_at column)
-- =============================================================================
do $$
declare
  t text;
  tables text[] := array[
    'profiles', 'user_roles', 'teacher_permissions', 'school_settings',
    'branding_assets', 'timing_schedules', 'public_notices', 'class_notices',
    'calendar_events', 'homework_uploads', 'student_spotlights',
    'birthday_profiles', 'resources', 'parent_messages',
    'internal_teacher_notices', 'teacher_leave_requests', 'chatbot_faqs',
    'chatbot_settings'
  ];
begin
  foreach t in array tables loop
    execute format(
      'create trigger trg_%1$s_updated_at before update on %1$s
         for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- =============================================================================
-- audit triggers on the most sensitive tables
-- =============================================================================
do $$
declare
  t text;
  tables text[] := array[
    'user_roles', 'teacher_permissions', 'school_settings',
    'timing_schedules', 'parent_messages', 'teacher_leave_requests',
    'leave_decisions', 'student_spotlights'
  ];
begin
  foreach t in array tables loop
    execute format(
      'create trigger trg_%1$s_audit after insert or update or delete on %1$s
         for each row execute function audit_row_change();', t);
  end loop;
end $$;
