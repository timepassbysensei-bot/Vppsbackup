import {
  useCallback,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Loader2 } from 'lucide-react';

/**
 * =============================================================================
 * admin/kit.tsx — shared building blocks for the admin dashboards
 * =============================================================================
 *
 * The Principal and Teacher dashboards are made of many small modules. Rather
 * than re-implement loading / error / success / empty states in each one, every
 * module composes these primitives. They deliberately stay English-only (like
 * the rest of the admin surface) while the PUBLIC site remains bilingual.
 */

export function Panel({
  title,
  description,
  actions,
  children,
  as = 'section',
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  as?: 'section' | 'div';
}) {
  const Tag = as;
  return (
    <Tag className="rounded-xl border border-black/10 bg-white p-4 shadow-card sm:p-5">
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-navy">{title}</h2>}
            {description && <p className="mt-1 text-sm text-text/60">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-text/80">{label}</span>
      {children}
      {hint && <span className="text-xs text-text/50">{hint}</span>}
    </label>
  );
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input w-full ${className}`} />;
}

export function TextArea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input w-full ${className}`} />;
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`input w-full ${className}`}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  ...props
}: { label: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex min-h-touch items-center gap-2 text-sm text-text/80">
      <input type="checkbox" {...props} className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </label>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn bg-danger/10 text-danger ring-1 ring-danger/30 hover:bg-danger/20',
};

export function Btn({
  variant = 'secondary',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      className={`${VARIANT_CLASS[variant]} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function Pill({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'info';
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-surface text-text/70',
    ok: 'bg-success/15 text-success',
    warn: 'bg-amber/20 text-amber-700',
    danger: 'bg-danger/15 text-danger',
    info: 'bg-sky/20 text-navy',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Empty({ title, message, action }: { title: string; message?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-black/15 bg-surface/60 p-6 text-center">
      <p className="font-medium text-navy">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-md text-sm text-text/60">{message}</p>}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-text/60" role="status" aria-live="polite">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-sm text-danger">
      {children}
    </p>
  );
}

export function SuccessNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="status" className="rounded bg-success/10 px-3 py-2 text-sm text-success">
      {children}
    </p>
  );
}

export interface ActionState {
  busy: boolean;
  error: string | null;
  success: string | null;
  /** Runs `work`, capturing a friendly error message. Returns true on success. */
  run: (work: () => Promise<unknown>, successMessage?: string) => Promise<boolean>;
  /** Runs `work` with a window.confirm gate first. */
  confirm: (question: string, work: () => Promise<unknown>, successMessage?: string) => Promise<boolean>;
  reset: () => void;
  setError: (message: string | null) => void;
}

/** Collapses busy/error/success + confirm-dialog handling that every form needs. */
export function useAction(): ActionState {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const run = useCallback(async (work: () => Promise<unknown>, successMessage?: string) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await work();
      if (successMessage) setSuccess(successMessage);
      return true;
    } catch (err) {
      setError(messageFor(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const confirm = useCallback(
    async (question: string, work: () => Promise<unknown>, successMessage?: string) => {
      if (!window.confirm(question)) return false;
      return run(work, successMessage);
    },
    [run],
  );

  return { busy, error, success, run, confirm, reset: () => { setError(null); setSuccess(null); }, setError };
}

/** Maps a PostgREST / supabase error to a message that never leaks SQL details. */
export function messageFor(err: unknown): string {
  const { message = '', code = '' } = (err ?? {}) as { message?: string; code?: string };
  if (code === '23505' || message.includes('duplicate key')) return 'An entry with those details already exists.';
  if (code === '42501' || message.includes('row-level security') || message.includes('permission denied'))
    return 'You do not have permission to do that.';
  if (message.includes('spotlight_unique_slot')) return 'That class, section, month and year already has an entry.';
  if (message.includes('not allowed') || message.includes('violates check constraint'))
    return 'Some values are not allowed. Please check the form.';
  return 'Something went wrong. Please try again.';
}

/** Extracts the storage path from a Supabase public URL (for cleanup on delete). */
export function pathFromPublicUrl(bucket: string, url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const rest = url.slice(idx + marker.length);
  return rest.split('?')[0] ?? null;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** A compact, responsive list row. */
export function Row({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <li className={`flex flex-wrap items-center justify-between gap-3 border-b border-black/5 py-3 last:border-0 ${className}`}>
      {children}
    </li>
  );
}

export function Labeled({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-text/45">{label}</p>
      <p className="truncate text-sm text-text/80">{value ?? '—'}</p>
    </div>
  );
}
