import Link from 'next/link';
import { Download, Plus } from 'lucide-react';
import { MoverShell } from '@/components/MoverShell';
import { IcsImport } from '@/components/IcsImport';
import { loadSchedule, moverDb, requireMe, type CalEvent } from '@/lib/mover';
import { addDays, dayHe, israelDate, weekStart } from '@/lib/moverFormat';
import { deleteEvent } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'יומן · סביבת מובילים', robots: { index: false, follow: false } };

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const FIRST = 6, LAST = 22, ROW = 44; // visible hours 06:00–23:00, px per hour
type Block = { key: string; date: string; start: string; end: string; title: string; sub?: string; href?: string; ext?: string; done?: boolean; kind: 'lead' | 'manual' | 'ext' };

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
/** Side-by-side lanes for overlapping blocks in one day. */
function layout(day: Block[]) {
  const timed = day.filter((b) => b.start).sort((a, b) => mins(a.start) - mins(b.start));
  const out: (Block & { top: number; h: number; lane: number; lanes: number })[] = [];
  let cluster: typeof out = [], clusterEnd = -1;
  const flush = () => { const n = Math.max(1, ...cluster.map((c) => c.lane + 1)); cluster.forEach((c) => (c.lanes = n)); out.push(...cluster); cluster = []; };
  for (const b of timed) {
    const s = Math.max(mins(b.start), FIRST * 60), e = Math.min(b.end ? mins(b.end) : mins(b.start) + 60, (LAST + 1) * 60);
    if (s >= clusterEnd && cluster.length) flush();
    const used = cluster.filter((c) => c.top + c.h > ((s - FIRST * 60) / 60) * ROW).map((c) => c.lane);
    let lane = 0; while (used.includes(lane)) lane++;
    cluster.push({ ...b, top: ((s - FIRST * 60) / 60) * ROW, h: Math.max(ROW * 0.6, ((Math.max(e, s + 30) - s) / 60) * ROW), lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, e);
  }
  if (cluster.length) flush();
  return out;
}

export default async function Calendar({ searchParams }: { searchParams: Promise<{ w?: string; ok?: string }> }) {
  const { w, ok } = await searchParams;
  const me = await requireMe();
  const today = israelDate();
  const start = weekStart(/^\d{4}-\d{2}-\d{2}$/.test(w || '') ? w! : today);
  const keys = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [{ crew, jobs }, { data: evData }] = await Promise.all([loadSchedule(), (await moverDb()).rpc('mm_mover_events')]);
  const crewName = (ids: string[]) => crew.filter((c) => ids.includes(c.id)).map((c) => c.full_name.split(' ')[0]).join(', ');
  const blocks: Block[] = [
    ...jobs.map((j) => ({ key: j.key, date: j.date, start: j.start, end: j.end, title: j.title, sub: crewName(j.crew), href: j.href, done: j.done, kind: j.kind })),
    ...((evData || []) as CalEvent[]).map((e) => ({ key: e.id, date: e.date, start: e.time || '', end: '', title: e.title, ext: e.id, kind: 'ext' as const })),
  ].filter((b) => keys.includes(b.date));
  const upcoming = jobs.filter((j) => j.date >= today && !j.done).slice(0, 8);
  const label = `${dayHe(keys[0]).replace(/^יום \S+ /, '')} – ${dayHe(keys[6]).replace(/^יום \S+ /, '')} ${keys[6].slice(0, 4)}`;

  const chip = (b: Block, style?: React.CSSProperties) => {
    const time = b.start ? `${b.start}${b.end ? `–${b.end}` : ''}` : '';
    const inner = <><b dir="ltr">{time}</b> <span>{b.title}</span>{b.sub && <small>👷 {b.sub}</small>}</>;
    return b.href
      ? <Link key={b.key} href={b.href} className={`mv-ev ${b.kind} ${b.done ? 'done' : ''}`} style={style}>{inner}</Link>
      : <span key={b.key} className="mv-ev ext" style={style}>{inner}<form action={deleteEvent.bind(null, b.ext!, start)}><button type="submit" aria-label={`מחיקת ${b.title}`} title="מחיקה">×</button></form></span>;
  };

  return (
    <MoverShell me={me} active="calendar" title="יומן">
      {ok === 'job' && <p className="mv-note ok" role="status">ההובלה נשמרה ביומן.</p>}
      <div className="mv-card mv-cal">
        <div className="mv-week-bar">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link className="btn btn-secondary" href={`/movers/calendar?w=${addDays(start, -7)}`} aria-label="שבוע קודם">›</Link>
            <Link className="btn btn-secondary" href="/movers/calendar">היום</Link>
            <Link className="btn btn-secondary" href={`/movers/calendar?w=${addDays(start, 7)}`} aria-label="שבוע הבא">‹</Link>
            <h2 style={{ marginInlineStart: 8 }}>{label}</h2>
          </div>
          <Link className="btn btn-primary" href={`/movers/calendar/job/new?d=${keys.includes(today) ? today : start}`}><Plus size={16} /> הוספת הובלה</Link>
        </div>
        <div className="mv-week-scroll" tabIndex={0} aria-label="יומן שבועי">
          <div className="mv-wk">
            <div className="mv-wk-head">
              <div className="mv-wh">שעה</div>
              {keys.map((k, i) => <Link key={k} href={`/movers/calendar/job/new?d=${k}`} className={`mv-wh ${k === today ? 'today' : ''}`} title="הוספת הובלה ביום הזה">{DAYS[i]}<br />{Number(k.slice(8))}/{Number(k.slice(5, 7))}</Link>)}
              <div className="mv-wt">ללא שעה</div>
              {keys.map((k) => <div key={k} className="mv-ws">{blocks.filter((b) => b.date === k && !b.start).map((b) => chip(b))}</div>)}
            </div>
            <div className="mv-wk-body" style={{ height: (LAST - FIRST + 1) * ROW }}>
              <div className="mv-wk-times">{Array.from({ length: LAST - FIRST + 1 }, (_, i) => <div key={i} style={{ height: ROW }}>{String(FIRST + i).padStart(2, '0')}:00</div>)}</div>
              {keys.map((k) => (
                <div key={k} className={`mv-wk-day ${k === today ? 'today' : ''}`} style={{ backgroundSize: `100% ${ROW}px` }}>
                  {layout(blocks.filter((b) => b.date === k)).map((b) => chip(b, { position: 'absolute', top: b.top + 1, height: b.h - 3, insetInlineStart: `calc(${(b.lane / b.lanes) * 100}% + 2px)`, width: `calc(${100 / b.lanes}% - 4px)` }))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mv-cal-foot">
          <span className="mv-meta">שעון ישראל · <i className="mv-dot lead" /> הובלות מ-MoveMatch · <i className="mv-dot manual" /> הובלות שהוספתם · <i className="mv-dot ext" /> אירועים מיובאים. הובלות שסימנתם &quot;הלקוח בחר בי&quot; נכנסות ליומן אוטומטית. לחיצה על יום פותחת הובלה חדשה באותו יום.</span>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <IcsImport />
            <a className="btn btn-secondary" href="/movers/calendar/ics" download="movematch.ics"><Download size={15} /> ייצוא ל-Google Calendar (ICS)</a>
          </span>
        </div>
      </div>

      <div className="mv-card">
        <div className="mv-head"><h2>הובלות קרובות ({upcoming.length})</h2><Link href="/movers/crew" className="mv-back">שליחת לו״ז לצוות ‹</Link></div>
        {upcoming.length === 0 ? <p className="mv-meta" style={{ margin: 0 }}>אין הובלות קרובות.</p> : (
          <div className="mv-list">{upcoming.map((j) => (
            <Link key={j.key} href={j.href} className="mv-lead" style={{ gridTemplateColumns: '1fr auto' }}>
              <span><b>{dayHe(j.date)}{j.start ? ` · ${j.start}${j.end ? `–${j.end}` : ''}` : ''}</b><small>{j.title}{j.tender ? ` · מכרז #${j.tender}` : ''}{j.crew.length ? ` · צוות: ${crewName(j.crew)}` : ''}</small></span>
              <span className="mv-go">לפרטים ‹</span>
            </Link>))}
          </div>
        )}
      </div>
    </MoverShell>
  );
}
