import { guard } from './_shared/handler.ts';
import { json } from './_shared/json.ts';
import { verifyTurnstile } from './_shared/turnstile.ts';
import { adminClient } from './_shared/supabase.ts';
import { isAutomaticAdmissionOpen } from './_shared/time.ts';
import { logInternal } from './_shared/logger.ts';
import { notifyAdmin } from './_shared/notify.ts';
import { admissionSchema, normalizePhone } from '../../src/lib/validation/schemas.ts';

/**
 * Public admission-enquiry submission.
 *  - anon + Turnstile (verified server-side)
 *  - respects the admissions window (Asia/Kolkata) and the principal's override
 *  - inserts with the service role because anon has NO insert policy on the table
 */
export default guard(
  'submit-admission',
  { rateLimit: { max: 5, windowMs: 60_000, bucket: 'admission' } },
  async ({ body, ip }) => {
    const parsed = admissionSchema.safeParse(body);
    if (!parsed.success) return json(422, { error: 'validation_failed' });

    if (!(await verifyTurnstile(parsed.data.turnstileToken, ip))) {
      return json(403, { error: 'turnstile_failed' });
    }

    const admin = adminClient();

    // Determine whether admissions are open: principal override wins.
    const { data: settings } = await admin
      .from('school_settings')
      .select('admission_mode')
      .limit(1)
      .maybeSingle();

    const mode = settings?.admission_mode ?? 'automatic';
    const open =
      mode === 'open' || (mode === 'automatic' && isAutomaticAdmissionOpen());
    if (!open) {
      return json(409, { error: 'admissions_closed' });
    }

    const d = parsed.data;
    const { data: inserted, error } = await admin
      .from('admission_enquiries')
      .insert({
        student_name: d.student_name,
        guardian_name: d.guardian_name,
        phone: normalizePhone(d.phone),
        email: d.email || null,
        class_applying: d.class_applying,
        current_school: d.current_school || null,
        message: d.message || null,
        consent: d.consent,
      })
      .select('id')
      .single();

    if (error || !inserted) {
      logInternal('submit-admission:insert_error');
      return json(500, { error: 'server_error' });
    }

    await admin.from('consent_records').insert({
      context: 'admission_enquiry',
      ref_id: inserted.id,
    });

    // Minimal alert only — no PII in the notification body.
    await notifyAdmin('New admission enquiry', 'A new admission enquiry was submitted. Open the principal dashboard to review it.');

    logInternal('submit-admission:ok', { class_applying: d.class_applying });
    return json(200, { ok: true });
  },
);
