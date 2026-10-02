import { guard } from './_shared/handler.ts';
import { json } from './_shared/json.ts';
import { requirePrincipal, AuthError } from './_shared/auth.ts';
import { adminClient } from './_shared/supabase.ts';
import { logInternal } from './_shared/logger.ts';

/**
 * repair-registrations — trusted server-side repair for accounts that exist in
 * Supabase Auth but have no `profiles` / `user_roles` row.
 *
 * WHY ACCOUNTS CAN BE MISSING THEIR ROWS
 * --------------------------------------
 * The initial role row is created by the `handle_new_user` trigger on
 * `auth.users` (0005_auth_signup.sql). Any account created while that trigger
 * was absent — i.e. before 0005 was applied, or created out-of-band through the
 * Supabase dashboard / Admin API before the trigger existed — has an auth user
 * but no profile and no pending `user_roles` row. Such an account is invisible
 * to every dashboard query (all of them read `user_roles`), which is exactly how
 * a real registered teacher can be absent from Pending Registrations while other
 * counts still look plausible.
 *
 * WHAT THIS DOES (and deliberately does NOT do)
 * --------------------------------------------
 *   * finds auth users whose id has no `user_roles` row
 *   * inserts the missing `profiles`, `user_roles` (teacher/pending) and
 *     `teacher_permissions` rows
 *   * inserts ONLY when a row is missing — an existing role/status/profile is
 *     never overwritten, so nobody is demoted and nobody is promoted
 *   * never grants teacher access: the repaired row is `pending`, which every
 *     RLS helper treats as having no access at all
 *   * writes one append-only `audit_logs` entry per repaired account
 *   * never exposes `auth.users` to the browser — this runs under the
 *     service-role key inside a Function and only returns a count
 *
 * CALLER: approved principal only, rate limited.
 */
export default guard(
  'repair-registrations',
  { rateLimit: { max: 5, windowMs: 60_000, bucket: 'repair-registrations' } },
  async ({ req }) => {
    let caller;
    try {
      caller = await requirePrincipal(req);
    } catch (e) {
      if (e instanceof AuthError) return json(e.status, { error: e.code });
      throw e;
    }

    const admin = adminClient();

    // --- 1. Which auth users already have a role row? -----------------------
    const { data: roleRows, error: roleErr } = await admin.from('user_roles').select('user_id');
    if (roleErr) return json(500, { error: 'server_error' });
    const hasRole = new Set((roleRows ?? []).map((r) => r.user_id as string));

    const { data: profileRows, error: profErr } = await admin.from('profiles').select('id');
    if (profErr) return json(500, { error: 'server_error' });
    const hasProfile = new Set((profileRows ?? []).map((p) => p.id as string));

    // --- 2. Walk Supabase Auth, page by page -------------------------------
    const missing: { id: string; email: string | null; full_name: string | null }[] = [];
    const perPage = 200;
    for (let page = 1; page <= 50; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) return json(500, { error: 'server_error' });
      const users = data?.users ?? [];
      for (const u of users) {
        if (!hasRole.has(u.id)) {
          const meta = (u.user_metadata ?? {}) as { full_name?: string };
          missing.push({
            id: u.id,
            email: u.email ?? null,
            full_name: typeof meta.full_name === 'string' ? meta.full_name : null,
          });
        }
      }
      if (users.length < perPage) break;
    }

    if (missing.length === 0) {
      logInternal('repair-registrations:none', {});
      return json(200, { ok: true, repaired: 0, repairedProfiles: 0 });
    }

    // --- 3. Create only what is missing ------------------------------------
    let repairedProfiles = 0;
    let repaired = 0;

    for (const u of missing) {
      if (!hasProfile.has(u.id)) {
        const { error } = await admin
          .from('profiles')
          .insert({ id: u.id, email: u.email, full_name: u.full_name });
        if (!error) repairedProfiles += 1;
        else continue; // without a profile the role row cannot reference it
      }

      const { error: insErr } = await admin
        .from('user_roles')
        .insert({ user_id: u.id, role: 'teacher', status: 'pending' });
      if (insErr) continue;
      repaired += 1;

      // Permission row: all flags off. Approval grants these explicitly.
      await admin.from('teacher_permissions').insert({ user_id: u.id });

      await admin.from('audit_logs').insert({
        actor: caller.id,
        action: 'registration_repaired',
        content_type: 'user_role',
        content_id: u.id,
        summary: 'Missing profile/role row recreated as teacher/pending',
      });
    }

    logInternal('repair-registrations:done', { repaired, repairedProfiles });
    return json(200, { ok: true, repaired, repairedProfiles });
  },
);
