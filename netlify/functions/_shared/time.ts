/**
 * Asia/Kolkata date helpers. Admissions windows and birthday matching are
 * computed in the school's local timezone regardless of server locale.
 */
const TZ = 'Asia/Kolkata';

/** Returns { year, month (1-12), day } for "now" in Asia/Kolkata. */
export function kolkataParts(now = new Date()): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/**
 * Default automatic admissions window: Dec 1 – Apr 30 inclusive, evaluated in
 * Asia/Kolkata. December, January, February, March, April are "open".
 */
export function isAutomaticAdmissionOpen(now = new Date()): boolean {
  const { month } = kolkataParts(now);
  return month === 12 || month <= 4;
}
