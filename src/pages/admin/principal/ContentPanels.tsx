import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useClasses } from '@/lib/hooks/useClasses';
import { publicUrl, uploadDocument } from '@/lib/uploads';
import {
  Btn,
  Checkbox,
  Empty,
  ErrorNote,
  Field,
  LoadingBlock,
  Panel,
  Pill,
  Select,
  SuccessNote,
  TextArea,
  TextInput,
  formatDate,
  useAction,
} from '@/components/admin/kit';
import { ClassPicker, classLabel } from '@/components/admin/ClassPicker';

const NOTICE_CATEGORIES = [
  'General', 'Holiday', 'Examination', 'Academic', 'Admission', 'Event',
  'Parent Meeting', 'Emergency', 'Transport', 'Timing Change', 'Other',
] as const;
const EVENT_TYPES = [
  'Holiday', 'Examination', 'Parent Meeting', 'School Event', 'Competition',
  'Admission', 'Academic Deadline', 'Timing Change', 'Other',
] as const;
const RESOURCE_CATEGORIES = [
  'Admission Forms', 'Syllabus', 'Examination Schedules', 'Holiday Calendar',
  'Leave Templates', 'Circulars', 'Policies', 'Other',
] as const;

/** ---------------------------------------------------------------------------
 * Public Notices — full CRUD with attachments, pinning and archive/restore.
 * ------------------------------------------------------------------------- */
interface PublicNoticeRow {
  id: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  content_en: string | null;
  category: string;
  priority: string;
  audience: string;
  effective_date: string | null;
  expiry_date: string | null;
  is_pinned: boolean;
  is_urgent: boolean;
  is_published: boolean;
  attachment_path: string | null;
  archived_at: string | null;
  is_deleted: boolean;
  created_at: string;
}

export function PublicNoticesPanel() {
  const qc = useQueryClient();
  const action = useAction();
  const [editing, setEditing] = useState<PublicNoticeRow | null>(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const { data: notices, isLoading } = useQuery({
    queryKey: ['public-notices-admin'],
    queryFn: async (): Promise<PublicNoticeRow[]> => {
      const { data, error: e } = await supabase
        .from('public_notices')
        .select('*')
        .order('created_at', { ascending: false });
      if (e) throw e;
      return (data as PublicNoticeRow[]) ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['public-notices-admin'] });

  const filtered = (notices ?? []).filter((n) => {
    if (filter === 'published') return n.is_published && !n.archived_at && !n.is_deleted;
    if (filter === 'draft') return !n.is_published && !n.archived_at && !n.is_deleted;
    if (filter === 'archived') return !!n.archived_at || n.is_deleted;
    return !n.is_deleted;
  });

  async function patch(id: string, p: Partial<PublicNoticeRow>, msg: string) {
    await action.run(async () => {
      const { error: e } = await supabase.from('public_notices').update(p).eq('id', id);
      if (e) throw e;
      await refresh();
    }, msg);
  }

  if (isLoading) return <Panel title="Public notices"><LoadingBlock /></Panel>;

  return (
    <div className="grid gap-4">
      <NoticeEditor editing={editing} onSaved={() => { setEditing(null); void refresh(); }} onError={setError} />
      {error && <ErrorNote>{error}</ErrorNote>}

      <Panel
        title="Public notices"
        description="Notices shown on the public website. Pin the major ones; archive instead of deleting."
        actions={
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40">
            <option value="all">All (not deleted)</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
            <option value="archived">Archived</option>
          </Select>
        }
      >
        {action.error && <div className="mb-3"><ErrorNote>{action.error}</ErrorNote></div>}
        {action.success && <div className="mb-3"><SuccessNote>{action.success}</SuccessNote></div>}
        {filtered.length === 0 ? (
          <Empty title="No notices" message="Publish your first notice using the form above." />
        ) : (
          <ul>
            {filtered.map((n) => (
              <li key={n.id} className="border-b border-black/5 py-3 last:border-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-navy">
                      {n.is_pinned && <span className="mr-1 text-amber-700">📌</span>}
                      {n.title_en}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text/50">
                      <Pill tone={n.is_published ? 'ok' : 'warn'}>{n.is_published ? 'published' : 'draft'}</Pill>
                      <span>{n.category}</span>
                      {n.attachment_path && <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" aria-hidden />attachment</span>}
                      {n.expiry_date && <span>expires {formatDate(n.expiry_date)}</span>}
                      {(n.archived_at || n.is_deleted) && <Pill tone="neutral">archived</Pill>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Btn onClick={() => setEditing(n)}>Edit</Btn>
                    {!n.is_published ? (
                      <Btn variant="primary" onClick={() => void patch(n.id, { is_published: true, archived_at: null, is_deleted: false }, 'Notice published.')}>Publish</Btn>
                    ) : (
                      <Btn onClick={() => void patch(n.id, { is_published: false }, 'Notice unpublished.')}>Unpublish</Btn>
                    )}
                    <Btn onClick={() => void patch(n.id, { is_pinned: !n.is_pinned }, n.is_pinned ? 'Unpinned.' : 'Pinned.')}>
                      {n.is_pinned ? 'Unpin' : 'Pin'}
                    </Btn>
                    {!n.archived_at && !n.is_deleted ? (
                      <Btn variant="danger" onClick={() => action.confirm('Archive this notice?', async () => {
                        const { error: e } = await supabase.from('public_notices').update({ archived_at: new Date().toISOString(), is_published: false }).eq('id', n.id);
                        if (e) throw e;
                        await refresh();
                      }, 'Notice archived.')}>Archive</Btn>
                    ) : (
                      <Btn onClick={() => void patch(n.id, { archived_at: null, is_deleted: false }, 'Notice restored.')}>Restore</Btn>
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

function NoticeEditor({
  editing,
  onSaved,
  onError,
}: {
  editing: PublicNoticeRow | null;
  onSaved: () => void;
  onError: (msg: string | null) => void;
}) {
  const action = useAction();
  const [form, setForm] = useState({
    title_en: '',
    title_hi: '',
    summary_en: '',
    content_en: '',
    category: 'General',
    priority: 'normal',
    audience: 'public',
    effective_date: '',
    expiry_date: '',
    is_pinned: false,
    is_urgent: false,
  });
  const [attachment, setAttachment] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Re-seed the form when a different notice is selected for editing.
  const [seedId, setSeedId] = useState<string | null>(null);
  if (editing && editing.id !== seedId) {
    setSeedId(editing.id);
    setForm({
      title_en: editing.title_en,
      title_hi: editing.title_hi ?? '',
      summary_en: editing.summary_en ?? '',
      content_en: editing.content_en ?? '',
      category: editing.category,
      priority: editing.priority,
      audience: editing.audience,
      effective_date: editing.effective_date ?? '',
      expiry_date: editing.expiry_date ?? '',
      is_pinned: editing.is_pinned,
      is_urgent: editing.is_urgent,
    });
    setAttachment(editing.attachment_path);
  }
  if (!editing && seedId !== null) {
    setSeedId(null);
    setForm({
      title_en: '', title_hi: '', summary_en: '', content_en: '', category: 'General',
      priority: 'normal', audience: 'public', effective_date: '', expiry_date: '',
      is_pinned: false, is_urgent: false,
    });
    setAttachment(null);
  }

  async function save(publish: boolean) {
    if (!form.title_en.trim()) {
      onError('A title is required.');
      return;
    }
    const ok = await action.run(async () => {
      const payload = {
        ...form,
        title_hi: form.title_hi || null,
        summary_en: form.summary_en || null,
        content_en: form.content_en || null,
        effective_date: form.effective_date || null,
        expiry_date: form.expiry_date || null,
        attachment_path: attachment,
        is_published: publish,
      };
      if (editing) {
        const { error: e } = await supabase.from('public_notices').update(payload).eq('id', editing.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('public_notices').insert(payload);
        if (e) throw e;
      }
      onSaved();
    }, editing ? 'Notice updated.' : publish ? 'Notice published.' : 'Draft saved.');
    if (ok) onError(null);
  }

  async function uploadAttachment(file: File | undefined) {
    if (!file) return;
    await action.run(async () => {
      const asset = await uploadDocument('notices', 'attachments', file);
      setAttachment(asset.path);
    }, 'Attachment uploaded.');
  }

  return (
    <Panel
      title={editing ? 'Edit notice' : 'New public notice'}
      description="Title, dates and pinning are what visitors see first. Preview before publishing."
      actions={editing ? <Btn variant="ghost" onClick={onSaved}>Cancel edit</Btn> : undefined}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title (English)" className="sm:col-span-2">
          <TextInput value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
        </Field>
        <Field label="Title (Hindi)">
          <TextInput value={form.title_hi} onChange={(e) => setForm({ ...form, title_hi: e.target.value })} />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {NOTICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Summary">
          <TextInput value={form.summary_en} onChange={(e) => setForm({ ...form, summary_en: e.target.value })} />
        </Field>
        <Field label="Priority">
          <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </Field>
        <Field label="Body">
          <TextArea rows={3} value={form.content_en} onChange={(e) => setForm({ ...form, content_en: e.target.value })} />
        </Field>
        <div className="grid gap-3">
          <Field label="Effective date">
            <TextInput type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} />
          </Field>
          <Field label="Expiry date">
            <TextInput type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
          </Field>
          <Field label="Audience">
            <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              <option value="public">Public website</option>
              <option value="internal">Internal only</option>
            </Select>
          </Field>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Checkbox label="Pin to top" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} />
        <Checkbox label="Show as emergency banner" checked={form.is_urgent} onChange={(e) => setForm({ ...form, is_urgent: e.target.checked })} />
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,image/*" className="sr-only" onChange={(e) => { void uploadAttachment(e.target.files?.[0]); e.target.value = ''; }} />
        <Btn icon={<Paperclip className="h-4 w-4" aria-hidden />} onClick={() => fileRef.current?.click()}>
          {attachment ? 'Replace attachment' : 'Add attachment'}
        </Btn>
        {attachment && <Pill tone="info">attached</Pill>}
      </div>

      {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
      {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}

      <div className="mt-4 flex flex-wrap gap-2">
        <Btn variant="primary" loading={action.busy} onClick={() => void save(true)}>{editing ? 'Save & publish' : 'Publish'}</Btn>
        <Btn loading={action.busy} onClick={() => void save(false)}>Save draft</Btn>
        <Btn variant="ghost" onClick={() => setPreview((p) => !p)}>{preview ? 'Hide preview' : 'Preview'}</Btn>
      </div>

      {preview && (
        <div className="mt-3 rounded-lg border border-dashed border-black/20 bg-surface/60 p-4">
          <p className="text-xs uppercase tracking-wide text-text/45">Public preview</p>
          {form.is_urgent && <div className="mt-2 rounded bg-danger px-3 py-1 text-sm font-medium text-white">{form.title_en || 'Urgent notice'}</div>}
          <h3 className="mt-2 font-semibold text-navy">{form.title_en || 'Notice title'}</h3>
          {form.summary_en && <p className="text-sm text-text/70">{form.summary_en}</p>}
          {form.content_en && <p className="mt-1 whitespace-pre-wrap text-sm text-text/80">{form.content_en}</p>}
          <p className="mt-2 text-xs text-text/45">{form.category} · {formatDate(form.effective_date)}</p>
        </div>
      )}
    </Panel>
  );
}

/** ---------------------------------------------------------------------------
 * All Class Notices — school-wide moderation.
 * ------------------------------------------------------------------------- */
interface ClassNoticeRow {
  id: string;
  class_id: string;
  section_id: string | null;
  title_en: string;
  content_en: string | null;
  category: string;
  expiry_date: string | null;
  is_published: boolean;
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
}

export function ClassNoticesAdminPanel() {
  const qc = useQueryClient();
  const action = useAction();
  const { data: classes } = useClasses();
  const [pick, setPick] = useState({ classId: '', sectionId: '' });
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<ClassNoticeRow | null>(null);

  const { data: notices, isLoading } = useQuery({
    queryKey: ['class-notices-admin'],
    queryFn: async (): Promise<ClassNoticeRow[]> => {
      const { data, error } = await supabase
        .from('class_notices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data as ClassNoticeRow[]) ?? [];
    },
  });

  const { data: authors } = useQuery({
    queryKey: ['class-notice-authors'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return data ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['class-notices-admin'] });

  const authorName = (id: string | null) => (authors ?? []).find((a) => a.id === id)?.full_name ?? 'Unknown';

  const filtered = (notices ?? []).filter((n) => {
    if (pick.classId && n.class_id !== pick.classId) return false;
    if (pick.sectionId && n.section_id !== pick.sectionId) return false;
    if (q && !`${n.title_en} ${n.content_en ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  if (isLoading) return <Panel title="All class notices"><LoadingBlock /></Panel>;

  return (
    <Panel
      title="All class notices"
      description="Every notice posted by teachers, school-wide. Edit inappropriate wording or archive a notice."
      actions={
        <div className="flex flex-wrap gap-2">
          <TextInput placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="sm:w-40" />
        </div>
      }
    >
      <div className="mb-3">
        <ClassPicker classId={pick.classId} sectionId={pick.sectionId} onChange={setPick} allowAllClasses allowAllSections />
      </div>

      {action.error && <div className="mb-3"><ErrorNote>{action.error}</ErrorNote></div>}
      {action.success && <div className="mb-3"><SuccessNote>{action.success}</SuccessNote></div>}

      {filtered.length === 0 ? (
        <Empty title="No class notices" message="Notices created by teachers appear here." />
      ) : (
        <ul>
          {filtered.map((n) => (
            <li key={n.id} className="border-b border-black/5 py-3 last:border-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{n.title_en}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-text/65">{n.content_en}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text/45">
                    <span>{classLabel(classes, (classes ?? []).flatMap((c) => c.sections), n.class_id, n.section_id)}</span>
                    <span>by {authorName(n.created_by)}</span>
                    <span>{formatDate(n.created_at)}</span>
                    <Pill tone={n.is_deleted ? 'neutral' : n.is_published ? 'ok' : 'warn'}>
                      {n.is_deleted ? 'archived' : n.is_published ? 'published' : 'draft'}
                    </Pill>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Btn onClick={() => setEditing(editing?.id === n.id ? null : n)}>{editing?.id === n.id ? 'Close' : 'Edit'}</Btn>
                  <Btn
                    variant="danger"
                    onClick={() => action.confirm('Archive this notice?', async () => {
                      const { error } = await supabase.from('class_notices').update({ is_deleted: true, is_published: false }).eq('id', n.id);
                      if (error) throw error;
                      await refresh();
                    }, 'Notice archived.')}
                  >
                    Archive
                  </Btn>
                </div>
              </div>

              {editing?.id === n.id && (
                <ClassNoticeEdit
                  row={n}
                  busy={action.busy}
                  onSave={(patch, msg) =>
                    action.run(async () => {
                      const { error } = await supabase.from('class_notices').update(patch).eq('id', n.id);
                      if (error) throw error;
                      setEditing(null);
                      await refresh();
                    }, msg)
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

function ClassNoticeEdit({
  row,
  busy,
  onSave,
}: {
  row: ClassNoticeRow;
  busy: boolean;
  onSave: (patch: Partial<ClassNoticeRow>, msg: string) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(row.title_en);
  const [content, setContent] = useState(row.content_en ?? '');
  return (
    <div className="mt-3 rounded-lg border border-black/10 bg-surface/50 p-3">
      <Field label="Title"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Content" className="mt-2"><TextArea rows={2} value={content} onChange={(e) => setContent(e.target.value)} /></Field>
      <div className="mt-2 flex flex-wrap gap-2">
        <Btn variant="primary" loading={busy} onClick={() => void onSave({ title_en: title, content_en: content }, 'Notice updated.')}>Save</Btn>
        <Btn loading={busy} onClick={() => void onSave({ is_deleted: false, is_published: true }, 'Notice restored.')}>Restore &amp; publish</Btn>
      </div>
    </div>
  );
}

/** ---------------------------------------------------------------------------
 * All Homework — school-wide viewer for the principal.
 * ------------------------------------------------------------------------- */
interface HomeworkRow {
  id: string;
  class_id: string;
  section_id: string | null;
  subject: string | null;
  homework_date: string;
  notes_en: string | null;
  images: { path: string; url: string }[];
  attachments: { path: string; url: string; name?: string }[];
  is_published: boolean;
  is_draft: boolean;
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
}

export function HomeworkAdminPanel() {
  const qc = useQueryClient();
  const action = useAction();
  const { data: classes } = useClasses();
  const [pick, setPick] = useState({ classId: '', sectionId: '' });
  const [date, setDate] = useState('');
  const [editing, setEditing] = useState<HomeworkRow | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['homework-admin'],
    queryFn: async (): Promise<HomeworkRow[]> => {
      const { data, error } = await supabase
        .from('homework_uploads')
        .select('*')
        .order('homework_date', { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data as HomeworkRow[]) ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['homework-admin'] });

  const filtered = (rows ?? []).filter((r) => {
    if (pick.classId && r.class_id !== pick.classId) return false;
    if (pick.sectionId && r.section_id !== pick.sectionId) return false;
    if (date && r.homework_date !== date) return false;
    return true;
  });

  // Missing entries: assigned class/sections with no homework on the chosen date.
  const missing = date && pick.classId
    ? (classes ?? []).filter((c) => c.id === pick.classId).flatMap((c) =>
        c.sections.filter((s) => !pick.sectionId || s.id === pick.sectionId).filter(
          (s) => !(rows ?? []).some((r) => r.class_id === c.id && r.section_id === s.id && r.homework_date === date && !r.is_deleted),
        ).map((s) => `${c.name === 'Nursery' ? 'Nursery' : `Class ${c.name}`} · ${s.name}`),
      )
    : [];

  if (isLoading) return <Panel title="All homework"><LoadingBlock /></Panel>;

  return (
    <Panel
      title="All homework"
      description="Homework uploaded across the school. Filter by class, section and date; archive anything unsuitable."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <ClassPicker classId={pick.classId} sectionId={pick.sectionId} onChange={setPick} allowAllClasses allowAllSections />
        </div>
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      {missing.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber/15 p-3 text-sm">
          <p className="font-medium text-amber-700">Missing homework for {formatDate(date)}</p>
          <p className="text-text/70">{missing.join(', ')}</p>
        </div>
      )}

      {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
      {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}

      {filtered.length === 0 ? (
        <div className="mt-3"><Empty title="No homework found" message="Try a different class or date." /></div>
      ) : (
        <ul className="mt-3">
          {filtered.map((r) => (
            <li key={r.id} className="border-b border-black/5 py-3 last:border-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-navy">
                    {classLabel(classes, (classes ?? []).flatMap((c) => c.sections), r.class_id, r.section_id)} · {r.subject ?? 'General'}
                  </p>
                  <p className="text-sm text-text/60">{formatDate(r.homework_date)}</p>
                  {r.notes_en && <p className="mt-1 line-clamp-2 text-sm text-text/70">{r.notes_en}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {r.is_draft && <Pill tone="warn">draft</Pill>}
                    {r.is_deleted && <Pill tone="neutral">archived</Pill>}
                    {r.images?.length > 0 && <Pill tone="info">{r.images.length} image(s)</Pill>}
                  </div>
                  {r.images?.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {r.images.map((img, i) => (
                        <a key={i} href={img.url ?? publicUrl('homework', img.path) ?? '#'} target="_blank" rel="noreferrer">
                          <img src={img.url ?? publicUrl('homework', img.path) ?? ''} alt="" className="h-14 w-14 rounded object-cover ring-1 ring-black/10" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Btn onClick={() => setEditing(editing?.id === r.id ? null : r)}>{editing?.id === r.id ? 'Close' : 'Edit'}</Btn>
                  {!r.is_deleted ? (
                    <Btn variant="danger" onClick={() => action.confirm('Archive this homework?', async () => {
                      const { error } = await supabase.from('homework_uploads').update({ is_deleted: true, is_published: false }).eq('id', r.id);
                      if (error) throw error;
                      await refresh();
                    }, 'Homework archived.')}>Archive</Btn>
                  ) : (
                    <Btn onClick={() => action.run(async () => {
                      const { error } = await supabase.from('homework_uploads').update({ is_deleted: false }).eq('id', r.id);
                      if (error) throw error;
                      await refresh();
                    }, 'Homework restored.')}>Restore</Btn>
                  )}
                </div>
              </div>

              {editing?.id === r.id && (
                <div className="mt-3 rounded-lg border border-black/10 bg-surface/50 p-3">
                  <HomeworkNotesEdit row={r} busy={action.busy} onSave={(patch, msg) =>
                    action.run(async () => {
                      const { error } = await supabase.from('homework_uploads').update(patch).eq('id', r.id);
                      if (error) throw error;
                      setEditing(null);
                      await refresh();
                    }, msg)
                  } />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function HomeworkNotesEdit({
  row,
  busy,
  onSave,
}: {
  row: HomeworkRow;
  busy: boolean;
  onSave: (patch: Partial<HomeworkRow>, msg: string) => Promise<boolean>;
}) {
  const [notes, setNotes] = useState(row.notes_en ?? '');
  const [subject, setSubject] = useState(row.subject ?? '');
  return (
    <>
      <Field label="Subject"><TextInput value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
      <Field label="Notes" className="mt-2"><TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <Btn variant="primary" className="mt-2" loading={busy} onClick={() => void onSave({ subject: subject || null, notes_en: notes }, 'Homework updated.')}>Save</Btn>
    </>
  );
}

/** ---------------------------------------------------------------------------
 * Calendar — principal-managed events incl. class-specific & visibility.
 * ------------------------------------------------------------------------- */
interface EventRow {
  id: string;
  title_en: string;
  desc_en: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  class_id: string | null;
  section_id: string | null;
  visibility: string;
  location: string | null;
  is_published: boolean;
}

export function CalendarPanel() {
  const qc = useQueryClient();
  const action = useAction();
  const { data: classes } = useClasses();
  const [form, setForm] = useState({
    title_en: '', desc_en: '', event_type: 'Holiday', start_date: '', end_date: '',
    classId: '', sectionId: '', visibility: 'public', location: '',
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar-admin'],
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_date', { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data as EventRow[]) ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['calendar-admin'] });

  async function add() {
    if (!form.title_en.trim() || !form.start_date) {
      action.setError('A title and start date are required.');
      return;
    }
    const ok = await action.run(async () => {
      const { error } = await supabase.from('calendar_events').insert({
        title_en: form.title_en.trim(),
        desc_en: form.desc_en || null,
        event_type: form.event_type,
        start_date: form.start_date,
        end_date: form.end_date || null,
        class_id: form.classId || null,
        section_id: form.sectionId || null,
        visibility: form.visibility,
        location: form.location || null,
        is_published: true,
      });
      if (error) throw error;
      await refresh();
    }, 'Event added.');
    if (ok) setForm({ ...form, title_en: '', desc_en: '', start_date: '', end_date: '', location: '' });
  }

  async function patch(id: string, p: Partial<EventRow>, msg: string) {
    await action.run(async () => {
      const { error } = await supabase.from('calendar_events').update(p).eq('id', id);
      if (error) throw error;
      await refresh();
    }, msg);
  }

  if (isLoading) return <Panel title="Calendar"><LoadingBlock /></Panel>;

  return (
    <div className="grid gap-4">
      <Panel title="Add calendar entry" description="Holidays, exams, events, admission dates and parent meetings.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title"><TextInput value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} /></Field>
          <Field label="Type">
            <Select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Start date"><TextInput type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
          <Field label="End date"><TextInput type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
          <Field label="Location"><TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="Visibility">
            <Select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
              <option value="public">Public</option>
              <option value="internal">Internal</option>
            </Select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <TextArea rows={2} value={form.desc_en} onChange={(e) => setForm({ ...form, desc_en: e.target.value })} />
          </Field>
        </div>
        <div className="mt-3">
          <p className="text-sm font-medium text-text/80">Class-specific (optional)</p>
          <ClassPicker classId={form.classId} sectionId={form.sectionId} onChange={(v) => setForm({ ...form, classId: v.classId, sectionId: v.sectionId })} allowAllClasses allowAllSections />
        </div>
        {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
        {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}
        <Btn variant="primary" className="mt-3" loading={action.busy} onClick={() => void add()}>Add event</Btn>
      </Panel>

      <Panel title="Calendar entries">
        {(events ?? []).length === 0 ? (
          <Empty title="No events" message="Add holidays, exams and events above." />
        ) : (
          <ul>
            {(events ?? []).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 py-2.5 last:border-0">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{e.title_en}</p>
                  <p className="text-xs text-text/50">
                    {e.event_type} · {formatDate(e.start_date)}{e.end_date ? ` – ${formatDate(e.end_date)}` : ''} · {e.visibility}
                    {e.class_id ? ` · ${classLabel(classes, (classes ?? []).flatMap((c) => c.sections), e.class_id, e.section_id)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={e.is_published ? 'ok' : 'warn'}>{e.is_published ? 'published' : 'unpublished'}</Pill>
                  <Btn onClick={() => void patch(e.id, { is_published: !e.is_published }, e.is_published ? 'Entry unpublished.' : 'Entry published.')}>
                    {e.is_published ? 'Unpublish' : 'Publish'}
                  </Btn>
                  <Btn variant="danger" onClick={() => action.confirm('Delete this entry?', async () => {
                    const { error } = await supabase.from('calendar_events').delete().eq('id', e.id);
                    if (error) throw error;
                    await refresh();
                  }, 'Entry deleted.')}>Delete</Btn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/** ---------------------------------------------------------------------------
 * Resources — uploads, external links, audience, class assignment, archive.
 * ------------------------------------------------------------------------- */
interface ResourceRow {
  id: string;
  title_en: string;
  desc_en: string | null;
  category: string;
  audience: string;
  class_id: string | null;
  section_id: string | null;
  file_path: string | null;
  external_url: string | null;
  is_published: boolean;
  is_public: boolean;
  is_archived: boolean;
}

export function ResourcesPanel() {
  const qc = useQueryClient();
  const action = useAction();
  const { data: classes } = useClasses();
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({
    title_en: '', desc_en: '', category: 'Syllabus', audience: 'public', classId: '', sectionId: '', external_url: '', file_path: '',
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ['resources-admin'],
    queryFn: async (): Promise<ResourceRow[]> => {
      const { data, error } = await supabase.from('resources').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data as ResourceRow[]) ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['resources-admin'] });

  async function upload(file: File | undefined) {
    if (!file) return;
    await action.run(async () => {
      const asset = await uploadDocument('resources-public', 'files', file);
      setForm((f) => ({ ...f, file_path: asset.path }));
    }, 'File uploaded.');
  }

  async function add() {
    if (!form.title_en.trim()) {
      action.setError('A title is required.');
      return;
    }
    if (!form.file_path && !form.external_url.trim()) {
      action.setError('Add a file or an external link.');
      return;
    }
    const ok = await action.run(async () => {
      const { error } = await supabase.from('resources').insert({
        title_en: form.title_en.trim(),
        desc_en: form.desc_en || null,
        category: form.category,
        audience: form.audience,
        is_public: form.audience === 'public',
        class_id: form.classId || null,
        section_id: form.sectionId || null,
        file_path: form.file_path || null,
        external_url: form.external_url || null,
        is_published: true,
      });
      if (error) throw error;
      await refresh();
    }, 'Resource added.');
    if (ok) setForm({ ...form, title_en: '', desc_en: '', external_url: '', file_path: '' });
  }

  async function patch(id: string, p: Partial<ResourceRow>, msg: string) {
    await action.run(async () => {
      const { error } = await supabase.from('resources').update(p).eq('id', id);
      if (error) throw error;
      await refresh();
    }, msg);
  }

  const filtered = (rows ?? []).filter((r) => !q || r.title_en.toLowerCase().includes(q.toLowerCase()));
  const bucket = (r: ResourceRow) => (r.audience === 'public' ? 'resources-public' : 'resources-private');

  if (isLoading) return <Panel title="Resources"><LoadingBlock /></Panel>;

  return (
    <div className="grid gap-4">
      <Panel title="Add resource" description="Upload a file or link an external resource; choose who can see it.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title"><TextInput value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} /></Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {RESOURCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <TextArea rows={2} value={form.desc_en} onChange={(e) => setForm({ ...form, desc_en: e.target.value })} />
          </Field>
          <Field label="Audience">
            <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              <option value="public">Public</option>
              <option value="internal">Internal (staff)</option>
            </Select>
          </Field>
          <Field label="External link (optional)">
            <TextInput value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} placeholder="https://" />
          </Field>
        </div>
        <div className="mt-3">
          <ClassPicker classId={form.classId} sectionId={form.sectionId} onChange={(v) => setForm({ ...form, classId: v.classId, sectionId: v.sectionId })} allowAllClasses allowAllSections />
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,image/*" className="sr-only" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Btn icon={<Paperclip className="h-4 w-4" aria-hidden />} onClick={() => fileRef.current?.click()}>{form.file_path ? 'Replace file' : 'Choose file'}</Btn>
          {form.file_path && <Pill tone="info">file ready</Pill>}
        </div>
        {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
        {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}
        <Btn variant="primary" className="mt-3" loading={action.busy} onClick={() => void add()}>Add resource</Btn>
      </Panel>

      <Panel title="Resources" actions={<TextInput placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="sm:w-48" />}>
        {filtered.length === 0 ? (
          <Empty title="No resources" message="Add syllabus, forms and circulars above." />
        ) : (
          <ul>
            {filtered.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 py-2.5 last:border-0">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{r.title_en}</p>
                  <p className="text-xs text-text/50">
                    {r.category} · {r.audience}
                    {r.class_id ? ` · ${classLabel(classes, (classes ?? []).flatMap((c) => c.sections), r.class_id, r.section_id)}` : ''}
                  </p>
                  {r.file_path && (
                    <a className="text-xs text-navy underline" href={publicUrl(bucket(r), r.file_path) ?? '#'} target="_blank" rel="noreferrer">Open file</a>
                  )}
                  {r.external_url && (
                    <a className="ml-2 text-xs text-navy underline" href={r.external_url} target="_blank" rel="noreferrer">Link</a>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={r.is_archived ? 'neutral' : r.is_published ? 'ok' : 'warn'}>
                    {r.is_archived ? 'archived' : r.is_published ? 'published' : 'draft'}
                  </Pill>
                  {!r.is_archived ? (
                    <>
                      <Btn onClick={() => void patch(r.id, { is_published: !r.is_published }, 'Resource updated.')}>
                        {r.is_published ? 'Unpublish' : 'Publish'}
                      </Btn>
                      <Btn variant="danger" onClick={() => action.confirm('Archive this resource?', async () => {
                        const { error } = await supabase.from('resources').update({ is_archived: true, is_published: false }).eq('id', r.id);
                        if (error) throw error;
                        await refresh();
                      }, 'Resource archived.')}>Archive</Btn>
                    </>
                  ) : (
                    <Btn onClick={() => void patch(r.id, { is_archived: false }, 'Resource restored.')}>Restore</Btn>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
