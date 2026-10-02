import { describe, expect, it, vi } from 'vitest';

// The modules under test import the Supabase client; stub it so the test needs
// no environment variables and no network.
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({}) } }));

import { mergeStaff, pendingRegistrations, type StaffProfileRow, type StaffRoleRow } from '@/lib/hooks/useStaff';
import { canOpenTeacherDashboard } from '@/app/guards';

const role = (over: Partial<StaffRoleRow> & { user_id: string }): StaffRoleRow => ({
  role: 'teacher',
  status: 'pending',
  approved_by: null,
  approved_at: null,
  created_at: '2026-09-30T10:00:00Z',
  ...over,
});

const profile = (id: string, full_name: string | null, email: string | null): StaffProfileRow => ({
  id,
  full_name,
  email,
});

describe('mergeStaff', () => {
  it('joins the role row with its profile without an embedded select', () => {
    const rows = mergeStaff(
      [role({ user_id: 'u1' })],
      [profile('u1', 'Asha Kumari', 'asha@example.com')],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.full_name).toBe('Asha Kumari');
    expect(rows[0]?.email).toBe('asha@example.com');
    expect(rows[0]?.status).toBe('pending');
  });

  it('keeps a role row whose profile is missing (the account is still approvable)', () => {
    const rows = mergeStaff([role({ user_id: 'u2' })], []);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.full_name).toBeNull();
    expect(rows[0]?.email).toBeNull();
  });

  it('never drops or reorders role rows', () => {
    const rows = mergeStaff(
      [role({ user_id: 'a' }), role({ user_id: 'b' }), role({ user_id: 'c' })],
      [profile('b', 'B', 'b@example.com')],
    );
    expect(rows.map((r) => r.user_id)).toEqual(['a', 'b', 'c']);
  });
});

describe('pendingRegistrations (the single pending definition)', () => {
  const staff = mergeStaff(
    [
      role({ user_id: 'p1', status: 'pending' }),
      role({ user_id: 'p2', status: 'pending' }),
      role({ user_id: 'a1', status: 'approved', role: 'principal' }),
      role({ user_id: 'r1', status: 'rejected' }),
      role({ user_id: 's1', status: 'suspended' }),
    ],
    [],
  );

  it('returns exactly the pending rows, so the badge and the list agree', () => {
    const pending = pendingRegistrations(staff);
    expect(pending.map((p) => p.user_id)).toEqual(['p1', 'p2']);
    expect(pending).toHaveLength(2);
  });

  it('treats undefined data as no pending rows (never throws)', () => {
    expect(pendingRegistrations(undefined)).toEqual([]);
  });

  it('returns no rows once every registration has been decided', () => {
    const decided = staff.map((s) => ({ ...s, status: 'approved' as const }));
    expect(pendingRegistrations(decided)).toHaveLength(0);
  });
});

describe('canOpenTeacherDashboard', () => {
  it('allows an approved teacher', () => {
    expect(canOpenTeacherDashboard('teacher', 'approved')).toBe(true);
  });

  it('allows an approved PRINCIPAL (supervisory access, no role change)', () => {
    expect(canOpenTeacherDashboard('principal', 'approved')).toBe(true);
  });

  it('denies a pending, rejected or suspended account', () => {
    expect(canOpenTeacherDashboard('teacher', 'pending')).toBe(false);
    expect(canOpenTeacherDashboard('teacher', 'rejected')).toBe(false);
    expect(canOpenTeacherDashboard('principal', 'suspended')).toBe(false);
    expect(canOpenTeacherDashboard(null, null)).toBe(false);
  });
});
