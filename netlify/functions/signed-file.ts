import { guard } from './_shared/handler.ts';
import { json } from './_shared/json.ts';
import { requireUser, AuthError } from './_shared/auth.ts';
import { adminClient } from './_shared/supabase.ts';
import { logInternal } from './_shared/logger.ts';
import { signedFileSchema, PRIVATE_BUCKETS } from '../../src/lib/validation/schemas.ts';

const SIGNED_URL_TTL_SECONDS = 60;

/**
 * Mints a short-lived signed URL for a PRIVATE file — but only after verifying
 * the caller may access the owning row. Authorization is bucket-specific:
 *   - leave-attachments: owner (path starts with their uid) or principal
 *   - parent-attachments: principal (assigned-teacher access is granted via the
 *     message record, which the dashboard resolves separately)
 *   - resources-private / internal-notices: any approved staff member
 *
 * We never trust the path alone as access control; we re-derive permission from
 * user_roles before signing.
 */
export default guard(
  'signed-file',
  { rateLimit: { max: 60, windowMs: 60_000, bucket: 'signed-file' } },
  async ({ body, req }) => {
    let caller;
    try {
      caller = await requireUser(req);
    } catch (e) {
      if (e instanceof AuthError) return json(e.status, { error: e.code });
      throw e;
    }

    const parsed = signedFileSchema.safeParse(body);
    if (!parsed.success) return json(422, { error: 'validation_failed' });
    const { bucket, path } = parsed.data;

    // Reject path traversal outright.
    if (path.includes('..') || path.startsWith('/')) {
      return json(400, { error: 'invalid_path' });
    }

    const admin = adminClient();
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role, status')
      .eq('user_id', caller.id)
      .maybeSingle();

    const isApproved = roleRow?.status === 'approved';
    const isPrincipal = isApproved && roleRow?.role === 'principal';
    const isStaff = isApproved && ['teacher', 'principal'].includes(roleRow?.role ?? '');

    let allowed = false;
    switch (bucket) {
      case 'leave-attachments': {
        const ownerFolder = path.split('/')[0];
        allowed = isPrincipal || ownerFolder === caller.id;
        break;
      }
      case 'parent-attachments':
        allowed = isPrincipal;
        break;
      case 'resources-private':
      case 'internal-notices':
        allowed = isStaff;
        break;
      default:
        allowed = false;
    }

    if (!allowed) return json(403, { error: 'forbidden' });
    // Extra guard: only ever sign private buckets.
    if (!PRIVATE_BUCKETS.includes(bucket)) return json(400, { error: 'invalid_bucket' });

    const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data) return json(404, { error: 'not_found' });

    logInternal('signed-file:ok', { bucket });
    return json(200, { url: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
  },
);
