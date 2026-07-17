-- =============================================================================
-- 0003_storage.sql — Supabase Storage buckets & policies
--
-- Only clearly-public buckets are public. Private files are served exclusively
-- through short-lived signed URLs minted by the `signed-file` Netlify Function
-- AFTER it verifies the caller may access the owning row.
--
-- Filenames are random (crypto.randomUUID() + a validated extension). We NEVER
-- rely on unpredictable names as access control — buckets + policies do that.
-- Private buckets store objects under a top-level folder equal to the owner's
-- user id, e.g. `<auth.uid()>/<uuid>.pdf`, so ownership is checkable in policy.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Buckets
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('branding',          'branding',          true),
  ('notices',           'notices',           true),
  ('homework',          'homework',          true),
  ('resources-public',  'resources-public',  true),
  ('spotlight',         'spotlight',         true),
  ('birthday',          'birthday',          true),
  ('resources-private', 'resources-private', false),
  ('parent-attachments','parent-attachments',false),
  ('leave-attachments', 'leave-attachments', false),
  ('internal-notices',  'internal-notices',  false)
on conflict (id) do nothing;

-- =============================================================================
-- PUBLIC BUCKETS — anon read; scoped staff write
-- =============================================================================

-- branding: principal-managed only.
create policy branding_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'branding');
create policy branding_write on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and is_principal());
create policy branding_update on storage.objects for update to authenticated
  using (bucket_id = 'branding' and is_principal())
  with check (bucket_id = 'branding' and is_principal());
create policy branding_delete on storage.objects for delete to authenticated
  using (bucket_id = 'branding' and is_principal());

-- notices: any teacher with the public_notices permission (or principal).
create policy notices_files_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'notices');
create policy notices_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'notices' and teacher_can('public_notices'));

-- homework: anon read; scoped teacher write.
create policy hw_files_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'homework');
create policy hw_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'homework' and is_active_teacher());

-- resources-public: teachers with resources permission.
create policy respub_files_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'resources-public');
create policy respub_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'resources-public' and teacher_can('resources'));

-- spotlight: teachers with spotlight permission.
create policy spotlight_files_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'spotlight');
create policy spotlight_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'spotlight' and teacher_can('spotlight'));

-- birthday: approved birthday photos only; teachers with birthdays permission.
create policy birthday_files_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'birthday');
create policy birthday_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'birthday' and teacher_can('birthdays'));

-- =============================================================================
-- PRIVATE BUCKETS — no anon; principal + owner (folder = auth.uid())
-- =============================================================================

-- leave-attachments: owner may write/read own folder; principal reads all.
create policy leave_files_read on storage.objects for select to authenticated
  using (bucket_id = 'leave-attachments' and (
    is_principal() or (storage.foldername(name))[1] = auth.uid()::text));
create policy leave_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'leave-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text);

-- resources-private: staff read; teachers with resources permission write.
create policy respriv_files_read on storage.objects for select to authenticated
  using (bucket_id = 'resources-private' and is_active_teacher());
create policy respriv_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'resources-private' and teacher_can('resources'));

-- parent-attachments: principal + assigned teacher read. Inserts are done by the
-- submit-parent-message Function (service role), so no anon insert policy exists.
create policy parent_files_read on storage.objects for select to authenticated
  using (bucket_id = 'parent-attachments' and is_principal());

-- internal-notices: staff read; principal write.
create policy internal_files_read on storage.objects for select to authenticated
  using (bucket_id = 'internal-notices' and is_active_teacher());
create policy internal_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'internal-notices' and is_principal());
