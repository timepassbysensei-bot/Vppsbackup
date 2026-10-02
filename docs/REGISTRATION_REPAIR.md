# Teacher registration: root cause and repair

This document records why registered teachers could be missing from **Pending
Registrations**, what was changed, and how to confirm the fix. It is written for
whoever maintains the school's Supabase project.

## Symptom

The navigation badge showed **1** beside *Registrations*, while the Pending
Registrations page said:

> No one is waiting for approval.

Both were "right" about different things — they were not reading the same data.

## Root cause

Two independent faults, and fixing only one would have hidden the other.

### 1. The page's query failed and the failure was rendered as an empty state

`user_roles` has **two** foreign keys into `profiles`:

| column        | references     | purpose            |
| ------------- | -------------- | ------------------ |
| `user_id`     | `profiles(id)` | the account        |
| `approved_by` | `profiles(id)` | who approved them  |

The Pending Registrations page embedded the profile with:

```ts
supabase
  .from('user_roles')
  .select('user_id, role, status, approved_by, approved_at, profiles(full_name, email)')
```

Because two relationships exist between the same two tables, that embed is
**ambiguous**, and PostgREST rejects it (`PGRST201`, "more than one relationship
was found"). The query therefore threw.

The panel only checked `isLoading` — never `isError`:

```ts
const { data: staff, isLoading } = useStaff();
...
{pending.length === 0 ? <Empty title="No one is waiting for approval" /> : ...}
```

A thrown query leaves `data === undefined`, so `pending.length === 0` was `true`
and the error was displayed as a friendly empty state. The badge, meanwhile,
used a completely different query — a plain `count` on `user_roles` with its own
cache key (`['badge-pending']`) that never errored, and reported the true count.

### 2. Some accounts genuinely have no role row

The initial `pending` row is created by the `handle_new_user` trigger on
`auth.users` (`0005_auth_signup.sql`). Any account created **while that trigger
was absent** — before 0005 was applied, or created out-of-band from the Supabase
dashboard or Admin API — has an auth user but no `profiles` and no `user_roles`
row.

Every dashboard query reads `user_roles`, so such an account is invisible to both
Pending Registrations *and* the Staff Roster, no matter how the query is written.

## The fix

### One query for badge, list and roster

`src/lib/hooks/useStaff.ts` is now the single source:

* one cache key — `STAFF_QUERY_KEY = ['staff']` — shared by the badge, the
  Pending Registrations page and the Staff Roster, so they cannot disagree, and
  one invalidation refreshes all three with no page reload
* one pending definition — `pendingRegistrations()` — used by the badge and the
  list alike
* **no embedded resource**: `user_roles` and `profiles` are fetched as two plain
  RLS-guarded selects and joined in memory, so the query cannot fail on
  relationship ambiguity
* an explicit **error state with a Retry button**; the empty state is only ever
  shown when the query genuinely succeeded with zero pending rows

### Repairing accounts that are already missing their rows

Two equivalent, additive paths — both only ever insert what is missing, and
neither one grants access:

1. **From the dashboard** — *Pending Registrations → Repair missing
   registrations*. This calls the principal-only `repair-registrations` Netlify
   Function, which pages through Supabase Auth with the service-role key and
   reports how many accounts were repaired. `auth.users` is never exposed to the
   browser.
2. **From SQL** — `supabase/migrations/0008_principal_access_and_audit.sql`
   performs the same backfill and is idempotent.

Safety properties of both:

* `on conflict do nothing` / "insert only if missing" — an existing role, status
  or profile is **never** overwritten, so nobody is demoted or promoted
* the created row is `teacher` / `pending`, which grants **no** access under any
  RLS helper (`is_active_teacher`, `teacher_can`, `teacher_owns_class`)
* one append-only `audit_logs` entry per repaired account, with
  `action = 'registration_repaired'`
* users are never deleted and are never asked to register again

## How to verify

```sql
-- 1. Accounts still missing a role row. Must return 0 rows.
select u.id, u.email
from auth.users u
left join public.user_roles r on r.user_id = u.id
where r.user_id is null;

-- 2. What the principal should see in Pending Registrations.
select r.created_at, p.full_name, p.email, r.role, r.status
from public.user_roles r
join public.profiles p on p.id = r.user_id
where r.status = 'pending'
order by r.created_at;

-- 3. What the badge counts. Must equal the row count from (2).
select count(*) from public.user_roles where status = 'pending';
```

Then, in the dashboard: sign in as the principal, confirm the badge equals the
number of rows returned by query (2), open **Pending Registrations**, and approve
one. The badge, the list and the Staff Roster all update without a reload.

## Registration lifecycle (the contract this protects)

1. Teacher registers (email + password) → Supabase Auth creates the account.
2. `handle_new_user` creates `profiles` + a `pending` `user_roles` row +
   `teacher_permissions` with every flag off.
3. The account has **no** privileged role and can read nothing.
4. The principal sees it in Pending Registrations (badge and list agree).
5. The principal approves or rejects it; approval is re-verified server-side and
   runs only in the `approve-teacher` Function.
6. Approving sets the role/status, records the approver and timestamp, and writes
   an audit entry.
7. The approved teacher appears in the Staff Roster.
8. The principal assigns classes, sections and permissions.
9. The teacher signs in and sees only their assigned classes.

## Related: principal access to the Teacher dashboard

An approved principal may open `/admin/teacher` (supervisory access). No role is
changed, nothing is written to `localStorage`, and no second sign-in is needed;
the route guard (`RequireTeacherAccess`) permits an approved teacher **or**
principal, and RLS already grants the principal every class because
`teacher_owns_class()` / `teacher_can()` short-circuit on `is_principal()`. An
ordinary teacher remains restricted to `teacher_class_assignments`.
