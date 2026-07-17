import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthProvider';
import { AdminShell } from '@/app/AdminShell';

/**
 * Teacher dashboard. Everything here is scoped by RLS: a teacher only ever sees
 * their own permissions, assignments, leave requests, and the staff-wide
 * internal notices. This component is a functional starting point wiring those
 * reads/writes; content-management editors build on the same RLS-guarded tables.
 */
export function TeacherDashboard() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();

  const { data: perms } = useQuery({
    queryKey: ['my-perms', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from('teacher_permissions').select('*').eq('user_id', uid).maybeSingle();
      return data;
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ['my-classes', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from('teacher_class_assignments')
        .select('class_id, section_id, classes(name), sections(name)')
        .eq('user_id', uid);
      return data ?? [];
    },
  });

  const { data: leave } = useQuery({
    queryKey: ['my-leave', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from('teacher_leave_requests')
        .select('*')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: notices } = useQuery({
    queryKey: ['internal-notices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('internal_teacher_notices')
        .select('id,title,content,priority,created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const permList = perms
    ? (['can_public_notices', 'can_birthdays', 'can_resources', 'can_spotlight'] as const).filter((k) => perms[k])
    : [];

  return (
    <AdminShell title={t('admin.teacherDashboard')}>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold text-navy">Your access</h2>
          <p className="mt-2 text-sm text-text/70">Permissions:</p>
          <ul className="mt-1 flex flex-wrap gap-2 text-xs">
            {permList.length === 0 ? (
              <li className="text-text/50">Class content only</li>
            ) : (
              permList.map((p) => (
                <li key={p} className="rounded bg-surface px-2 py-0.5 text-navy">
                  {p.replace('can_', '').replace('_', ' ')}
                </li>
              ))
            )}
          </ul>
          <p className="mt-3 text-sm text-text/70">Assigned classes:</p>
          <ul className="mt-1 flex flex-wrap gap-2 text-xs">
            {(assignments ?? []).length === 0 ? (
              <li className="text-text/50">None yet</li>
            ) : (
              (assignments ?? []).map((a, i) => {
                const cls = (a as { classes?: { name?: string } }).classes?.name ?? '?';
                const sec = (a as { sections?: { name?: string } }).sections?.name;
                return (
                  <li key={i} className="rounded bg-surface px-2 py-0.5 text-navy">
                    {cls === 'Nursery' ? 'Nursery' : `Class ${cls}`}
                    {sec ? ` ${sec}` : ''}
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <LeaveCard uid={uid} onSubmitted={() => qc.invalidateQueries({ queryKey: ['my-leave', uid] })} leave={leave ?? []} />
      </div>

      <section className="card mt-6 p-5">
        <h2 className="font-semibold text-navy">Staff notices</h2>
        {(notices ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-text/50">No notices.</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/5">
            {(notices ?? []).map((n) => (
              <li key={n.id} className="py-2">
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-text/70">{n.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}

function LeaveCard({
  uid,
  leave,
  onSubmitted,
}: {
  uid: string | undefined;
  leave: { id: string; start_date: string; end_date: string; status: string }[];
  onSubmitted: () => void;
}) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid || !start || !end) return;
    setBusy(true);
    setErr('');
    // teacher_id must equal auth.uid() — enforced by the leave_insert policy.
    const { error } = await supabase.from('teacher_leave_requests').insert({
      teacher_id: uid,
      start_date: start,
      end_date: end,
      reason: reason || null,
    });
    setBusy(false);
    if (error) {
      setErr('Could not submit request.');
      return;
    }
    setStart('');
    setEnd('');
    setReason('');
    onSubmitted();
  }

  return (
    <section className="card p-5">
      <h2 className="font-semibold text-navy">Leave</h2>
      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span>From</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="input" required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>To</span>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="input" required />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span>Reason (private)</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="input" />
        </label>
        {err && <p className="text-sm text-danger sm:col-span-2">{err}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-fit sm:col-span-2">
          Submit request
        </button>
      </form>

      <ul className="mt-4 divide-y divide-black/5 text-sm">
        {leave.length === 0 ? (
          <li className="py-2 text-text/50">No leave requests.</li>
        ) : (
          leave.map((l) => (
            <li key={l.id} className="flex items-center justify-between py-2">
              <span>
                {l.start_date} → {l.end_date}
              </span>
              <span className="rounded bg-surface px-2 py-0.5 text-xs">{l.status}</span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
