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

type LeadLike = { move_from: Addr; move_to: Addr; move_when: Record<string, unknown> | null | undefined; city: string | null; videos: unknown; items?: unknown };

/**
 * Details a lead still lacks, in movers' words (Hebrew). Used when the operator sends an unfinished lead to movers by hand:
 * the mover alert, the mover lead pages and /admin list what is missing.
 */
export function missingInfo(l: LeadLike): string[] {
  const out: string[] = [];
  const from = l.move_from, to = l.move_to;
  if (!cityOf(from, l.city)) out.push('עיר מוצא');
  if (!from?.rooms) out.push('גודל הדירה');
  if (!from?.address && !from?.street) out.push('כתובת במוצא');
  if (!from?.floor && from?.floor !== 0) out.push('קומה ומעלית במוצא');
  if (!cityOf(to)) out.push('עיר יעד');
  else if (!to?.address && !to?.street) out.push('כתובת ביעד');
  if (!l.move_when || !Object.keys(l.move_when).length) out.push('תאריך');
  const nVideos = Array.isArray(l.videos) ? l.videos.length : Number(l.videos) || 0;
  const items = l.items as { list?: unknown[] } | number | null | undefined;
  const nItems = typeof items === 'number' ? items : items?.list?.length || 0;
  if (!nVideos && !nItems) out.push('סרטון או רשימת פריטים');
  return out;
}
