-- =============================================================================
-- 0004_functions.sql — server-callable RPCs
--
-- public_birthdays(m, d) returns ONLY safe display fields for birthdays whose
-- day/month match the given values. It NEVER returns dob, year, age, or any
-- contact data. It is SECURITY DEFINER so the birthdays-today Netlify Function
-- (service role) can call it, but by construction it cannot leak the full date.
-- =============================================================================

create or replace function public_birthdays(m int, d int)
returns table (
  display_name text,
  class_name text,
  section_name text,
  greeting_en text,
  greeting_hi text,
  photo_path text,
  publish_mode text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    b.display_name,
    c.name as class_name,
    s.name as section_name,
    b.greeting_en,
    b.greeting_hi,
    case when b.publish_mode = 'with_photo' then b.photo_path else null end as photo_path,
    b.publish_mode
  from birthday_profiles b
  left join classes c on c.id = b.class_id
  left join sections s on s.id = b.section_id
  where b.is_active
    and b.publish_mode in ('text_only', 'with_photo')
    and extract(month from b.dob) = m
    and extract(day from b.dob) = d;
$$;

-- Only the service role should invoke this (via the Function). Revoke from
-- anon/authenticated so it can never be called directly from the browser.
revoke all on function public_birthdays(int, int) from public, anon, authenticated;
grant execute on function public_birthdays(int, int) to service_role;
