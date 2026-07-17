import { useEffect, useRef } from 'react';
import { env } from '@/lib/env';

/**
 * Thin wrapper around the Cloudflare Turnstile widget. Renders the challenge and
 * hands the resulting token to `onToken`. Loads the official script once.
 *
 * When VITE_TURNSTILE_SITE_KEY is not configured (e.g. local dev without a key)
 * the widget renders nothing and no token is produced — the server then rejects
 * the request, which is the correct fail-closed behaviour.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

function ensureScript(): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const siteKey = env.turnstileSiteKey;
    if (!siteKey || !ref.current) return;
    let widgetId: string | undefined;
    let cancelled = false;

    void ensureScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return;
      widgetId = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
        'refresh-expired': 'auto',
        theme: 'light',
      });
    });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.reset(widgetId);
    };
  }, [onToken]);

  if (!env.turnstileSiteKey) {
    return (
      <p className="text-xs text-danger">
        Turnstile is not configured (VITE_TURNSTILE_SITE_KEY missing).
      </p>
    );
  }
  return <div ref={ref} className="my-2" />;
}
