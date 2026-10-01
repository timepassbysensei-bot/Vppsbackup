import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Star, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useClasses } from '@/lib/hooks/useClasses';
import { removeObject } from '@/lib/uploads';
import { ImageUploadField, type UploadedImage } from '@/components/admin/ImageUploadField';
import { classLabel } from '@/components/admin/ClassPicker';
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
  formatDateTime,
  useAction,
} from '@/components/admin/kit';

/** ---------------------------------------------------------------------------
 * Gallery Manager — albums, multi-upload, captions, covers, reorder, publish.
 * ------------------------------------------------------------------------- */
interface Album {
  id: string;
  title_en: string;
  title_hi: string | null;
  description_en: string | null;
  cover_image_id: string | null;
  is_published: boolean;
  archived_at: string | null;
  is_deleted: boolean;
  created_at: string;
}
interface GalleryImage {
  id: string;
  album_id: string;
  storage_path: string;
  caption_en: string | null;
  sort_order: number;
  archived_at: string | null;
  is_deleted: boolean;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  original_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export function GalleryPanel() {
  const qc = useQueryClient();
  const action = useAction();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [pending, setPending] = useState<UploadedImage[]>([]);

  const { data: albums, isLoading } = useQuery({
    queryKey: ['gallery-albums'],
    queryFn: async (): Promise<Album[]> => {
      const { data, error } = await supabase.from('gallery_albums').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Album[]) ?? [];
    },
  });

  const album = (albums ?? []).find((a) => a.id === selected) ?? null;

  const { data: images } = useQuery({
    queryKey: ['gallery-images', selected],
    enabled: !!selected,
    queryFn: async (): Promise<GalleryImage[]> => {
      const { data, error } = await supabase
        .from('gallery_images')
        .select('*')
        .eq('album_id', selected)
        .order('sort_order');
      if (error) throw error;
      return (data as GalleryImage[]) ?? [];
    },
  });

  const refreshAlbums = () => qc.invalidateQueries({ queryKey: ['gallery-albums'] });
  const refreshImages = () => qc.invalidateQueries({ queryKey: ['gallery-images', selected] });

  const filteredAlbums = (albums ?? []).filter((a) => !q || a.title_en.toLowerCase().includes(q.toLowerCase()));

  async function createAlbum() {
    if (!newTitle.trim()) {
      action.setError('An album title is required.');
      return;
    }
    const ok = await action.run(async () => {
      const { error } = await supabase.from('gallery_albums').insert({ title_en: newTitle.trim(), is_published: false });
      if (error) throw error;
      await refreshAlbums();
    }, 'Album created.');
    if (ok) setNewTitle('');
  }

  async function patchAlbum(id: string, p: Partial<Album>, msg: string) {
    await action.run(async () => {
      const { error } = await supabase.from('gallery_albums').update(p).eq('id', id);
      if (error) throw error;
      await refreshAlbums();
    }, msg);
  }

  async function commitImages() {
    if (!album || pending.length === 0) return;
    const base = (images ?? []).reduce((max, i) => Math.max(max, i.sort_order), -1) + 1;
    const ok = await action.run(async () => {
      const rows = pending.map((img, i) => ({
        album_id: album.id,
        storage_path: img.path,
        sort_order: base + i,
        width: img.width || null,
        height: img.height || null,
        size_bytes: img.sizeBytes,
        original_bytes: img.originalBytes,
      }));
      const { error } = await supabase.from('gallery_images').insert(rows);
      if (error) throw error;
      await refreshImages();
    }, 'Photos added to the album.');
    if (ok) setPending([]);
  }

  async function move(img: GalleryImage, dir: -1 | 1) {
    const list = [...(images ?? [])];
    const idx = list.findIndex((i) => i.id === img.id);
    const swap = list[idx + dir];
    if (!swap) return;
    await action.run(async () => {
      await supabase.from('gallery_images').update({ sort_order: swap.sort_order }).eq('id', img.id);
      await supabase.from('gallery_images').update({ sort_order: img.sort_order }).eq('id', swap.id);
      await refreshImages();
    });
  }

  async function delImage(img: GalleryImage) {
    if (album?.cover_image_id === img.id) {
      action.setError('This photo is the album cover. Choose another cover before deleting it.');
      return;
    }
    await action.confirm('Delete this photo permanently? This cannot be undone.', async () => {
      const { error } = await supabase.from('gallery_images').delete().eq('id', img.id);
      if (error) throw error;
      await removeObject('gallery', img.storage_path);
      await refreshImages();
    }, 'Photo deleted.');
  }

  if (isLoading) return <Panel title="Gallery"><LoadingBlock /></Panel>;

  return (
    <div className="grid gap-4">
      <Panel title="Albums" description="Create an album, then add and caption photos inside it." actions={
        <TextInput placeholder="Search albums" value={q} onChange={(e) => setQ(e.target.value)} className="sm:w-44" />
      }>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="New album title" className="min-w-48 flex-1">
            <TextInput value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </Field>
          <Btn variant="primary" loading={action.busy} onClick={() => void createAlbum()}>Create album</Btn>
        </div>

        {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
        {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}

        {filteredAlbums.length === 0 ? (
          <div className="mt-3"><Empty title="No albums yet" message="Create your first album above." /></div>
        ) : (
          <ul className="mt-3">
            {filteredAlbums.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 py-2.5 last:border-0">
                <button type="button" onClick={() => { setSelected(a.id); setPending([]); }} className="min-w-0 text-left">
                  <p className={`font-medium ${selected === a.id ? 'text-amber-700' : 'text-navy'}`}>{a.title_en}</p>
                  <p className="text-xs text-text/50">
                    {a.is_deleted || a.archived_at ? 'archived' : a.is_published ? 'published' : 'draft'} · created {formatDate(a.created_at)}
                  </p>
                </button>
                <div className="flex flex-wrap gap-2">
                  <Btn onClick={() => setSelected(a.id)}>{selected === a.id ? 'Selected' : 'Open'}</Btn>
                  <Btn onClick={() => void patchAlbum(a.id, { is_published: !a.is_published }, 'Album updated.')}>
                    {a.is_published ? 'Unpublish' : 'Publish'}
                  </Btn>
                  {!a.archived_at && !a.is_deleted ? (
                    <Btn variant="danger" onClick={() => action.confirm('Archive this album?', async () => {
                      const { error } = await supabase.from('gallery_albums').update({ archived_at: new Date().toISOString(), is_published: false }).eq('id', a.id);
                      if (error) throw error;
                      await refreshAlbums();
                    }, 'Album archived.')}>Archive</Btn>
                  ) : (
                    <Btn onClick={() => void patchAlbum(a.id, { archived_at: null, is_deleted: false }, 'Album restored.')}>Restore</Btn>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {album && (
        <Panel title={`Photos — ${album.title_en}`} description="Compressed automatically. Reorder, caption, and set a cover.">
          <ImageUploadField bucket="gallery" folder={album.id} value={pending} onChange={setPending} max={20} label="Add photos" />
          {pending.length > 0 && (
            <Btn variant="primary" className="mt-3" loading={action.busy} onClick={() => void commitImages()}>
              Save {pending.length} photo{pending.length === 1 ? '' : 's'} to album
            </Btn>
          )}

          {(images ?? []).length === 0 ? (
            <div className="mt-3"><Empty title="No photos in this album" message="Add photos above." /></div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(images ?? []).map((img) => (
                <li key={img.id} className={`rounded-lg border p-2 ${album.cover_image_id === img.id ? 'border-amber' : 'border-black/10'}`}>
                  <img src={supabase.storage.from('gallery').getPublicUrl(img.storage_path).data.publicUrl} alt="" className="h-36 w-full rounded object-cover" />
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {album.cover_image_id === img.id && <Pill tone="warn">cover</Pill>}
                    <Btn variant="ghost" onClick={() => void move(img, -1)} icon={<ArrowUp className="h-3.5 w-3.5" aria-hidden />}>Up</Btn>
                    <Btn variant="ghost" onClick={() => void move(img, 1)} icon={<ArrowDown className="h-3.5 w-3.5" aria-hidden />}>Down</Btn>
                    <Btn variant="ghost" icon={<Star className="h-3.5 w-3.5" aria-hidden />} onClick={() => void patchAlbum(album.id, { cover_image_id: img.id }, 'Cover updated.')}>Cover</Btn>
                    <Btn variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" aria-hidden />} onClick={() => void delImage(img)}>Delete</Btn>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}

/** ---------------------------------------------------------------------------
 * Achievements / Student of the Month — approval, publish, consent enforcement.
 * ------------------------------------------------------------------------- */
interface SpotlightRow {
  id: string;
  award_title: string;
  display_name: string;
  class_id: string | null;
  section_id: string | null;
  photo_path: string | null;
  writeup_en: string | null;
  reason: string | null;
  month: number | null;
  year: number | null;
  status: string;
  consent: boolean;
  is_published: boolean;
  created_by: string | null;
  rejection_note: string | null;
  approved_at?: string | null;
  created_at: string;
}

export function AchievementsPanel() {
  const qc = useQueryClient();
  const action = useAction();
  const { data: classes } = useClasses();
  const [filter, setFilter] = useState('submitted');
  const [note, setNote] = useState<Record<string, string>>({});

  const { data: rows, isLoading } = useQuery({
    queryKey: ['spotlights-admin'],
    queryFn: async (): Promise<SpotlightRow[]> => {
      const { data, error } = await supabase.from('student_spotlights').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data as SpotlightRow[]) ?? [];
    },
  });

  const { data: authors } = useQuery({
    queryKey: ['spotlight-authors'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return data ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['spotlights-admin'] });

  async function patch(id: string, p: Partial<SpotlightRow>, msg: string) {
    await action.run(async () => {
      const { error } = await supabase.from('student_spotlights').update(p).eq('id', id);
      if (error) throw error;
      await refresh();
    }, msg);
  }

  const filtered = (rows ?? []).filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'submitted') return r.status === 'submitted' || r.status === 'approved';
    return r.status === filter;
  });

  if (isLoading) return <Panel title="Achievements"><LoadingBlock /></Panel>;

  return (
    <Panel
      title="Achievements & Student of the Month"
      description="Approve teacher submissions, publish with consent, or correct entries. Publishing is blocked without recorded consent."
      actions={
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-44">
          <option value="submitted">Awaiting decision</option>
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
          <option value="archived">Archived</option>
        </Select>
      }
    >
      {action.error && <div className="mb-3"><ErrorNote>{action.error}</ErrorNote></div>}
      {action.success && <div className="mb-3"><SuccessNote>{action.success}</SuccessNote></div>}
      {filtered.length === 0 ? (
        <Empty title="Nothing to review" message="Teacher submissions appear here for approval." />
      ) : (
        <ul>
          {filtered.map((r) => (
            <li key={r.id} className="border-b border-black/5 py-3 last:border-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  {r.photo_path && (
                    <img src={supabase.storage.from('spotlight').getPublicUrl(r.photo_path).data.publicUrl} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-navy">{r.display_name} — {r.award_title}</p>
                    <p className="text-xs text-text/50">
                      {classLabel(classes, (classes ?? []).flatMap((c) => c.sections), r.class_id, r.section_id)}
                      {r.month ? ` · ${r.month}/${r.year}` : ''} · by {authors?.find((a) => a.id === r.created_by)?.full_name ?? 'teacher'}
                    </p>
                    {(r.reason || r.writeup_en) && <p className="mt-1 line-clamp-2 text-sm text-text/70">{r.reason || r.writeup_en}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Pill tone={r.status === 'published' ? 'ok' : r.status === 'rejected' ? 'danger' : 'warn'}>{r.status}</Pill>
                      <Pill tone={r.consent ? 'ok' : 'danger'}>{r.consent ? 'consent recorded' : 'no consent'}</Pill>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(r.status === 'submitted' || r.status === 'approved') && (
                    <>
                      <Btn
                        variant="primary"
                        disabled={!r.consent}
                        title={r.consent ? '' : 'Consent must be recorded before publishing'}
                        onClick={() => void patch(r.id, { status: 'published', is_published: true, approved_at: new Date().toISOString() }, 'Published.')}
                      >
                        Approve &amp; publish
                      </Btn>
                      <Btn onClick={() => void patch(r.id, { status: 'approved' }, 'Approved (not yet published).')}>Approve</Btn>
                    </>
                  )}
                  {r.status !== 'rejected' && r.status !== 'archived' && (
                    <Btn variant="danger" onClick={() => action.confirm('Reject this submission?', async () => {
                      const { error } = await supabase.from('student_spotlights').update({ status: 'rejected', is_published: false, rejection_note: note[r.id] ?? null }).eq('id', r.id);
                      if (error) throw error;
                      await refresh();
                    }, 'Rejected.')}>Reject</Btn>
                  )}
                  {r.is_published && (
                    <Btn onClick={() => void patch(r.id, { is_published: false, status: 'approved' }, 'Unpublished.')}>Unpublish</Btn>
                  )}
                  {r.status !== 'archived' && (
                    <Btn onClick={() => void patch(r.id, { status: 'archived', is_published: false }, 'Archived.')}>Archive</Btn>
                  )}
                  <Btn onClick={() => void patch(r.id, { status: 'draft', is_published: false }, 'Returned to draft.')}>Correct</Btn>
                </div>
              </div>
              {(r.status === 'submitted' || r.status === 'approved') && (
                <div className="mt-2">
                  <TextInput
                    placeholder="Rejection note (optional)"
                    value={note[r.id] ?? ''}
                    onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** ---------------------------------------------------------------------------
 * Emergency Alert — publish instantly, expire, deactivate, audit.
 * ------------------------------------------------------------------------- */
interface AlertRow {
  id: string;
  title: string;
  body: string;
  audience: string;
  severity: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export function EmergencyAlertPanel() {
  const qc = useQueryClient();
  const action = useAction();
  const [form, setForm] = useState({ title: '', body: '', audience: 'public', severity: 'warning', expires_at: '' });

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async (): Promise<AlertRow[]> => {
      const { data, error } = await supabase.from('emergency_alerts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data as AlertRow[]) ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['alerts'] });

  async function publish() {
    if (!form.title.trim() || !form.body.trim()) {
      action.setError('A title and message are required.');
      return;
    }
    await action.confirm(
      'Publish this alert to the site immediately?',
      async () => {
        const { error } = await supabase.from('emergency_alerts').insert({
          title: form.title.trim(),
          body: form.body.trim(),
          audience: form.audience,
          severity: form.severity,
          expires_at: form.expires_at || null,
          is_active: true,
        });
        if (error) throw error;
        await refresh();
        setForm({ title: '', body: '', audience: 'public', severity: 'warning', expires_at: '' });
      },
      'Alert published.',
    );
  }

  if (isLoading) return <Panel title="Emergency alert"><LoadingBlock /></Panel>;

  return (
    <div className="grid gap-4">
      <Panel title="Create emergency alert" description="Shown in a banner on the public site until deactivated or expired.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Message" className="sm:col-span-2">
            <TextArea rows={2} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
          <Field label="Audience">
            <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              <option value="public">Public site</option>
              <option value="internal">Staff only (not shown publicly yet)</option>
              <option value="all">Everyone</option>
            </Select>
          </Field>
          <Field label="Severity">
            <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </Select>
          </Field>
          <Field label="Expires at (optional)">
            <TextInput type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </Field>
        </div>
        {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
        {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}
        <Btn variant="primary" className="mt-3" loading={action.busy} onClick={() => void publish()}>Publish alert</Btn>
      </Panel>

      <Panel title="Alert history">
        {(alerts ?? []).length === 0 ? (
          <Empty title="No alerts" message="Published alerts will be listed here." />
        ) : (
          <ul>
            {(alerts ?? []).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 py-2.5 last:border-0">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{a.title}</p>
                  <p className="text-xs text-text/50">
                    {a.severity} · {a.audience} · {formatDateTime(a.created_at)}
                    {a.expires_at ? ` · expires ${formatDateTime(a.expires_at)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={a.is_active ? 'danger' : 'neutral'}>{a.is_active ? 'active' : 'inactive'}</Pill>
                  {a.is_active && (
                    <Btn onClick={() => action.run(async () => {
                      const { error } = await supabase.from('emergency_alerts').update({ is_active: false }).eq('id', a.id);
                      if (error) throw error;
                      await refresh();
                    }, 'Alert deactivated.')}>Deactivate</Btn>
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

/** ---------------------------------------------------------------------------
 * Chatbot FAQs — CRUD + convert unanswered questions.
 * ------------------------------------------------------------------------- */
interface FaqRow {
  id: string;
  topic: string;
  question_en: string | null;
  answer_en: string | null;
  question_hi: string | null;
  answer_hi: string | null;
  is_active: boolean;
}
interface QuestionRow {
  id: string;
  question: string;
  lang: string;
  answered_faq_id: string | null;
  created_at: string;
}

export function FaqPanel() {
  const qc = useQueryClient();
  const action = useAction();
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ topic: '', question_en: '', answer_en: '', question_hi: '', answer_hi: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState({ topic: '', question_en: '', answer_en: '', is_active: true });

  const { data: faqs, isLoading } = useQuery({
    queryKey: ['faqs-admin'],
    queryFn: async (): Promise<FaqRow[]> => {
      const { data, error } = await supabase.from('chatbot_faqs').select('*').order('topic');
      if (error) throw error;
      return (data as FaqRow[]) ?? [];
    },
  });

  const { data: questions } = useQuery({
    queryKey: ['chatbot-questions'],
    queryFn: async (): Promise<QuestionRow[]> => {
      const { data } = await supabase.from('chatbot_questions').select('*').order('created_at', { ascending: false }).limit(50);
      return (data as QuestionRow[]) ?? [];
    },
  });

  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['faqs-admin'] }),
    qc.invalidateQueries({ queryKey: ['chatbot-questions'] }),
  ]);

  async function add(seed?: Partial<FaqRow> & { id?: string }) {
    const topic = seed?.topic ?? form.topic;
    const question = seed?.question_en ?? form.question_en;
    const answer = seed?.answer_en ?? form.answer_en;
    if (!topic.trim() || !question.trim()) {
      action.setError('A topic and question are required.');
      return;
    }
    const ok = await action.run(async () => {
      const { data, error } = await supabase
        .from('chatbot_faqs')
        .insert({ topic: topic.trim(), question_en: question.trim(), answer_en: answer || null, is_active: true })
        .select('id')
        .single();
      if (error) throw error;
      if (seed?.id && data) {
        await supabase.from('chatbot_questions').update({ answered_faq_id: data.id }).eq('id', seed.id);
      }
      await refresh();
    }, 'FAQ saved.');
    if (ok && !seed) setForm({ topic: '', question_en: '', answer_en: '', question_hi: '', answer_hi: '' });
  }

  async function patch(id: string, p: Partial<FaqRow>, msg: string) {
    await action.run(async () => {
      const { error } = await supabase.from('chatbot_faqs').update(p).eq('id', id);
      if (error) throw error;
      await refresh();
    }, msg);
  }

  const filtered = (faqs ?? []).filter((f) => !q || `${f.topic} ${f.question_en ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const unanswered = (questions ?? []).filter((x) => !x.answered_faq_id);

  if (isLoading) return <Panel title="Chatbot FAQs"><LoadingBlock /></Panel>;

  return (
    <div className="grid gap-4">
      <Panel title="Add FAQ" description="These answers power the Sensei chatbot.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Topic"><TextInput value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></Field>
          <Field label="Question (English)"><TextInput value={form.question_en} onChange={(e) => setForm({ ...form, question_en: e.target.value })} /></Field>
          <Field label="Answer (English)" className="sm:col-span-2">
            <TextArea rows={2} value={form.answer_en} onChange={(e) => setForm({ ...form, answer_en: e.target.value })} />
          </Field>
        </div>
        {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
        {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}
        <Btn variant="primary" className="mt-3" loading={action.busy} onClick={() => void add()}>Add FAQ</Btn>
      </Panel>

      <Panel
        title="FAQs"
        description="Publish or archive (deactivate) a FAQ. Archived FAQs are hidden from the chatbot."
        actions={<TextInput placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="sm:w-44" />}
      >
        {filtered.length === 0 ? (
          <Empty title="No FAQs" message="Add your first FAQ above." />
        ) : (
          <ul>
            {filtered.map((f) => (
              <li key={f.id} className="border-b border-black/5 py-2.5 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-navy">{f.topic}</p>
                    <p className="truncate text-sm text-text/65">{f.question_en}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill tone={f.is_active ? 'ok' : 'neutral'}>{f.is_active ? 'published' : 'archived'}</Pill>
                    <Btn onClick={() => {
                      setEditing(editing === f.id ? null : f.id);
                      setEditState({ topic: f.topic, question_en: f.question_en ?? '', answer_en: f.answer_en ?? '', is_active: f.is_active });
                    }}>{editing === f.id ? 'Close' : 'Edit'}</Btn>
                    <Btn onClick={() => void patch(f.id, { is_active: !f.is_active }, 'FAQ updated.')}>{f.is_active ? 'Archive' : 'Publish'}</Btn>
                  </div>
                </div>
                {editing === f.id && (
                  <div className="mt-2 rounded-lg border border-black/10 bg-surface/50 p-3">
                    <Field label="Topic"><TextInput value={editState.topic} onChange={(e) => setEditState({ ...editState, topic: e.target.value })} /></Field>
                    <Field label="Question" className="mt-2"><TextInput value={editState.question_en} onChange={(e) => setEditState({ ...editState, question_en: e.target.value })} /></Field>
                    <Field label="Answer" className="mt-2"><TextArea rows={2} value={editState.answer_en} onChange={(e) => setEditState({ ...editState, answer_en: e.target.value })} /></Field>
                    <Checkbox label="Published" checked={editState.is_active} onChange={(e) => setEditState({ ...editState, is_active: e.target.checked })} />
                    <Btn variant="primary" className="mt-2" loading={action.busy} onClick={() => void patch(f.id, editState, 'FAQ saved.')}>Save</Btn>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Unanswered questions" description="Questions the chatbot could not answer. Turn one into a FAQ.">
        {unanswered.length === 0 ? (
          <Empty title="Nothing unanswered" message="All recent questions were answered." />
        ) : (
          <ul>
            {unanswered.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 py-2.5 last:border-0">
                <span className="min-w-0 truncate text-sm">{u.question}</span>
                <Btn
                  variant="primary"
                  onClick={() => void add({ topic: 'General', question_en: u.question, answer_en: '', id: u.id })}
                >
                  Convert to FAQ
                </Btn>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
