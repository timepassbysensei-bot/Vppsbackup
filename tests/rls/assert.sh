#!/bin/bash
# Runs RLS assertions. Each check is a fresh connection; we SET ROLE and the
# test.user_id GUC (which auth.uid() reads) to impersonate an actor.
PSQL="psql -h /tmp/pgtest -p 5433 -U postgres -tA -q"
PRIN=11111111-1111-1111-1111-111111111111
TEACH=22222222-2222-2222-2222-222222222222
PEND=33333333-3333-3333-3333-333333333333
pass=0; fail=0

chk() { # label  expected  sql-with-role-preamble
  local label="$1"; local want="$2"; local sql="$3"
  local got
  got=$($PSQL -c "$sql" 2>/dev/null)
  if [ "$got" == "$want" ]; then
    echo "PASS | $label (got=$got)"; pass=$((pass+1))
  else
    echo "FAIL | $label (got=$got want=$want)"; fail=$((fail+1))
  fi
}

as_anon="set role anon;"
as_teach="set role authenticated; set test.user_id = '$TEACH';"
as_prin="set role authenticated; set test.user_id = '$PRIN';"
as_pend="set role authenticated; set test.user_id = '$PEND';"

echo "=== Test matrix (authorization) ==="
# 1. Anon cannot list teacher profiles
chk "T1  anon cannot read profiles" 0 "$as_anon select count(*) from profiles;"
# 2. Anon cannot read full birthday records
chk "T2  anon cannot read birthday_profiles" 0 "$as_anon select count(*) from birthday_profiles;"
# 3. Anon cannot read parent messages
chk "T3  anon cannot read parent_messages" 0 "$as_anon select count(*) from parent_messages;"
# 4. Anon cannot read admissions
chk "T4  anon cannot read admission_enquiries" 0 "$as_anon select count(*) from admission_enquiries;"
# 5. Anon cannot read internal notices
chk "T5  anon cannot read internal_teacher_notices" 0 "$as_anon select count(*) from internal_teacher_notices;"
# 6. Anon cannot read leave
chk "T6  anon cannot read teacher_leave_requests" 0 "$as_anon select count(*) from teacher_leave_requests;"
# Public reads that SHOULD work for anon
chk "T+  anon CAN read classes"      11 "$as_anon select count(*) from classes;"
chk "T+  anon CAN read settings row"  1 "$as_anon select count(*) from school_settings;"
chk "T+  anon CAN read active timing" 1 "$as_anon select count(*) from timing_schedules;"

# 7. Pending teacher blocked from data (no approved role)
chk "T7  pending teacher blocked from parent_messages" 0 "$as_pend select count(*) from parent_messages;"
chk "T7b pending teacher is_active_teacher=false" f "$as_pend select is_active_teacher();"

# Principal can read sensitive tables
chk "T-  principal reads parent_messages" 1 "$as_prin select count(*) from parent_messages;"
chk "T-  principal reads admissions"      1 "$as_prin select count(*) from admission_enquiries;"
chk "T-  principal reads birthdays"       1 "$as_prin select count(*) from birthday_profiles;"
chk "T-  principal reads audit_logs"      "$($PSQL -c "select count(*) from audit_logs;")" "$as_prin select count(*) from audit_logs;"

# 9. Teacher cannot self-promote (write user_roles denied -> 0 rows updated)
chk "T9  teacher cannot update own role" 0 "$as_teach with u as (update user_roles set role='principal' where user_id='$TEACH' returning 1) select count(*) from u;"
chk "T9b teacher is_principal=false" f "$as_teach select is_principal();"

# 11. Teacher cannot read another's leave (none exist for them -> 0)
chk "T11 teacher sees only own leave" 0 "$as_teach select count(*) from teacher_leave_requests;"
# 12. Teacher cannot read unassigned parent message
chk "T12 teacher cannot read unassigned message" 0 "$as_teach select count(*) from parent_messages;"
# 15. Teacher cannot change timings (update denied -> 0)
chk "T15 teacher cannot update timings" 0 "$as_teach with u as (update timing_schedules set name='x' returning 1) select count(*) from u;"
# 16. Teacher cannot delete audit logs (delete denied -> 0)
chk "T16 teacher cannot delete audit logs" 0 "$as_teach with d as (delete from audit_logs returning 1) select count(*) from d;"

# 20/21 ownership helper: teacher owns Class 1/A, not Class 2
echo "=== ownership helper ==="
C1=$($PSQL -c "select id from classes where name='1';")
S1A=$($PSQL -c "select s.id from sections s join classes c on c.id=s.class_id where c.name='1' and s.name='A';")
C2=$($PSQL -c "select id from classes where name='2';")
NUR=$($PSQL -c "select id from classes where name='Nursery';")
chk "T21 teacher owns Class1/A" t "$as_teach select teacher_owns_class('$C1','$S1A');"
chk "T21b teacher does NOT own Class2" f "$as_teach select teacher_owns_class('$C2', null);"

echo ""
echo "SUMMARY: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
