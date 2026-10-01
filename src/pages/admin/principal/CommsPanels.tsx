import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthProvider';
import { normalizePhone } from '@/lib/validation/schemas';
import {
  Btn,
  Checkbox,
  Empty,
  ErrorNote,
  Field,
  Labeled,
  LoadingBlock,
  Panel,
  Pill,
  Select,
  SuccessNote,
  TextArea,
  TextInput,
  formatDate,
  formatDateTime,
  useAction,
} from '@/components/admin/kit';

const NOTICE_PRIORITIES = ['normal', 'high', 'urgent'] as const;

/** ---------------------------------------------------------------------------
 * Internal Notices — staff-only notices with draft/publish/pin/archive.
 * ------------------------------------------------------------------------- */
interface InternalNotice {
  id: string;
  title: string;
  content: string;
  priority: string;
  audience: string;
  is_pinned: boolean;
  state: string;
  expiry_date: string | null;
  published_at: string | null;
  is_deleted: boolean;
  created_at: string;
}

export function InternalNoticesPanel() {
  const qc = useQueryClient();
  const action = useAction();
  const [filter, setFilter] = useState('all');
  const { data: notices, isLoading } = useQuery({
    queryKey: ['internal-notices-admin'],
    queryFn: async (): Promise<InternalNotice[]> => {
      const { data, error } = await supabase
        .from('internal_teacher_notices')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as InternalNotice[]) ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['internal-notices-admin'] });

  async function update(id: string, patch: Partial<InternalNotice>) {
    await action.run(async () => {
      const { error } = await supabase.from('internal_teacher_notices').update(patch).eq('id', id);
      if (error) throw error;
      await refresh();
    }, 'Notice updated.');
  }

  const filtered = (notices ?? []).filter((n) => {
    if (filter === 'all') return !n.is_deleted;
    if (filter === 'archived') return n.is_deleted;
    return n.state === filter && !n.is_deleted;
  });

  if (isLoading) return <Panel title="Internal notices"><LoadingBlock /></Panel>;

  return (
    <div className="grid gap-4">
      <NoticeComposer onSaved={refresh} />
      <Panel
        title="Staff notices"
        description="Internal notices appear on the teacher dashboard. Pin the important ones and set an expiry date."
        actions={
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40">
            <option value="all">All live</option>
            <option value="draft">Drafts</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
        }
      >
        {action.error && <div className="mb-3"><ErrorNote>{action.error}</ErrorNote></div>}
        {action.success && <div className="mb-3"><SuccessNote>{action.success}</SuccessNote></div>}
        {filtered.length === 0 ? (
          <Empty title="Nothing here yet" message="Create a notice above to reach your staff." />
        ) : (
          <ul>
            {filtered.map((n) => (
              <li key={n.id} className="border-b border-black/5 py-3 last:border-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-navy">
                      {n.is_pinned && <span className="mr-1 text-amber-700">📌</span>}
                      {n.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-text/65">{n.content}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text/45">
                      <Pill tone={n.state === 'published' ? 'ok' : n.state === 'draft' ? 'warn' : 'neutral'}>{n.state}</Pill>
                      <span>{n.priority}</span>
                      {n.expiry_date && <span>expires {formatDate(n.expiry_date)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {n.state !== 'published' && (
                      <Btn
                        variant="primary"
                        onClick={() => void update(n.id, { state: 'published', published_at: new Date().toISOString(), is_deleted: false })}
                      >
                        Publish
                      </Btn>
                    )}
                    {n.state === 'published' && <Btn onClick={() => void update(n.id, { state: 'draft' })}>Unpublish</Btn>}
                    <Btn onClick={() => void update(n.id, { is_pinned: !n.is_pinned })}>{n.is_pinned ? 'Unpin' : 'Pin'}</Btn>
                    {!n.is_deleted && (
                      <Btn variant="danger" onClick={() => action.confirm('Archive this notice?', async () => {
                        const { error } = await supabase.from('internal_teacher_notices').update({ state: 'archived', is_deleted: true }).eq('id', n.id);
                        if (error) throw error;
                        await refresh();
                      }, 'Notice archived.')}>
                        Archive
                      </Btn>
                    )}
                    {n.is_deleted && (
                      <Btn onClick={() => void update(n.id, { is_deleted: false, state: 'draft' })}>Restore</Btn>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function NoticeComposer({ onSaved }: { onSaved: () => void }) {
  const action = useAction();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [audience, setAudience] = useState('all');
  const [pinned, setPinned] = useState(false);
  const [expiry, setExpiry] = useState('');

  async function save(state: 'draft' | 'published') {
    if (!title.trim() || !content.trim()) {
      action.setError('A title and message are required.');
      return;
    }
    const ok = await action.run(async () => {
      const { error } = await supabase.from('internal_teacher_notices').insert({
        title: title.trim(),
        content: content.trim(),
        priority,
        audience,
        is_pinned: pinned,
        expiry_date: expiry || null,
        state,
        published_at: state === 'published' ? new Date().toISOString() : null,
      });
      if (error) throw error;
      onSaved();
    }, state === 'published' ? 'Notice published.' : 'Draft saved.');
    if (ok) {
      setTitle('');
      setContent('');
      setPinned(false);
      setExpiry('');
    }
  }

  return (
    <Panel title="New staff notice">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Title" className="sm:col-span-3">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
        </Field>
        <Field label="Message" className="sm:col-span-3">
          <TextArea rows={3} value={content} onChange={(e) => setContent(e.target.value)} maxLength={4000} />
        </Field>
        <Field label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            {NOTICE_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Field>
        <Field label="Audience">
          <Select value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="all">All staff</option>
            <option value="teachers">Teachers</option>
            <option value="office">Office</option>
          </Select>
        </Field>
        <Field label="Expiry date">
          <TextInput type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </Field>
      </div>
      <div className="mt-2"><Checkbox label="Pin this notice" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /></div>
      {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
      {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn variant="primary" loading={action.busy} onClick={() => void save('published')}>Publish</Btn>
        <Btn loading={action.busy} onClick={() => void save('draft')}>Save draft</Btn>
      </div>
    </Panel>
  );
}

/** ---------------------------------------------------------------------------
 * Parent Messages — threads, replies, internal notes, assignment, open/closed.
 * ------------------------------------------------------------------------- */
interface ParentMessage {
  id: string;
  student_name: string;
  sender_name: string;
  phone: string;
  body: string;
  status: string;
  subject: string | null;
  class_id: string | null;
  section_id: string | null;
  is_open: boolean;
  assigned_to: string | null;
  internal_note: string | null;
  unread_principal: boolean;
  created_at: string;
}

interface Reply {
  id: string;
  message_id: string;
  author_kind: string;
  author_id: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export function ParentMessagesPanel() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const action = useAction();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['parent-messages'],
    queryFn: async (): Promise<ParentMessage[]> => {
      const { data, error } = await supabase
        .from('parent_messages')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as ParentMessage[]) ?? [];
    },
  });

  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('user_id, role, profiles(full_name)');
      return (data as unknown as { user_id: string; profiles: { full_name: string | null } | null }[]) ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['parent-messages'] });

  const filtered = (messages ?? []).filter((m) => {
    const hay = `${m.student_name} ${m.sender_name} ${m.phone} ${m.body}`.toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (status && m.status !== status) return false;
    return true;
  });

  async function open(message: ParentMessage) {
    setOpenId(openId === message.id ? null : message.id);
    if (message.unread_principal) {
      await supabase.from('parent_messages').update({ unread_principal: false }).eq('id', message.id);
      void refresh();
    }
  }

  if (isLoading) return <Panel title="Parent messages"><LoadingBlock /></Panel>;

  return (
    <Panel
      title="Parent messages"
      description="Every conversation sent from the public contact form. Open a thread to reply or assign it to a teacher."
      actions={
        <div className="flex flex-wrap gap-2">
          <TextInput placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="sm:w-48" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40">
            <option value="">All statuses</option>
            {['New', 'Opened', 'Assigned', 'In Review', 'Resolved', 'Archived', 'Spam'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
      }
    >
      {action.error && <div className="mb-3"><ErrorNote>{action.error}</ErrorNote></div>}
      {filtered.length === 0 ? (
        <Empty title="No conversations" message="Parent enquiries from the contact form land here." />
      ) : (
        <ul>
          {filtered.map((m) => (
            <li key={m.id} className="border-b border-black/5 py-3 last:border-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-navy">
                    {m.subject || 'Enquiry'} — {m.sender_name}
                  </p>
                  <p className="truncate text-sm text-text/60">{m.student_name} · {m.phone}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-text/70">{m.body}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {m.unread_principal && <Pill tone="warn">new</Pill>}
                  <Pill tone={m.is_open ? 'info' : 'neutral'}>{m.status}</Pill>
                  <Btn onClick={() => void open(m)}>{openId === m.id ? 'Close' : 'Open'}</Btn>
                </div>
              </div>

              {openId === m.id && (
                <ParentThread
                  message={m}
                  staff={staff ?? []}
                  uid={session?.user.id ?? ''}
                  action={action}
                  onChanged={refresh}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ParentThread({
  message,
  staff,
  uid,
  action,
  onChanged,
}: {
  message: ParentMessage;
  staff: { user_id: string; profiles: { full_name: string | null } | null }[];
  uid: string;
  action: ReturnType<typeof useAction>;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [assign, setAssign] = useState(message.assigned_to ?? '');
  const [internalNote, setInternalNote] = useState(message.internal_note ?? '');

  const { data: replies } = useQuery({
    queryKey: ['pm-replies', message.id],
    queryFn: async (): Promise<Reply[]> => {
      const { data } = await supabase
        .from('parent_message_replies')
        .select('*')
        .eq('message_id', message.id)
        .order('created_at');
      return (data as Reply[]) ?? [];
    },
  });

  async function send() {
    if (!reply.trim()) return;
    const ok = await action.run(async () => {
      const { error } = await supabase.from('parent_message_replies').insert({
        message_id: message.id,
        author_kind: 'staff',
        author_id: uid,
        body: reply.trim(),
        is_internal: internal,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['pm-replies', message.id] });
    }, internal ? 'Internal note saved.' : 'Reply saved.');
    if (ok) {
      setReply('');
      setInternal(false);
    }
  }

  async function patch(patch: Record<string, unknown>, msg: string) {
    await action.run(async () => {
      const { error } = await supabase.from('parent_messages').update(patch).eq('id', message.id);
      if (error) throw error;
      onChanged();
    }, msg);
  }

  async function assignTo(id: string) {
    setAssign(id);
    if (!id) {
      await supabase.from('parent_message_assignments').delete().eq('message_id', message.id);
      await patch({ status: 'Opened' }, 'Assignment cleared.');
      return;
    }
    await action.run(async () => {
      await supabase.from('parent_message_assignments').delete().eq('message_id', message.id);
      const { error } = await supabase
        .from('parent_message_assignments')
        .insert({ message_id: message.id, teacher_id: id });
      if (error) throw error;
      await supabase.from('parent_messages').update({ status: 'Assigned', assigned_to: id }).eq('id', message.id);
      onChanged();
    }, 'Conversation assigned.');
  }

  return (
    <div className="mt-3 rounded-lg border border-black/10 bg-surface/50 p-3">
      <div className="flex flex-wrap gap-2">
        <Btn
          onClick={() =>
            void patch(
              { is_open: !message.is_open, status: message.is_open ? 'Resolved' : 'Opened' },
              message.is_open ? 'Conversation closed.' : 'Conversation reopened.',
            )
          }
        >
          {message.is_open ? 'Mark closed' : 'Reopen'}
        </Btn>
        <Btn onClick={() => void patch({ status: 'Spam', is_open: false }, 'Marked as spam.')}>Mark spam</Btn>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Assign to staff">
          <Select value={assign} onChange={(e) => void assignTo(e.target.value)}>
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.user_id} value={s.user_id}>
                {s.profiles?.full_name ?? s.user_id.slice(0, 8)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Internal note (staff only)">
          <TextInput value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
        </Field>
      </div>
      {internalNote !== (message.internal_note ?? '') && (
        <Btn className="mt-2" onClick={() => void patch({ internal_note: internalNote }, 'Internal note saved.')}>
          Save internal note
        </Btn>
      )}

      <div className="mt-4 space-y-2">
        <div className="rounded-lg bg-white p-2 text-sm">
          <p className="text-xs text-text/45">{message.sender_name} · parent</p>
          <p>{message.body}</p>
        </div>
        {(replies ?? []).map((r) => (
          <div key={r.id} className={`rounded-lg p-2 text-sm ${r.is_internal ? 'bg-amber/15' : 'bg-white'}`}>
            <p className="text-xs text-text/45">
              {r.is_internal ? 'Internal note' : 'Staff reply'} · {formatDateTime(r.created_at)}
            </p>
            <p>{r.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <TextArea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" className="w-full" />
        <Checkbox label="Internal note (not sent to the parent)" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
        {action.error && <div className="mt-2"><ErrorNote>{action.error}</ErrorNote></div>}
        <Btn variant="primary" className="mt-2" loading={action.busy} onClick={() => void send()}>Save</Btn>
      </div>
    </div>
  );
}

/** ---------------------------------------------------------------------------
 * Leave Inbox — approve/reject staff leave with a decision note.
 * ------------------------------------------------------------------------- */
interface LeaveRow {
  id: string;
  teacher_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  profiles: { full_name: string | null } | null;
}

export function LeaveInboxPanel() {
  const qc = useQueryClient();
  const action = useAction();
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['leave-all'],
    queryFn: async (): Promise<LeaveRow[]> => {
      const { data, error } = await supabase
        .from('teacher_leave_requests')
        .select('id, teacher_id, start_date, end_date, reason, status, profiles(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as LeaveRow[]) ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['leave-all'] });

  async function decide(id: string, decision: 'Approved' | 'Rejected', note: string) {
    await action.run(async () => {
      const { error: e1 } = await supabase.from('teacher_leave_requests').update({ status: decision }).eq('id', id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('leave_decisions').insert({
        request_id: id,
        decision,
        note: note || null,
      });
      if (e2) throw e2;
      await refresh();
    }, `Request ${decision.toLowerCase()}.`);
  }

  const filtered = (requests ?? []).filter((r) => !status || r.status === status);

  if (isLoading) return <Panel title="Leave inbox"><LoadingBlock /></Panel>;

  return (
    <Panel
      title="Leave inbox"
      description="Approve or reject staff leave and add a decision note. Leave reasons are private to the principal."
      actions={
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
          <option value="">All requests</option>
          {['Pending', 'Approved', 'Rejected', 'Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      }
    >
      {action.error && <div className="mb-3"><ErrorNote>{action.error}</ErrorNote></div>}
      {action.success && <div className="mb-3"><SuccessNote>{action.success}</SuccessNote></div>}
      {filtered.length === 0 ? (
        <Empty title="No leave requests" message="Teacher leave requests appear here for a decision." />
      ) : (
        <ul>
          {filtered.map((r) => (
            <li key={r.id} className="border-b border-black/5 py-3 last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{r.profiles?.full_name ?? 'Staff member'}</p>
                  <p className="text-sm text-text/60">
                    {formatDate(r.start_date)} → {formatDate(r.end_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={r.status === 'Approved' ? 'ok' : r.status === 'Rejected' ? 'danger' : 'warn'}>{r.status}</Pill>
                  <Btn onClick={() => setExpanded(expanded === r.id ? null : r.id)}>{expanded === r.id ? 'Hide' : 'Review'}</Btn>
                </div>
              </div>

              {expanded === r.id && (
                <LeaveDecision
                  row={r}
                  busy={action.busy}
                  onDecide={decide}
                  onCancel={() =>
                    action.confirm('Cancel this leave request?', async () => {
                      const { error } = await supabase.from('teacher_leave_requests').update({ status: 'Cancelled' }).eq('id', r.id);
                      if (error) throw error;
                      await refresh();
                    }, 'Request cancelled.')
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function LeaveDecision({
  row,
  busy,
  onDecide,
  onCancel,
}: {
  row: LeaveRow;
  busy: boolean;
  onDecide: (id: string, decision: 'Approved' | 'Rejected', note: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [note, setNote] = useState('');
  return (
    <div className="mt-3 rounded-lg border border-black/10 bg-surface/50 p-3">
      <Labeled label="Private reason" value={row.reason || 'No reason given'} />
      <Field label="Decision note" className="mt-3">
        <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="mt-2 flex flex-wrap gap-2">
        <Btn variant="primary" loading={busy} onClick={() => void onDecide(row.id, 'Approved', note)}>Approve</Btn>
        <Btn variant="danger" loading={busy} onClick={() => void onDecide(row.id, 'Rejected', note)}>Reject</Btn>
        {row.status === 'Pending' && <Btn variant="ghost" onClick={onCancel}>Cancel request</Btn>}
      </div>
    </div>
  );
}

/** ---------------------------------------------------------------------------
 * Admission Enquiries — status workflow, assignment, duplicates, CSV export.
 * ------------------------------------------------------------------------- */
interface Enquiry {
  id: string;
  student_name: string;
  guardian_name: string;
  phone: string;
  email: string | null;
  class_applying: string;
  current_school: string | null;
  message: string | null;
  status: string;
  assigned_to: string | null;
  follow_up_date: string | null;
  internal_note: string | null;
  is_spam: boolean;
  created_at: string;
}

export function AdmissionsPanel() {
  const qc = useQueryClient();
  const action = useAction();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['admissions'],
    queryFn: async (): Promise<Enquiry[]> => {
      const { data, error } = await supabase
        .from('admission_enquiries')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Enquiry[]) ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['admissions'] });

  const duplicates = useMemo(() => {
    const byPhone = new Map<string, number>();
    for (const r of rows ?? []) {
      const key = normalizePhone(r.phone);
      byPhone.set(key, (byPhone.get(key) ?? 0) + 1);
    }
    return byPhone;
  }, [rows]);

  const filtered = (rows ?? []).filter((r) => {
    if (status && r.status !== status) return false;
    const hay = `${r.student_name} ${r.guardian_name} ${r.phone}`.toLowerCase();
    return !q || hay.includes(q.toLowerCase());
  });

  function exportCsv() {
    const header = ['Student', 'Guardian', 'Phone', 'Email', 'Class', 'Status', 'Follow-up', 'Note'];
    const lines = filtered.map((r) =>
      [r.student_name, r.guardian_name, r.phone, r.email ?? '', r.class_applying, r.status, r.follow_up_date ?? '', (r.internal_note ?? '').replace(/[\n,]/g, ' ')].join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'admission-enquiries.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function patch(id: string, p: Partial<Enquiry>, msg: string) {
    await action.run(async () => {
      const { error } = await supabase.from('admission_enquiries').update(p).eq('id', id);
      if (error) throw error;
      await refresh();
    }, msg);
  }

  if (isLoading) return <Panel title="Admission enquiries"><LoadingBlock /></Panel>;

  return (
    <Panel
      title="Admission enquiries"
      description="Applications submitted from the public admissions form. Track status, assign follow-ups, flag spam and export."
      actions={
        <div className="flex flex-wrap gap-2">
          <TextInput placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="sm:w-44" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40">
            <option value="">All statuses</option>
            {['New', 'Contacted', 'Follow-up', 'Admitted', 'Closed', 'Spam'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Btn onClick={exportCsv}>Export CSV</Btn>
        </div>
      }
    >
      {action.error && <div className="mb-3"><ErrorNote>{action.error}</ErrorNote></div>}
      {action.success && <div className="mb-3"><SuccessNote>{action.success}</SuccessNote></div>}
      {filtered.length === 0 ? (
        <Empty title="No enquiries" message="Admission enquiries will appear here." />
      ) : (
        <ul>
          {filtered.map((r) => {
            const dup = (duplicates.get(normalizePhone(r.phone)) ?? 0) > 1;
            return (
              <li key={r.id} className="border-b border-black/5 py-3 last:border-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-navy">
                      {r.student_name} <span className="text-sm font-normal text-text/60">· guardian {r.guardian_name}</span>
                    </p>
                    <p className="text-sm text-text/60">
                      Class {r.class_applying} · {r.phone}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Pill tone={r.status === 'Admitted' ? 'ok' : r.is_spam ? 'danger' : 'info'}>{r.status}</Pill>
                      {dup && <Pill tone="warn">possible duplicate</Pill>}
                      {r.follow_up_date && <span className="text-xs text-text/45">follow-up {formatDate(r.follow_up_date)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a className="btn-ghost" href={`tel:${r.phone}`}>Call</a>
                    {r.email && <a className="btn-ghost" href={`mailto:${r.email}`}>Email</a>}
                    <Btn onClick={() => setExpanded(expanded === r.id ? null : r.id)}>{expanded === r.id ? 'Hide' : 'Manage'}</Btn>
                  </div>
                </div>

                {expanded === r.id && (
                  <EnquiryEditor row={r} busy={action.busy} onPatch={patch} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function EnquiryEditor({
  row,
  busy,
  onPatch,
}: {
  row: Enquiry;
  busy: boolean;
  onPatch: (id: string, p: Partial<Enquiry>, msg: string) => Promise<void>;
}) {
  const [status, setStatus] = useState(row.status);
  const [followUp, setFollowUp] = useState(row.follow_up_date ?? '');
  const [note, setNote] = useState(row.internal_note ?? '');

  return (
    <div className="mt-3 rounded-lg border border-black/10 bg-surface/50 p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {['New', 'Contacted', 'Follow-up', 'Admitted', 'Closed', 'Spam'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Follow-up date">
          <TextInput type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
        </Field>
      </div>
      {row.current_school && <p className="mt-2 text-sm text-text/60">Current school: {row.current_school}</p>}
      {row.message && <p className="mt-2 text-sm text-text/70">{row.message}</p>}
      <Field label="Internal note" className="mt-3">
        <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="mt-2 flex flex-wrap gap-2">
        <Btn
          variant="primary"
          loading={busy}
          onClick={() => void onPatch(row.id, { status, follow_up_date: followUp || null, internal_note: note || null }, 'Enquiry updated.')}
        >
          Save
        </Btn>
        <Btn variant="danger" loading={busy} onClick={() => void onPatch(row.id, { is_spam: !row.is_spam, status: row.is_spam ? 'New' : 'Spam' }, 'Spam flag toggled.')}>
          {row.is_spam ? 'Not spam' : 'Mark spam'}
        </Btn>
      </div>
    </div>
  );
}
