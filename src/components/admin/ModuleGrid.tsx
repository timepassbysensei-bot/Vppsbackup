import type { ReactNode } from 'react';

/**
 * =============================================================================
 * ModuleGrid — the directly-visible module buttons (the old dashboard pattern)
 * =============================================================================
 *
 * The dashboards use this instead of burying every module in the mobile drawer.
 * Requirements it satisfies:
 *
 *   • two columns on the smallest phones, more columns as space allows
 *   • large, touch-friendly targets (min 76px tall, well over the 44px minimum)
 *   • labels wrap instead of clipping, and `break-words` + `min-w-0` guarantee
 *     no horizontal overflow at 320–360px
 *   • an unmistakable active state (solid navy + ring)
 *   • an optional count badge, so a pending decision is never hidden
 */

export interface ModuleItem {
  id: string;
  label: string;
  icon: ReactNode;
  /** Optional count shown as a small badge. */
  badge?: number;
}

export function ModuleGrid({
  items,
  active,
  onSelect,
  ariaLabel = 'Dashboard modules',
}: {
  items: ModuleItem[];
  active: string;
  onSelect: (id: string) => void;
  ariaLabel?: string;
}) {
  return (
    <ul
      aria-label={ariaLabel}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <li key={item.id} className="min-w-0">
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex h-full min-h-[76px] w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-center transition ${
                isActive
                  ? 'bg-navy text-white shadow-card ring-2 ring-navy/30'
                  : 'border border-black/10 bg-white text-navy hover:-translate-y-0.5 hover:border-navy hover:shadow-card'
              }`}
            >
              <span
                className={`shrink-0 ${isActive ? 'text-white' : 'text-navy/80'}`}
                aria-hidden
              >
                {item.icon}
              </span>
              <span className="w-full min-w-0 break-words text-[13px] font-medium leading-tight">
                {item.label}
              </span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber/25 text-amber-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A compact, optional grouping wrapper. Used to keep a long module list
 * scannable without hiding anything behind another tap.
 */
export function ModuleSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-4 first:mt-0">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text/45">
        {title}
      </h2>
      {children}
    </section>
  );
}
