import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { BrandingPanel } from '@/pages/admin/BrandingPanel';
import { ClassesPanel } from '@/pages/admin/ClassesPanel';
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
 * School Settings — merges the old settings with the new branding/classes panels.
 * ------------------------------------------------------------------------- */
interface SettingsRow {
  id: string;
  name_en: string | null;
  name_hi: string | null;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  office_hours: string | null;
  established_year: number | null;
  principal_name: string | null;
  affiliation: string | null;
  affiliation_number: string | null;
  admission_mode: string;
  public_fee_message: string | null;
  homepage_intro_en: string | null;
  about_en: string | null;
  mission_en: string | null;
  vision_en: string | null;
  principal_message_en: string | null;
  privacy_contact: string | null;
  default_language: string;
  homework_retention_days: number;
  academic_session: string | null;
  session_start_date: string | null;
  session_end_date: string | null;
  feature_toggles: Record<string, boolean>;
}

export function SchoolSettingsPanel() {
  const qc = useQueryClient();
  const action = useAction();
  const [local, setLocal] = useState<Partial<SettingsRow> | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['school_settings'],
    queryFn: async (): Promise<SettingsRow | null> => {
      const { data, error } = await supabase.from('school_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return (data as SettingsRow) ?? null;
    },
  });

  const row = local ?? settings ?? null;

  function set<K extends keyof SettingsRow>(key: K, value: SettingsRow[K]) {
    setLocal({ ...(row ?? {}), [key]: value });
  }

  async function save() {
    if (!row?.id) return;
    await action.run(async () => {
      const { id, ...patch } = row;
      const { error } = await supabase.from('school_settings').update(patch).eq('id', id);
      if (error) throw error;
      setLocal(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['school_settings'] }),
        qc.invalidateQueries({ queryKey: ['branding_assets'] }),
      ]);
    }, 'Settings saved. Public pages update within a minute.');
  }

  if (isLoading) return <Panel title="School settings"><LoadingBlock /></Panel>;
  if (!row) return <Panel title="School settings"><Empty title="No settings row" message="Run the seed migration to create it." /></Panel>;

  const toggles = row.feature_toggles ?? {};

  return (
    <div className="grid gap-4">
      <Panel title="School identity & contact" description="Shown across the public site and footer.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="School name (English)"><TextInput value={row.name_en ?? ''} onChange={(e) => set('name_en', e.target.value)} /></Field>
          <Field label="School name (Hindi)"><TextInput value={row.name_hi ?? ''} onChange={(e) => set('name_hi', e.target.value)} /></Field>
          <Field label="Tagline" className="sm:col-span-2"><TextInput value={row.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} /></Field>
          <Field label="Address" className="sm:col-span-2"><TextArea rows={2} value={row.address ?? ''} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label="Phone"><TextInput value={row.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Email"><TextInput value={row.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Office hours"><TextInput value={row.office_hours ?? ''} onChange={(e) => set('office_hours', e.target.value)} /></Field>
          <Field label="Established year"><TextInput type="number" value={row.established_year ?? ''} onChange={(e) => set('established_year', e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Principal name"><TextInput value={row.principal_name ?? ''} onChange={(e) => set('principal_name', e.target.value)} /></Field>
          <Field label="Affiliation"><TextInput value={row.affiliation ?? ''} onChange={(e) => set('affiliation', e.target.value)} /></Field>
          <Field label="Affiliation number"><TextInput value={row.affiliation_number ?? ''} onChange={(e) => set('affiliation_number', e.target.value)} /></Field>
          <Field label="Privacy contact"><TextInput value={row.privacy_contact ?? ''} onChange={(e) => set('privacy_contact', e.target.value)} /></Field>
        </div>
      </Panel>

      <Panel title="Academic session & preferences">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Academic session" hint="e.g. 2026–27"><TextInput value={row.academic_session ?? ''} onChange={(e) => set('academic_session', e.target.value)} /></Field>
          <Field label="Default language">
            <Select value={row.default_language} onChange={(e) => set('default_language', e.target.value)}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </Select>
          </Field>
          <Field label="Session start"><TextInput type="date" value={row.session_start_date ?? ''} onChange={(e) => set('session_start_date', e.target.value)} /></Field>
          <Field label="Session end"><TextInput type="date" value={row.session_end_date ?? ''} onChange={(e) => set('session_end_date', e.target.value)} /></Field>
          <Field label="Admission mode">
            <Select value={row.admission_mode} onChange={(e) => set('admission_mode', e.target.value)}>
              <option value="automatic">Automatic</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </Select>
          </Field>
          <Field label="Homework retention (days)">
            <Select value={String(row.homework_retention_days)} onChange={(e) => set('homework_retention_days', Number(e.target.value))}>
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
            </Select>
          </Field>
          <Field label="Public fee message" className="sm:col-span-2">
            <TextArea rows={2} value={row.public_fee_message ?? ''} onChange={(e) => set('public_fee_message', e.target.value)} />
          </Field>
        </div>
      </Panel>

      <Panel title="Public-site content">
        <div className="grid gap-3">
          <Field label="Homepage intro"><TextArea rows={2} value={row.homepage_intro_en ?? ''} onChange={(e) => set('homepage_intro_en', e.target.value)} /></Field>
          <Field label="About text"><TextArea rows={3} value={row.about_en ?? ''} onChange={(e) => set('about_en', e.target.value)} /></Field>
          <Field label="Mission"><TextArea rows={2} value={row.mission_en ?? ''} onChange={(e) => set('mission_en', e.target.value)} /></Field>
          <Field label="Vision"><TextArea rows={2} value={row.vision_en ?? ''} onChange={(e) => set('vision_en', e.target.value)} /></Field>
          <Field label="Principal's message"><TextArea rows={3} value={row.principal_message_en ?? ''} onChange={(e) => set('principal_message_en', e.target.value)} /></Field>
        </div>
      </Panel>

      <Panel title="Feature toggles" description="Turn public-site sections on or off without deleting them.">
        <div className="grid gap-1 sm:grid-cols-2">
          {(['gallery', 'birthdays', 'resources', 'calendar', 'achievements', 'chatbot'] as const).map((key) => (
            <Checkbox
              key={key}
              label={key[0]?.toUpperCase() + key.slice(1)}
              checked={toggles[key] !== false}
              onChange={(e) => set('feature_toggles', { ...toggles, [key]: e.target.checked })}
            />
          ))}
        </div>
      </Panel>

      {action.error && <ErrorNote>{action.error}</ErrorNote>}
      {action.success && <SuccessNote>{action.success}</SuccessNote>}
      <div><Btn variant="primary" loading={action.busy} onClick={() => void save()}>Save settings</Btn></div>

      <BrandingPanel />
      <ClassesPanel />
    </div>
  );
}

/** ---------------------------------------------------------------------------
 * Timing Manager — schedules, periods/breaks/assembly, effective dates, state.
 * ------------------------------------------------------------------------- */
interface ScheduleRow {
  id: string;
  name: string;
  morning_start: string | null;
  morning_end: string | null;
  day_start: string | null;
  day_end: string | null;
  effective_date: string | null;
  end_date: string | null;
  state: string;
  is_override: boolean;
}

interface PeriodRow {
  id: string;
  schedule_id: string;
  label: string;
  kind: string;
  start_time: string;
  end_time: string;
  sort_order: number;
}

export function TimingPanel() {
  const qc = useQueryClient();
  const action = useAction();
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', morning_start: '', morning_end: '', day_start: '', day_end: '',
    effective_date: '', end_date: '', is_override: false,
  });
  const [period, setPeriod] = useState({ label: '', kind: 'period', start_time: '', end_time: '' });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['timing-schedules'],
    queryFn: async (): Promise<ScheduleRow[]> => {
      const { data, error } = await supabase.from('timing_schedules').select('*').order('effective_date', { ascending: false });
      if (error) throw error;
      return (data as ScheduleRow[]) ?? [];
    },
  });

  const { data: periods } = useQuery({
    queryKey: ['timing-periods', selected],
    enabled: !!selected,
    queryFn: async (): Promise<PeriodRow[]> => {
      const { data, error } = await supabase.from('timing_periods').select('*').eq('schedule_id', selected).order('sort_order');
      if (error) throw error;
      return (data as PeriodRow[]) ?? [];
    },
  });

  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['timing-schedules'] }),
    qc.invalidateQueries({ queryKey: ['timing-periods', selected] }),
    qc.invalidateQueries({ queryKey: ['timing-active'] }),
  ]);

  async function addSchedule() {
    if (!form.name.trim()) {
      action.setError('A schedule name is required.');
      return;
    }
    const ok = await action.run(async () => {
      const { error } = await supabase.from('timing_schedules').insert({
        name: form.name.trim(),
        morning_start: form.morning_start || null,
        morning_end: form.morning_end || null,
        day_start: form.day_start || null,
        day_end: form.day_end || null,
        effective_date: form.effective_date || null,
        end_date: form.end_date || null,
        is_override: form.is_override,
        state: 'draft',
      });
      if (error) throw error;
      await refresh();
    }, 'Schedule created.');
    if (ok) setForm({ name: '', morning_start: '', morning_end: '', day_start: '', day_end: '', effective_date: '', end_date: '', is_override: false });
  }

  async function activate(s: ScheduleRow) {
    await action.confirm('Make this the active schedule? Other normal schedules will be set to inactive.', async () => {
      const { error } = await supabase.from('timing_schedules').update({ state: 'inactive' }).eq('state', 'active').eq('is_override', s.is_override);
      if (error) throw error;
      const { error: e2 } = await supabase.from('timing_schedules').update({ state: 'active' }).eq('id', s.id);
      if (e2) throw e2;
      await refresh();
    }, 'Schedule activated.');
  }

  async function addPeriod() {
    if (!selected || !period.label.trim() || !period.start_time || !period.end_time) {
      action.setError('A label, start and end time are required.');
      return;
    }
    const nextOrder = (periods ?? []).reduce((m, p) => Math.max(m, p.sort_order), -1) + 1;
    const ok = await action.run(async () => {
      const { error } = await supabase.from('timing_periods').insert({
        schedule_id: selected,
        label: period.label.trim(),
        kind: period.kind,
        start_time: period.start_time,
        end_time: period.end_time,
        sort_order: nextOrder,
      });
      if (error) throw error;
      await refresh();
    }, 'Timing added.');
    if (ok) setPeriod({ label: '', kind: 'period', start_time: '', end_time: '' });
  }

  if (isLoading) return <Panel title="Timing manager"><LoadingBlock /></Panel>;

  return (
    <div className="grid gap-4">
      <Panel title="New schedule" description="A normal schedule is the everyday timetable; an override handles special days.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name" className="sm:col-span-3"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Normal timetable / Exam day" /></Field>
          <Field label="Morning start"><TextInput type="time" value={form.morning_start} onChange={(e) => setForm({ ...form, morning_start: e.target.value })} /></Field>
          <Field label="Morning end"><TextInput type="time" value={form.morning_end} onChange={(e) => setForm({ ...form, morning_end: e.target.value })} /></Field>
          <div className="grid content-end"><Checkbox label="Special-day override" checked={form.is_override} onChange={(e) => setForm({ ...form, is_override: e.target.checked })} /></div>
          <Field label="Day start"><TextInput type="time" value={form.day_start} onChange={(e) => setForm({ ...form, day_start: e.target.value })} /></Field>
          <Field label="Day end"><TextInput type="time" value={form.day_end} onChange={(e) => setForm({ ...form, day_end: e.target.value })} /></Field>
          <Field label="Effective date"><TextInput type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} /></Field>
          <Field label="End date"><TextInput type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
        </div>
        {action.error && <div className="mt-3"><ErrorNote>{action.error}</ErrorNote></div>}
        {action.success && <div className="mt-3"><SuccessNote>{action.success}</SuccessNote></div>}
        <Btn variant="primary" className="mt-3" loading={action.busy} onClick={() => void addSchedule()}>Create schedule</Btn>
      </Panel>

      <Panel title="Schedules" description="Only an active schedule is shown on the public site.">
        {(schedules ?? []).length === 0 ? (
          <Empty title="No schedules" message="Create a normal timetable above." />
        ) : (
          <ul>
            {(schedules ?? []).map((s) => (
              <li key={s.id} className="border-b border-black/5 py-2.5 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-navy">{s.name}{s.is_override ? ' (override)' : ''}</p>
                    <p className="text-xs text-text/50">
                      {s.morning_start ? `Morning ${s.morning_start}` : ''} {s.day_start ? `· Day ${s.day_start}–${s.day_end ?? ''}` : ''}
                      {s.effective_date ? ` · from ${formatDate(s.effective_date)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={s.state === 'active' ? 'ok' : s.state === 'inactive' ? 'neutral' : 'warn'}>{s.state}</Pill>
                    <Btn onClick={() => setSelected(selected === s.id ? null : s.id)}>{selected === s.id ? 'Hide timings' : 'Timings'}</Btn>
                    {s.state !== 'active' && <Btn variant="primary" onClick={() => void activate(s)}>Activate</Btn>}
                  </div>
                </div>

                {selected === s.id && (
                  <div className="mt-3 rounded-lg border border-black/10 bg-surface/50 p-3">
                    <p className="text-sm font-medium text-text/80">Periods, breaks &amp; assembly</p>
                    {(periods ?? []).length === 0 ? (
                      <p className="mt-1 text-sm text-text/50">No periods yet.</p>
                    ) : (
                      <ul className="mt-2 grid gap-1 text-sm">
                        {(periods ?? []).map((p) => (
                          <li key={p.id} className="flex items-center justify-between gap-2">
                            <span>{p.label} <span className="text-xs text-text/45">({p.kind})</span></span>
                            <span>{p.start_time}–{p.end_time}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 grid gap-3 sm:grid-cols-4">
                      <Field label="Label"><TextInput value={period.label} onChange={(e) => setPeriod({ ...period, label: e.target.value })} placeholder="Period 1 / Lunch" /></Field>
                      <Field label="Kind">
                        <Select value={period.kind} onChange={(e) => setPeriod({ ...period, kind: e.target.value })}>
                          <option value="period">Period</option>
                          <option value="break">Break</option>
                          <option value="assembly">Assembly</option>
                          <option value="other">Other</option>
                        </Select>
                      </Field>
                      <Field label="Start"><TextInput type="time" value={period.start_time} onChange={(e) => setPeriod({ ...period, start_time: e.target.value })} /></Field>
                      <Field label="End"><TextInput type="time" value={period.end_time} onChange={(e) => setPeriod({ ...period, end_time: e.target.value })} /></Field>
                    </div>
                    <Btn className="mt-2" loading={action.busy} onClick={() => void addPeriod()}>Add timing</Btn>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/** ---------------------------------------------------------------------------
 * Audit Log — read-only view of audit_logs (principal only).
 * ------------------------------------------------------------------------- */
interface AuditRow {
  id: string;
  actor: string | null;
  action: string;
  content_type: string | null;
  content_id: string | null;
  summary: string | null;
  at: string;
}

export function AuditLogPanel() {
  const [q, setQ] = useState('');
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase.from('audit_logs').select('*').order('at', { ascending: false }).limit(300);
      if (error) throw error;
      return (data as AuditRow[]) ?? [];
    },
  });

  const { data: actors } = useQuery({
    queryKey: ['audit-actors'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return data ?? [];
    },
  });

  const filtered = (logs ?? []).filter((l) =>
    !q || `${l.action} ${l.content_type ?? ''} ${l.summary ?? ''}`.toLowerCase().includes(q.toLowerCase()),
  );

  if (isLoading) return <Panel title="Audit log"><LoadingBlock /></Panel>;

  return (
    <Panel
      title="Audit log"
      description="Read-only record of sensitive actions. Passwords, tokens and private content are never stored here."
      actions={<TextInput placeholder="Search action" value={q} onChange={(e) => setQ(e.target.value)} className="sm:w-48" />}
    >
      {filtered.length === 0 ? (
        <Empty title="No audit entries" message="Sensitive changes are recorded here automatically." />
      ) : (
        <ul>
          {filtered.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 py-2 last:border-0 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-navy">{l.action}</p>
                <p className="text-xs text-text/50">
                  {actors?.find((a) => a.id === l.actor)?.full_name ?? l.actor?.slice(0, 8) ?? 'system'}
                  {l.content_type ? ` · ${l.content_type}` : ''}
                  {l.summary ? ` · ${l.summary}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-xs text-text/45">{formatDateTime(l.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
