/** Crew scheduling: shared types + Hebrew / Russian text for the daily WhatsApp message. Safe on server and client. */
export type Lang = 'he' | 'ru';
export type Crew = { id: string; full_name: string; email: string | null; phone: string; lang: Lang; created_at: string };
export type ManualJob = {
  id: string; title: string; date: string; start_time: string | null; end_time: string | null;
  from_text: string; to_text: string; items_text: string; notes: string; crew_ids: string[]; sheet_token: string;
};
/** One job on the schedule, from either a MoveMatch booking or a job the mover added by hand. */
export type DayJob = {
  key: string; kind: 'lead' | 'manual'; title: string; date: string; start: string; end: string;
  from: Addr; to: Addr; fromText: string; toText: string; crew: string[]; sheet: string; href: string; done?: boolean; tender?: string;
};
type Addr = Record<string, unknown> | null | undefined;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const T = {
  he: { floor: 'קומה', apt: 'דירה', elev: 'יש מעלית', stairs: 'בלי מעלית', crane: 'אפשר מנוף', park: 'חניה למשאית', from: 'מאיפה', to: 'לאן', items: 'רשימת פריטים', none: 'אין לך עבודות מתוכננות', hi: 'היי', sched: 'הלו״ז שלך ל', noTime: 'שעה תתואם', job: 'עבודה' },
  ru: { floor: 'этаж', apt: 'кв.', elev: 'есть лифт', stairs: 'без лифта', crane: 'можно кран', park: 'парковка грузовика', from: 'Откуда', to: 'Куда', items: 'Список вещей', none: 'Нет запланированных работ на', hi: 'Привет', sched: 'Твой график на', noTime: 'время уточняется', job: 'Работа' },
};

const PARK: Record<Lang, Record<string, string>> = {
  he: { p10: 'עד 10 מ׳', p30: '10 עד 30 מ׳', p60: '30 עד 60 מ׳', p100: '60 עד 100 מ׳', far: 'מעל 100 מ׳ / אין חניה' },
  ru: { p10: 'до 10 м', p30: '10–30 м', p60: '30–60 м', p100: '60–100 м', far: 'более 100 м / нет парковки' },
};

const ROOMS: Record<Lang, Record<string, string>> = {
  he: { r1: '1 עד 1.5 חדרים', r2: '2 עד 2.5 חדרים', r3: '3 עד 3.5 חדרים', r4: '4 עד 4.5 חדרים', r5: '5 עד 5.5 חדרים', r6: '6 חדרים ומעלה', house: 'בית פרטי' },
  ru: { r1: '1–1.5 комн.', r2: '2–2.5 комн.', r3: '3–3.5 комн.', r4: '4–4.5 комн.', r5: '5–5.5 комн.', r6: '6+ комн.', house: 'частный дом' },
};

/** "דיזנגוף 100, תל אביב · קומה 3, דירה 7 · יש מעלית" (labels in the chosen language; street/city as the client typed them). */
export function addrLine(a: Addr, text: string, lang: Lang) {
  if (!a) return text;
  const t = T[lang];
  const place = [str(a.address), str(a.city)].filter(Boolean).join(', ');
  const fl = [str(a.floor) && `${t.floor} ${str(a.floor)}`, str(a.apartment) && `${t.apt} ${str(a.apartment)}`].filter(Boolean).join(', ');
  const el = a.elevator === true ? t.elev : a.elevator === false ? t.stairs : '';
  const cr = a.crane === 'yes' ? t.crane : '';
  const pk = PARK[lang][a.parking as string] ? `${t.park} ${PARK[lang][a.parking as string]}` : '';
  return [ROOMS[lang][a.rooms as string] || '', place, fl, el, cr, pk].filter(Boolean).join(' · ');
}

export const hours = (j: Pick<DayJob, 'start' | 'end'>, lang: Lang) => (j.start ? `${j.start}${j.end ? `–${j.end}` : ''}` : T[lang].noTime);

export function dayLabel(date: string, lang: Lang) {
  return new Date(date + 'T12:00:00').toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** WhatsApp text: the member's jobs for one day, each with hours, from → to and the item-list link. */
export function scheduleMessage(o: { name: string; date: string; jobs: DayJob[]; company: string; site: string; lang: Lang }) {
  const t = T[o.lang];
  const first = o.name.trim().split(/\s+/)[0];
  if (!o.jobs.length) return `${t.hi} ${first}, ${t.none} ${o.lang === 'ru' ? '' : 'ב'}${dayLabel(o.date, o.lang)}.\n${o.company}`;
  const blocks = o.jobs.map((j, i) => [
    `${i + 1}) ${hours(j, o.lang)} · ${j.kind === 'manual' ? j.title : `${t.job}${j.tender ? ` #${j.tender}` : ''}`}`,
    `📍 ${t.from}: ${addrLine(j.from, j.fromText, o.lang) || '—'}`,
    `🏁 ${t.to}: ${addrLine(j.to, j.toText, o.lang) || '—'}`,
    `📋 ${t.items}: ${o.site}/j/${j.sheet}${o.lang === 'ru' ? '?lang=ru' : ''}`,
  ].join('\n'));
  return `${t.hi} ${first}! ${t.sched}${o.lang === 'ru' ? ' ' : ''}${dayLabel(o.date, o.lang)}:\n\n${blocks.join('\n\n')}\n\n${o.company}`;
}

export const waUrl = (phone: string, text?: string) => `https://wa.me/972${phone.replace(/\D/g, '').replace(/^0/, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
