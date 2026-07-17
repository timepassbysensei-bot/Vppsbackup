import { guard } from './_shared/handler.ts';
import { json } from './_shared/json.ts';
import { verifyTurnstile } from './_shared/turnstile.ts';
import { adminClient } from './_shared/supabase.ts';
import { logInternal } from './_shared/logger.ts';
import { notifyAdmin } from './_shared/notify.ts';
import { parentMessageSchema, normalizePhone } from '../../src/lib/validation/schemas.ts';

/**
 * Public parent-message submission.
 *  - anon + Turnstile
 *  - phone normalized before storage
 *  - service-role insert (anon has NO insert policy on parent_messages)
 *  - minimal email alert only; the complaint body is never emailed
 */
export default guard(
  'submit-parent-message',
  { rateLimit: { max: 5, windowMs: 60_000, bucket: 'parent-message' } },
  async ({ body, ip }) => {
    const parsed = parentMessageSchema.safeParse(body);
    if (!parsed.success) return json(422, { error: 'validation_failed' });

    if (!(await verifyTurnstile(parsed.data.turnstileToken, ip))) {
      return json(403, { error: 'turnstile_failed' });
    }

    const d = parsed.data;
    const admin = adminClient();
    const { error } = await admin.from('parent_messages').insert({
      student_name: d.student_name,
      sender_name: d.sender_name,
      phone: normalizePhone(d.phone),
      class_id: d.class_id ?? null,
      section_id: d.section_id ?? null,
      body: d.body,
      status: 'New',
    });

    if (error) {
      logInternal('submit-parent-message:insert_error');
      return json(500, { error: 'server_error' });
    }

    await notifyAdmin('New parent message', 'A new parent message was received. Open the principal dashboard to review it.');

    logInternal('submit-parent-message:ok');
    return json(200, { ok: true });
  },
);
