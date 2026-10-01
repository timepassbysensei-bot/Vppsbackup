import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { compressAndUploadImage, removeObject, type UploadStage } from '@/lib/uploads';
import { formatBytes } from '@/lib/image';
import { ErrorNote } from './kit';

export interface UploadedImage {
  path: string;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
  originalBytes: number;
}

const STAGE_LABEL: Record<UploadStage, string> = {
  validating: 'Checking image…',
  compressing: 'Compressing…',
  uploading: 'Uploading…',
  done: 'Done',
};

/**
 * ImageUploadField — the single uploader used by homework, gallery, achievements,
 * Student of the Month, birthdays and notices.
 *
 * Every file is validated, orientation-corrected, resized and compressed in the
 * browser (see lib/image.ts) BEFORE it is stored, and the before/after size is
 * shown so staff can see the saving. `capture="environment"` on mobile opens the
 * camera directly; the same control also accepts gallery picks.
 */
export function ImageUploadField({
  bucket,
  folder,
  value,
  onChange,
  multiple = true,
  max = 6,
  label = 'Images',
  disabled = false,
}: {
  bucket: string;
  folder: string;
  value: UploadedImage[];
  onChange: (next: UploadedImage[]) => void;
  multiple?: boolean;
  max?: number;
  label?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    const next = [...value];
    try {
      for (const file of Array.from(files)) {
        if (next.length >= max) break;
        const asset = await compressAndUploadImage(bucket, folder, file, {
          onStage: setStage,
          maxEdge: 1800,
          quality: 0.82,
        });
        if (asset.publicUrl) {
          next.push({
            path: asset.path,
            url: asset.publicUrl,
            width: asset.width,
            height: asset.height,
            sizeBytes: asset.sizeBytes,
            originalBytes: asset.originalBytes,
          });
        }
      }
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
      setStage(null);
    }
  }

  async function remove(index: number) {
    const item = value[index];
    if (!item) return;
    if (!window.confirm('Remove this image?')) return;
    onChange(value.filter((_, i) => i !== index));
    await removeObject(bucket, item.path);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text/80">{label}</span>
        {stage && (
          <span className="flex items-center gap-1 text-xs text-text/55" role="status" aria-live="polite">
            {stage !== 'done' && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
            {STAGE_LABEL[stage]}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          void pick(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="mt-2 flex flex-wrap gap-3">
        {value.map((img, i) => (
          <figure key={img.path} className="w-24">
            <div className="relative h-24 w-24 overflow-hidden rounded-lg ring-1 ring-black/10">
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => void remove(i)}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
                aria-label="Remove image"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            <figcaption className="mt-1 text-[11px] leading-tight text-text/50">
              {img.width > 0 && <>{img.width}×{img.height}<br /></>}
              {formatBytes(img.originalBytes)} → {formatBytes(img.sizeBytes)}
            </figcaption>
          </figure>
        ))}

        {value.length < max && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
            className="grid h-24 w-24 place-items-center gap-1 rounded-lg border border-dashed border-black/20 text-xs text-text/55 hover:border-navy hover:text-navy disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ImagePlus className="h-5 w-5" aria-hidden />}
            Add
          </button>
        )}
      </div>

      <p className="mt-1 text-xs text-text/45">
        Photos are compressed automatically before upload. Up to {max}.
      </p>
      {error && <div className="mt-2"><ErrorNote>{error}</ErrorNote></div>}
    </div>
  );
}
