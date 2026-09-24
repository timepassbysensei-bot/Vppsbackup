-- =============================================================================
-- 0006_classes_admin.sql — principal management of classes & sections
-- =============================================================================
--
-- The principal can add classes/sections from the dashboard (for example Class
-- 11 / 12, or a new section 1C). Adding rows needs nothing new: RLS already
-- grants `classes_admin` / `sections_admin` to `is_principal()`.
--
-- REMOVAL is the part that needs care, and is why this migration exists.
-- Several foreign keys point at `classes`/`sections` with `on delete cascade`:
--
--   sections.class_id                     -> cascade (intended: children go too)
--   teacher_class_assignments.class_id    -> cascade
--   teacher_class_assignments.section_id  -> cascade
--   timing_shift_assignments.class_id     -> cascade
--
-- A bare `delete from classes` would therefore SILENTLY destroy real records:
-- teacher assignments, timing assignments and sections — with no warning and no
-- undo. That contradicts the project rule "never remove existing database data".
--
-- So deletes go through the two functions below, which refuse to run while any
-- record still refers to the class/section (including teacher assignments, the
-- "teachers" case in the dashboard copy). The principal archive/reassigns first,
-- or simply stops using the entry — nothing is ever destroyed by accident.
--
-- Both functions are SECURITY DEFINER + principal-checked, so they add no new
-- privilege: they only ever *restrict* what `is_principal()` could do.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- In-use predicates
-- -----------------------------------------------------------------------------
-- A class is "in use" if ANY record refers to it, including the cascading ones.
create or replace function class_in_use(p_class_id uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select
       exists (select 1 from class_notices            where class_id = p_class_id)
    or exists (select 1 from homework_uploads         where class_id = p_class_id)
    or exists (select 1 from calendar_events          where class_id = p_class_id)
    or exists (select 1 from student_spotlights       where class_id = p_class_id)
    or exists (select 1 from birthday_profiles        where class_id = p_class_id)
    or exists (select 1 from parent_messages          where class_id = p_class_id)
    -- Cascading FKs: counted so they can never be destroyed silently.
    or exists (select 1 from teacher_class_assignments where class_id = p_class_id)
    or exists (select 1 from timing_shift_assignments  where class_id = p_class_id);
$$;

-- A section is "in use" if any record refers to it. Sections themselves are not
-- counted: an empty section of an unused class may be removed freely.
create or replace function section_in_use(p_section_id uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select
       exists (select 1 from class_notices            where section_id = p_section_id)
    or exists (select 1 from homework_uploads         where section_id = p_section_id)
    or exists (select 1 from calendar_events          where section_id = p_section_id)
    or exists (select 1 from student_spotlights       where section_id = p_section_id)
    or exists (select 1 from birthday_profiles        where section_id = p_section_id)
    or exists (select 1 from parent_messages          where section_id = p_section_id)
    or exists (select 1 from teacher_class_assignments where section_id = p_section_id);
$$;


-- -----------------------------------------------------------------------------
-- Guarded deletes
-- -----------------------------------------------------------------------------
-- Call with: supabase.rpc('delete_class', { p_id: <uuid> })
--
--   raises 'forbidden'  (SQLSTATE 42501) -> caller is not an approved principal
--   raises 'class_in_use' / 'section_in_use' (SQLSTATE P0001) -> still referenced
--
-- The client maps those codes to the localised `classes.inUseNote` message.
create or replace function delete_class(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not is_principal() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (select 1 from classes where id = p_id) then
    return; -- already gone; nothing to do
  end if;

  if class_in_use(p_id) then
    raise exception 'class_in_use' using errcode = 'P0001';
  end if;

  -- Safe now: no content, no teacher/timing assignment, and only its own
  -- (empty) sections cascade away with it.
  delete from classes where id = p_id;
end $$;

create or replace function delete_section(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not is_principal() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (select 1 from sections where id = p_id) then
    return;
  end if;

  if section_in_use(p_id) then
    raise exception 'section_in_use' using errcode = 'P0001';
  end if;

  delete from sections where id = p_id;
end $$;


-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
-- Signed-in staff may CALL them (the principal check inside is what authorises),
-- but they are never reachable anonymously.
revoke all on function class_in_use(uuid)   from public, anon, authenticated;
revoke all on function section_in_use(uuid) from public, anon, authenticated;
revoke all on function delete_class(uuid)   from public, anon;
revoke all on function delete_section(uuid) from public, anon;

grant execute on function class_in_use(uuid)   to authenticated;
grant execute on function section_in_use(uuid) to authenticated;
grant execute on function delete_class(uuid)   to authenticated;
grant execute on function delete_section(uuid) to authenticated;


-- =============================================================================
-- NOTES
-- =============================================================================
-- * Adding a class/section is a plain RLS-guarded insert from the dashboard; a
--   client cannot insert one unless `is_principal()` is true.
-- * `classes.name` is globally unique and `sections` is unique per
--   (class_id, name), so duplicates are rejected by the database itself.
-- * Deletion is intentionally hard to do by accident. Nothing here archives
--   automatically: an in-use class stays, which is the safe default.
