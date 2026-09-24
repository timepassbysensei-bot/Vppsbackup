import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ImageUp, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BRANDING_BUCKET, useBranding, type BrandingKey } from '@/lib/branding';

/** Accepted upload types and a per-slot size cap (bytes). Kept intentionally small. */
const ALLOWED_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/x-icon'];
const MAX_BYTES: Record<'favicon' | 'logo', number> = { favicon: 512 * 1024, logo: 2 * 1024 * 1024 };

function safeExt(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return /^[a-z0-9]{2,4}$/.test(ext) ? ext : 'png';
}

/**
 * BrandingPanel — principal-only uploader for the site logo and favicon.
 *
 * Writes go to the public `branding` storage bucket; access is enforced by RLS
 * (`branding_write` needs is_principal()) and by the `branding_admin` policy on
 * branding_assets, so a non-principal cannot mutate this even if they reach it.
 * Uploaded files use a unique filename so CDNs/browsers never serve a stale icon.
 */
export function BrandingPanel() {
  const qc = useQueryClient();
  const { data: branding } = useBranding();
  const [busy, setBusy] = useState<BrandingKey | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  async function upload(key: 'favicon' | 'logo', file: File | undefined) {
    if (!file) return;
    setMessage(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage({ kind: 'error', text: 'Please choose an SVG, PNG, JPEG, WebP or ICO image.' });
      return;
    }
    if (file.size > MAX_BYTES[key]) {
      setMessage({ kind: 'error', text: `That file is too large (max ${MAX_BYTES[key] / 1024} KB).` });
      return;
    }

    setBusy(key);
    try {
      const path = `${key}/${crypto.randomUUID()}.${safeExt(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(BRANDING_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase
        .from('branding_assets')
        .upsert({ key, storage_path: path }, { onConflict: 'key' });
      if (dbErr) throw dbErr;

      // Best-effort cleanup of the previous object (never fatal).
      const previous = branding?.assets[key];
      if (previous) {
        const oldPath = previous.split(`/${BRANDING_BUCKET}/`)[1];
        if (oldPath) await supabase.storage.from(BRANDING_BUCKET).remove([oldPath]);
      }

      await qc.invalidateQueries({ queryKey: ['branding_assets'] });
      setMessage({ kind: 'ok', text: `${key === 'favicon' ? 'Favicon' : 'Logo'} updated.` });
    } catch {
      setMessage({ kind: 'error', text: 'Upload failed. Please try again.' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card mt-6 p-5">
      <h2 className="font-semibold text-navy">Branding</h2>
      <p className="mt-1 text-sm text-text/60">
        Upload the school logo and browser-tab favicon. Changes appear across the public site.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <BrandingSlot
          label="Logo"
          slot="logo"
          preview={branding?.resolved.logo ?? null}
          busy={busy === 'logo'}
          onPick={(f) => void upload('logo', f)}
        />
        <BrandingSlot
          label="Favicon"
          slot="favicon"
          preview={branding?.resolved.favicon ?? null}
          busy={busy === 'favicon'}
          onPick={(f) => void upload('favicon', f)}
        />
      </div>

      {message && (
        <p className={`mt-3 text-sm ${message.kind === 'ok' ? 'text-success' : 'text-danger'}`} role="status">
          {message.text}
        </p>
      )}
    </section>
  );
}

function BrandingSlot({
  label,
  slot,
  preview,
  busy,
  onPick,
}: {
  label: string;
  slot: 'favicon' | 'logo';
  preview: string | null;
  busy: boolean;
  onPick: (file: File | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-lg border border-black/10 p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-surface ring-1 ring-black/5">
          {preview ? (
            <img src={preview} alt="" className="h-10 w-10 object-contain" />
          ) : (
            <ImageUp className="h-6 w-6 text-text/40" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-text/50">
            {slot === 'favicon' ? 'SVG or PNG, up to 512 KB' : 'SVG or PNG, up to 2 MB'}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="sr-only"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="btn-secondary mt-3 w-full"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImageUp className="h-4 w-4" aria-hidden />}
        {busy ? 'Uploading…' : `Replace ${label.toLowerCase()}`}
      </button>
    </div>
  );
}
