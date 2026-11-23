import { notFound } from 'next/navigation';
import { Navigation, Phone, Truck } from 'lucide-react';
import { db } from '@/lib/db';
import { addrLine, dayLabel, type Lang } from '@/lib/crew';
import { ITEMS_RU } from '@/lib/itemsRu';
import type { ItemsValue } from '@/lib/items';
import '@/app/admin.css';
import '@/app/mover.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'דף עבודה · MoveMatch', robots: { index: false, follow: false } };

type Addr = Record<string, unknown> | null;
type Sheet = {
  kind: 'lead' | 'manual'; company: string; title?: string; tender_no?: number; date: string; start_time: string | null; end_time: string | null;
  from_text?: string; to_text?: string; items_text?: string; notes?: string; note?: string | null;
  city?: string | null; move_from?: Addr; move_to?: Addr; items?: ItemsValue | null; client?: { name: string; phone: string }; crew: string[];
};

const L = {
  he: { sheet: 'דף עבודה', job: 'הובלה', when: 'מתי', hours: 'שעות', crew: 'צוות', from: 'איסוף · מאיפה', to: 'פריקה · לאן', items: 'רשימת פריטים', item: 'פריט', qty: 'כמות', dis: 'פירוק', asm: 'הרכבה',
    boxes: 'קרטונים', total: 'סה״כ פריטים', notes: 'הערות', client: 'לקוח', call: 'התקשרות', nav: 'ניווט ב-Waze', noItems: 'הלקוח לא מסר רשימת פריטים.', tbd: 'תתואם', switchTo: 'Русский', custom: '* פריט שהלקוח הוסיף בעצמו' },
  ru: { sheet: 'Лист работы', job: 'Переезд', when: 'Когда', hours: 'Часы', crew: 'Бригада', from: 'Погрузка · откуда', to: 'Разгрузка · куда', items: 'Список вещей', item: 'Вещь', qty: 'Кол-во', dis: 'Разборка', asm: 'Сборка',
    boxes: 'коробок', total: 'Всего вещей', notes: 'Примечания', client: 'Клиент', call: 'Позвонить', nav: 'Навигация Waze', noItems: 'Клиент не указал список вещей.', tbd: 'уточняется', switchTo: 'עברית', custom: '* вещь добавлена клиентом (на иврите)' },
};

const waze = (q: string) => `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export default async function JobSheet({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { token } = await params;
  const lang: Lang = (await searchParams).lang === 'ru' ? 'ru' : 'he';
  if (!/^[0-9a-f-]{36}$/.test(token)) notFound();
  const { data } = await db().rpc('mm_job_sheet', { p_token: token });
  if (!data) notFound();
  const s = data as Sheet;
  const t = L[lang];
  const fromText = s.kind === 'lead' ? addrLine(s.move_from || (s.city ? { city: s.city } : null), '', lang) : s.from_text || '';
  const toText = s.kind === 'lead' ? addrLine(s.move_to, '', lang) : s.to_text || '';
  const navFrom = s.kind === 'lead' ? [str(s.move_from?.address), str(s.move_from?.city) || str(s.city)].filter(Boolean).join(', ') : s.from_text || '';
  const navTo = s.kind === 'lead' ? [str(s.move_to?.address), str(s.move_to?.city)].filter(Boolean).join(', ') : s.to_text || '';
  const hrs = s.start_time ? `${s.start_time}${s.end_time ? `–${s.end_time}` : ''}` : t.tbd;
  const title = s.kind === 'manual' ? s.title : `${t.job}${s.tender_no ? ` #${s.tender_no}` : ''}`;
  const list = s.items?.list || [];
  const notes = [s.notes, s.note].filter(Boolean).join('\n');

  const Stop = ({ label, text, nav }: { label: string; text: string; nav: string }) => (
    <div className="mv-stop">
      <h3>{label}</h3>
      <p style={{ margin: '0 0 8px', fontSize: 16 }}>{text || '—'}</p>
      {nav && <a className="btn btn-secondary" href={waze(nav)} target="_blank" rel="noreferrer"><Navigation size={15} /> {t.nav}</a>}
    </div>
  );

  return (
    <main className="mmx mv" dir={lang === 'ru' ? 'ltr' : 'rtl'} lang={lang} style={{ display: 'block', minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '16px 14px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="mv-head" style={{ alignItems: 'center' }}>
          <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="mmx-brand-ico" aria-hidden><Truck size={20} strokeWidth={1.75} /></span><span><b>{s.company}</b><br /><small className="mv-meta">{t.sheet}</small></span></span>
          <a className="btn btn-secondary" href={`/j/${token}${lang === 'ru' ? '' : '?lang=ru'}`}>{t.switchTo}</a>
        </div>
        <section className="mmx-hero">
          <span className="mmx-kicker">{dayLabel(s.date, lang)} · <span dir="ltr">{hrs}</span></span>
          <h1 style={{ fontSize: 30 }}>{title}</h1>
          {s.crew.length > 0 && <p>{t.crew}: {s.crew.join(', ')}</p>}
        </section>
        <div className="mv-grid2">
          <Stop label={t.from} text={fromText} nav={navFrom} />
          <Stop label={t.to} text={toText} nav={navTo} />
        </div>
        {s.client && (
          <div className="mv-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span><span className="mv-meta">{t.client}: </span><b>{s.client.name}</b> <span dir="ltr">{s.client.phone}</span></span>
            <a className="btn btn-primary" href={`tel:${s.client.phone}`}><Phone size={15} /> {t.call}</a>
          </div>
        )}
        <div className="mv-card">
          <h2>{t.items}</h2>
          {s.kind === 'manual' ? (s.items_text ? <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 15 }}>{s.items_text}</p> : <p className="mv-meta" style={{ margin: 0 }}>{t.noItems}</p>)
            : list.length === 0 ? <p className="mv-meta" style={{ margin: 0 }}>{t.noItems}</p> : (
              <>
                <table className="mv-bill-table" style={{ textAlign: lang === 'ru' ? 'left' : 'right' }}>
                  <thead><tr><th>{t.item}</th><th>{t.qty}</th><th>{t.dis}</th><th>{t.asm}</th></tr></thead>
                  <tbody>{list.map((i) => <tr key={i.id}><td>{lang === 'ru' && ITEMS_RU[i.id] ? ITEMS_RU[i.id] : i.name}{i.custom ? ' *' : ''}</td><td>{i.qty}</td><td>{i.dis ? '✓' : ''}</td><td>{i.asm ? '✓' : ''}</td></tr>)}</tbody>
                </table>
                <p className="mv-meta" style={{ margin: 0 }}>{t.total}: {list.reduce((n, i) => n + i.qty, 0)}{s.items?.boxes ? ` · ~${s.items.boxes} ${t.boxes}` : ''}{list.some((i) => i.custom) ? ` · ${t.custom}` : ''}</p>
              </>
            )}
        </div>
        {notes && <div className="mv-card"><h2>{t.notes}</h2><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{notes}</p></div>}
        <p className="mv-meta" style={{ textAlign: 'center', margin: 0 }}><b dir="ltr">MoveMatch</b></p>
      </div>
    </main>
  );
}
