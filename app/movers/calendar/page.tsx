import Link from 'next/link';
import { Download } from 'lucide-react';
import { MoverShell } from '@/components/MoverShell';
import { IcsImport } from '@/components/IcsImport';
import { loadSchedule, moverDb, requireMe, type CalEvent } from '@/lib/mover';
import { addDays, dayHe, israelDate, weekStart } from '@/lib/moverFormat';
import { MoverCalendar, type CalBlock, type CalView } from '@/components/MoverCalendar';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'יומן · סביבת מובילים', robots: { index: false, follow: false } };

const month = (k: string, opts: Intl.DateTimeFormatOptions) => new Date(k + 'T12:00:00Z').toLocaleDateString('he-IL', { timeZone: 'UTC', ...opts });

export default async function Calendar({ searchParams }: { searchParams: Promise<{ w?: string; v?: string; ok?: string }> }) {
  const { w, v, ok } = await searchParams;
  const me = await requireMe();
  const today = israelDate();
  const view: CalView = v === 'day' ? 'day' : 'week';
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(w || '') ? w! : today;
  const start = weekStart(anchor);
  const keys = view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(start, i)) : [anchor];
  const [{ crew, manual, jobs }, { data: evData }] = await Promise.all([loadSchedule(), (await moverDb()).rpc('mm_mover_events')]);
  const crewName = (ids: string[]) => crew.filter((c) => ids.includes(c.id)).map((c) => c.full_name.split(' ')[0]).join(', ');
  const blocks: CalBlock[] = [
    ...jobs.map((j) => ({ key: j.key, date: j.date, start: j.start, end: j.end, title: j.title, crewNames: crewName(j.crew), href: j.href, sheet: j.sheet, done: j.done, tender: j.tender, kind: j.kind })),
    ...((evData || []) as CalEvent[]).map((e) => ({ key: e.id, date: e.date, start: e.time ? e.time.slice(0, 5) : '', end: '', title: e.title, kind: 'ext' as const })),
  ].filter((b) => keys.includes(b.date));
  const upcoming = jobs.filter((j) => j.date >= today && !j.done).slice(0, 8);
  // Google-style title: "נובמבר 2026", "נובמבר – דצמבר 2026", or the full day in day view.
  const label = view === 'day'
    ? month(anchor, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : keys[0].slice(0, 7) === keys[6].slice(0, 7) ? month(keys[0], { month: 'long', year: 'numeric' })
    : keys[0].slice(0, 4) === keys[6].slice(0, 4) ? `${month(keys[0], { month: 'long' })} – ${month(keys[6], { month: 'long', year: 'numeric' })}`
    : `${month(keys[0], { month: 'long', year: 'numeric' })} – ${month(keys[6], { month: 'long', year: 'numeric' })}`;

  return (
    <MoverShell me={me} active="calendar" title="יומן">
      {ok === 'job' && <p className="mv-note ok" role="status">ההובלה נשמרה ביומן.</p>}
      <MoverCalendar view={view} anchor={anchor} keys={keys} today={today} label={label} blocks={blocks} crew={crew} manual={manual} />
      <div className="mv-cal-foot">
        <span className="mv-meta">שעון ישראל · <i className="mv-dot lead" /> הובלות מ-MoveMatch · <i className="mv-dot manual" /> הובלות שהוספתם · <i className="mv-dot ext" /> אירועים מיובאים. הובלות שסימנתם &quot;הלקוח בחר בי&quot; נכנסות ליומן אוטומטית. לחיצה על שעה פנויה פותחת הובלה חדשה.</span>
        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <IcsImport />
          <a className="btn btn-secondary" href="/movers/calendar/ics" download="movematch.ics"><Download size={15} /> ייצוא ל-Google Calendar (ICS)</a>
        </span>
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
