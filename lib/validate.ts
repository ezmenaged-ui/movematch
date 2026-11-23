import { t, type Locale } from './i18n';

export type Variant = 'a' | 'wizard' | 'form' | 'items' | 'choice';

export type ElevatorType = 'small' | 'regular' | 'large';
/** Elevator size: what movers need to know (does a sofa / fridge fit?). */
export const ELEVATOR_TYPES: { v: ElevatorType; label: string }[] = [
  { v: 'small', label: 'קטנה' },
  { v: 'regular', label: 'בינונית' },
  { v: 'large', label: 'גדולה' },
];
export const elevatorText = (a: { elevator?: unknown; elevator_type?: unknown } | null | undefined) =>
  a?.elevator === true ? `יש מעלית${ELEVATOR_TYPES.find((t) => t.v === a.elevator_type) ? ` (${ELEVATOR_TYPES.find((t) => t.v === a.elevator_type)!.label})` : ''}`
  : a?.elevator === false ? 'רק מדרגות' : '';

/** Can a crane (מנוף) be used at this address? Clients usually know from an earlier move (trees, power lines). */
export type Crane = 'yes' | 'no' | 'unknown';
export const CRANE_OPTIONS: { v: Crane; label: string }[] = [
  { v: 'yes', label: 'כן, אפשר' },
  { v: 'no', label: 'לא' },
  { v: 'unknown', label: 'לא יודעים' },
];
export const craneText = (a: { crane?: unknown } | null | undefined) =>
  a?.crane === 'yes' ? 'אפשר מנוף' : a?.crane === 'no' ? 'אי אפשר מנוף' : a?.crane === 'unknown' ? 'מנוף: לא ידוע' : '';

/** Distance from the nearest spot where the truck can park to the building entrance. Changes the price a lot. */
export type Parking = 'p10' | 'p30' | 'p60' | 'p100' | 'far';
export const PARKING_OPTIONS: { v: Parking; label: string }[] = [
  { v: 'p10', label: 'עד 10 מ׳' },
  { v: 'p30', label: '10 עד 30 מ׳' },
  { v: 'p60', label: '30 עד 60 מ׳' },
  { v: 'p100', label: '60 עד 100 מ׳' },
  { v: 'far', label: 'מעל 100 מ׳ / אין חניה' },
];
export const parkingText = (a: { parking?: unknown } | null | undefined) => {
  const o = PARKING_OPTIONS.find((p) => p.v === a?.parking);
  return o ? `חניה למשאית: ${o.label}` : '';
};

/**
 * Size of the home they're moving FROM: the best single predictor of truck size, crew and price.
 * Israeli count = all rooms including the living room (2 bedrooms + salon = 3 חדרים); half rooms go to the lower bucket.
 */
export type Rooms = 'r1' | 'r2' | 'r3' | 'r4' | 'r5' | 'r6' | 'house';
export const ROOMS_OPTIONS: { v: Rooms; short: string; label: string }[] = [
  // label = text for messages and pages ("3 עד 3.5", like the parking labels: a "3–3.5" range flips in RTL text);
  // short = tile caption, always shown inside a left-to-right <bdi>.
  { v: 'r1', short: '1–1.5', label: '1 עד 1.5 חדרים' },
  { v: 'r2', short: '2–2.5', label: '2 עד 2.5 חדרים' },
  { v: 'r3', short: '3–3.5', label: '3 עד 3.5 חדרים' },
  { v: 'r4', short: '4–4.5', label: '4 עד 4.5 חדרים' },
  { v: 'r5', short: '5–5.5', label: '5 עד 5.5 חדרים' },
  { v: 'r6', short: '6+', label: '6 חדרים ומעלה' },
  { v: 'house', short: 'בית פרטי', label: 'בית פרטי / קוטג׳' },
];
export const ROOMS_VALUES = ROOMS_OPTIONS.map((o) => o.v) as string[];
/** "דירת 3 עד 3.5 חדרים" / "בית פרטי / קוטג׳", or '' when not given. */
export const roomsText = (a: { rooms?: unknown } | null | undefined) => {
  const o = ROOMS_OPTIONS.find((r) => r.v === a?.rooms);
  return !o ? '' : o.v === 'house' ? o.label : `דירת ${o.label}`;
};

export type Address = {
  city: string;
  /** "street number", kept for movers, emails and the crew sheet. Forms fill it from `street` + `number`. */
  address: string;
  street?: string;
  number?: string; // house number on the street
  floor: string;
  apartment: string;
  elevator: boolean | null;
  elevator_type?: ElevatorType | '';
  crane?: Crane | '';
  parking?: Parking | '';
  rooms?: Rooms | ''; // origin only
};

export const emptyAddress = (): Address => ({ city: '', address: '', street: '', number: '', floor: '', apartment: '', elevator: null, crane: '', parking: '' });

export const joinAddr = (street: string, number: string) => [street.trim(), number.trim()].filter(Boolean).join(' ');

/** Street and house number; a draft saved before they were split keeps its old full address in the street box. */
export const addrParts = (a: Address) =>
  a.street != null || a.number != null ? { street: a.street || '', number: a.number || '' }
    : ((m) => (m ? { street: m[1], number: m[2] } : { street: a.address || '', number: '' }))((a.address || '').trim().match(/^(.*\D)\s+(\d+[א-ת]?)$/));

/** Normalise to 05XXXXXXXX. Accepts spaces, dashes, +972 / 972 prefixes. */
export function normalizePhone(raw: string): string {
  let d = (raw || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+972')) d = '0' + d.slice(4);
  else if (d.startsWith('972')) d = '0' + d.slice(3);
  return d.replace(/\D/g, '');
}

export const isValidPhone = (raw: string) => /^05\d{8}$/.test(normalizePhone(raw));
export const isValidName = (raw: string) => (raw || '').trim().length >= 2;

/** Form messages in Hebrew (kept for older callers); msgs(locale) for the page language. */
export const MSG = {
  name: 'נא למלא שם מלא',
  phone: 'מספר טלפון לא תקין',
  city: 'נא לבחור עיר',
  address: 'נא למלא כתובת',
  street: 'נא למלא רחוב',
  number: 'נא למלא מספר בית',
  floor: 'נא למלא קומה',
  elevator: 'נא לבחור',
  video: 'נא לצרף סרטון, או לבחור לדלג ונחזור אליכם לקבלת הסרטון',
  crane: 'נא לבחור',
  parking: 'נא לבחור את המרחק',
  rooms: 'נא לבחור כמה חדרים יש בדירה',
};

export const msgs = (locale: Locale = 'he') => t(locale).msg;

/** Shown when this phone number already opened a tender in the last 30 days. `until` is YYYY-MM-DD. */
export function phoneRecentMsg(until?: string, locale: Locale = 'he') {
  const d = until && /^\d{4}-\d{2}-\d{2}$/.test(until)
    ? new Date(until + 'T12:00:00').toLocaleDateString(t(locale).dateLocale, { day: 'numeric', month: 'numeric', year: 'numeric' }) : '';
  return t(locale).msg.phoneRecent(d);
}

/** `origin`: the address they're moving from, which also needs the home size. */
export function validateAddress(a: Address, origin = false, locale: Locale = 'he'): Partial<Record<keyof Address, string>> {
  const MSG = t(locale).msg;
  const e: Partial<Record<keyof Address, string>> = {};
  if (origin && !a.rooms) e.rooms = MSG.rooms;
  if (!a.city.trim()) e.city = MSG.city;
  const { street, number } = addrParts(a);
  if (!street.trim()) e.street = MSG.street;
  if (!number.trim()) e.number = MSG.number;
  if (!a.floor.trim()) e.floor = MSG.floor;
  if (a.elevator == null) e.elevator = MSG.elevator;
  if (a.elevator === true && !a.elevator_type) e.elevator_type = MSG.elevatorType;
  if (!a.parking) e.parking = MSG.parking;
  return e;
}

export const CITIES = [
  'ירושלים', 'תל אביב-יפו', 'חיפה', 'ראשון לציון', 'פתח תקווה', 'אשדוד', 'נתניה', 'באר שבע', 'בני ברק', 'חולון',
  'רמת גן', 'אשקלון', 'רחובות', 'בת ים', 'בית שמש', 'כפר סבא', 'הרצליה', 'חדרה', 'מודיעין-מכבים-רעות', 'נצרת',
  'רמלה', 'לוד', 'רעננה', 'מודיעין עילית', 'רהט', 'הוד השרון', 'גבעתיים', 'קריית אתא', 'נהריה', 'בית"ר עילית',
  'אום אל-פחם', 'קריית גת', 'אילת', 'ראש העין', 'עפולה', 'נס ציונה', 'עכו', 'אלעד', 'רמת השרון', 'כרמיאל',
  'יבנה', 'טבריה', 'טייבה', 'קריית מוצקין', 'שפרעם', 'נוף הגליל', 'קריית ים', 'קריית ביאליק', 'קריית אונו', 'מעלה אדומים',
  'אור יהודה', 'צפת', 'נתיבות', 'דימונה', 'טירה', 'סח\'נין', 'יהוד-מונוסון', 'באקה אל-גרביה', 'אופקים', 'גבעת שמואל',
  'טירת כרמל', 'אריאל', 'שדרות', 'קריית שמונה', 'מגדל העמק', 'יקנעם עילית', 'כפר יונה', 'קריית מלאכי', 'אור עקיבא', 'זכרון יעקב',
  'גן יבנה', 'גדרה', 'מבשרת ציון', 'אבן יהודה', 'שוהם', 'קדימה-צורן', 'פרדס חנה-כרכור', 'כוכב יאיר-צור יגאל', 'גני תקווה', 'ערד',
];

/** When the customer wants to move. Date is required unless they're flexible; time is optional. */
export type When = { date: string; date_flexible: boolean; time: '' | 'morning' | 'noon' | 'afternoon'; time_flexible: boolean };
export const emptyWhen = (): When => ({ date: '', date_flexible: false, time: '', time_flexible: false });
export const TIME_LABEL: Record<string, string> = { morning: 'בוקר (7:00–11:00)', noon: 'צהריים (11:00–15:00)', afternoon: 'אחר הצהריים (15:00–19:00)' };

export function validateWhen(w: When, locale: Locale = 'he'): { date?: string } {
  return !w.date && !w.date_flexible ? { date: t(locale).msg.date } : {};
}

/** "יום שני, 15.12.2026 · בוקר (7:00–11:00)". Hebrew by default (movers, emails); `locale` for the English pages. */
export function whenText(w: Partial<When> | null | undefined, locale: Locale = 'he'): string {
  if (!w) return '';
  const o = t(locale).opts;
  const d = w.date ? new Date(w.date + 'T12:00:00').toLocaleDateString(t(locale).dateLocale, { weekday: 'long', day: 'numeric', month: locale === 'he' ? 'numeric' : 'short', year: 'numeric' }) : '';
  const date = d ? `${d}${w.date_flexible ? o.flexible : ''}` : w.date_flexible ? o.dateFlexible : '';
  const time = w.time ? `${o.time[w.time] || w.time}${w.time_flexible ? o.flexible : ''}` : w.time_flexible ? o.timeFlexible : '';
  return [date, time].filter(Boolean).join(' · ');
}

/**
 * Turn whatever a person pasted into a clean https:// link, or '' if empty, or null if no link is in it.
 * Phones paste share text ("Check out X on Google Maps: https://maps.app.goo.gl/…"), links without https://
 * ("www.midrag.co.il/…"), or http:// links. We pull out the first link, add or upgrade to https://, and drop
 * trailing punctuation.
 */
export function cleanUrl(raw: string): string | null {
  const s = (raw || '').trim();
  if (!s) return '';
  const m = s.match(/https?:\/\/[^\s<>"'״]+/i)?.[0]
    ?? s.match(/(?:^|[\s:(])((?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"'״]*)?)/i)?.[1];
  if (!m) return null;
  const link = 'https://' + m.replace(/[.,;:!?)\]}]+$/, '').replace(/^https?:\/\//i, '');
  try {
    const u = new URL(link);
    if (u.protocol !== 'https:' || !u.hostname.includes('.')) return null;
    const out = u.toString();
    return out.length <= 500 ? out : null;
  } catch { return null; }
}
