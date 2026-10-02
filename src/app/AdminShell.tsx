import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useBranding } from '@/lib/branding';

/** A single navigable module inside a group. */
export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  /** Optional count shown as a small badge (e.g. pending approvals). */
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * =============================================================================
 * AdminShell — shared chrome for the Principal and Teacher dashboards
 * =============================================================================
 *
 * The redesigned shell used to cram the school name, BOTH dashboard links and
 * Sign out into a single row, which wrapped and clipped on phones. This version:
 *
 *   • Desktop  → a persistent, grouped sidebar (Overview, People, Academics …).
 *   • Mobile   → a compact header (mark + name + role + menu button) and a
 *                slide-over drawer containing the same grouped navigation.
 *   • Sign out and the signed-in identity live INSIDE the drawer/profile area,
 *     never in the top row, so nothing can overlap or overflow.
 *   • The drawer is SECONDARY navigation. Each dashboard also renders its module
 *     buttons directly on the homepage (see `ModuleGrid`), so nothing needs the
 *     drawer to be reachable.
 *   • A module shows a Back button (and, on desktop, a breadcrumb) that returns
 *     to the dashboard home in one tap.
 *   • `headerRight` is where a dashboard places its dashboard-switch button — an
 *     approved principal may open BOTH dashboards; nothing is stored in
 *     localStorage and no re-login is required.
 *
 * Route access is still UX only — RLS + Netlify Functions remain the real gate.
 */
export function AdminShell({
  title,
  groups,
  active,
  onSelect,
  children,
  headerRight,
  homeId = 'overview',
  homeLabel = 'Dashboard',
}: {
  title: string;
  groups: NavGroup[];
  active: string;
  onSelect: (id: string) => void;
  children: ReactNode;
  headerRight?: ReactNode;
  /** Id of the dashboard-home module — used for the back button and breadcrumb. */
  homeId?: string;
  homeLabel?: string;
}) {
  const { session, role, signOut } = useAuth();
  const { data: branding } = useBranding();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);

  const email = session?.user.email ?? '';
  const logo = branding?.resolved.logo ?? null;

  // Tapping a module button (or a drawer entry) brings its content into view, so
  // the persistent button grid never forces a manual scroll to see the result.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [active]);

  // Close the drawer on Escape and lock body scroll while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function choose(id: string) {
    onSelect(id);
    setOpen(false);
  }

  async function doSignOut() {
    await signOut();
    navigate('/admin/login');
  }

  const nav = (
    <nav className="grid gap-4" aria-label="Dashboard sections">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-text/40">{group.label}</p>
          <ul className="mt-1 grid gap-0.5">
            {group.items.map((item) => {
              const isActive = item.id === active;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => choose(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex w-full min-h-touch items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                      isActive ? 'bg-navy text-white shadow-card' : 'text-text/75 hover:bg-surface hover:text-navy'
                    }`}
                  >
                    <span className="shrink-0" aria-hidden>
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
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
        </div>
      ))}
    </nav>
  );

  const identity = (
    <div className="border-t border-black/10 pt-3">
      <p className="truncate text-sm font-medium text-navy">{session?.user.user_metadata?.full_name || 'Signed in'}</p>
      <p className="truncate text-xs text-text/55">{email}</p>
      <p className="mt-1 text-xs capitalize text-text/45">{role ?? '—'} account</p>
      <button type="button" onClick={() => void doSignOut()} className="btn-secondary mt-3 w-full">
        <LogOut className="h-4 w-4" aria-hidden />
        Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* ---------- mobile header (never overflows) ---------- */}
      <header className="sticky top-0 z-30 border-b border-black/10 bg-white lg:hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          <Link to="/" className="flex min-w-0 items-center gap-2 text-navy" aria-label="Back to site">
            {logo ? (
              <img src={logo} alt="" className="h-7 w-7 shrink-0 object-contain" />
            ) : (
              <GraduationCap className="h-6 w-6 shrink-0" aria-hidden />
            )}
            <span className="min-w-0 truncate text-sm font-bold">VPPS Admin</span>
          </Link>
          <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs capitalize text-text/60">
            {role ?? '—'}
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-auto flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-lg ring-1 ring-black/10"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="h-5 w-5 text-navy" aria-hidden />
          </button>
        </div>
      </header>

      {/* ---------- mobile drawer ---------- */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Dashboard menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-xs flex-col overflow-y-auto bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-navy">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-text/60"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="mt-3 flex-1">{nav}</div>
            <div className="mt-4">{identity}</div>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-3 py-4 sm:px-4 sm:py-6">
        {/* ---------- desktop sidebar ---------- */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-6 flex max-h-[calc(100vh-3rem)] flex-col overflow-y-auto rounded-xl border border-black/10 bg-white p-3">
            <Link to="/" className="mb-3 flex min-w-0 items-center gap-2 px-1 text-navy">
              {logo ? (
                <img src={logo} alt="" className="h-8 w-8 shrink-0 object-contain" />
              ) : (
                <GraduationCap className="h-7 w-7 shrink-0" aria-hidden />
              )}
              <span className="min-w-0 truncate font-bold">VPPS Admin</span>
            </Link>
            <div className="flex-1">{nav}</div>
            <div className="mt-4">{identity}</div>
          </div>
        </aside>

        {/* ---------- content ---------- */}
        <main className="min-w-0 flex-1">
          <div ref={contentRef} className="scroll-mt-20">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                {active !== homeId && (
                  <nav aria-label="Breadcrumb" className="mb-1 hidden items-center gap-1.5 text-xs text-text/50 lg:flex">
                    <button
                      type="button"
                      onClick={() => onSelect(homeId)}
                      className="hover:text-navy hover:underline"
                    >
                      {homeLabel}
                    </button>
                    <span aria-hidden>/</span>
                    <span className="text-text/70">{title}</span>
                  </nav>
                )}
                <h1 className="min-w-0 text-xl font-bold text-navy sm:text-2xl">{title}</h1>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {active !== homeId && (
                  <button type="button" onClick={() => onSelect(homeId)} className="btn-secondary">
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    {homeLabel}
                  </button>
                )}
                {headerRight}
              </div>
            </div>
            <div className="grid gap-4">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
