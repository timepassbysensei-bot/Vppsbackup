import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Send } from 'lucide-react';
import { callFunction } from '@/lib/api';
import { useLang } from '@/lib/hooks/useLang';
import { Turnstile } from './Turnstile';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  actions?: { id: string; label_en: string; label_hi: string; href: string }[];
}

/**
 * "Sensei" chatbot widget. Lower-corner, non-blocking, keyboard accessible, with
 * an aria-live region for responses. It only ever calls the same-origin
 * sensei-chat Function; the Gemini key stays server-side.
 */
export function SenseiWidget() {
  const { t } = useTranslation();
  const [lang] = useLang();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState('');
  const liveRef = useRef<HTMLDivElement>(null);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setInput('');
    setBusy(true);
    try {
      const res = await callFunction<{ reply: string; actions?: Msg['actions'] }>('sensei-chat', {
        message,
        history,
        lang,
        turnstileToken: token,
      });
      setMessages((m) => [...m, { role: 'assistant', content: res.reply, actions: res.actions }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: t('sensei.disclaimer') },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="sensei-panel"
        className="fixed bottom-4 right-4 z-40 flex min-h-touch min-w-touch items-center gap-2 rounded-full bg-navy px-4 py-3 text-white shadow-card hover:bg-navy-600"
      >
        <MessageCircle className="h-5 w-5" aria-hidden />
        <span className="text-sm font-semibold">{t('sensei.title')}</span>
      </button>

      {open && (
        <div
          id="sensei-panel"
          role="dialog"
          aria-label={t('sensei.title')}
          className="fixed bottom-20 right-4 z-40 flex h-[28rem] w-[22rem] max-w-[92vw] flex-col overflow-hidden rounded bg-white shadow-xl ring-1 ring-black/10"
        >
          <div className="flex items-center justify-between bg-navy px-3 py-2 text-white">
            <span className="text-sm font-semibold">{t('sensei.title')}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label={t('common.close')} className="min-h-touch min-w-touch">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div ref={liveRef} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
            {messages.length === 0 && <p className="text-text/60">{t('sensei.placeholder')}</p>}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <span
                  className={`inline-block whitespace-pre-line rounded px-3 py-2 ${
                    m.role === 'user' ? 'bg-navy text-white' : 'bg-surface text-text'
                  }`}
                  lang={lang}
                >
                  {m.content}
                </span>
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.actions.map((a) => (
                      <a key={a.id} href={a.href} className="btn-secondary text-xs">
                        {lang === 'hi' ? a.label_hi : a.label_en}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-black/5 p-2">
            <Turnstile onToken={setToken} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="flex items-center gap-2"
            >
              <label className="sr-only" htmlFor="sensei-input">
                {t('sensei.placeholder')}
              </label>
              <input
                id="sensei-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('sensei.placeholder')}
                maxLength={1000}
                className="min-h-touch flex-1 rounded border border-black/10 px-3 py-2 text-sm"
              />
              <button type="submit" disabled={busy || !input.trim()} className="btn-primary" aria-label={t('sensei.send')}>
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </form>
            <p className="mt-1 text-[11px] text-text/50">{t('sensei.disclaimer')}</p>
          </div>
        </div>
      )}
    </>
  );
}
