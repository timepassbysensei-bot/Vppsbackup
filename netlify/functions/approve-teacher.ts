import { guard } from './_shared/handler.ts';
import { json } from './_shared/json.ts';
import { requirePrincipal, AuthError } from './_shared/auth.ts';
import { adminClient } from './_shared/supabase.ts';
import { logInternal } from './_shared/logger.ts';
import { approveTeacherSchema } from '../../src/lib/validation/schemas.ts';

/**
 * Approve / reject / suspend a teacher and optionally set their role,
 * permissions, and class assignments.
 *
 * This is the ONLY place role/status changes happen, and it re-verifies
 * `is_principal()` server-side against the authoritative user_roles table. A
 * Google login alone can therefore never grant access, and no user can
 * self-promote. Every change is written to the append-only audit log.
 */
export default guard(
  'approve-teacher',
  { rateLimit: { max: 30, windowMs: 60_000, bucket: 'approve-teacher' } },
  async ({ body, req }) => {
    let caller;
    try {
      caller = await requirePrincipal(req);
    } catch (e) {
      if (e instanceof AuthError) return json(e.status, { error: e.code });
      throw e;
    }

    const parsed = approveTeacherSchema.safeParse(body);
    if (!parsed.success) return json(422, { error: 'validation_failed' });
    const d = parsed.data;

    // A principal cannot change their own role/status through this endpoint.
    if (d.userId === caller.id) return json(400, { error: 'cannot_modify_self' });

    const admin = adminClient();

    const { error: roleErr } = await admin
      .from('user_roles')
      .update({
        status: d.action,
        role: d.role ?? 'teacher',
        approved_by: caller.id,
        approved_at: new Date().toISOString(),
      })
      .eq('user_id', d.userId);
    if (roleErr) return json(500, { error: 'server_error' });

    if (d.perms) {
      await admin.from('teacher_permissions').upsert({
        user_id: d.userId,
        can_public_notices: d.perms.can_public_notices ?? false,
        can_birthdays: d.perms.can_birthdays ?? false,
        can_resources: d.perms.can_resources ?? false,
        can_spotlight: d.perms.can_spotlight ?? false,
        updated_by: caller.id,
      });
    }

    if (d.classes) {
      // Replace the teacher's class assignments with the provided set.
      await admin.from('teacher_class_assignments').delete().eq('user_id', d.userId);
      if (d.classes.length > 0) {
        await admin.from('teacher_class_assignments').insert(
          d.classes.map((c) => ({
            user_id: d.userId,
            class_id: c.class_id,
            section_id: c.section_id,
          })),
        );
      }
    }

    await admin.from('audit_logs').insert({
      actor: caller.id,
      action: `teacher_${d.action}`,
      content_type: 'user_role',
      content_id: d.userId,
      summary: `role=${d.role ?? 'teacher'}`,
    });

    logInternal('approve-teacher:ok', { action: d.action });
    return json(200, { ok: true });
  },
);
