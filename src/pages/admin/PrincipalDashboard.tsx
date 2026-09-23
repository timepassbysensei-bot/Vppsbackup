import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { callFunction } from '@/lib/api';
import { maskPhone } from '@/lib/validation/schemas';
import { AdminShell } from '@/app/AdminShell';
import { BrandingPanel } from './BrandingPanel';

interface StaffRow {
  user_id: string;
  role: string;
  status: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

/**
 * Principal dashboard. The principal can read all staff and all parent messages
 * (RLS grants this only to an approved principal). Role/status changes go
 * through the approve-teacher Function, which re-verifies is_principal()
 * server-side — the browser never writes user_roles directly.
 */
export function PrincipalDashboard() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: async (): Promise<StaffRow[]> => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role, status, profiles(full_name, email)')
        .order('status');
      if (error) throw error;
      return (data as unknown as StaffRow[]) ?? [];
    },
  });

  const { data: messages } = useQuery({
    queryKey: ['parent-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent_messages')
        .select('id, student_name, sender_name, phone, status, created_at')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(25);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function act(userId: string, action: 'approved' | 'rejected' | 'suspended', role: 'teacher' | 'principal' = 'teacher') {
    await callFunction('approve-teacher', { userId, action, role });
    await qc.invalidateQueries({ queryKey: ['staff'] });
  }

  const pending = (staff ?? []).filter((s) => s.status === 'pending');
  const others = (staff ?? []).filter((s) => s.status !== 'pending');

  return (
    <AdminShell title={t('admin.principalDashboard')}>
      <section className="card p-5">
        <h2 className="font-semibold text-navy">Pending approvals</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-text/50">No one is waiting for approval.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/5">
            {pending.map((s) => (
              <li key={s.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">{s.profiles?.full_name ?? 'Unknown'}</p>
                  <p className="text-sm text-text/60">{s.profiles?.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary" onClick={() => void act(s.user_id, 'approved', 'teacher')}>
                    Approve teacher
                  </button>
                  <button className="btn-secondary" onClick={() => void act(s.user_id, 'approved', 'principal')}>
                    Approve principal
                  </button>
                  <button
                    className="btn text-danger ring-1 ring-danger/30"
                    onClick={() => void act(s.user_id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-6 p-5">
        <h2 className="font-semibold text-navy">Staff</h2>
        <ul className="mt-3 divide-y divide-black/5">
          {others.map((s) => (
            <li key={s.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-medium">
                  {s.profiles?.full_name ?? 'Unknown'} <span className="text-xs text-text/50">({s.role})</span>
                </p>
                <p className="text-sm text-text/60">{s.profiles?.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-surface px-2 py-0.5 text-xs">{s.status}</span>
                {s.status === 'approved' && (
                  <button className="btn text-danger ring-1 ring-danger/30" onClick={() => void act(s.user_id, 'suspended', s.role as 'teacher' | 'principal')}>
                    Suspend
                  </button>
                )}
                {s.status !== 'approved' && (
                  <button className="btn-secondary" onClick={() => void act(s.user_id, 'approved', s.role as 'teacher' | 'principal')}>
                    Reinstate
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="font-semibold text-navy">Parent messages</h2>
        {/* Phone is MASKED in the preview list; the full number appears only in a
            protected detail view (to be built on the same RLS-guarded table). */}
        {(messages ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-text/50">No messages.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/5">
            {(messages ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">{m.sender_name}</p>
                  <p className="text-sm text-text/60">
                    Student: {m.student_name} · {maskPhone(m.phone)}
                  </p>
                </div>
                <span className="rounded bg-surface px-2 py-0.5 text-xs">{m.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Branding: logo + favicon uploads (RLS restricts writes to the principal). */}
      <BrandingPanel />
    </AdminShell>
  );
}
