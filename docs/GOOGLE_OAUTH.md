# Google OAuth setup

Staff sign in with Google. A Google login by itself grants **no** access — it
only creates a *pending* account until the principal approves it.

## Google Cloud

1. Create an OAuth consent screen (Internal if using Google Workspace, else External).
2. Create an **OAuth client ID** (Web application).
3. Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`.
4. Copy the client ID and secret.

## Supabase

1. Authentication → Providers → Google → enable.
2. Paste the client ID and secret.
3. Authentication → URL Configuration → add your site URL(s) and
   `.../admin/login` as redirect URLs. Keep this list tight (open-redirect defense).

## App behaviour

- `signInWithGoogle()` uses PKCE and redirects back to `/admin/login`.
- On first sign-in the app upserts a `profiles` row (self-insert is RLS-allowed)
  and reads `user_roles` for status. New users are `pending` → shown the pending
  screen until approved.
- Approval/rejection/suspension happens only via the `approve-teacher` Function.
