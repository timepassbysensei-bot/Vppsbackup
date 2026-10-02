import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * These tests pin the round-4 requirement that is easiest to regress: the module
 * buttons must be visible DIRECTLY on the dashboard homepage, not only inside the
 * drawer. They also pin the principal's supervisory access to the teacher
 * dashboard and confirm it is not exposed to an ordinary teacher.
 */

vi.mock('@/lib/supabase', () => {
  const result = { data: [], error: null, count: 0 };
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'limit', 'update', 'insert', 'delete', 'upsert']) {
    chain[m] = () => chain;
  }
  (chain as { maybeSingle: unknown }).maybeSingle = () => Promise.resolve({ data: null, error: null });
  (chain as { single: unknown }).single = () => Promise.resolve({ data: null, error: null });
  (chain as { then: unknown }).then = (res: unknown, rej: unknown) =>
    Promise.resolve(result).then(res as never, rej as never);

  return {
    supabase: {
      from: () => chain,
      rpc: () => Promise.resolve({ data: null, error: null }),
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          remove: async () => ({ error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        }),
      },
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
    },
  };
});

const authState: { current: { role: 'principal' | 'teacher' } } = { current: { role: 'principal' } };

vi.mock('@/app/AuthProvider', () => ({
  useAuth: () => ({
    session: {
      user: { id: 'me', email: 'principal@example.com', user_metadata: { full_name: 'The Principal' } },
    },
    loading: false,
    role: authState.current.role,
    status: 'approved',
    signIn: vi.fn(),
    signUp: vi.fn(),
    requestPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    signOut: vi.fn(),
    refresh: vi.fn(),
  }),
  authErrorKey: () => 'admin.errors.generic',
}));

vi.mock('@/lib/branding', () => ({
  useBranding: () => ({ data: null }),
  BRANDING_BUCKET: 'branding',
}));

vi.mock('@/lib/hooks/useClasses', () => ({
  useClasses: () => ({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() }),
}));

vi.mock('@/lib/hooks/useStaff', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/hooks/useStaff')>();
  return {
    ...actual,
    useStaff: () => ({
      data: [
        {
          user_id: 'u1',
          role: 'teacher',
          status: 'pending',
          approved_by: null,
          approved_at: null,
          created_at: '2026-09-30T10:00:00Z',
          full_name: 'Asha Kumari',
          email: 'asha@example.com',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    }),
  };
});

import { PrincipalDashboard } from '@/pages/admin/PrincipalDashboard';
import { TeacherDashboard } from '@/pages/admin/TeacherDashboard';

function wrap(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Every module button rendered directly on the page (inside a ModuleGrid list). */
function moduleButtons() {
  const grids = screen.getAllByRole('list').filter((l) => (l.getAttribute('aria-label') ?? '').includes('modules'));
  return grids.flatMap((g) => within(g).queryAllByRole('button'));
}

function expectModule(label: string) {
  const found = moduleButtons().some((b) => new RegExp(label, 'i').test(b.textContent ?? ''));
  expect(found, `expected a directly-visible "${label}" module button`).toBe(true);
}

describe('PrincipalDashboard', () => {
  it('shows every old and new module as a button directly on the page', () => {
    authState.current = { role: 'principal' };
    wrap(<PrincipalDashboard />);

    for (const label of [
      // Restored (old site) modules
      'Pending Registrations',
      'Staff Roster',
      'Internal Notices',
      'Public Notices',
      'All Class Notices',
      'All Homework',
      'Leave Inbox',
      'Timing Manager',
      'Emergency Alert',
      'School Settings',
      'Gallery Manager',
      'Resources Manager',
      'Parent Messages',
      'Admission Enquiries',
      'Calendar',
      'Achievements',
      'Chatbot FAQs',
      'Audit Log',
      // Newer modules that must not be lost
      'Class & Section Manager',
      'Teacher Assignments',
      'Branding',
      'Change Logo',
      'Change Favicon',
      'Account & Role Management',
    ]) {
      expectModule(label);
    }
  });

  it('exposes the Teacher Dashboard switch and drops the developer-facing note', () => {
    authState.current = { role: 'principal' };
    wrap(<PrincipalDashboard />);

    expect(screen.getByRole('link', { name: /Teacher Dashboard/i })).toBeInTheDocument();
    expect(
      screen.queryByText(/Authorization is enforced by the database, not these buttons/i),
    ).not.toBeInTheDocument();
  });

  it('keeps the badge count equal to the number of pending rows the list shows', () => {
    authState.current = { role: 'principal' };
    wrap(<PrincipalDashboard />);

    // The single mocked staff row is pending, so the badge must read 1.
    const badge = moduleButtons().find((b) => /Pending Registrations/i.test(b.textContent ?? ''));
    expect(badge?.textContent).toContain('1');
  });
});

describe('TeacherDashboard', () => {
  it('shows every teacher module as a button directly on the page', () => {
    authState.current = { role: 'teacher' };
    wrap(<TeacherDashboard />);

    for (const label of [
      'Daily Homework Uploader',
      'Class Notices',
      'Principal Notice Board',
      'Staff Leave Center',
      'Birthday Management',
      'Student of the Month',
      'My Dashboard',
      'Access Summary',
    ]) {
      expectModule(label);
    }
  });

  it('gives a principal the Principal Dashboard switch and a supervisory indicator', () => {
    authState.current = { role: 'principal' };
    wrap(<TeacherDashboard />);

    expect(screen.getByRole('link', { name: /Principal Dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Principal access — all authorized classes/i)).toBeInTheDocument();
  });

  it('does not expose the principal switch to an ordinary teacher', () => {
    authState.current = { role: 'teacher' };
    wrap(<TeacherDashboard />);

    expect(screen.queryByRole('link', { name: /Principal Dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Principal access — all authorized classes/i)).not.toBeInTheDocument();
  });
});
