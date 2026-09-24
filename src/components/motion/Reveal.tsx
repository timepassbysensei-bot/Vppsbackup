import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Motion primitives — deliberately dependency-free (no animation library) so the
 * bundle stays small and everything remains compatible with the site's strict CSP.
 *
 * Reveal/scroll animations toggle a CSS CLASS (`is-visible`); they never inject
 * markup-level inline styles. Parallax (which needs a dynamic value) writes to
 * `element.style` through the CSSOM, which CSP does not restrict.
 *
 * `prefers-reduced-motion` disables all of this and the matching CSS rules keep
 * the content fully visible (see src/styles/tokens.css).
 */

export type RevealVariant = 'up' | 'left' | 'right' | 'scale' | 'mask';
export type RevealDelay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const VARIANT_CLASS: Record<RevealVariant, string> = {
  up: 'reveal',
  left: 'reveal-left',
  right: 'reveal-right',
  scale: 'reveal-scale',
  mask: 'reveal-mask',
};

const DELAY_CLASSES = ['', 'reveal-d1', 'reveal-d2', 'reveal-d3', 'reveal-d4', 'reveal-d5', 'reveal-d6'];

export function revealClasses(variant: RevealVariant = 'up', delay: RevealDelay = 0): string {
  return [VARIANT_CLASS[variant], DELAY_CLASSES[delay] ?? ''].filter(Boolean).join(' ');
}

/**
 * Adds `is-visible` to the referenced element the first time it scrolls into
 * view. Attach the returned ref to any element (including `<li>`, so lists stay
 * semantically valid).
 */
export function useRevealRef<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver (or SSR): show content immediately.
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/** Convenience wrapper: reveals a block on scroll. */
export function Reveal({
  children,
  variant = 'up',
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: RevealDelay;
  className?: string;
}) {
  const ref = useRevealRef<HTMLDivElement>();
  return (
    <div ref={ref} className={[revealClasses(variant, delay), className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

/**
 * Subtle scroll parallax. Translates its children as they move through the
 * viewport. `speed` is small by default (0.12) — enough to feel alive, never
 * enough to make text wobble.
 */
export function Parallax({
  children,
  speed = 0.12,
  className = '',
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduced =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      // -1 (below fold) .. +1 (above fold), 0 when centered.
      const progress = (rect.top + rect.height / 2 - viewport / 2) / viewport;
      el.style.transform = `translate3d(0, ${(progress * speed * 120).toFixed(2)}px, 0)`;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
      el.style.transform = '';
    };
  }, [speed]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
