-- =============================================================================
-- 0007_restore_modules.sql — schema + RLS for the restored Principal/Teacher
-- dashboard modules (gallery, timing periods, emergency alerts, threads,
-- admissions workflow, homework images, internal-notice workflow, Student of
-- the Month approval workflow, resources audience, school settings extensions).
--
-- Authorization stays in Postgres. Every new table enables RLS and every new
-- policy derives from the SECURITY DEFINER helpers in 0002_rls.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. NEW TABLES
-- -----------------------------------------------------------------------------

-- Emergency alerts — a dedicated, short-lived banner (separate from notices so
-- it can be deactivated instantly without touching published content).
create table emergency_alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'public' check (audience in ('public', 'internal', 'all')),
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Gallery albums + images.
create table gallery_albums (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_hi text,
  description_en text,
  description_hi text,
  cover_image_id uuid,
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  is_deleted boolean not null default false
);

create table gallery_images (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references gallery_albums(id) on delete cascade,
  storage_path text not null,
  caption_en text,
  caption_hi text,
  width int,
  height int,
  size_bytes bigint,
  original_bytes bigint,
  sort_order int not null default 0,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  is_deleted boolean not null default false
);
create index idx_gallery_images_album on gallery_images(album_id, is_deleted, archived_at);

alter table gallery_albums
  add constraint gallery_albums_cover_fk
  foreign key (cover_image_id) references gallery_images(id) on delete set null;

-- Period / break / assembly timings belong to a schedule.
create table timing_periods (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references timing_schedules(id) on delete cascade,
  label text not null,
  kind text not null default 'period' check (kind in ('period', 'break', 'assembly', 'other')),
  start_time time not null,
  end_time time not null,
  sort_order int not null default 0
);
create index idx_timing_periods_schedule on timing_periods(schedule_id, sort_order);

-- Unanswered chatbot questions, so the principal can turn them into FAQs.
create table chatbot_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  lang text not null default 'en',
  asked_by uuid references profiles(id),
  answered_faq_id uuid references chatbot_faqs(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Parent-message conversation threads (staff replies + internal notes).
create table parent_message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references parent_messages(id) on delete cascade,
  author_kind text not null check (author_kind in ('staff', 'parent', 'system')),
  author_id uuid references profiles(id),
  body text not null,
  is_internal boolean not null default false,
  attachment_path text,
  created_at timestamptz not null default now()
);
create index idx_pm_replies on parent_message_replies(message_id, created_at);

-- -----------------------------------------------------------------------------
-- 2. COLUMNS ON EXISTING TABLES
-- -----------------------------------------------------------------------------
alter table parent_messages
  add column if not exists subject text,
  add column if not exists parent_email text,
  add column if not exists is_open boolean not null default true,
  add column if not exists assigned_to uuid references profiles(id),
  add column if not exists unread_principal boolean not null default true,
  add column if not exists attachment_path text;

alter table admission_enquiries
  add column if not exists class_id uuid references classes(id),
  add column if not exists section_id uuid references sections(id),
  add column if not exists status text not null default 'New'
    check (status in ('New', 'Contacted', 'Follow-up', 'Admitted', 'Closed', 'Spam')),
  add column if not exists assigned_to uuid references profiles(id),
  add column if not exists follow_up_date date,
  add column if not exists internal_note text,
  add column if not exists is_spam boolean not null default false;

alter table homework_uploads
  add column if not exists subject text,
  add column if not exists title text,
  add column if not exists images jsonb not null default '[]'::jsonb,
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists is_draft boolean not null default false;

alter table internal_teacher_notices
  add column if not exists audience text not null default 'all',
  add column if not exists is_pinned boolean not null default false,
  add column if not exists state text not null default 'draft'
    check (state in ('draft', 'published', 'archived')),
  add column if not exists is_deleted boolean not null default false;

alter table student_spotlights
  add column if not exists reason text,
  add column if not exists consent boolean not null default false,
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'rejected', 'published', 'archived')),
  add column if not exists rejection_note text,
  add column if not exists approved_by uuid references profiles(id),
  add column if not exists approved_at timestamptz,
  add column if not exists archived_at timestamptz;

alter table school_settings
  add column if not exists academic_session text,
  add column if not exists session_start_date date,
  add column if not exists session_end_date date,
  add column if not exists feature_toggles jsonb not null default '{}'::jsonb;

alter table resources
  add column if not exists audience text not null default 'public'
    check (audience in ('public', 'internal')),
  add column if not exists class_id uuid references classes(id),
  add column if not exists section_id uuid references sections(id),
  add column if not exists external_url text,
  add column if not exists is_archived boolean not null default false;

-- One Student of the Month per class+section+month+year (ignoring archived).
create unique index if not exists spotlight_unique_slot on student_spotlights (
  coalesce(class_id::text, ''),
  coalesce(section_id::text, ''),
  month,
  year
) where status <> 'archived' and month is not null and year is not null;

-- -----------------------------------------------------------------------------
-- 3. updated_at + audit triggers for the new tables
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  stamp text[] := array['emergency_alerts', 'gallery_albums'];
begin
  foreach t in array stamp loop
    execute format(
      'create trigger trg_%1$s_updated_at before update on %1$s
         for each row execute function set_updated_at();', t);
  end loop;
end $$;

do $$
declare
  t text;
  audited text[] := array[
    'emergency_alerts', 'gallery_albums', 'gallery_images', 'timing_periods',
    'admission_enquiries', 'class_notices', 'homework_uploads', 'public_notices',
    'resources', 'internal_teacher_notices', 'chatbot_faqs', 'chatbot_questions'
  ];
begin
  foreach t in array audited loop
    execute format(
      'create trigger trg_%1$s_audit after insert or update or delete on %1$s
         for each row execute function audit_row_change();', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 4. RLS on the new tables
-- -----------------------------------------------------------------------------
alter table emergency_alerts       enable row level security;
alter table gallery_albums         enable row level security;
alter table gallery_images         enable row level security;
alter table timing_periods         enable row level security;
alter table chatbot_questions      enable row level security;
alter table parent_message_replies enable row level security;

-- Emergency alerts: public read while active and unexpired; principal writes.
create policy alerts_read on emergency_alerts for select to anon, authenticated
  using (is_active and audience in ('public', 'all') and (expires_at is null or expires_at > now()));
create policy alerts_admin on emergency_alerts for all to authenticated
  using (is_principal()) with check (is_principal());

-- Gallery: only published, live albums/images are public; principal manages.
create policy gallery_albums_read on gallery_albums for select to anon, authenticated
  using (is_published and not is_deleted and archived_at is null);
create policy gallery_albums_admin on gallery_albums for all to authenticated
  using (is_principal()) with check (is_principal());

create policy gallery_images_read on gallery_images for select to anon, authenticated
  using (not is_deleted and archived_at is null and exists (
    select 1 from gallery_albums a
    where a.id = gallery_images.album_id and a.is_published and not a.is_deleted and a.archived_at is null));
create policy gallery_images_admin on gallery_images for all to authenticated
  using (is_principal()) with check (is_principal());

-- Timing periods: read alongside an active schedule; principal writes.
create policy timing_periods_read on timing_periods for select to anon, authenticated
  using (exists (select 1 from timing_schedules t
    where t.id = timing_periods.schedule_id and t.state = 'active'));
create policy timing_periods_admin on timing_periods for all to authenticated
  using (is_principal()) with check (is_principal());

-- Chatbot questions: principal manages; any signed-in caller may log one.
create policy cbq_principal on chatbot_questions for all to authenticated
  using (is_principal()) with check (is_principal());
create policy cbq_insert on chatbot_questions for insert to authenticated
  with check (auth.uid() is not null);

-- Thread replies: principal all; assigned teacher may read/write non-internal.
create policy pmr_principal on parent_message_replies for all to authenticated
  using (is_principal()) with check (is_principal());
create policy pmr_assigned_read on parent_message_replies for select to authenticated
  using (not is_internal and exists (select 1 from parent_message_assignments a
    where a.message_id = parent_message_replies.message_id and a.teacher_id = auth.uid() and a.revoked_at is null));
create policy pmr_assigned_write on parent_message_replies for insert to authenticated
  with check (not is_internal and author_kind = 'staff' and author_id = auth.uid()
    and exists (select 1 from parent_message_assignments a
      where a.message_id = parent_message_replies.message_id and a.teacher_id = auth.uid() and a.revoked_at is null));

-- -----------------------------------------------------------------------------
-- 5. Tighten / extend policies on existing tables
-- -----------------------------------------------------------------------------

-- Public notices: archived notices leave the public site but stay restorable.
drop policy if exists notices_public_read on public_notices;
create policy notices_public_read on public_notices for select to anon, authenticated
  using (is_published and audience = 'public' and not is_deleted and archived_at is null
    and (effective_date is null or effective_date <= current_date)
    and (expiry_date is null or expiry_date >= current_date));

-- Calendar: management is principal-only (previously any active teacher could write).
drop policy if exists events_write on calendar_events;
create policy events_admin on calendar_events for all to authenticated
  using (is_principal()) with check (is_principal());

-- Student of the Month: replace the blanket teacher write with an approval flow.
-- Teachers may create/edit their own draft or submitted entry; only the
-- principal may approve, publish, reject or archive.
drop policy if exists spotlight_write on student_spotlights;

create policy spotlight_principal on student_spotlights for all to authenticated
  using (is_principal()) with check (is_principal());
create policy spotlight_owner_read on student_spotlights for select to authenticated
  using (created_by = auth.uid());
create policy spotlight_owner_insert on student_spotlights for insert to authenticated
  with check (created_by = auth.uid() and teacher_can('spotlight') and status in ('draft', 'submitted'));
create policy spotlight_owner_update on student_spotlights for update to authenticated
  using (created_by = auth.uid() and status in ('draft', 'submitted', 'rejected'))
  with check (created_by = auth.uid() and status in ('draft', 'submitted'));
create policy spotlight_owner_delete on student_spotlights for delete to authenticated
  using (created_by = auth.uid() and status in ('draft', 'submitted', 'rejected'));

-- Homework: staff (teacher of the class, or principal) may read every entry,
-- including ones outside the public retention window; teachers may only write
-- for classes/sections they are assigned to. (teacher_owns_class already returns
-- true for the principal.)
create policy homework_staff_read on homework_uploads for select to authenticated
  using (teacher_owns_class(class_id, section_id));

-- Class notices: staff read inside owned classes (write policy already covers
-- this via `for all`), plus principal-wide moderation is granted by is_principal().

-- Profiles: the principal may read AND edit any staff profile (needed by the
-- staff-roster editor). Teachers can still only edit their own (0002 policy).
create policy profile_admin on profiles for all to authenticated
  using (is_principal()) with check (is_principal());

-- Admissions workflow: principal-only (unchanged) — status/assignment columns
-- ride on the existing adm_principal policy.

-- -----------------------------------------------------------------------------
-- 6. STORAGE — new bucket + real server-side validation
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('gallery', 'gallery', true)
on conflict (id) do nothing;

create policy gallery_files_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'gallery');
create policy gallery_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery' and is_principal());

-- Enforce size + MIME limits at the Storage layer (server-side validation that
-- cannot be bypassed from the browser).
update storage.buckets set file_size_limit = 4 * 1024 * 1024,
  allowed_mime_types = array['image/jpeg','image/png','image/webp']
  where id in ('gallery', 'spotlight', 'birthday');

update storage.buckets set file_size_limit = 5 * 1024 * 1024,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']
  where id in ('homework', 'notices');

update storage.buckets set file_size_limit = 2 * 1024 * 1024,
  allowed_mime_types = array['image/svg+xml','image/png','image/jpeg','image/webp','image/x-icon']
  where id = 'branding';

update storage.buckets set file_size_limit = 20 * 1024 * 1024,
  allowed_mime_types = array[
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg','image/png','image/webp','text/plain','text/csv']
  where id in ('resources-public', 'resources-private');

update storage.buckets set file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp']
  where id in ('leave-attachments', 'parent-attachments');

update storage.buckets set file_size_limit = 20 * 1024 * 1024,
  allowed_mime_types = array[
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg','image/png','image/webp','text/plain']
  where id = 'internal-notices';
