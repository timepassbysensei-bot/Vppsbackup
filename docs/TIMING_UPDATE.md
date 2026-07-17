# Updating school timings

Timings are served from the database (`timing_schedules` + `timing_shift_assignments`),
never hard-coded. The homepage and Academics page read the single **active**
schedule.

## Model

- A schedule has `morning_start/end`, `day_start/end`, a `state`
  (`draft` / `active` / `inactive`), and an `is_override` flag.
- A partial unique index (`one_active_normal`) enforces **at most one active,
  non-override schedule** at a time.
- `timing_shift_assignments` maps each class to `morning` or `day`.

Current active schedule (seeded): Morning 6:00–10:00 AM → Nursery, Classes 1–3,
9–10. Day 10:10 AM–3:30 PM → Classes 4–8.

## Change the normal schedule

1. Create a new schedule in `draft`.
2. Set its shift assignments.
3. Deactivate the current active schedule (`state='inactive'`), then set the new
   one `state='active'`. The unique index guarantees only one normal active row.

## Temporary override (e.g. exam week, weather)

Create a schedule with `is_override = true` and `state='active'`. Overrides are
exempt from the single-active-normal index so they can coexist; the app shows the
override while it is active. Every timing change is written to `audit_logs`.

All timing writes are principal-only (RLS `timing_admin`).
