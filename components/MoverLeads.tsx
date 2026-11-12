import Link from 'next/link';
import { CalendarCheck, CalendarDays, Inbox, Send, Truck } from 'lucide-react';
import { AdminHero } from './AdminShell';
import { MoverShell } from './MoverShell';
import { Countdown } from './Countdown';
import { MoverSearch } from './MoverSearch';
import { BID_STATE_LABEL, bidState, myLeads, requireMe, tabOf, type MoverLeadSummary, type Tab } from '@/lib/mover';
import { cityOf, dayHe, hhmm, nis, routeText } from '@/lib/moverFormat';
import { whenText } from '@/lib/validate';
import { tenderRef } from '@/lib/publicLead';

const COPY: Record<Tab, { title: string; sub: string; list: string; empty: string }> = {
  new: { title: 'פניות חדשות', sub: 'לקוחות שמחכים להצעת מחיר להובלה. הגישו הצעה לפני שהמכרז נסגר.', list: 'תיבת הפניות', empty: 'אין כרגע פניות פתוחות. נשלח לכם וואטסאפ כשתיכנס פנייה חדשה.' },
  offers: { title: 'הצעות שנשלחו', sub: 'מעקב אחרי ההצעות שלכם וההובלות שנקבעו.', list: 'הצעות מחיר', empty: 'עוד לא שלחתם הצעות פתוחות.' },
  history: { title: 'היסטוריה', sub: 'מכרזים שנסגרו, הובלות שהושלמו ופניות שפספסתם.', list: 'פניות קודמות', empty: 'אין עדיין היסטוריה.' },
};

function Row({ l }: { l: MoverLeadSummary }) {
  const st = bidState(l);
  const b = l.my_bid;
  const date = b?.job_date || (typeof l.move_when?.date === 'string' ? l.move_when.date : '');
  const pill = st === 'none' && l.closes_at
    ? <Countdown closesAt={l.closes_at} serverNow={l.now} variant="pill" />
    : <span className={`mv-pill ${st === 'booked' ? '' : st === 'sent' ? 'blue' : st === 'none' ? '' : 'grey'}`}>{BID_STATE_LABEL[st]}</span>;
  const hay = [routeText(l), cityOf(l.move_from, l.city), cityOf(l.move_to), tenderRef(l)].join(' ');
  return (
    <Link href={`/movers/leads/${l.id}`} className="mv-lead" data-search={hay}>
      <span className="mv-ico" aria-hidden><Truck size={20} strokeWidth={1.75} /></span>
      <span><b>{routeText(l)}</b><small>מכרז #{tenderRef(l)}{l.items ? ` · ${l.items} פריטים` : ''}{l.videos ? ` · ${l.videos} סרטונים` : ''}</small></span>
      <span className="mv-when"><CalendarDays size={16} strokeWidth={1.75} aria-hidden />
        {b?.booked_at && b.job_date ? `${dayHe(b.job_date)}${b.job_time ? ` · ${hhmm(b.job_time)}` : ''}` : date ? whenText(l.move_when as never) || dayHe(date) : 'מועד לא צוין'}
      </span>
      <span className="mv-tags">{pill}{b && <span className="mv-pill grey">{nis(b.price)}</span>}</span>
      <span className="mv-go">לפרטים ‹</span>
    </Link>
  );
}

export async function MoverLeadsPage({ tab }: { tab: Tab }) {
  const me = await requireMe();
  const all = await myLeads();
  const by = (t: Tab) => all.filter((l) => tabOf(l) === t);
  const rows = by(tab).sort((a, b) =>
    tab === 'new' ? (a.closes_at || '9').localeCompare(b.closes_at || '9')
      : tab === 'offers' ? (a.my_bid?.job_date || a.created_at).localeCompare(b.my_bid?.job_date || b.created_at)
        : b.created_at.localeCompare(a.created_at));
  const nNew = by('new').length;
  const nWaiting = all.filter((l) => bidState(l) === 'sent').length;
  const nBooked = all.filter((l) => bidState(l) === 'booked').length;
  const c = COPY[tab];
  return (
    <MoverShell me={me} active={tab} title={c.title} counts={{ new: nNew, offers: nWaiting + nBooked }}>
      <AdminHero kicker="סביבת מובילים" title={c.title} sub={c.sub} />
      <div className="mmx-stats mv-stats">
        <Link href="/movers" className="mmx-stat"><span className="mmx-stat-ico"><Inbox size={20} /></span><span><b>{nNew}</b><small>פניות פתוחות</small></span></Link>
        <Link href="/movers/offers" className="mmx-stat"><span className="mmx-stat-ico"><Send size={20} /></span><span><b>{nWaiting}</b><small>הצעות ממתינות</small></span></Link>
        <Link href="/movers/calendar" className="mmx-stat"><span className="mmx-stat-ico"><CalendarCheck size={20} /></span><span><b>{nBooked}</b><small>הובלות שנקבעו</small></span></Link>
      </div>
      <div className="mmx-bar">
        <h2>{c.list} {rows.length ? `(${rows.length})` : ''}</h2>
        {rows.length > 3 && <MoverSearch />}
      </div>
      <div className="mv-list" id="mv-list">
        {rows.length ? rows.map((l) => <Row key={l.id} l={l} />) : <div className="mmx-empty">{c.empty}</div>}
      </div>
    </MoverShell>
  );
}


