# Storage policies

Buckets are split by sensitivity. Only clearly-public buckets are public.
Private files are served exclusively through short-lived signed URLs minted by
the `signed-file` Function after it verifies the caller may access the row.

| Bucket | Public? | Contents |
| --- | --- | --- |
| `branding` | yes | logo, favicon, hero, principal/about photos, og image |
| `notices` | yes | public notice attachments |
| `homework` | yes | homework images (retention-gated at the query layer) |
| `resources-public` | yes | deliberately-public resources |
| `spotlight` | yes | Student of the Month photo |
| `birthday` | yes | approved birthday photos only |
| `resources-private` | no | internal circulars / policies |
| `parent-attachments` | no | parent-message attachments |
| `leave-attachments` | no | leave attachments |
| `internal-notices` | no | teachers-only attachments |

## Principles

- **Filenames are random** (`crypto.randomUUID()` + an extension chosen from the
  validated file signature — never the client-supplied name). Unpredictable
  names are *not* access control; buckets + policies are.
- **Private buckets** store objects under a top-level folder equal to the owner's
  user id (e.g. `<uid>/<uuid>.pdf`) so ownership is checkable in policy. Example:
  a teacher may read/write only their own `leave-attachments/<uid>/...`; the
  principal may read all.
- **Public buckets** allow anon read but scope writes (e.g. `homework` write needs
  `is_active_teacher()`, `spotlight` needs `teacher_can('spotlight')`).
- The `signed-file` Function rejects path traversal (`..`, leading `/`) and only
  ever signs the four private buckets.

See `supabase/migrations/0003_storage.sql`.
