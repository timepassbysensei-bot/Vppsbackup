import { adminClient } from './supabase.ts';

export interface Caller {
  id: string;
  email: string | null;
}

/** Reads and verifies the Supabase JWT from the Authorization header. */
export async function requireUser(req: Request): Promise<Caller> {
  const header = req.headers.get('authorization') || '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new AuthError(401, 'unauthenticated');

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new AuthError(401, 'unauthenticated');
  return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * Verifies the caller is an approved principal. Authorization is read from the
 * authoritative `user_roles` table server-side — NEVER trusted from the JWT
 * payload or any client claim, so signing in (or registering) alone can never
 * grant access.
 */
export async function requirePrincipal(req: Request): Promise<Caller> {
  const caller = await requireUser(req);
  const admin = adminClient();
  const { data, error } = await admin
    .from('user_roles')
    .select('role, status')
    .eq('user_id', caller.id)
    .maybeSingle();
  if (error) throw new AuthError(500, 'server_error');
  if (!data || data.role !== 'principal' || data.status !== 'approved') {
    throw new AuthError(403, 'forbidden');
  }
  return caller;
}

/** Verifies the caller is an approved teacher or principal. */
export async function requireActiveStaff(req: Request): Promise<Caller> {
  const caller = await requireUser(req);
  const admin = adminClient();
  const { data, error } = await admin
    .from('user_roles')
    .select('role, status')
    .eq('user_id', caller.id)
    .maybeSingle();
  if (error) throw new AuthError(500, 'server_error');
  if (!data || data.status !== 'approved' || !['teacher', 'principal'].includes(data.role)) {
    throw new AuthError(403, 'forbidden');
  }
  return caller;
}

export class AuthError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}
