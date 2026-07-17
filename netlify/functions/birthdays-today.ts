import { guard } from './_shared/handler.ts';
import { json } from './_shared/json.ts';
import { adminClient } from './_shared/supabase.ts';
import { kolkataParts } from './_shared/time.ts';
import { logError } from './_shared/logger.ts';

/**
 * Public "birthdays today" display.
 *
 * This endpoint exists precisely so that anon visitors NEVER read the full DOB.
 * birthday_profiles has no anon SELECT policy; instead we call the
 * public_birthdays(m, d) RPC with the service role, which returns only safe
 * display fields (name, class, greeting, optional photo) and matches on
 * month/day computed in Asia/Kolkata. The year/DOB/age never leave the server.
 */
export default guard(
  'birthdays-today',
  { rateLimit: { max: 60, windowMs: 60_000, bucket: 'birthdays' }, requireJson: false },
  async () => {
    const { month, day } = kolkataParts();
    const admin = adminClient();

    const { data, error } = await admin.rpc('public_birthdays', { m: month, d: day });
    if (error) {
      logError('birthdays-today:rpc_error', error);
      return json(500, { error: 'server_error' });
    }

    // Defensive: guarantee no dob-like field is ever serialized to the client.
    const safe = (data ?? []).map((r: Record<string, unknown>) => ({
      display_name: r.display_name,
      class_name: r.class_name,
      section_name: r.section_name,
      greeting_en: r.greeting_en,
      greeting_hi: r.greeting_hi,
      photo_path: r.photo_path,
      publish_mode: r.publish_mode,
    }));

    return json(200, { birthdays: safe }, { 'cache-control': 'public, max-age=300' });
  },
);
