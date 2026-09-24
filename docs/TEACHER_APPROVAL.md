# Teacher approval

Registration is self-service (**e-mail + password**; no Google/OAuth); **access
is not**. Every new account is `pending` and sees only the waiting screen until
the principal acts. The pending row is created by the `handle_new_user` database
trigger (`0005_auth_signup.sql`), never by the browser — which is why a new user
cannot approve themselves.

## Principal actions (from the principal dashboard)

- **Approve teacher** — sets `status='approved', role='teacher'`.
- **Approve principal** — grants a second principal.
- **Reject** — `status='rejected'`.
- **Suspend / Reinstate** — toggles an approved account's access.

Each action calls the `approve-teacher` Function, which:

1. Re-verifies the caller is an approved principal (`requirePrincipal`).
2. Validates the payload with Zod.
3. Refuses to let a principal modify their own row.
4. Updates `user_roles`, optionally `teacher_permissions` and
   `teacher_class_assignments`.
5. Writes an append-only `audit_logs` entry.

## Permissions & class assignments

- Cross-cutting content permissions: `can_public_notices`, `can_birthdays`,
  `can_resources`, `can_spotlight`.
- Class ownership: assign specific class/section pairs. Nursery uses a `null`
  section (no section). Classes 1–10 use A/B where configured.

These flags drive the RLS helpers `teacher_can()` and `teacher_owns_class()`,
so a teacher can only write content they've been granted.
