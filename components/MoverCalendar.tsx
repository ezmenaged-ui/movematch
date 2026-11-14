'use client';
import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight, Clock, ExternalLink, FileText, MapPin, Plus, Trash2, Users, X } from 'lucide-react';
import { calDeleteEvent, calDeleteJob, calSaveJob, type CalResult } from '@/app/movers/actions';
import type { Crew, ManualJob } from '@/lib/crew';
import { addDays } from '@/lib/moverFormat';

export type CalView = 'week' | 'day';
export type CalBlock = {
  key: string; date: string; start: string; end: string; title: string; kind: 'lead' | 'manual' | 'ext';
  crewNames?: string; href?: string; sheet?: string; done?: boolean; tender?: string;
};

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const FIRST = 6, LAST = 22, ROW = 48; // visible hours 06:00–23:00, px per hour
const ERR: Record<string, string> = { title: 'נא לתת שם להובלה.', date: 'נא לבחור תאריך.', hours: 'שעת הסיום צריכה להיות אחרי שעת ההתחלה.', db: 'השמירה נכשלה. נסו שוב.' };

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const t5 = (t?: string | null) => (t ? t.slice(0, 5) : '');
const d12 = (k: string) => new Date(k + 'T12:00:00Z');
const dayLong = (k: string) => d12(k).toLocaleDateString('he-IL', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });

/** Side-by-side lanes for overlapping blocks in one day. */
function layout<B extends { start: string; end: string }>(day: B[]) {
  const timed = day.filter((b) => b.start).sort((a, b) => mins(a.start) - mins(b.start));
  const out: (B & { top: number; h: number; lane: number; lanes: number })[] = [];
  let cluster: typeof out = [], clusterEnd = -1;
  const flush = () => { const n = Math.max(1, ...cluster.map((c) => c.lane + 1)); cluster.forEach((c) => (c.lanes = n)); out.push(...cluster); cluster = []; };
  for (const b of timed) {
    const s = Math.max(mins(b.start), FIRST * 60), e = Math.min(b.end ? mins(b.end) : mins(b.start) + 60, (LAST + 1) * 60);
    if (s >= clusterEnd && cluster.length) flush();
    const used = cluster.filter((c) => c.top + c.h > ((s - FIRST * 60) / 60) * ROW).map((c) => c.lane);
    let lane = 0; while (used.includes(lane)) lane++;
    cluster.push({ ...b, top: ((s - FIRST * 60) / 60) * ROW, h: Math.max(ROW * 0.5, ((Math.max(e, s + 30) - s) / 60) * ROW), lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, e);
  }
  if (cluster.length) flush();
  return out;
}

type Pop =
  | { type: 'new'; date: string; start: string; end: string }
  | { type: 'manual'; job: ManualJob }
  | { type: 'lead' | 'ext'; block: CalBlock };

/** Google-Calendar-style week / day view. Tapping an empty slot or a job opens a pop-up editor instead of a new page. */
export function MoverCalendar({ view, anchor, keys, today, label, blocks, crew, manual }: {
  view: CalView; anchor: string; keys: string[]; today: string; label: string;
  blocks: CalBlock[]; crew: Crew[]; manual: ManualJob[];
}) {
  const [pop, setPop] = useState<Pop | null>(null);
  const [toast, setToast] = useState('');
  const [now, setNow] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const step = view === 'week' ? 7 : 1;
  const url = (d: string, v: CalView = view) => `/movers/calendar?w=${d}${v === 'day' ? '&v=day' : ''}`;
  const shift = (n: number) => addDays(anchor, n);

  // Current time in Israel, for the red "now" line; refreshed every minute.
  useEffect(() => {
    const tick = () => { const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()); setNow(mins(p)); };
    tick(); const t = setInterval(tick, 60_000); return () => clearInterval(t);
  }, []);
  // Open scrolled to the working morning (07:00), like Google.
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = ROW * (7 - FIRST) - 12; }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t); }, [toast]);

  const open = (b: CalBlock) => {
    if (b.kind === 'manual') { const job = manual.find((m) => m.id === b.key); if (job) setPop({ type: 'manual', job }); }
    else setPop({ type: b.kind, block: b });
  };
  const slotClick = (e: React.MouseEvent<HTMLDivElement>, date: string) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const s = Math.min(FIRST * 60 + Math.floor(y / (ROW / 2)) * 30, 22 * 60);
    setPop({ type: 'new', date, start: hm(s), end: hm(Math.min(s + 120, 23 * 60 + 30)) });
  };
  const close = (msg?: string) => { setPop(null); if (msg) setToast(msg); };
  const draft = pop?.type === 'new' ? pop : null;

  const chip = (b: CalBlock, style?: React.CSSProperties) => (
    <button key={b.key} type="button" className={`mv-ev ${b.kind} ${b.done ? 'done' : ''}`} style={style} onClick={(e) => { e.stopPropagation(); open(b); }}>
      <span>{b.title}</span>
      {b.start && <b dir="ltr">{b.start}{b.end ? `–${b.end}` : ''}</b>}
      {b.crewNames && <small>👷 {b.crewNames}</small>}
    </button>
  );

  const cols = { gridTemplateColumns: `58px repeat(${keys.length}, minmax(0, 1fr))` };
  return (
    <div className={`mv-card mv-cal mv-cal-${view}`}>
      <div className="mv-cal-bar">
        <div className="mv-cal-nav">
          <Link className="btn btn-secondary" href={url(today)}>היום</Link>
          <Link className="mv-icon-btn" href={url(shift(-step))} aria-label={view === 'week' ? 'שבוע קודם' : 'יום קודם'} title={view === 'week' ? 'שבוע קודם' : 'יום קודם'}><ChevronRight size={20} /></Link>
          <Link className="mv-icon-btn" href={url(shift(step))} aria-label={view === 'week' ? 'שבוע הבא' : 'יום הבא'} title={view === 'week' ? 'שבוע הבא' : 'יום הבא'}><ChevronLeft size={20} /></Link>
          <h2>{label}</h2>
        </div>
        <div className="mv-cal-nav">
          <div className="mv-lang" role="group" aria-label="תצוגה">
            <Link href={url(anchor, 'week')} aria-current={view === 'week' ? 'page' : undefined} className={view === 'week' ? 'on' : ''}>שבוע</Link>
            <Link href={url(view === 'week' && keys.includes(today) ? today : anchor, 'day')} aria-current={view === 'day' ? 'page' : undefined} className={view === 'day' ? 'on' : ''}>יום</Link>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setPop({ type: 'new', date: keys.includes(today) ? today : keys[0], start: '08:00', end: '12:00' })}><Plus size={16} /> הוספת הובלה</button>
        </div>
      </div>

      <div className="mv-week-scroll" ref={scroller} tabIndex={0} aria-label={view === 'week' ? 'יומן שבועי' : 'יומן יומי'}>
        <div className="mv-wk">
          <div className="mv-wk-head" style={cols}>
            <div className="mv-wh-gut">GMT+2</div>
            {keys.map((k) => {
              const inner = <><small>{DAYS[d12(k).getUTCDay()]}</small><span className="mv-wh-num">{Number(k.slice(8))}</span></>;
              return view === 'week'
                ? <Link key={k} href={url(k, 'day')} className={`mv-wh ${k === today ? 'today' : ''}`} title="תצוגת יום">{inner}</Link>
                : <div key={k} className={`mv-wh ${k === today ? 'today' : ''}`}>{inner}</div>;
            })}
            <div className="mv-wt">ללא שעה</div>
            {keys.map((k) => <div key={k} className="mv-ws">{blocks.filter((b) => b.date === k && !b.start).map((b) => chip(b))}</div>)}
          </div>
          <div className="mv-wk-body" style={{ ...cols, height: (LAST - FIRST + 1) * ROW }}>
            <div className="mv-wk-times">{Array.from({ length: LAST - FIRST + 1 }, (_, i) => <div key={i} style={{ height: ROW }}>{i ? `${String(FIRST + i).padStart(2, '0')}:00` : ''}</div>)}</div>
            {keys.map((k) => (
              <div key={k} className={`mv-wk-day ${k === today ? 'today' : ''}`} style={{ backgroundSize: `100% ${ROW}px` }} onClick={(e) => slotClick(e, k)} title="לחיצה מוסיפה הובלה">
                {layout(blocks.filter((b) => b.date === k)).map((b) => chip(b, { position: 'absolute', top: b.top + 1, height: b.h - 3, insetInlineStart: `calc(${(b.lane / b.lanes) * 100}% + 2px)`, width: `calc(${100 / b.lanes}% - 6px)` }))}
                {draft && draft.date === k && (
                  <div className="mv-ev draft" style={{ position: 'absolute', top: ((mins(draft.start) - FIRST * 60) / 60) * ROW + 1, height: Math.max(ROW / 2, ((mins(draft.end) - mins(draft.start)) / 60) * ROW) - 3, insetInlineStart: 2, width: 'calc(100% - 6px)' }}>
                    <span>(ללא שם)</span><b dir="ltr">{draft.start}–{draft.end}</b>
                  </div>
                )}
                {k === today && now !== null && now >= FIRST * 60 && now < (LAST + 1) * 60 && <div className="mv-now" style={{ top: ((now - FIRST * 60) / 60) * ROW }} aria-hidden />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {pop && (
        <CalDialog onClose={() => close()} wide={pop.type === 'new' || pop.type === 'manual'}>
          {(pop.type === 'new' || pop.type === 'manual') && (
            <JobForm key={pop.type === 'manual' ? pop.job.id : 'new'} pop={pop} crew={crew} onDone={close}
              onChange={(date, start, end) => pop.type === 'new' && setPop({ ...pop, date, start: start || pop.start, end: end || pop.end })} />
          )}
          {pop.type === 'lead' && <LeadView b={pop.block} />}
          {pop.type === 'ext' && <ExtView b={pop.block} onDone={close} />}
        </CalDialog>
      )}
      {toast && <p className="mv-toast" role="status">{toast}</p>}
    </div>
  );
}

function CalDialog({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); }, []);
  return (
    <dialog ref={ref} className={`mv-pop ${wide ? 'wide' : ''}`} onClose={onClose} onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mv-pop-in">
        <button type="button" className="mv-icon-btn mv-pop-x" onClick={onClose} aria-label="סגירה"><X size={20} /></button>
        {children}
      </div>
    </dialog>
  );
}

function JobForm({ pop, crew, onDone, onChange }: {
  pop: Extract<Pop, { type: 'new' | 'manual' }>; crew: Crew[]; onDone: (msg?: string) => void;
  onChange: (date: string, start: string, end: string) => void;
}) {
  const j = pop.type === 'manual' ? pop.job : null;
  const [state, action, saving] = useActionState<CalResult, FormData>(calSaveJob, {});
  const [deleting, startDelete] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.saved) onDone(j ? 'השינויים נשמרו.' : 'ההובלה נוספה ליומן.'); }, [state.saved]); // eslint-disable-line react-hooks/exhaustive-deps
  const sync = () => { const f = form.current; if (!f) return; const g = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value; onChange(g('date'), g('start_time'), g('end_time')); };
  const hasMore = !!(j?.items_text || j?.notes);

  return (
    <form ref={form} action={action} className="mv-pop-form">
      <input type="hidden" name="id" value={j?.id || ''} />
      <input name="title" className="mv-pop-title" required maxLength={120} defaultValue={j?.title || ''} placeholder="שם ההובלה, למשל: משפחת כהן" aria-label="שם ההובלה" autoFocus={!j} />
      {state.error && <p className="mv-note warn" role="alert">{ERR[state.error] || ERR.db}</p>}

      <div className="mv-pop-row"><Clock size={18} aria-hidden />
        <div className="mv-pop-when">
          <input name="date" type="date" className="input" required defaultValue={j?.date || (pop.type === 'new' ? pop.date : '')} dir="ltr" aria-label="תאריך" onChange={sync} />
          <input name="start_time" type="time" className="input" defaultValue={j ? t5(j.start_time) : pop.type === 'new' ? pop.start : ''} dir="ltr" aria-label="משעה" onChange={sync} />
          <span aria-hidden>–</span>
          <input name="end_time" type="time" className="input" defaultValue={j ? t5(j.end_time) : pop.type === 'new' ? pop.end : ''} dir="ltr" aria-label="עד שעה" onChange={sync} />
        </div>
      </div>
      <div className="mv-pop-row"><MapPin size={18} aria-hidden />
        <div className="mv-pop-stack">
          <input name="from_text" className="input" maxLength={300} defaultValue={j?.from_text || ''} placeholder="מאיפה: רחוב, עיר, קומה, מעלית" aria-label="מאיפה (כתובת איסוף)" />
          <input name="to_text" className="input" maxLength={300} defaultValue={j?.to_text || ''} placeholder="לאן: רחוב, עיר, קומה, מעלית" aria-label="לאן (כתובת פריקה)" />
        </div>
      </div>
      <div className="mv-pop-row"><Users size={18} aria-hidden />
        <fieldset className="mv-crew-pick"><legend className="mv-sr">מי בצוות של ההובלה הזו?</legend>
          {crew.length === 0 ? <Link href="/movers/crew" className="mv-back">הוספת עובדים לצוות ‹</Link>
            : crew.map((c) => <label key={c.id}><input type="checkbox" name="crew" value={c.id} defaultChecked={j?.crew_ids.includes(c.id)} /> {c.full_name}</label>)}
        </fieldset>
      </div>
      <details className="mv-pop-row mv-pop-more" open={hasMore}>
        <summary><FileText size={18} aria-hidden /> <span>רשימת פריטים והערות לצוות</span></summary>
        <div className="mv-pop-stack">
          <textarea name="items_text" className="input" rows={4} maxLength={3000} defaultValue={j?.items_text || ''} aria-label="רשימת פריטים" placeholder={'רשימת פריטים, פריט בכל שורה:\nספה תלת מושבית\nמקרר\n20 קרטונים'} />
          <textarea name="notes" className="input" rows={2} maxLength={1000} defaultValue={j?.notes || ''} aria-label="הערות לצוות" placeholder="הערות לצוות, למשל: חניה ברחוב הסמוך" />
        </div>
      </details>

      <div className="mv-pop-foot">
        {j && <>
          <button type="button" className="mv-icon-btn" aria-label="מחיקת ההובלה" title="מחיקת ההובלה" disabled={deleting}
            onClick={() => { if (confirm(`למחוק את "${j.title}" מהיומן?`)) startDelete(async () => { await calDeleteJob(j.id); onDone('ההובלה נמחקה.'); }); }}><Trash2 size={18} /></button>
          <a href={`/j/${j.sheet_token}`} target="_blank" rel="noreferrer" className="btn btn-secondary"><ExternalLink size={15} /> דף עבודה לצוות</a>
        </>}
        <button type="submit" className="btn btn-primary mv-pop-save" disabled={saving} aria-busy={saving}>{saving ? 'שומר…' : 'שמירה'}</button>
      </div>
    </form>
  );
}

function LeadView({ b }: { b: CalBlock }) {
  return (
    <div className="mv-pop-form">
      <h3 className="mv-pop-h"><i className="mv-dot lead" /> {b.title}</h3>
      <div className="mv-pop-row"><Clock size={18} aria-hidden /><span>{dayLong(b.date)}{b.start ? ` · ${b.start}${b.end ? `–${b.end}` : ''}` : ' · שעה תתואם'}</span></div>
      <div className="mv-pop-row"><Users size={18} aria-hidden /><span>{b.crewNames || 'עוד לא שובץ צוות'}</span></div>
      <p className="mv-meta" style={{ margin: 0 }}>הובלה מ-MoveMatch{b.tender ? ` · מכרז #${b.tender}` : ''}{b.done ? ' · בוצעה' : ''}. התאריך, השעות והצוות נערכים בדף ההובלה.</p>
      <div className="mv-pop-foot">
        {b.sheet && <a href={`/j/${b.sheet}`} target="_blank" rel="noreferrer" className="btn btn-secondary"><ExternalLink size={15} /> דף עבודה לצוות</a>}
        {b.href && <Link href={b.href} className="btn btn-primary mv-pop-save">לדף ההובלה</Link>}
      </div>
    </div>
  );
}

function ExtView({ b, onDone }: { b: CalBlock; onDone: (msg?: string) => void }) {
  const [busy, start] = useTransition();
  return (
    <div className="mv-pop-form">
      <h3 className="mv-pop-h"><i className="mv-dot ext" /> {b.title}</h3>
      <div className="mv-pop-row"><Clock size={18} aria-hidden /><span>{dayLong(b.date)}{b.start ? ` · ${b.start}` : ''}</span></div>
      <p className="mv-meta" style={{ margin: 0 }}>אירוע שיובא מ-Google Calendar.</p>
      <div className="mv-pop-foot">
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => start(async () => { await calDeleteEvent(b.key); onDone('האירוע נמחק.'); })}><Trash2 size={15} /> מחיקה מהיומן</button>
      </div>
    </div>
  );
}
