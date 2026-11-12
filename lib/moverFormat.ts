/** Formatting helpers shared by mover panel pages (server + client safe). */
type Addr = Record<string, unknown> | null | undefined;

export const TZ = 'Asia/Jerusalem';
export const cityOf = (a: Addr, fb?: string | null) => (typeof a?.city === 'string' && a.city) || fb || '';
export const routeText = (l: { move_from: Addr; move_to: Addr; city: string | null }) => `${cityOf(l.move_from, l.city) || '?'} ← ${cityOf(l.move_to) || '?'}`;
export const nis = (n: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
export const dayHe = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
export const dateShort = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
export const stamp = (iso: string) => new Date(iso).toLocaleString('he-IL', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' });
export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');

/** YYYY-MM-DD for an instant, in Israel time. */
export function israelDate(d: Date = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}
export function addDays(key: string, n: number) {
  const d = new Date(key + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Sunday of the week containing `key`. */
export const weekStart = (key: string) => addDays(key, -new Date(key + 'T12:00:00Z').getUTCDay());

export const VAT_RATE = 18;
export const ENTITY_LABEL: Record<string, string> = { dealer: 'עוסק מורשה', company: 'חברה בע״מ', exempt: 'עוסק פטור' };
