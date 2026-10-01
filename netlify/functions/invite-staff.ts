import { guard } from './_shared/handler.ts';
import { json } from './_shared/json.ts';
import { requirePrincipal, AuthError } from './_shared/auth.ts';
import { adminClient } from './_shared/supabase.ts';
import { logInternal } from './_shared/logger.ts';
import { inviteStaffSchema } from '../../src/lib/validation/schemas.ts';

/**
 * invite-staff — lets the principal add a staff member without them
 * self-registering first.
 *
 * The account is created with the service-role key (the ONLY place that may do
 * this), e-mail pre-confirmed and NO password: the invitee sets their own
 * password via the standard "Forgot password" flow, so we never transmit or
 * store a credential. The role is pre-approved and every change is audited.
 *
 * `handle_new_user` (0005) already creates the profile + pending role trigger
 * row on insert, so this endpoint only ever *promotes* the fresh row — it can
 * never escalate an existing account.
 */
export default guard(
  'invite-staff',
  { rateLimit: { max: 20, windowMs: 60_000, bucket: 'invite-staff' } },
  async ({ body, req }) => {
    let caller;
    try {
      caller = await requirePrincipal(req);
    } catch (e) {
      if (e instanceof AuthError) return json(e.status, { error: e.code });
      throw e;
    }

    const parsed = inviteStaffSchema.safeParse(body);
    if (!parsed.success) return json(422, { error: 'validation_failed' });
    const d = parsed.data;

    const admin = adminClient();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: d.email,
      email_confirm: true,
      user_metadata: { full_name: d.full_name },
    });

    if (createErr || !created?.user) {
      const msg = createErr?.message?.toLowerCase() ?? '';
      if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
        return json(409, { error: 'already_exists' });
      }
      return json(500, { error: 'invite_failed' });
    }

    const userId = created.user.id;

    await admin.from('profiles').upsert(
      { id: userId, email: d.email, full_name: d.full_name },
      { onConflict: 'id' },
    );

    const { error: roleErr } = await admin
      .from('user_roles')
      .upsert(
        {
          user_id: userId,
          role: d.role,
          status: 'approved',
          approved_by: caller.id,
          approved_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    if (roleErr) return json(500, { error: 'server_error' });

    await admin.from('teacher_permissions').upsert(
      {
        user_id: userId,
        can_public_notices: d.perms?.can_public_notices ?? false,
        can_birthdays: d.perms?.can_birthdays ?? false,
        can_resources: d.perms?.can_resources ?? false,
        can_spotlight: d.perms?.can_spotlight ?? false,
        updated_by: caller.id,
      },
      { onConflict: 'user_id' },
    );

    if (d.classes && d.classes.length > 0) {
      await admin.from('teacher_class_assignments').insert(
        d.classes.map((c) => ({ user_id: userId, class_id: c.class_id, section_id: c.section_id })),
      );
    }

    await admin.from('audit_logs').insert({
      actor: caller.id,
      action: 'staff_invited',
      content_type: 'user_role',
      content_id: userId,
      summary: `role=${d.role}`,
    });

    logInternal('invite-staff:ok', { role: d.role });
    return json(200, { ok: true, userId });
  },
);
