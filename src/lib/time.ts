/** Client-side Asia/Kolkata helpers (display only; server re-checks the window). */
export function kolkataMonth(now = new Date()): number {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', month: '2-digit' });
  return Number(fmt.format(now));
}

/** Default automatic window: Dec 1 – Apr 30 inclusive. */
export function isAutomaticAdmissionOpen(now = new Date()): boolean {
  const m = kolkataMonth(now);
  return m === 12 || m <= 4;
}
