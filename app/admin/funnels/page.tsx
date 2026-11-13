import Link from 'next/link';
import { AdminHero, AdminShell, StatCard } from '@/components/AdminShell';
import { CircleCheck, Inbox, Send, Truck } from 'lucide-react';
import { db, LeadRow } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Funnels · MoveMatch', robots: { index: false } };

type Lead = LeadRow & { theme?: 'photo' | 'art' | null };
type Bid = { lead_id: string; hidden: boolean; job_done_at: string | null };

const FUNNELS = [
  { v: 'a', letter: 'A', name: 'חזרה טלפונית', steps: ['פרטים'] },
  { v: 'wizard', letter: 'B', name: 'אשף עם רשימת פריטים', steps: ['פרטים', 'מאיפה', 'לאן', 'מתי', 'פריטים'] },
  { v: 'form', letter: 'C', name: 'טופס בעמוד אחד', steps: ['פרטים', 'טופס הפרטים'] },
  { v: 'items', letter: 'D', name: 'אשף עם פריטים וסרטונים', steps: ['פרטים', 'מאיפה', 'לאן', 'מתי', 'פריטים', 'סרטונים'] },
] as const;
const RANGES = [{ d: '7', label: '7 ימים' }, { d: '30', label: '30 יום' }, { d: '90', label: '90 יום' }, { d: 'all', label: 'הכול' }];
const THEME: Record<string, string> = { photo: 'צילום', art: 'איור' };
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');
const isTest = (l: Lead) => /^\s*QA\b/i.test(l.name || '') || (l.utm_source || '').toLowerCase() === 'qa';

/**
 * Funnel performance: for each of the 4 funnels (and its photo / art design), how many people left their details,
 * how many finished, and at which step the others stopped. Read live from the leads table on every page load.
 * Page views are not stored here: "visitors → lead" is in Google Analytics (event funnel_step, step 0_landing).
 */
export default async function Funnels({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const d = (await searchParams).d || '30';
  const secret = process.env.MM_ADMIN_SECRET;
  const [{ data: leadData, error }, { data: bidData }, { data: moverData }] = await Promise.all([
    db().rpc('mm_admin_list', { p_secret: secret, p_limit: 5000 }),
    db().rpc('mm_admin_bids', { p_secret: secret }),
    db().rpc('mm_admin_movers', { p_secret: secret }),
  ]);
  if (error) return <main style={{ padding: 24 }}>שגיאה בטעינה: {error.message}</main>;
  const movers = (moverData || []) as { status: string }[];
  const pending = movers.filter((m) => m.status === 'pending').length;
  const since = d === 'all' ? 0 : Date.now() - Number(d) * 864e5;
  const everyone = (leadData || []) as Lead[];
  const leads = everyone.filter((l) => !isTest(l) && new Date(l.created_at).getTime() >= since);
  const offers = new Set<string>(), jobs = new Set<string>();
  for (const b of (bidData || []) as Bid[]) { if (!b.hidden) offers.add(b.lead_id); if (b.job_done_at) jobs.add(b.lead_id); }

  const sum = (ls: Lead[]) => ({
    n: ls.length,
    complete: ls.filter((l) => l.status === 'complete').length,
    video: ls.filter((l) => (l.videos?.length || 0) > 0).length,
    offers: ls.filter((l) => offers.has(l.id)).length,
    jobs: ls.filter((l) => jobs.has(l.id)).length,
  });
  const all = sum(leads);

  const sources = new Map<string, Lead[]>();
  for (const l of leads) {
    const k = [l.utm_source || 'ישיר / לא ידוע', l.utm_campaign].filter(Boolean).join(' · ');
    sources.set(k, [...(sources.get(k) || []), l]);
  }

  return (
    <AdminShell active="funnels" title="ביצועי משפכים" counts={{ leads: everyone.length, movers: movers.length - pending, pending }}>
      <AdminHero kicker="סביבת ניהול" title="ביצועי משפכים" sub="כמה השאירו פרטים בכל משפך, כמה סיימו, ואיפה האחרים עצרו. הנתונים מתעדכנים בכל טעינה של העמוד. לידים של בדיקות (QA) לא נספרים." />
      <div className="mmx-bar">
        <h2>תקופה</h2>
        <nav className="mmx-range" aria-label="תקופה">
          {RANGES.map((r) => <Link key={r.d} href={`/admin/funnels?d=${r.d}`} className={r.d === d ? 'on' : ''} aria-current={r.d === d ? 'page' : undefined}>{r.label}</Link>)}
        </nav>
      </div>
      <div className="mmx-stats">
        <StatCard icon={<Inbox size={20} />} n={all.n} label="השאירו פרטים" />
        <StatCard icon={<CircleCheck size={20} />} n={`${all.complete} · ${pct(all.complete, all.n)}`} label="סיימו את התהליך" />
        <StatCard icon={<Send size={20} />} n={`${all.offers} · ${pct(all.offers, all.n)}`} label="קיבלו הצעת מחיר" />
        <StatCard icon={<Truck size={20} />} n={`${all.jobs} · ${pct(all.jobs, all.n)}`} label="הובלה שבוצעה" />
      </div>

      <h2 className="mmx-h2">השוואה בין המשפכים</h2>
      <div className="mmx-tablebox">
        <table className="mmx-table">
          <thead><tr><th>משפך</th><th className="num">השאירו פרטים</th><th className="num">סיימו</th><th className="num">% השלמה</th><th className="num">עם סרטון</th><th className="num">קיבלו הצעה</th><th className="num">הובלות</th><th className="num">% ליד ← הובלה</th></tr></thead>
          <tbody>
            {FUNNELS.map((f) => {
              const s = sum(leads.filter((l) => l.variant === f.v));
              return <tr key={f.v}><td><b>{f.letter}</b> · {f.name}</td><td className="num">{s.n}</td><td className="num">{s.complete}</td><td className="num"><b>{pct(s.complete, s.n)}</b></td><td className="num">{s.video}</td><td className="num">{s.offers}</td><td className="num">{s.jobs}</td><td className="num">{pct(s.jobs, s.n)}</td></tr>;
            })}
          </tbody>
          <tfoot><tr><td>סה״כ</td><td className="num">{all.n}</td><td className="num">{all.complete}</td><td className="num">{pct(all.complete, all.n)}</td><td className="num">{all.video}</td><td className="num">{all.offers}</td><td className="num">{all.jobs}</td><td className="num">{pct(all.jobs, all.n)}</td></tr></tfoot>
        </table>
      </div>

      <h2 className="mmx-h2">כל משפך מקרוב</h2>
      <p className="mmx-sub">הפס הירוק: כמה הגיעו לכל שלב. המספר בצהוב: כמה עצרו בשלב הזה ולא המשיכו.</p>
      <div className="mmx-fgrid">
        {FUNNELS.map((f) => {
          const ls = leads.filter((l) => l.variant === f.v);
          const s = sum(ls);
          const last = f.steps.length;
          return (
            <section key={f.v} className="mmx-fcard">
              <h3>משפך {f.letter} · {f.name}</h3>
              <div className="mmx-fbig">
                <span><b>{s.n}</b><small>השאירו פרטים</small></span>
                <span><b>{s.complete}</b><small>סיימו</small></span>
                <span><b>{pct(s.complete, s.n)}</b><small>השלמה</small></span>
              </div>
              {s.n === 0 ? <p className="mmx-sub">אין לידים בתקופה הזו.</p> : (
                <ul className="mmx-steps">
                  {f.steps.map((name, i) => {
                    const step = i + 1;
                    const reached = ls.filter((l) => l.status === 'complete' || l.furthest_step >= step).length;
                    const stopped = ls.filter((l) => l.status !== 'complete' && Math.min(l.furthest_step, last) === step).length;
                    return (
                      <li key={name}>
                        <span>{step}. {name}</span>
                        <span className="bar" title={`${reached} הגיעו לשלב`}><i style={{ width: `${(reached / s.n) * 100}%` }} /></span>
                        <span className="num">{reached}{stopped ? <small style={{ color: '#8a5a00' }}> −{stopped}</small> : null}</span>
                      </li>
                    );
                  })}
                  <li><span>סיום</span><span className="bar"><i style={{ width: `${(s.complete / s.n) * 100}%` }} /></span><span className="num">{s.complete}</span></li>
                </ul>
              )}
              <div className="mmx-split">
                {(['photo', 'art'] as const).map((t) => {
                  const x = sum(ls.filter((l) => l.theme === t));
                  return <span key={t}>עיצוב {THEME[t]}: <b>{x.n}</b> לידים · <b>{pct(x.complete, x.n)}</b> השלמה</span>;
                })}
              </div>
            </section>
          );
        })}
      </div>

      <h2 className="mmx-h2">לפי מקור וקמפיין</h2>
      {sources.size === 0 ? <div className="mmx-empty">אין לידים בתקופה הזו.</div> : (
        <div className="mmx-tablebox">
          <table className="mmx-table">
            <thead><tr><th>מקור · קמפיין</th><th className="num">השאירו פרטים</th><th className="num">סיימו</th><th className="num">% השלמה</th><th className="num">קיבלו הצעה</th><th className="num">הובלות</th></tr></thead>
            <tbody>
              {[...sources.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 30).map(([k, ls]) => {
                const s = sum(ls);
                return <tr key={k}><td>{k}</td><td className="num">{s.n}</td><td className="num">{s.complete}</td><td className="num">{pct(s.complete, s.n)}</td><td className="num">{s.offers}</td><td className="num">{s.jobs}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mmx-sub">כמה אנשים ראו כל עמוד נחיתה (לפני שהשאירו פרטים) אפשר לראות ב-Google Analytics, באירוע funnel_step.</p>
    </AdminShell>
  );
}
