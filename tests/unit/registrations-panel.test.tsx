import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * Hermetic component test for the Pending Registrations panel.
 *
 * It pins the regression that caused this round of fixes: when the registrations
 * query FAILED, the panel rendered "No one is waiting for approval" — an empty
 * state — which is why a real pending teacher looked like nothing at all while
 * the navigation badge still showed 1.
 */

// Keep the test hermetic: no Supabase client, no network, no auth provider tree.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
    }),
  },
}));

const staffState: { current: Record<string, unknown> } = { current: {} };

vi.mock('@/lib/hooks/useStaff', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/hooks/useStaff')>();
  return { ...actual, useStaff: () => staffState.current };
});

import { RegistrationsPanel } from '@/pages/admin/principal/PeoplePanels';

function wrap(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

describe('RegistrationsPanel', () => {
  beforeEach(() => {
    staffState.current = {};
  });

  it('shows an error state with Retry when the query fails — never the empty state', () => {
    staffState.current = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      isFetching: false,
      refetch: vi.fn(),
    };

    wrap(<RegistrationsPanel />);

    expect(screen.getByText(/Unable to load registrations/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/No one is waiting for approval/i)).not.toBeInTheDocument();
  });

  it('renders the pending teacher with Approve / View details / Reject once the query succeeds', () => {
    staffState.current = {
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
    };

    wrap(<RegistrationsPanel />);

    expect(screen.getByText('Asha Kumari')).toBeInTheDocument();
    expect(screen.getByText('asha@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(screen.queryByText(/No one is waiting for approval/i)).not.toBeInTheDocument();
  });

  it('only shows the empty state when the query genuinely succeeded with no pending rows', () => {
    staffState.current = {
      data: [
        {
          user_id: 'u2',
          role: 'teacher',
          status: 'approved',
          approved_by: 'p1',
          approved_at: '2026-09-29T10:00:00Z',
          created_at: '2026-09-28T10:00:00Z',
          full_name: 'Approved Teacher',
          email: 'approved@example.com',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    };

    wrap(<RegistrationsPanel />);

    expect(screen.getByText(/No one is waiting for approval/i)).toBeInTheDocument();
  });
});
