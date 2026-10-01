import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { callFunction } from '@/lib/api';
import { maskPhone } from '@/lib/validation/schemas';
import { useClasses } from '@/lib/hooks/useClasses';
import { useAuth } from '@/app/AuthProvider';
import {
  Btn,
  Checkbox,
  ErrorNote,
  Empty,
  Field,
  Labeled,
  LoadingBlock,
  Panel,
  Pill,
  Row,
  Select,
  SuccessNote,
  TextInput,
  formatDate,
  useAction,
} from '@/components/admin/kit';

export interface StaffRow {
  user_id: string;
  role: 'principal' | 'teacher';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  approved_by: string | null;
  approved_at: string | null;
  profiles: { full_name: string | null; email: string | null } | null;
}

interface PermRow {
  user_id: string;
  can_public_notices: boolean;
  can_birthdays: boolean;
  can_resources: boolean;
  can_spotlight: boolean;
}

interface AssignmentRow {
  user_id: string;
  class_id: string;
  section_id: string | null;
}

/** Shared query: every staff member with role + profile. Principal RLS read. */
function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async (): Promise<StaffRow[]> => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role, status, approved_by, approved_at, profiles(full_name, email)')
        .order('status');
      if (error) throw error;
      return (data as unknown as StaffRow[]) ?? [];
    },
  });
}

/** ---------------------------------------------------------------------------
 * Pending Registrations — approve/reject with a role, recording the approver.
 * ------------------------------------------------------------------------- */
export function RegistrationsPanel() {
  const qc = useQueryClient();
  const { data: staff, isLoading } = useStaff();
  const action = useAction();

  const pending = (staff ?? []).filter((s) => s.status === 'pending');
  const byId = useMemo(() => new Map((staff ?? []).map((s) => [s.user_id, s])), [staff]);

  async function decide(userId: string, act: 'approved' | 'rejected', role: 'teacher' | 'principal') {
    await action.run(
      async () => {
        await callFunction('approve-teacher', { userId, action: act, role });
        await qc.invalidateQueries({ queryKey: ['staff'] });
      },
      act === 'approved' ? 'Registration approved.' : 'Registration rejected.',
    );
  }

  if (isLoading) return <Panel title="Pending registrations"><LoadingBlock /></Panel>;

  return (
    <Panel
      title="Pending registrations"
      description="New sign-ups wait here until you assign a role. Approval is re-verified server-side, so a frontend cannot grant itself a role."
    >
      {action.error && <div className="mb-3"><ErrorNote>{action.error}</ErrorNote></div>}
      {action.success && <div className="mb-3"><SuccessNote>{action.success}</SuccessNote></div>}

      {pending.length === 0 ? (
        <Empty title="No one is waiting for approval" message="New teacher and staff registrations will appear here." />
      ) : (
        <ul>
          {pending.map((s) => (
            <Row key={s.user_id}>
              <div className="min-w-0">
                <p className="font-medium text-navy">{s.profiles?.full_name ?? 'Unnamed account'}</p>
                <p className="truncate text-sm text-text/60">{s.profiles?.email ?? '—'}</p>
                <p className="text-xs text-text/45">Signed up — awaiting a role</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn variant="primary" loading={action.busy} onClick={() => void decide(s.user_id, 'approved', 'teacher')}>
                  Approve as teacher
                </Btn>
                <Btn onClick={() => void decide(s.user_id, 'approved', 'principal')}>Approve as principal</Btn>
                <Btn
                  variant="danger"
                  loading={action.busy}
                  onClick={() => action.confirm('Reject this registration?', async () => {
                    await callFunction('approve-teacher', { userId: s.user_id, action: 'rejected', role: 'teacher' });
                    await qc.invalidateQueries({ queryKey: ['staff'] });
                  }, 'Registration rejected.')}
                >
                  Reject
                </Btn>
              </div>
            </Row>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-black/5 pt-4">
        <p className="text-sm font-medium text-navy">Recently decided</p>
        <ul className="mt-2">
          {(staff ?? [])
            .filter((s) => s.status !== 'pending')
            .slice(0, 6)
            .map((s) => (
              <li key={s.user_id} className="flex flex-wrap items-center gap-2 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{s.profiles?.full_name ?? s.profiles?.email ?? '—'}</span>
                <Pill tone={s.status === 'approved' ? 'ok' : s.status === 'suspended' ? 'warn' : 'danger'}>{s.status}</Pill>
                <span className="text-xs text-text/45">
                  {s.approved_by
                    ? `by ${byId.get(s.approved_by)?.profiles?.full_name ?? 'principal'} · ${formatDate(s.approved_at)}`
                    : ''}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </Panel>
  );
}

/** ---------------------------------------------------------------------------
 * Staff Roster — search, invite, activate/deactivate, roles, permissions,
 * class assignments, edit details, revoke access.
 * ------------------------------------------------------------------------- */
export function StaffPanel() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const { data: staff, isLoading } = useStaff();
  const { data: perms } = useQuery({
    queryKey: ['staff-perms'],
    queryFn: async (): Promise<PermRow[]> => {
      const { data } = await supabase.from('teacher_permissions').select('*');
      return (data as PermRow[]) ?? [];
    },
  });
  const { data: assignments } = useQuery({
    queryKey: ['staff-assignments'],
    queryFn: async (): Promise<AssignmentRow[]> => {
      const { data } = await supabase.from('teacher_class_assignments').select('user_id, class_id, section_id');
      return (data as AssignmentRow[]) ?? [];
    },
  });

  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const action = useAction();

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['staff'] }),
      qc.invalidateQueries({ queryKey: ['staff-perms'] }),
      qc.invalidateQueries({ queryKey: ['staff-assignments'] }),
      qc.invalidateQueries({ queryKey: ['my-classes'] }),
    ]);
  };

  const filtered = (staff ?? []).filter((s) => {
    const name = `${s.profiles?.full_name ?? ''} ${s.profiles?.email ?? ''}`.toLowerCase();
    if (q && !name.includes(q.toLowerCase())) return false;
    if (roleFilter && s.role !== roleFilter) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    return true;
  });

  async function setStatus(userId: string, status: 'approved' | 'suspended') {
    await action.run(async () => {
      await callFunction('approve-teacher', { userId, action: status, role: 'teacher' });
      await refresh();
    }, status === 'approved' ? 'Account activated.' : 'Account deactivated.');
  }

  async function revoke(userId: string) {
    await action.confirm('Revoke this account\'s access? They will be signed out of all dashboards.', async () => {
      await callFunction('approve-teacher', { userId, action: 'suspended', role: 'teacher' });
      await supabase.from('teacher_class_assignments').delete().eq('user_id', userId);
      await refresh();
    }, 'Access revoked.');
  }

  if (isLoading) return <Panel title="Staff roster"><LoadingBlock /></Panel>;

  return (
    <div className="grid gap-4">
      <InviteStaffForm onDone={refresh} />

      <Panel
        title="Staff roster"
        description="Search staff, change roles and permissions, assign classes, edit details, deactivate or revoke access."
        actions={
          <div className="flex flex-wrap gap-2">
            <TextInput placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} className="sm:w-56" />
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="sm:w-36">
              <option value="">All roles</option>
              <option value="teacher">Teacher</option>
              <option value="principal">Principal</option>
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-36">
              <option value="">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>
        }
      >
        {action.error && <div className="mb-3"><ErrorNote>{action.error}</ErrorNote></div>}
        {action.success && <div className="mb-3"><SuccessNote>{action.success}</SuccessNote></div>}

        {filtered.length === 0 ? (
          <Empty title="No staff match your filters" message="Try clearing the search or filters, or invite a staff member." />
        ) : (
          <ul>
            {filtered.map((s) => {
              const isSelf = s.user_id === session?.user.id;
              const p = (perms ?? []).find((x) => x.user_id === s.user_id);
              const myAssign = (assignments ?? []).filter((a) => a.user_id === s.user_id);
              return (
                <li key={s.user_id} className="border-b border-black/5 py-3 last:border-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-navy">
                        {s.profiles?.full_name ?? 'Unnamed'}{' '}
                        <span className="text-xs capitalize text-text/50">({s.role})</span>
                        {isSelf && <span className="ml-2 text-xs text-amber-700">you</span>}
                      </p>
                      <p className="truncate text-sm text-text/60">{s.profiles?.email ?? '—'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={s.status === 'approved' ? 'ok' : s.status === 'suspended' ? 'warn' : 'neutral'}>
                        {s.status}
                      </Pill>
                      {!isSelf && s.status === 'approved' && (
                        <Btn variant="danger" onClick={() => void revoke(s.user_id)}>Revoke</Btn>
                      )}
                      {!isSelf && s.status !== 'approved' && (
                        <Btn variant="primary" onClick={() => void setStatus(s.user_id, 'approved')}>Activate</Btn>
                      )}
                      {!isSelf && s.status === 'approved' && (
                        <Btn onClick={() => void setStatus(s.user_id, 'suspended')}>Deactivate</Btn>
                      )}
                      <Btn onClick={() => setEditing(editing === s.user_id ? null : s.user_id)}>
                        {editing === s.user_id ? 'Close' : 'Manage'}
                      </Btn>
                    </div>
                  </div>

                  {myAssign.length > 0 && (
                    <p className="mt-1 text-xs text-text/50">
                      {myAssign.length} class assignment{myAssign.length === 1 ? '' : 's'}
                    </p>
                  )}

                  {editing === s.user_id && !isSelf && (
                    <StaffEditor
                      row={s}
                      perm={p}
                      assigned={myAssign}
                      onSaved={refresh}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Parent messages — preview" description="Read-only summary. Full thread handling lives in Communication → Parent messages.">
        <ParentPreview />
      </Panel>
    </div>
  );
}

function ParentPreview() {
  const { data } = useQuery({
    queryKey: ['parent-messages-preview'],
    queryFn: async () => {
      const { data } = await supabase
        .from('parent_messages')
        .select('id, student_name, sender_name, phone, status')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });
  if ((data ?? []).length === 0) return <p className="text-sm text-text/50">No messages yet.</p>;
  return (
    <ul className="text-sm">
      {(data ?? []).map((m) => (
        <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
          <span className="min-w-0 truncate">
            {m.sender_name} · {m.student_name}
          </span>
          <span className="text-xs text-text/50">{maskPhone(m.phone)} · {m.status}</span>
        </li>
      ))}
    </ul>
  );
}

function InviteStaffForm({ onDone }: { onDone: () => Promise<void> }) {
  const { data: classes } = useClasses();
  const action = useAction();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'teacher' | 'principal'>('teacher');
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  async function submit() {
    const classIds = Object.keys(picked).filter((k) => picked[k]);
    const ok = await action.run(async () => {
      await callFunction('invite-staff', {
        email,
        full_name: name,
        role,
        classes: classIds.map((id) => ({ class_id: id, section_id: null })),
      });
      await onDone();
    }, 'Invitation created. Ask them to use “Forgot password” to set their password.');
    if (ok) {
      setEmail('');
      setName('');
      setPicked({});
    }
  }

  if (!open) {
    return (
      <Panel title="Add staff" description="Invite a staff member by e-mail. The account is created server-side and pre-approved.">
        <Btn variant="primary" onClick={() => setOpen(true)}>Invite a staff member</Btn>
      </Panel>
    );
  }

  return (
    <Panel title="Invite a staff member" actions={<Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </Field>
        <Field label="Email">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as 'teacher' | 'principal')}>
            <option value="teacher">Teacher</option>
            <option value="principal">Principal</option>
          </Select>
        </Field>
      </div>

      <p className="mt-3 text-sm font-medium text-text/80">Initial class assignments</p>
      <div className="mt-1 grid gap-1 sm:grid-cols-2">
        {(classes ?? []).map((c) => (
          <Checkbox
            key={c.id}
            label={c.name === 'Nursery' ? 'Nursery' : `Class ${c.name}`}
            checked={!!picked[c.id]}
            onChange={(e) => setPicked((prev) => ({ ...prev, [c.id]: e.target.checked }))}
          />
        ))}
      </div>

      {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
      {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}
      <div className="mt-4">
        <Btn
          variant="primary"
          loading={action.busy}
          disabled={!email.trim() || name.trim().length < 2}
          onClick={() => void submit()}
        >
          Create invitation
        </Btn>
      </div>
    </Panel>
  );
}

function StaffEditor({
  row,
  perm,
  assigned,
  onSaved,
}: {
  row: StaffRow;
  perm: PermRow | undefined;
  assigned: AssignmentRow[];
  onSaved: () => Promise<void>;
}) {
  const { data: classes } = useClasses();
  const action = useAction();
  const [name, setName] = useState(row.profiles?.full_name ?? '');
  const [role, setRole] = useState(row.role);
  const [perms, setPerms] = useState({
    can_public_notices: perm?.can_public_notices ?? false,
    can_birthdays: perm?.can_birthdays ?? false,
    can_resources: perm?.can_resources ?? false,
    can_spotlight: perm?.can_spotlight ?? false,
  });
  const [picked, setPicked] = useState<Record<string, boolean>>(
    Object.fromEntries(assigned.map((a) => [a.class_id, true])),
  );

  const [sectionPicks, setSectionPicks] = useState<Record<string, boolean>>(
    Object.fromEntries(assigned.filter((a) => a.section_id).map((a) => [a.section_id as string, true])),
  );

  async function save() {
    await action.run(async () => {
      if (name.trim()) {
        await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', row.user_id);
      }
      await supabase.from('user_roles').update({ role }).eq('user_id', row.user_id);
      await supabase.from('teacher_permissions').upsert({ user_id: row.user_id, ...perms }, { onConflict: 'user_id' });

      await supabase.from('teacher_class_assignments').delete().eq('user_id', row.user_id);
      const rows: { user_id: string; class_id: string; section_id: string | null }[] = [];
      for (const c of classes ?? []) {
        if (!picked[c.id]) continue;
        const chosen = c.sections.filter((s) => sectionPicks[s.id]);
        if (chosen.length === 0) {
          rows.push({ user_id: row.user_id, class_id: c.id, section_id: null });
        } else {
          for (const s of chosen) rows.push({ user_id: row.user_id, class_id: c.id, section_id: s.id });
        }
      }
      if (rows.length > 0) {
        const { error } = await supabase.from('teacher_class_assignments').insert(rows);
        if (error) throw error;
      }
      await onSaved();
    }, 'Staff details saved.');
  }

  return (
    <div className="mt-3 rounded-lg border border-black/10 bg-surface/50 p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Full name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as 'teacher' | 'principal')}>
            <option value="teacher">Teacher</option>
            <option value="principal">Principal</option>
          </Select>
        </Field>
        <div className="grid content-end gap-1">
          <Labeled label="Status" value={row.status} />
        </div>
      </div>

      <p className="mt-3 text-sm font-medium text-text/80">Extra permissions</p>
      <div className="mt-1 grid gap-1 sm:grid-cols-2">
        {(
          [
            ['can_public_notices', 'Manage public notices'],
            ['can_birthdays', 'Manage birthdays'],
            ['can_resources', 'Manage resources'],
            ['can_spotlight', 'Submit Student of the Month'],
          ] as const
        ).map(([key, label]) => (
          <Checkbox
            key={key}
            label={label}
            checked={perms[key]}
            onChange={(e) => setPerms((p) => ({ ...p, [key]: e.target.checked }))}
          />
        ))}
      </div>

      <p className="mt-3 text-sm font-medium text-text/80">Class &amp; section assignments</p>
      <div className="mt-1 grid gap-2">
        {(classes ?? []).map((c) => (
          <div key={c.id} className="rounded border border-black/10 bg-white p-2">
            <Checkbox
              label={c.name === 'Nursery' ? 'Nursery (whole class)' : `Class ${c.name} (whole class)`}
              checked={!!picked[c.id]}
              onChange={(e) => setPicked((p) => ({ ...p, [c.id]: e.target.checked }))}
            />
            {c.requires_section && picked[c.id] && (
              <div className="mt-1 flex flex-wrap gap-3 pl-6">
                {c.sections.map((s) => (
                  <Checkbox
                    key={s.id}
                    label={`Section ${s.name}`}
                    checked={!!sectionPicks[s.id]}
                    onChange={(e) => setSectionPicks((p) => ({ ...p, [s.id]: e.target.checked }))}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
      {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn variant="primary" loading={action.busy} onClick={() => void save()}>Save changes</Btn>
      </div>
    </div>
  );
}
