import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, GraduationCap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthProvider';
import { useClasses } from '@/lib/hooks/useClasses';
import { publicUrl, removeObject, uploadDocument } from '@/lib/uploads';
import { ImageUploadField, type UploadedImage } from '@/components/admin/ImageUploadField';
import { classLabel } from '@/components/admin/ClassPicker';
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

interface Assignment {
  class_id: string;
  section_id: string | null;
  classes: { name: string } | null;
  sections: { name: string } | null;
}

/** The signed-in teacher's class assignments (RLS limits these to their own). */
function useAssignments() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['my-assignments', uid],
    enabled: !!uid,
    queryFn: async (): Promise<Assignment[]> => {
      const { data, error } = await supabase
        .from('teacher_class_assignments')
        .select('class_id, section_id, classes(name), sections(name)')
        .eq('user_id', uid);
      if (error) throw error;
      return (data as unknown as Assignment[]) ?? [];
    },
  });
}

function labelFor(a: Assignment): string {
  const c = a.classes?.name ? (a.classes.name === 'Nursery' ? 'Nursery' : `Class ${a.classes.name}`) : 'Class';
  return a.sections?.name ? `${c} · ${a.sections.name}` : c;
}

/** ---------------------------------------------------------------------------
 * My classes — useful assigned-class display with quick links and empty state.
 * ------------------------------------------------------------------------- */
export function MyClassesPanel({ onGo }: { onGo: (id: string) => void }) {
  const { data: assignments, isLoading } = useAssignments();
  const { data: perms } = useQuery({
    queryKey: ['my-perms'],
    queryFn: async () => {
      const { data } = await supabase.from('teacher_permissions').select('*').maybeSingle();
      return data as
        | { can_public_notices: boolean; can_birthdays: boolean; can_resources: boolean; can_spotlight: boolean }
        | null;
    },
  });

  if (isLoading) return <Panel title="My classes"><LoadingBlock /></Panel>;

  const permsList = perms
    ? ([
        perms.can_public_notices && 'Public notices',
        perms.can_birthdays && 'Birthdays',
        perms.can_resources && 'Resources',
        perms.can_spotlight && 'Student of the Month',
      ].filter(Boolean) as string[])
    : [];

  const quick: [string, string][] = [
    ['homework', 'Upload homework'],
    ['classnotices', 'Post a class notice'],
    ['leave', 'Request leave'],
    ['noticeboard', 'Staff notices'],
  ];

  return (
    <div className="grid gap-4">
      <Panel title="Your access" description="Only the classes assigned to you are visible anywhere in this dashboard.">
        {permsList.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-text/60">Extra permissions:</span>
            {permsList.map((p) => <Pill key={p} tone="info">{p}</Pill>)}
          </div>
        )}

        {(assignments ?? []).length === 0 ? (
          <Empty
            title="No class assigned yet"
            message="The principal must assign you a class before you can upload homework or post notices. Please contact the school office."
            action={<Link className="btn-secondary" to="/">Back to site</Link>}
          />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {(assignments ?? []).map((a, i) => (
              <li key={i} className="flex items-center gap-3 rounded-lg border border-black/10 bg-surface/50 p-3">
                <GraduationCap className="h-5 w-5 shrink-0 text-navy" aria-hidden />
                <span className="min-w-0 font-medium text-navy">{labelFor(a)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {quick.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onGo(id)}
              disabled={(assignments ?? []).length === 0}
              className="rounded-lg border border-black/10 px-3 py-2 text-sm text-navy transition hover:border-navy hover:bg-surface disabled:opacity-40"
            >
              {label}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/** ---------------------------------------------------------------------------
 * Daily Homework Uploader.
 * ------------------------------------------------------------------------- */
interface HomeworkRow {
  id: string;
  class_id: string;
  section_id: string | null;
  subject: string | null;
  title: string | null;
  homework_date: string;
  notes_en: string | null;
  notes_hi: string | null;
  images: UploadedImage[];
  attachments: { path: string; url: string | null; name: string }[];
  is_published: boolean;
  is_draft: boolean;
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
}

export function HomeworkPanel() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user.id;
  const action = useAction();
  const { data: classes } = useClasses();
  const { data: assignments } = useAssignments();

  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState('');
  const [en, setEn] = useState('');
  const [hi, setHi] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [attachments, setAttachments] = useState<{ path: string; url: string | null; name: string }[]>([]);
  const [filterClass, setFilterClass] = useState('');
  const docRef = useRef<HTMLInputElement>(null);

  const assignedClassIds = Array.from(new Set((assignments ?? []).map((a) => a.class_id)));
  const assignedClasses = (classes ?? []).filter((c) => assignedClassIds.includes(c.id));
  const selectedClass = assignedClasses.find((c) => c.id === classId);
  const allowedSections = (selectedClass?.sections ?? []).filter((s) =>
    (assignments ?? []).some((a) => a.class_id === classId && (a.section_id === s.id || a.section_id === null)),
  );

  const { data: rows, isLoading } = useQuery({
    queryKey: ['homework-mine'],
    queryFn: async (): Promise<HomeworkRow[]> => {
      const { data, error } = await supabase
        .from('homework_uploads')
        .select('*')
        .order('homework_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as HomeworkRow[]) ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['homework-mine'] });

  async function uploadDoc(file: File | undefined) {
    if (!file) return;
    await action.run(async () => {
      const asset = await uploadDocument('homework', `docs/${classId || 'misc'}`, file);
      setAttachments((prev) => [...prev, { path: asset.path, url: asset.publicUrl, name: file.name }]);
    }, 'Attachment uploaded.');
  }

  async function save(publish: boolean) {
    if (!uid) return;
    if (!classId || !date || !subject.trim()) {
      action.setError('Choose a class, a subject and a date.');
      return;
    }
    if (!selectedClass?.requires_section && !sectionId) {
      // Nursery has no sections; that is fine.
    }
    const ok = await action.run(async () => {
      const { error } = await supabase.from('homework_uploads').insert({
        class_id: classId,
        section_id: sectionId || null,
        subject: subject.trim(),
        title: title.trim() || null,
        homework_date: date,
        notes_en: en || null,
        notes_hi: hi || null,
        images,
        attachments,
        is_published: publish,
        is_draft: !publish,
        created_by: uid,
      });
      if (error) throw error;
      await refresh();
    }, publish ? 'Homework published.' : 'Draft saved.');
    if (ok) {
      setSubject('');
      setTitle('');
      setEn('');
      setHi('');
      setImages([]);
      setAttachments([]);
    }
  }

  async function archive(row: HomeworkRow) {
    await action.confirm('Archive this homework?', async () => {
      const { error } = await supabase.from('homework_uploads').update({ is_deleted: true, is_published: false }).eq('id', row.id);
      if (error) throw error;
      await refresh();
    }, 'Homework archived.');
  }

  const filtered = (rows ?? []).filter((r) => !filterClass || r.class_id === filterClass);

  if (isLoading) return <Panel title="Homework"><LoadingBlock /></Panel>;

  return (
    <div className="grid gap-4">
      <Panel title="Upload homework" description="Photos of the notebook are compressed automatically. Add English and Hindi notes.">
        {(assignments ?? []).length === 0 ? (
          <Empty title="No class assigned" message="Ask the principal to assign you a class before uploading homework." />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Class">
                <Select value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}>
                  <option value="">Select a class</option>
                  {assignedClasses.map((c) => <option key={c.id} value={c.id}>{c.name === 'Nursery' ? 'Nursery' : `Class ${c.name}`}</option>)}
                </Select>
              </Field>
              {selectedClass?.requires_section && (
                <Field label="Section">
                  <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                    <option value="">All my sections</option>
                    {allowedSections.map((s) => <option key={s.id} value={s.id}>Section {s.name}</option>)}
                  </Select>
                </Field>
              )}
              <Field label="Subject"><TextInput value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Maths" /></Field>
              <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label="Title (optional)"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Notes (English)"><TextArea rows={3} value={en} onChange={(e) => setEn(e.target.value)} /></Field>
              <Field label="Notes (Hindi)"><TextArea rows={3} value={hi} onChange={(e) => setHi(e.target.value)} /></Field>
            </div>
            <div className="mt-3">
              <ImageUploadField
                bucket="homework"
                folder={`${classId || 'unassigned'}/${sectionId || 'all'}/${date}`}
                value={images}
                onChange={setImages}
                max={6}
                label="Homework photos"
              />
            </div>
            <div className="mt-3">
              <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.txt,image/*" className="sr-only" onChange={(e) => { void uploadDoc(e.target.files?.[0]); e.target.value = ''; }} />
              <Btn icon={<FileText className="h-4 w-4" aria-hidden />} onClick={() => docRef.current?.click()}>Attach a document</Btn>
              {attachments.length > 0 && (
                <ul className="mt-2 text-sm">
                  {attachments.map((a) => (
                    <li key={a.path} className="flex items-center justify-between gap-2">
                      <span className="truncate">{a.name}</span>
                      <button
                        type="button"
                        className="text-danger"
                        onClick={() => { setAttachments((prev) => prev.filter((x) => x.path !== a.path)); void removeObject('homework', a.path); }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
            {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn variant="primary" loading={action.busy} onClick={() => void save(true)}>Publish homework</Btn>
              <Btn loading={action.busy} onClick={() => void save(false)}>Save draft</Btn>
            </div>
          </>
        )}
      </Panel>

      <Panel
        title="Previous homework"
        description="You can edit or archive only the homework you uploaded. The principal can moderate everything."
        actions={
          <Select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-44">
            <option value="">All classes</option>
            {assignedClasses.map((c) => <option key={c.id} value={c.id}>{c.name === 'Nursery' ? 'Nursery' : `Class ${c.name}`}</option>)}
          </Select>
        }
      >
        {filtered.length === 0 ? (
          <Empty title="No homework yet" message="Published homework appears here, newest first." />
        ) : (
          <ul>
            {filtered.map((r) => {
              const mine = r.created_by === uid;
              return (
                <li key={r.id} className="border-b border-black/5 py-3 last:border-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-navy">
                        {classLabel(classes, (classes ?? []).flatMap((c) => c.sections), r.class_id, r.section_id)} · {r.subject ?? 'General'}
                      </p>
                      <p className="text-xs text-text/50">
                        {formatDate(r.homework_date)} · {mine ? 'your upload' : 'uploaded by another teacher'}
                        {r.is_draft ? ' · draft' : ''}{r.is_deleted ? ' · archived' : ''}
                      </p>
                      {r.notes_en && <p className="mt-1 line-clamp-2 text-sm text-text/70">{r.notes_en}</p>}
                      {r.images?.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {r.images.map((img, i) => (
                            <a key={i} href={img.url || publicUrl('homework', img.path) || '#'} target="_blank" rel="noreferrer">
                              <img src={img.url || publicUrl('homework', img.path) || ''} alt="" className="h-12 w-12 rounded object-cover ring-1 ring-black/10" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    {mine && !r.is_deleted && (
                      <div className="flex flex-wrap gap-2">
                        <Btn onClick={() => action.run(async () => {
                          const { error } = await supabase.from('homework_uploads').update({ is_published: true, is_draft: false }).eq('id', r.id);
                          if (error) throw error;
                          await refresh();
                        }, 'Homework published.')}>Publish</Btn>
                        <Btn variant="danger" onClick={() => void archive(r)}>Archive</Btn>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/** ---------------------------------------------------------------------------
 * Class Notices — teachers post for their own classes.
 * ------------------------------------------------------------------------- */
export function ClassNoticesTeacherPanel() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user.id;
  const action = useAction();
  const { data: classes } = useClasses();
  const { data: assignments } = useAssignments();
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [expiry, setExpiry] = useState('');

  const assignedClassIds = Array.from(new Set((assignments ?? []).map((a) => a.class_id)));
  const assignedClasses = (classes ?? []).filter((c) => assignedClassIds.includes(c.id));
  const selectedClass = assignedClasses.find((c) => c.id === classId);

  const { data: notices, isLoading } = useQuery({
    queryKey: ['class-notices-teacher'],
    queryFn: async () => {
      const { data, error } = await supabase.from('class_notices').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['class-notices-teacher'] });

  async function save(publish: boolean) {
    if (!uid) return;
    if (!classId || !title.trim()) {
      action.setError('Choose a class and enter a title.');
      return;
    }
    const ok = await action.run(async () => {
      const { error } = await supabase.from('class_notices').insert({
        class_id: classId,
        section_id: sectionId || null,
        title_en: title.trim(),
        content_en: content || null,
        expiry_date: expiry || null,
        is_published: publish,
        created_by: uid,
      });
      if (error) throw error;
      await refresh();
    }, publish ? 'Notice published.' : 'Draft saved.');
    if (ok) { setTitle(''); setContent(''); setExpiry(''); }
  }

  if (isLoading) return <Panel title="Class notices"><LoadingBlock /></Panel>;

  return (
    <div className="grid gap-4">
      <Panel title="Post a class notice" description="Only your assigned classes can receive a notice.">
        {(assignments ?? []).length === 0 ? (
          <Empty title="No class assigned" message="Ask the principal to assign you a class." />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Class">
                <Select value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}>
                  <option value="">Select a class</option>
                  {assignedClasses.map((c) => <option key={c.id} value={c.id}>{c.name === 'Nursery' ? 'Nursery' : `Class ${c.name}`}</option>)}
                </Select>
              </Field>
              {selectedClass?.requires_section && (
                <Field label="Section">
                  <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                    <option value="">All my sections</option>
                    {selectedClass.sections
                      .filter((s) => (assignments ?? []).some((a) => a.class_id === classId && (a.section_id === s.id || a.section_id === null)))
                      .map((s) => <option key={s.id} value={s.id}>Section {s.name}</option>)}
                  </Select>
                </Field>
              )}
              <Field label="Expiry date"><TextInput type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></Field>
            </div>
            <Field label="Title" className="mt-3"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Details" className="mt-2"><TextArea rows={3} value={content} onChange={(e) => setContent(e.target.value)} /></Field>
            {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
            {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn variant="primary" loading={action.busy} onClick={() => void save(true)}>Publish notice</Btn>
              <Btn loading={action.busy} onClick={() => void save(false)}>Save draft</Btn>
            </div>
          </>
        )}
      </Panel>

      <Panel title="Your class notices">
        {(notices ?? []).length === 0 ? (
          <Empty title="No notices yet" message="Notices you create appear here." />
        ) : (
          <ul>
            {(notices ?? []).map((n) => {
              const mine = n.created_by === uid;
              return (
                <li key={n.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-black/5 py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium text-navy">{n.title_en}</p>
                    <p className="text-xs text-text/50">
                      {classLabel(classes, (classes ?? []).flatMap((c) => c.sections), n.class_id, n.section_id)}
                      {n.expiry_date ? ` · expires ${formatDate(n.expiry_date)}` : ''}
                    </p>
                    {n.content_en && <p className="mt-1 line-clamp-2 text-sm text-text/70">{n.content_en}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill tone={n.is_deleted ? 'neutral' : n.is_published ? 'ok' : 'warn'}>
                      {n.is_deleted ? 'archived' : n.is_published ? 'published' : 'draft'}
                    </Pill>
                    {mine && !n.is_deleted && (
                      <Btn variant="danger" onClick={() => action.confirm('Archive your notice?', async () => {
                        const { error } = await supabase.from('class_notices').update({ is_deleted: true, is_published: false }).eq('id', n.id);
                        if (error) throw error;
                        await refresh();
                      }, 'Notice archived.')}>Archive</Btn>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/** ---------------------------------------------------------------------------
 * Principal Notice Board — read-only staff notices with "mark as read".
 * ------------------------------------------------------------------------- */
export function NoticeBoardPanel() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user.id;

  const { data: notices, isLoading } = useQuery({
    queryKey: ['internal-notices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_teacher_notices')
        .select('*')
        .eq('state', 'published')
        .eq('is_deleted', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reads } = useQuery({
    queryKey: ['internal-reads', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from('internal_notice_reads').select('notice_id');
      return data ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['internal-reads', uid] });
  const isRead = (id: string) => (reads ?? []).some((r) => r.notice_id === id);

  if (isLoading) return <Panel title="Staff notices"><LoadingBlock /></Panel>;

  return (
    <Panel title="Principal notice board" description="Notices from the principal. You cannot edit these.">
      {(notices ?? []).length === 0 ? (
        <Empty title="No notices" message="Staff notices will appear here." />
      ) : (
        <ul>
          {(notices ?? []).map((n) => (
            <li key={n.id} className="border-b border-black/5 py-3 last:border-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-navy">
                    {n.is_pinned && <span className="mr-1 text-amber-700">📌</span>}
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-sm text-text/70">{n.content}</p>
                  <p className="mt-1 text-xs text-text/45">
                    Published {formatDateTime(n.published_at ?? n.created_at)}
                    {n.expiry_date ? ` · expires ${formatDate(n.expiry_date)}` : ''}
                  </p>
                  {n.attachment_path && (
                    <a className="text-xs text-navy underline" href={publicUrl('internal-notices', n.attachment_path) ?? '#'} target="_blank" rel="noreferrer">
                      Open attachment
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {n.priority && n.priority !== 'normal' && <Pill tone="warn">{n.priority}</Pill>}
                  {isRead(n.id) ? (
                    <Pill tone="ok">read</Pill>
                  ) : (
                    <Btn onClick={() => uid && void supabase.from('internal_notice_reads').upsert({ notice_id: n.id, teacher_id: uid }).then(refresh)}>
                      Mark read
                    </Btn>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** ---------------------------------------------------------------------------
 * Staff Leave Center.
 * ------------------------------------------------------------------------- */
interface LeaveRow {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  created_at: string;
}
interface DecisionRow {
  request_id: string;
  decision: string;
  note: string | null;
  decided_at: string;
}

export function LeaveCenterPanel() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user.id;
  const action = useAction();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');

  const { data: leaves, isLoading } = useQuery({
    queryKey: ['my-leave'],
    queryFn: async (): Promise<LeaveRow[]> => {
      const { data, error } = await supabase.from('teacher_leave_requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data as LeaveRow[]) ?? [];
    },
  });

  const { data: decisions } = useQuery({
    queryKey: ['my-leave-decisions'],
    queryFn: async (): Promise<DecisionRow[]> => {
      const { data } = await supabase.from('leave_decisions').select('request_id, decision, note, decided_at');
      return (data as DecisionRow[]) ?? [];
    },
  });

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['my-leave'] }),
      qc.invalidateQueries({ queryKey: ['my-leave-decisions'] }),
    ]);
  };

  async function submit() {
    if (!uid || !start || !end) {
      action.setError('Choose a start and end date.');
      return;
    }
    if (end < start) {
      action.setError('The end date cannot be before the start date.');
      return;
    }
    const ok = await action.run(async () => {
      const { error } = await supabase.from('teacher_leave_requests').insert({
        teacher_id: uid,
        start_date: start,
        end_date: end,
        reason: reason || null,
      });
      if (error) throw error;
      await refresh();
    }, 'Leave request submitted.');
    if (ok) { setStart(''); setEnd(''); setReason(''); }
  }

  if (isLoading) return <Panel title="Leave"><LoadingBlock /></Panel>;

  return (
    <div className="grid gap-4">
      <Panel title="Request leave" description="Your reason is private — only the principal can read it.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From"><TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="To"><TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          <Field label="Private reason" className="sm:col-span-2"><TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        </div>
        {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
        {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}
        <Btn variant="primary" className="mt-3" loading={action.busy} onClick={() => void submit()}>Submit request</Btn>
      </Panel>

      <Panel title="My leave requests">
        {(leaves ?? []).length === 0 ? (
          <Empty title="No requests yet" message="Your leave requests and the principal's decision appear here." />
        ) : (
          <ul>
            {(leaves ?? []).map((l) => {
              const decision = (decisions ?? []).find((d) => d.request_id === l.id);
              return (
                <li key={l.id} className="border-b border-black/5 py-3 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-navy">{formatDate(l.start_date)} → {formatDate(l.end_date)}</p>
                      {l.reason && <p className="text-sm text-text/60">{l.reason}</p>}
                      {decision?.note && <p className="mt-1 text-sm text-text/70">Principal: {decision.note}</p>}
                      {decision && <p className="text-xs text-text/45">Decided {formatDateTime(decision.decided_at)}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Pill tone={l.status === 'Approved' ? 'ok' : l.status === 'Rejected' ? 'danger' : l.status === 'Cancelled' ? 'neutral' : 'warn'}>
                        {l.status}
                      </Pill>
                      {l.status === 'Pending' && (
                        <Btn variant="danger" onClick={() => action.confirm('Cancel this leave request?', async () => {
                          const { error } = await supabase.from('teacher_leave_requests').update({ status: 'Cancelled' }).eq('id', l.id);
                          if (error) throw error;
                          await refresh();
                        }, 'Request cancelled.')}>Cancel</Btn>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/** ---------------------------------------------------------------------------
 * Birthday Management — upcoming birthdays for assigned classes.
 * ------------------------------------------------------------------------- */
interface BirthdayRow {
  id: string;
  display_name: string;
  class_id: string | null;
  section_id: string | null;
  dob: string;
  publish_mode: string;
  is_active: boolean;
}

export function BirthdaysPanel() {
  const qc = useQueryClient();
  const action = useAction();
  const { data: perms } = useQuery({
    queryKey: ['my-perms'],
    queryFn: async () => {
      const { data } = await supabase.from('teacher_permissions').select('*').maybeSingle();
      return data as { can_birthdays: boolean } | null;
    },
  });
  const { data: classes } = useClasses();
  const { data: assignments } = useAssignments();
  const [sel, setSel] = useState({ classId: '', sectionId: '' });
  const [form, setForm] = useState({ name: '', dob: '' });

  const permitted = !!perms?.can_birthdays;
  const assignedClassIds = Array.from(new Set((assignments ?? []).map((a) => a.class_id)));

  const { data: rows, isLoading } = useQuery({
    queryKey: ['birthdays'],
    enabled: permitted,
    queryFn: async (): Promise<BirthdayRow[]> => {
      const { data, error } = await supabase.from('birthday_profiles').select('*').eq('is_active', true);
      if (error) throw error;
      return (data as BirthdayRow[]) ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['birthdays'] });

  const today = new Date();
  const upcoming = (rows ?? [])
    .filter((r) => assignedClassIds.includes(r.class_id ?? ''))
    .map((r) => {
      const d = new Date(r.dob);
      const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      return { ...r, next };
    })
    .sort((a, b) => a.next.getTime() - b.next.getTime());

  async function add() {
    if (!form.name.trim() || !form.dob) {
      action.setError('A name and date of birth are required.');
      return;
    }
    const ok = await action.run(async () => {
      const { error } = await supabase.from('birthday_profiles').insert({
        display_name: form.name.trim(),
        dob: form.dob,
        class_id: sel.classId || null,
        section_id: sel.sectionId || null,
        publish_mode: 'none',
      });
      if (error) throw error;
      await refresh();
    }, 'Birthday added.');
    if (ok) setForm({ name: '', dob: '' });
  }

  if (isLoading) return <Panel title="Birthdays"><LoadingBlock /></Panel>;

  if (!permitted) {
    return (
      <Panel title="Birthday management">
        <Empty title="Permission needed" message="The principal must grant you the birthdays permission before you can manage them." />
      </Panel>
    );
  }

  return (
    <div className="grid gap-4">
      <Panel title="Upcoming birthdays" description="Birthdays for your assigned classes. Dates of birth are never shown publicly.">
        {upcoming.length === 0 ? (
          <Empty title="No birthdays recorded" message="Add birthday information below." />
        ) : (
          <ul>
            {upcoming.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 py-2.5 last:border-0">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{r.display_name}</p>
                  <p className="text-xs text-text/50">
                    {classLabel(classes, (classes ?? []).flatMap((c) => c.sections), r.class_id, r.section_id)} · {formatDate(r.next.toISOString())}
                  </p>
                </div>
                <Pill tone="info">{r.publish_mode === 'none' ? 'private' : r.publish_mode}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Add or correct a birthday" description="Publishing photos still requires the principal's review.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Student display name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Date of birth"><TextInput type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
          <Field label="Class">
            <Select value={sel.classId} onChange={(e) => setSel({ classId: e.target.value, sectionId: '' })}>
              <option value="">Select a class</option>
              {(classes ?? []).filter((c) => assignedClassIds.includes(c.id)).map((c) => (
                <option key={c.id} value={c.id}>{c.name === 'Nursery' ? 'Nursery' : `Class ${c.name}`}</option>
              ))}
            </Select>
          </Field>
        </div>
        {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
        {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}
        <Btn variant="primary" className="mt-3" loading={action.busy} onClick={() => void add()}>Add birthday</Btn>
      </Panel>
    </div>
  );
}

/** ---------------------------------------------------------------------------
 * Student of the Month — submit for approval, withdraw before approval.
 * ------------------------------------------------------------------------- */
interface SpotlightRow {
  id: string;
  award_title: string;
  display_name: string;
  class_id: string | null;
  section_id: string | null;
  photo_path: string | null;
  reason: string | null;
  month: number | null;
  year: number | null;
  status: string;
  consent: boolean;
  rejection_note: string | null;
  created_by: string | null;
}

export function SpotlightPanel() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user.id;
  const action = useAction();
  const { data: perms } = useQuery({
    queryKey: ['my-perms'],
    queryFn: async () => {
      const { data } = await supabase.from('teacher_permissions').select('*').maybeSingle();
      return data as { can_spotlight: boolean } | null;
    },
  });
  const { data: classes } = useClasses();
  const { data: assignments } = useAssignments();
  const permitted = !!perms?.can_spotlight;

  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [name, setName] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [reason, setReason] = useState('');
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<UploadedImage[]>([]);

  const assignedClassIds = Array.from(new Set((assignments ?? []).map((a) => a.class_id)));
  const assignedClasses = (classes ?? []).filter((c) => assignedClassIds.includes(c.id));
  const selectedClass = assignedClasses.find((c) => c.id === classId);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['my-spotlights'],
    enabled: permitted,
    queryFn: async (): Promise<SpotlightRow[]> => {
      const { data, error } = await supabase.from('student_spotlights').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data as SpotlightRow[]) ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['my-spotlights'] });

  async function submit(status: 'draft' | 'submitted') {
    if (!uid) return;
    if (!classId || !name.trim() || !month || !year) {
      action.setError('Choose a class, student name, month and year.');
      return;
    }
    const ok = await action.run(async () => {
      const { error } = await supabase.from('student_spotlights').insert({
        award_title: 'Student of the Month',
        display_name: name.trim(),
        class_id: classId,
        section_id: sectionId || null,
        month: Number(month),
        year: Number(year),
        reason: reason || null,
        writeup_en: reason || null,
        photo_path: photo[0]?.path ?? null,
        consent,
        status,
        is_published: false,
        created_by: uid,
      });
      if (error) throw error;
      await refresh();
    }, status === 'submitted' ? 'Submitted for approval.' : 'Draft saved.');
    if (ok) { setName(''); setReason(''); setPhoto([]); setConsent(false); }
  }

  async function withdraw(row: SpotlightRow) {
    await action.confirm('Withdraw this submission?', async () => {
      const { error } = await supabase.from('student_spotlights').update({ status: 'draft' }).eq('id', row.id);
      if (error) throw error;
      await removeObject('spotlight', row.photo_path);
      await refresh();
    }, 'Withdrawn to draft.');
  }

  if (isLoading) return <Panel title="Student of the Month"><LoadingBlock /></Panel>;

  if (!permitted) {
    return (
      <Panel title="Student of the Month">
        <Empty title="Permission needed" message="The principal must grant you the Student of the Month permission." />
      </Panel>
    );
  }

  return (
    <div className="grid gap-4">
      <Panel title="Nominate a student" description="One entry per class, section, month and year. The principal approves before anything is published.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Class">
            <Select value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}>
              <option value="">Select a class</option>
              {assignedClasses.map((c) => <option key={c.id} value={c.id}>{c.name === 'Nursery' ? 'Nursery' : `Class ${c.name}`}</option>)}
            </Select>
          </Field>
          {selectedClass?.requires_section && (
            <Field label="Section">
              <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">Select a section</option>
                {selectedClass.sections
                  .filter((s) => (assignments ?? []).some((a) => a.class_id === classId && (a.section_id === s.id || a.section_id === null)))
                  .map((s) => <option key={s.id} value={s.id}>Section {s.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Student name"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Month">
            <Select value={month} onChange={(e) => setMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Year"><TextInput type="number" value={year} onChange={(e) => setYear(e.target.value)} /></Field>
          <Field label="Reason / achievement" className="sm:col-span-2">
            <TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3">
          <ImageUploadField bucket="spotlight" folder="photos" value={photo} onChange={setPhoto} multiple={false} max={1} label="Photo (optional)" />
        </div>
        <div className="mt-2">
          <Checkbox
            label="I confirm written parental consent to publish the student's name and photograph."
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
        </div>
        {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
        {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn variant="primary" loading={action.busy} disabled={!consent} onClick={() => void submit('submitted')}>Submit for approval</Btn>
          <Btn loading={action.busy} onClick={() => void submit('draft')}>Save draft</Btn>
        </div>
      </Panel>

      <Panel title="Your submissions">
        {(rows ?? []).length === 0 ? (
          <Empty title="Nothing submitted" message="Your nominations and their status appear here." />
        ) : (
          <ul>
            {(rows ?? []).map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-black/5 py-3 last:border-0">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{r.display_name} · {r.month}/{r.year}</p>
                  <p className="text-xs text-text/50">{classLabel(classes, (classes ?? []).flatMap((c) => c.sections), r.class_id, r.section_id)}</p>
                  {r.reason && <p className="mt-1 line-clamp-2 text-sm text-text/70">{r.reason}</p>}
                  {r.rejection_note && <p className="mt-1 text-sm text-danger">Principal: {r.rejection_note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={r.status === 'published' ? 'ok' : r.status === 'rejected' ? 'danger' : 'warn'}>{r.status}</Pill>
                  {(r.status === 'draft' || r.status === 'submitted' || r.status === 'rejected') && (
                    <Btn variant="danger" onClick={() => void withdraw(r)}>Withdraw</Btn>
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

/** A small helper used by the teacher dashboard overview. */
export function TeacherSummary() {
  const { data: assignments } = useAssignments();
  const { data: leave } = useQuery({
    queryKey: ['my-leave'],
    queryFn: async () => {
      const { data } = await supabase.from('teacher_leave_requests').select('status');
      return data ?? [];
    },
  });
  return (
    <Panel title="At a glance">
      <div className="grid gap-3 sm:grid-cols-3">
        <Labeled label="Assigned classes" value={(assignments ?? []).length} />
        <Labeled label="Pending leave" value={(leave ?? []).filter((l) => l.status === 'Pending').length} />
        <Labeled label="Approved leave" value={(leave ?? []).filter((l) => l.status === 'Approved').length} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link className="btn-secondary" to="/">View public site</Link>
      </div>
      <p className="mt-3 flex items-center gap-2 text-sm text-text/60">
        <BookOpen className="h-4 w-4" aria-hidden /> Use the menu to upload homework, post notices and more.
      </p>
    </Panel>
  );
}
