-- =============================================================================
-- RLS behaviour tests against the local shim DB.
-- We seed two auth users (a principal + a teacher), grant them roles/perms,
-- assign the teacher to Class 1 Section A, then assert access outcomes.
-- =============================================================================
\set ON_ERROR_STOP on

-- Create auth users + profiles
insert into auth.users(id, email) values
  ('11111111-1111-1111-1111-111111111111','principal@example.com'),
  ('22222222-2222-2222-2222-222222222222','teacher@example.com'),
  ('33333333-3333-3333-3333-333333333333','pending@example.com');

insert into profiles(id, full_name, email) values
  ('11111111-1111-1111-1111-111111111111','Principal Demo','principal@example.com'),
  ('22222222-2222-2222-2222-222222222222','Teacher Demo','teacher@example.com'),
  ('33333333-3333-3333-3333-333333333333','Pending Demo','pending@example.com');

insert into user_roles(user_id, role, status) values
  ('11111111-1111-1111-1111-111111111111','principal','approved'),
  ('22222222-2222-2222-2222-222222222222','teacher','approved'),
  ('33333333-3333-3333-3333-333333333333','teacher','pending');

insert into teacher_permissions(user_id, can_public_notices, can_birthdays) values
  ('22222222-2222-2222-2222-222222222222', true, false);

-- Assign teacher to Class '1' Section 'A'
insert into teacher_class_assignments(user_id, class_id, section_id)
select '22222222-2222-2222-2222-222222222222', c.id, s.id
from classes c join sections s on s.class_id=c.id
where c.name='1' and s.name='A';

-- A private parent message + admission enquiry (as service/superuser)
insert into parent_messages(student_name, sender_name, phone, body)
values ('Demo Student','Demo Parent','+910000000000','demo body');
insert into admission_enquiries(student_name, guardian_name, phone, class_applying, consent)
values ('Demo Student','Demo Guardian','+910000000000','1', true);
insert into birthday_profiles(display_name, dob, publish_mode)
values ('Demo Kid','2015-07-17','text_only');

-- Helper to print a labeled boolean expectation
create or replace function expect(label text, got bigint, want bigint) returns void
  language plpgsql as $$
begin
  raise notice '% => got=% want=% %', label, got, want,
    case when got=want then 'PASS' else '*** FAIL ***' end;
end $$;
