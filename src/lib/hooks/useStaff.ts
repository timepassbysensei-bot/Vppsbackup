import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AppRole, ApprovalStatus } from '@/lib/types';

/**
 * =============================================================================
 * useStaff — the ONE canonical source for staff / pending registrations
 * =============================================================================
 *
 * WHY THIS FILE EXISTS (the bug it fixes)
 * ---------------------------------------
 * Before this, the navigation badge counted pending rows with a direct
 * `user_roles` count query (cache key `['badge-pending']`) while the Pending
 * Registrations page used a *different* query (cache key `['staff']`) that
 * embedded the profile with `profiles(full_name, email)`.
 *
 * `user_roles` has TWO foreign keys into `profiles` (`user_id` for the account
 * and `approved_by` for the approver), so that embed is AMBIGUOUS and PostgREST
 * rejects it (PGRST201). The page's query therefore threw, and because the panel
 * only checked `isLoading` — never `isError` — the thrown error was rendered as
 * the empty state "No one is waiting for approval." while the badge (a simple
 * count that never errored) correctly showed 1.
 *
 * Two independent fixes, both structural:
 *
 *   1. ONE query. The badge, the Pending Registrations page and the Staff Roster
 *      all read this hook, so they share `STAFF_QUERY_KEY` and can never
 *      disagree. Invalidating `['staff']` refreshes all three at once.
 *   2. NO embedded resource. Roles and profiles are fetched as two plain
 *      RLS-guarded selects and joined in memory, so the query cannot fail on
 *      relationship ambiguity, regardless of constraint naming.
 *
 * Reads stay RLS-guarded: `roles_admin` / `profile_admin` grant the principal
 * every row. Pending users can read only their own row and can never approve
 * themselves — approval happens exclusively in the `approve-teacher` Function.
 */

export interface StaffRoleRow {
  user_id: string;
  role: AppRole;
  status: ApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string | null;
}

export interface StaffProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface StaffMember {
  user_id: string;
  role: AppRole;
  status: ApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  /** When the registration/role row was created — shown as the registration date. */
  created_at: string | null;
  full_name: string | null;
  email: string | null;
}

/**
 * The single cache key. Anything that changes a registration must invalidate
 * this key so the badge, the list and the roster update together.
 */
export const STAFF_QUERY_KEY = ['staff'] as const;

/** In-memory join of the role row with its profile (never an embedded select). */
export function mergeStaff(roles: StaffRoleRow[], profiles: StaffProfileRow[]): StaffMember[] {
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return roles.map((r) => {
    const p = byId.get(r.user_id);
    return {
      ...r,
      full_name: p?.full_name ?? null,
      email: p?.email ?? null,
    };
  });
}

/**
 * The one pending-status definition used everywhere. Kept as a pure function so
 * it is unit-testable and so the badge can never drift from the list.
 */
export function pendingRegistrations(rows: StaffMember[] | undefined): StaffMember[] {
  return (rows ?? []).filter((r) => r.status === 'pending');
}

export function useStaff() {
  return useQuery({
    queryKey: STAFF_QUERY_KEY,
    queryFn: async (): Promise<StaffMember[]> => {
      const [{ data: roles, error: roleErr }, { data: profiles, error: profileErr }] =
        await Promise.all([
          supabase
            .from('user_roles')
            .select('user_id, role, status, approved_by, approved_at, created_at'),
          supabase.from('profiles').select('id, full_name, email'),
        ]);

      if (roleErr) throw roleErr;
      if (profileErr) throw profileErr;

      return mergeStaff(
        (roles ?? []) as StaffRoleRow[],
        (profiles ?? []) as StaffProfileRow[],
      );
    },
  });
}
