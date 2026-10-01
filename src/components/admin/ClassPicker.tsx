import { useClasses } from '@/lib/hooks/useClasses';
import { Select } from './kit';

/**
 * ClassPicker — the shared class/section selector used by homework, notices,
 * calendar, resources, Student of the Month and admission modules. Sections are
 * filtered to the chosen class, and a class that does not use sections (Nursery)
 * hides the section field entirely.
 */
export function ClassPicker({
  classId,
  sectionId,
  onChange,
  allowAllClasses = false,
  allowAllSections = true,
  disabled = false,
}: {
  classId: string;
  sectionId: string;
  onChange: (next: { classId: string; sectionId: string }) => void;
  allowAllClasses?: boolean;
  allowAllSections?: boolean;
  disabled?: boolean;
}) {
  const { data: classes, isLoading } = useClasses();
  const selected = (classes ?? []).find((c) => c.id === classId);
  const needsSection = !!selected && selected.requires_section;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-text/80">Class</span>
        <Select
          value={classId}
          disabled={disabled || isLoading}
          onChange={(e) => onChange({ classId: e.target.value, sectionId: '' })}
        >
          <option value="">{allowAllClasses ? 'All classes' : 'Select a class'}</option>
          {(classes ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name === 'Nursery' ? 'Nursery' : `Class ${c.name}`}
            </option>
          ))}
        </Select>
      </label>

      {needsSection && (
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-text/80">Section</span>
          <Select
            value={sectionId}
            disabled={disabled}
            onChange={(e) => onChange({ classId, sectionId: e.target.value })}
          >
            {allowAllSections && <option value="">All sections</option>}
            {!allowAllSections && <option value="">Select a section</option>}
            {selected?.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </label>
      )}
    </div>
  );
}

/** Human label for a class/section pair (used in lists and previews). */
export function classLabel(
  classes: { id: string; name: string }[] | undefined,
  sections: { id: string; name: string }[] | undefined,
  classId: string | null | undefined,
  sectionId: string | null | undefined,
): string {
  const c = (classes ?? []).find((x) => x.id === classId);
  const s = (sections ?? []).find((x) => x.id === sectionId);
  if (!c) return '—';
  const name = c.name === 'Nursery' ? 'Nursery' : `Class ${c.name}`;
  return s ? `${name} · ${s.name}` : name;
}
