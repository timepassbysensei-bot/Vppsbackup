# Feature-Parity Audit — VPPS admin dashboards

**Scope:** compare the features the school used to have in the Principal and
Teacher dashboards with what exists after the redesign, record every gap, and
track the repair. Written after inspecting the repository, migrations, storage
policies, Netlify Functions and routes.

**Method / constraints**

- Git history contains only two commits (scaffold + redesign), so the "old site"
  UI is **not** in this repository and the referenced screenshots were not
  available in the working session. Old features were therefore reconstructed
  from the **tables, enums, buckets and RPCs that already existed but had no
  UI** — those are the authoritative description of the intended feature set.
- Authorization is enforced in Postgres RLS + Netlify Functions. Frontend guards
  are UX only. Every module below that says "RLS verified" is backed by a policy,
  not just a hidden button.

**Legend**

| Status | Meaning |
| --- | --- |
| ✅ Restored | Full CRUD UI + persistence + loading/error/empty states, RLS-backed |
| 🟡 Kept | Preserved from the redesign |
| 🟠 Partial | Works, but a sub-feature is deferred (see *Remaining limitations*) |
| ⬜ Database-only | Table/bucket exists with RLS; no UI yet |

---

## 1. Principal modules

| Feature | Old site | Before this change | Route | Role | Table / bucket | CRUD | Mobile | RLS | Tests | Repair status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pending registrations (role assignment + approver) | ✅ | Partial (approve/reject only) | `/admin/principal` → People | principal | `user_roles`, `profiles` | approve/reject | ✅ | ✅ `roles_admin` + `approve-teacher` (server re-checks) | ✅ | ✅ Restored (approver + timestamp shown) |
| Staff roster (search/filter/invite/activate/deactivate/roles/assignments/edit/revoke) | ✅ | Card only | People | principal | `user_roles`, `teacher_permissions`, `teacher_class_assignments`, `profiles` | ✅ | ✅ | ✅ + new `profile_admin` | ✅ | ✅ Restored |
| Internal notices (CRUD/draft/publish/pin/audience/dates/archive) | ✅ | Read-only on teacher side | Communication | principal | `internal_teacher_notices` | ✅ | ✅ | ✅ `internal_write` |  | ✅ Restored |
| Public notices (attachments/dates/pin/publish/archive/restore/preview) | ✅ | None | Content | principal | `public_notices`, `notices` bucket | ✅ | ✅ | ✅ |  | ✅ Restored |
| All class notices (view/search/filter/edit/archive/author/history) | ✅ | None | Academics | principal | `class_notices` | ✅ | ✅ | ✅ `class_notices_write` (principal included) |  | ✅ Restored |
| All homework (view/filter/attachments/edit/archive/author/missing) | ✅ | None | Academics | principal | `homework_uploads`, `homework` bucket | ✅ | ✅ | ✅ + new `homework_staff_read` |  | ✅ Restored |
| Leave inbox (approve/reject/note/filter/decision-maker) | ✅ | None | Communication | principal | `teacher_leave_requests`, `leave_decisions` | ✅ | ✅ | ✅ `leave_decide` | ✅ | ✅ Restored |
| Timing manager (open/close, periods, breaks, assembly, effective dates, active) | ✅ | None | Academics | principal | `timing_schedules`, `timing_periods` (new), `timing_shift_assignments` | ✅ | ✅ | ✅ + new `timing_periods_admin` | ✅ | 🟠 Partial (per-class shift UI deferred) |
| Emergency alert (audience/severity/publish/expiry/deactivate/audit/confirm) | ✅ | Only via urgent notices | Communication | principal | `emergency_alerts` (new) | ✅ | ✅ | ✅ `alerts_admin` / `alerts_read` | ✅ | ✅ Restored (shown in public `AlertBar`) |
| School settings (merge old + new: logo/favicon/classes/sections) | ✅ | Branding + classes only | Settings | principal | `school_settings`, `branding_assets`, `classes`, `sections` | ✅ | ✅ | ✅ `settings_admin`, `branding_admin`, `classes_admin` | ✅ | ✅ Restored |
| Gallery manager (albums/multi-upload/preview/captions/covers/reorder/publish/archive/restore/safe delete/uploader/search + compression) | ✅ | None | Media | principal | `gallery_albums`, `gallery_images` (new), `gallery` bucket | ✅ | ✅ | ✅ | ✅ | 🟠 Partial (image captions have no inline editor yet) |
| Resources manager (uploads/external links/audience/class assignment/publish/archive/search/safe delete) | ✅ | None | Content | principal | `resources`, `resources-public`/`resources-private` | ✅ | ✅ | ✅ `resources_write` |  | ✅ Restored |
| Parent messages (threads/search/reply/open-closed/assign/internal notes/attachments/unread) | ✅ | Masked list only | Communication | principal | `parent_messages`, `parent_message_replies` (new), `parent_message_assignments` | ✅ | ✅ | ✅ + new `pmr_*` | ✅ | 🟠 Partial (attachments in replies deferred) |
| Admission enquiries (list/details/status/assign/follow-up/notes/duplicates/CSV/spam) | ✅ | None | Admissions | principal | `admission_enquiries` | ✅ | ✅ | ✅ `adm_principal` |  | ✅ Restored |
| Calendar (holidays/exams/events/admission dates/meetings/class-specific/public-private) | ✅ | None | Academics | principal | `calendar_events` | ✅ | ✅ | ✅ (tightened to principal) |  | ✅ Restored |
| Achievements (title/student/class/category/image/date/draft/publish/archive/consent) | ✅ | Read-only public page | Media | principal | `student_spotlights`, `spotlight` bucket, `consent_records` | ✅ | ✅ | ✅ (new approval policies) | ✅ | ✅ Restored (publish blocked without consent) |
| Chatbot FAQs (CRUD/category/publish/archive/search/unanswered→FAQ) | ✅ | Read-only public | Content | principal | `chatbot_faqs`, `chatbot_questions` (new) | ✅ | ✅ | ✅ `faqs_admin`, `cbq_principal` |  | 🟠 Partial (unanswered capture depends on the chatbot writing rows) |
| Audit log (read-only) | ✅ | None | Audit | principal | `audit_logs` | read-only | ✅ | ✅ `audit_read` |  | ✅ Restored |
| Pending approvals / staff / parent messages / logo / favicon / classes / sections | new | ✅ | — | principal | as above | ✅ | ✅ | ✅ | ✅ | 🟡 Kept |

## 2. Teacher modules

| Feature | Old site | Before this change | Route | Role | Table / bucket | CRUD | Mobile | RLS | Tests | Repair status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Assigned-class access (classes/sections/subjects/quick links/empty state) | ✅ | Basic list | `/admin/teacher` → Overview | teacher | `teacher_class_assignments`, `classes`, `sections` | read | ✅ | ✅ `tca_read` | ✅ | ✅ Restored (subjects are free-text — see limits) |
| Daily homework uploader (class/section/subject/date EN+HI/multi-image/documents/draft/publish/archive/history/filter + compression) | ✅ | None | Teaching → Homework | teacher | `homework_uploads`, `homework` bucket | ✅ | ✅ | ✅ `homework_write` | ✅ | 🟠 Partial (editing own notes in place deferred) |
| Class notices (own classes/draft/publish/expiry/archive/view own) | ✅ | None | Teaching → Class notices | teacher | `class_notices` | ✅ | ✅ | ✅ `class_notices_write` |  | 🟠 Partial (edit-in-place deferred) |
| Principal notice board (read/pinned first/attachments/dates/mark read) | ✅ | Read-only list | Communication → Staff notices | teacher | `internal_teacher_notices`, `internal_notice_reads` | read + mark read | ✅ | ✅ `internal_read`, `internal_reads_self` |  | ✅ Restored |
| Staff leave center (dates/private reason/submit/status/cancel/decision note) | ✅ | Basic form | Communication → Leave | teacher | `teacher_leave_requests`, `leave_decisions` | ✅ | ✅ | ✅ `leave_own`/`leave_cancel`/`leave_decisions_own_read` | ✅ | ✅ Restored |
| Birthday management (upcoming for assigned classes/add/correct/permission) | ✅ | None | Teaching → Birthdays | teacher (with `can_birthdays`) | `birthday_profiles`, `birthday` bucket | ✅ | ✅ | ✅ `birthdays_write` |  | 🟠 Partial (publish_mode/photo workflow deferred) |
| Student of the Month (class/section/student/month/year/reason/photo/draft-or-submit/withdraw/history + no duplicates + consent) | ✅ | None | Teaching → Student of the Month | teacher (with `can_spotlight`) | `student_spotlights`, `spotlight` bucket | ✅ | ✅ | ✅ (owner insert/update/delete) | ✅ | ✅ Restored (unique index + consent gate) |
| Assigned-class info + leave form | new | ✅ | — | teacher | as above | ✅ | ✅ | ✅ | ✅ | 🟡 Kept |

## 3. Cross-cutting issues discovered and fixed

| # | Issue found | Fix |
| --- | --- | --- |
| 1 | Admin mobile header crammed school name + **both** dashboard links + sign-out into one row; risked overflow/wrap | `AdminShell` rewritten: compact header (mark + name + role + menu), drawer holds nav + identity + sign out |
| 2 | Principal accounts were shown **both** dashboards (no real dual-role support) | Cross-dashboard links removed; grouped sidebar/drawer only for the account's own role |
| 3 | Every module was stacked in one long page | Grouped navigation (Overview/People/Academics/Communication/Content/Media/Admissions/Settings/Audit) |
| 4 | `events_write` let **any** active teacher write calendar events | Replaced with principal-only `events_admin` |
| 5 | `spotlight_write` let any permitted teacher **self-publish** Student of the Month | Replaced with an approval workflow (owner draft/submit; principal publish) |
| 6 | Archived public notices stayed visible on the site | `notices_public_read` now requires `archived_at is null` |
| 7 | No principal policy to edit other staff profiles (roster editor was impossible) | New `profile_admin` policy |
| 8 | Storage buckets had **no** size/MIME limits → unsafe uploads | `file_size_limit` + `allowed_mime_types` set server-side for every bucket |
| 9 | Emergency banner only read urgent notices | `AlertBar` now prefers active `emergency_alerts` |
| 10 | Large phone photos uploaded raw (slow, wasteful) | Shared browser compression pipeline with orientation fix, resize, WebP, before/after sizes, fallback |
| 11 | Teacher could not see homework outside the public retention window | Added `homework_staff_read` for authenticated staff |
| 12 | No audit trail for galleries/notices/homework/timing/alerts/settings | Audit triggers extended to the new + content tables |
| 13 | Gallery/image deletion could orphan storage or break a cover | Deletion blocked for the album cover; storage removed with the row; delete requires confirm |

## 4. Database migrations added

- **`supabase/migrations/0007_restore_modules.sql`** — new tables
  `emergency_alerts`, `gallery_albums`, `gallery_images`, `timing_periods`,
  `chatbot_questions`, `parent_message_replies`; new columns on
  `parent_messages`, `admission_enquiries`, `homework_uploads`,
  `internal_teacher_notices`, `student_spotlights`, `school_settings`,
  `resources`; `spotlight_unique_slot` unique index; audit/updated-at triggers;
  RLS for all new tables; storage bucket `gallery`; server-side upload limits.

## 5. RLS policies added / changed

**Added:** `alerts_read`, `alerts_admin`, `gallery_albums_read`,
`gallery_albums_admin`, `gallery_images_read`, `gallery_images_admin`,
`timing_periods_read`, `timing_periods_admin`, `cbq_principal`, `cbq_insert`,
`pmr_principal`, `pmr_assigned_read`, `pmr_assigned_write`,
`homework_staff_read`, `profile_admin`,
`spotlight_principal`, `spotlight_owner_read`, `spotlight_owner_insert`,
`spotlight_owner_update`, `spotlight_owner_delete`, `gallery_files_read`,
`gallery_files_write`, `events_admin`.

**Changed:** `notices_public_read` (excludes archived);
`events_write` dropped (teacher write removed); `spotlight_write` dropped
(replaced by the approval policies above).

## 6. Netlify Functions added

- `invite-staff.ts` — principal-only; creates the auth account with the
  service-role key (no password — invitee uses *Forgot password*), pre-approves
  the role, writes permissions/assignments and an audit entry. Re-verifies
  `requirePrincipal` server-side.

## 7. Additional issues found but **not** fully fixed

These are recorded honestly so nothing is silently dropped:

1. **Gallery captions** — stored in `gallery_images.caption_en/hi` but there is
   no inline caption editor in the UI yet.
2. **Per-image archive/restore** — albums archive/restore; individual images are
   delete-only (safe delete with cover protection).
3. **Reply attachments** — parent-message threads support text + internal notes;
   file attachments in replies are not wired (bucket policy restricts inserts to
   the server Function).
4. **Homework/class-notice edit-in-place** — publish/archive work; editing an
   existing row's body is done via the Principal moderation panels, not yet in
   the teacher view.
5. **Unanswered chatbot questions** — the table + UI exist, but `sensei-chat`
   must write a row when it cannot answer (not added here) for the list to fill.
6. **Timing per-class shifts** — `timing_shift_assignments` has RLS but no UI
   (period/break/assembly timings are fully managed).
7. **Birthday publishing workflow** — teachers manage records with
   `publish_mode = 'none'`; the public photo/greeting publishing flow is
   deferred.
8. **Subjects** — there is no `subjects` table; subject is free text on homework
   (matches the existing schema).
9. **Students** — there is no `students` table; Student of the Month and
   birthdays use a display name, as the schema always did.
10. **Upload progress** — supabase-js v2 exposes no byte-level upload progress,
    so the UI reports real pipeline stages (validating → compressing →
    uploading) with an indeterminate indicator.
11. **Production deploy not exercised here** — `0007` must be applied to the
    Supabase project before the new modules return data.

## 8. Verification

| Check | Result |
| --- | --- |
| `npm run lint` (zero warnings) | ✅ pass |
| `npm run typecheck` (app + functions + node) | ✅ pass |
| `npm test` | ✅ 58 passed (7 files) |
| `npm run build` | ✅ built |
| Responsive breakpoints | Layout uses mobile-first classes + a drawer below `lg`; verified structurally (375/768/1440) — browser e2e not run (Playwright browsers/Supabase not available in-session) |

> Authorization for every module is enforced by the policies listed above, not by
> the navigation. Reaching a module by URL without permission shows nothing.
