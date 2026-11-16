export type Variant = 'a' | 'wizard' | 'form' | 'items' | 'choice';

export type ElevatorType = 'small' | 'regular' | 'large';
/** Elevator size: what movers need to know (does a sofa / fridge fit?). */
export const ELEVATOR_TYPES: { v: ElevatorType; label: string; hint: string }[] = [
  { v: 'small', label: 'קטנה', hint: 'עד 4 אנשים' },
  { v: 'regular', label: 'רגילה', hint: '5–8 אנשים' },
  { v: 'large', label: 'גדולה / משא', hint: 'נכנסת ספה או מקרר' },
];
export const elevatorText = (a: { elevator?: unknown; elevator_type?: unknown } | null | undefined) =>
  a?.elevator === true ? `יש מעלית${ELEVATOR_TYPES.find((t) => t.v === a.elevator_type) ? ` (${ELEVATOR_TYPES.find((t) => t.v === a.elevator_type)!.label})` : ''}`
  : a?.elevator === false ? 'רק מדרגות' : '';

export type Address = {
  city: string;
  address: string;
  floor: string;
  apartment: string;
  elevator: boolean | null;
  elevator_type?: ElevatorType | '';
};

export const emptyAddress = (): Address => ({ city: '', address: '', floor: '', apartment: '', elevator: null });

/** Normalise to 05XXXXXXXX. Accepts spaces, dashes, +972 / 972 prefixes. */
export function normalizePhone(raw: string): string {
  let d = (raw || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+972')) d = '0' + d.slice(4);
  else if (d.startsWith('972')) d = '0' + d.slice(3);
  return d.replace(/\D/g, '');
}

export const isValidPhone = (raw: string) => /^05\d{8}$/.test(normalizePhone(raw));
export const isValidName = (raw: string) => (raw || '').trim().length >= 2;

export const MSG = {
  name: 'נא למלא שם מלא',
  phone: 'מספר טלפון לא תקין',
  city: 'נא לבחור עיר',
  address: 'נא למלא כתובת',
  floor: 'נא למלא קומה',
  elevator: 'נא לבחור',
  video: 'נא לצרף סרטון, או לבחור לדלג ונחזור אליכם לקבלת הסרטון',
};

/** Shown when this phone number already opened a tender in the last 30 days. `until` is YYYY-MM-DD. */
export function phoneRecentMsg(until?: string) {
  const d = until && /^\d{4}-\d{2}-\d{2}$/.test(until)
    ? new Date(until + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '';
  return `כבר נפתח מכרז עם מספר הטלפון הזה בחודש האחרון. אפשר לפתוח מכרז חדש${d ? ` החל מ־${d}` : ' 30 יום אחרי הקודם'}.`;
}

export function validateAddress(a: Address): Partial<Record<keyof Address, string>> {
  const e: Partial<Record<keyof Address, string>> = {};
  if (!a.city.trim()) e.city = MSG.city;
  if (!a.address.trim()) e.address = MSG.address;
  if (!a.floor.trim()) e.floor = MSG.floor;
  if (a.elevator === true && !a.elevator_type) e.elevator_type = 'נא לבחור את גודל המעלית';
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

export function validateWhen(w: When): { date?: string } {
  return !w.date && !w.date_flexible ? { date: 'נא לבחור תאריך, או לסמן שאתם גמישים' } : {};
}

export function whenText(w: Partial<When> | null | undefined): string {
  if (!w) return '';
  const d = w.date ? new Date(w.date + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' }) : '';
  const date = d ? `${d}${w.date_flexible ? ' (גמיש)' : ''}` : w.date_flexible ? 'תאריך גמיש' : '';
  const time = w.time ? `${TIME_LABEL[w.time] || w.time}${w.time_flexible ? ' (גמיש)' : ''}` : w.time_flexible ? 'שעה גמישה' : '';
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
