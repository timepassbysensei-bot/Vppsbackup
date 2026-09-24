import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Layers, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useClasses } from '@/lib/hooks/useClasses';
import { classNameSchema, sectionNameSchema } from '@/lib/validation/schemas';

/**
 * ClassesPanel — principal-only manager for the school's classes and sections.
 *
 * Why it is needed: the school grows (a new Class 11/12, a new section 1C) and
 * those lists feed the homework, notices, calendar and admission forms. Until
 * now they could only be changed by editing the database.
 *
 * Security: this component is UX only. Every write is a direct PostgREST call
 * that Postgres RLS permits solely when `is_principal()` is true
 * (`classes_admin` / `sections_admin` in 0002_rls.sql). Removal goes through the
 * `delete_class` / `delete_section` functions from 0006_classes_admin.sql, which
 * refuse to delete an entry that records still refer to — so a class in use can
 * never be destroyed by a mis-click.
 */
export function ClassesPanel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: classes, isLoading } = useClasses();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['classes-with-sections'] });

  /** Turns a PostgREST / RPC failure into a localised message (never raw SQL). */
  function describe(err: unknown): string {
    const { code = '', message = '' } = (err ?? {}) as { code?: string; message?: string };
    if (code === '23505' || message.includes('duplicate key')) return t('classes.nameTaken');
    if (message.includes('class_in_use') || message.includes('section_in_use'))
      return t('classes.inUseNote');
    return t('admin.errors.generic');
  }

  async function run(work: () => Promise<unknown>): Promise<boolean> {
    setError(null);
    setBusy(true);
    try {
      await work();
      await refresh();
      return true;
    } catch (err) {
      setError(describe(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function addClass(name: string, requiresSection: boolean) {
    const parsed = classNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(t('classes.needName'));
      return Promise.resolve(false);
    }
    // New classes sort after the existing ones.
    const nextOrder = (classes ?? []).reduce((max, c) => Math.max(max, c.sort_order), -1) + 1;
    return run(async () => {
      const { error } = await supabase
        .from('classes')
        .insert({ name: parsed.data, requires_section: requiresSection, sort_order: nextOrder });
      if (error) throw error;
    });
  }

  function addSection(classId: string, name: string) {
    const parsed = sectionNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(t('classes.needName'));
      return Promise.resolve(false);
    }
    return run(async () => {
      const { error } = await supabase
        .from('sections')
        .insert({ class_id: classId, name: parsed.data.toUpperCase() });
      if (error) throw error;
    });
  }

  function removeSection(id: string) {
    if (!window.confirm(t('classes.confirmRemoveSection'))) return Promise.resolve(false);
    return run(async () => {
      const { error } = await supabase.rpc('delete_section', { p_id: id });
      if (error) throw error;
    });
  }

  function removeClass(id: string) {
    if (!window.confirm(t('classes.confirmRemoveClass'))) return Promise.resolve(false);
    return run(async () => {
      const { error } = await supabase.rpc('delete_class', { p_id: id });
      if (error) throw error;
    });
  }

  return (
    <section className="card mt-6 p-5">
      <h2 className="flex items-center gap-2 font-semibold text-navy">
        <Layers className="h-4 w-4" aria-hidden />
        {t('classes.title')}
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-text/60">{t('classes.intro')}</p>

      {error && (
        <p className="mt-3 rounded bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="mt-4 text-sm text-text/50">{t('common.loading')}</p>
      ) : (classes ?? []).length === 0 ? (
        <p className="mt-4 text-sm text-text/50">{t('classes.empty')}</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {(classes ?? []).map((c) => (
            <li key={c.id} className="rounded-lg border border-black/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 font-semibold text-navy">{c.name}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeClass(c.id)}
                  className="btn text-danger ring-1 ring-danger/30"
                  aria-label={`${t('classes.remove')} ${c.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  {t('classes.remove')}
                </button>
              </div>

              {c.requires_section && (
                <div className="mt-3 border-t border-black/5 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                    {t('classes.sections')}
                  </p>
                  {c.sections.length === 0 ? (
                    <p className="mt-2 text-sm text-text/50">{t('classes.noSections')}</p>
                  ) : (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {c.sections.map((s) => (
                        <li
                          key={s.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-sm"
                        >
                          {s.name}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void removeSection(s.id)}
                            className="text-danger"
                            aria-label={`${t('classes.remove')} ${c.name} ${s.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <AddSectionForm classId={c.id} disabled={busy} onAdd={addSection} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <AddClassForm disabled={busy} onAdd={addClass} />
    </section>
  );
}

function AddClassForm({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (name: string, requiresSection: boolean) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [requiresSection, setRequiresSection] = useState(true);

  return (
    <form
      className="mt-4 grid gap-3 border-t border-black/5 pt-4 sm:flex sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        void onAdd(name, requiresSection).then((ok) => {
          if (ok) setName('');
        });
      }}
    >
      <label className="grid flex-1 gap-1.5">
        <span className="text-sm font-medium text-text/80">{t('classes.className')}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          className="input"
          placeholder={t('classes.classNameHint')}
        />
      </label>
      <label className="flex min-h-touch items-center gap-2 text-sm text-text/80">
        <input
          type="checkbox"
          checked={requiresSection}
          onChange={(e) => setRequiresSection(e.target.checked)}
          className="h-4 w-4"
        />
        {t('classes.requiresSection')}
      </label>
      <button type="submit" disabled={disabled} className="btn-primary sm:w-auto">
        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Plus className="h-4 w-4" aria-hidden />
        )}
        {disabled ? t('classes.adding') : t('classes.addClass')}
      </button>
    </form>
  );
}

function AddSectionForm({
  classId,
  disabled,
  onAdd,
}: {
  classId: string;
  disabled: boolean;
  onAdd: (classId: string, name: string) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');

  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        void onAdd(classId, name).then((ok) => {
          if (ok) setName('');
        });
      }}
    >
      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-text/80">{t('classes.sectionName')}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={8}
          className="input w-24"
          placeholder="C"
        />
      </label>
      <button type="submit" disabled={disabled} className="btn-secondary">
        <Plus className="h-4 w-4" aria-hidden />
        {t('classes.addSection')}
      </button>
    </form>
  );
}
