import Link from 'next/link';
import { headers } from 'next/headers';
import { Trash2, UserPlus } from 'lucide-react';
import { MoverShell } from '@/components/MoverShell';
import { CrewLangProvider, CrewLangSwitch, CrewSend } from '@/components/CrewSend';
import { loadSchedule, requireMe } from '@/lib/mover';
import { addDays, israelDate } from '@/lib/moverFormat';
import { dayLabel, hours, type Crew } from '@/lib/crew';
import { deleteCrew, saveCrew } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'צוות · סביבת מובילים', robots: { index: false, follow: false } };

const ERR: Record<string, string> = { name: 'נא למלא שם מלא.', phone: 'מספר הוואטסאפ לא תקין. כתבו אותו כמו 0501234567.', db: 'השמירה נכשלה. נסו שוב.' };

function CrewFields({ c }: { c?: Crew }) {
  const k = c?.id || 'new';
  return (
    <>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="field"><label htmlFor={`cn-${k}`}>שם מלא</label><input id={`cn-${k}`} name="full_name" className="input" required maxLength={120} defaultValue={c?.full_name} /></div>
      <div className="field"><label htmlFor={`cp-${k}`}>מספר וואטסאפ</label><input id={`cp-${k}`} name="phone" type="tel" className="input" required dir="ltr" placeholder="0501234567" defaultValue={c?.phone} /></div>
      <div className="field"><label htmlFor={`ce-${k}`}>דוא״ל (לא חובה)</label><input id={`ce-${k}`} name="email" type="email" className="input" dir="ltr" maxLength={120} defaultValue={c?.email || ''} /></div>
      <div className="field"><label htmlFor={`cl-${k}`}>שפת ההודעות</label>
        <select id={`cl-${k}`} name="lang" className="input" defaultValue={c?.lang || 'he'}><option value="he">עברית</option><option value="ru">Русский (רוסית)</option></select></div>
    </>
  );
}

export default async function CrewPage({ searchParams }: { searchParams: Promise<{ d?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const me = await requireMe();
  const { crew, jobs } = await loadSchedule();
  const today = israelDate();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.d || '') ? sp.d! : today;
  const dayJobs = jobs.filter((j) => j.date === date && !j.done);
  const h = await headers();
  const site = `https://${h.get('x-forwarded-host') || h.get('host')}`;
  const company = me.company_name || me.name;
  const unassigned = dayJobs.filter((j) => !j.crew.length);

  return (
    <MoverShell me={me} active="crew" title="צוות">
      {sp.ok && <p className="mv-note ok" role="status">{sp.ok === 'del' ? 'העובד הוסר.' : 'נשמר.'}</p>}
      {sp.error && <p className="mv-note warn" role="alert">{ERR[sp.error] || ERR.db}</p>}
      <CrewLangProvider>
        <div className="mv-card">
          <div className="mv-head">
            <div>
              <h2 style={{ marginBottom: 4 }}>הלו״ז של הצוות · {dayLabel(date, 'he')}</h2>
              <p className="mv-meta" style={{ margin: 0 }}>שולחים לכל עובד בוואטסאפ את העבודות שלו: שעות, מאיפה לאן, וקישור לרשימת הפריטים המלאה.</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Link className={`btn ${date === today ? 'btn-primary' : 'btn-secondary'}`} href="/movers/crew">היום</Link>
              <Link className={`btn ${date === addDays(today, 1) ? 'btn-primary' : 'btn-secondary'}`} href={`/movers/crew?d=${addDays(today, 1)}`}>מחר</Link>
              <form action="/movers/crew" style={{ display: 'flex', gap: 6 }}><input type="date" name="d" className="input" defaultValue={date} dir="ltr" aria-label="בחירת יום" style={{ minHeight: 42 }} /><button className="btn btn-secondary" type="submit">הצגה</button></form>
            </div>
          </div>
          <div style={{ margin: '14px 0' }}><CrewLangSwitch /></div>
          {unassigned.length > 0 && <p className="mv-note warn" style={{ marginBottom: 12 }}>{unassigned.length === 1 ? 'הובלה אחת' : `${unassigned.length} הובלות`} ביום הזה בלי צוות: {unassigned.map((j) => <Link key={j.key} href={j.href} style={{ fontWeight: 700, marginInlineEnd: 8 }}>{j.title}</Link>)}</p>}
          {crew.length === 0 ? <div className="mmx-empty">עוד לא הוספתם עובדים. הוסיפו את הצוות למטה, ואז שבצו אותם להובלות ביומן.</div> : (
            <div className="mv-crew">
              {crew.map((c) => {
                const mine = dayJobs.filter((j) => j.crew.includes(c.id));
                return (
                  <div key={c.id} className="mv-crew-row">
                    <span className="mv-ico" aria-hidden>{c.full_name.trim().charAt(0)}</span>
                    <span><b>{c.full_name}</b><small className="mv-meta" dir="ltr" style={{ display: 'block', textAlign: 'right' }}>{c.phone}{c.email ? ` · ${c.email}` : ''}</small>{c.lang === 'ru' && <span className="mv-pill grey" style={{ marginTop: 4 }}>Русский</span>}</span>
                    <div className="mv-crew-jobs">{mine.length ? <ul>{mine.map((j) => <li key={j.key}><b style={{ color: 'var(--mmx-ink)' }}>{hours(j, 'he')}</b> · <Link href={j.href}>{j.title}</Link></li>)}</ul> : 'אין עבודות ביום הזה'}</div>
                    <CrewSend name={c.full_name} phone={c.phone} memberLang={c.lang} date={date} jobs={mine} company={company} site={site} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CrewLangProvider>

      <div className="mv-card">
        <h2>עובדי החברה ({crew.length})</h2>
        {crew.map((c) => (
          <details key={c.id} style={{ borderTop: '1px solid var(--mmx-line)', padding: '10px 0' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{c.full_name} <span className="mv-meta" dir="ltr">{c.phone}</span></summary>
            <form action={saveCrew} className="mv-fields" style={{ alignItems: 'end' }}>
              <CrewFields c={c} />
              <div className="wide" style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" type="submit">שמירה</button></div>
            </form>
            <form action={deleteCrew.bind(null, c.id)}><button className="btn btn-secondary" type="submit"><Trash2 size={15} /> הסרת העובד</button></form>
          </details>
        ))}
        <form action={saveCrew} className="mv-fields" style={{ alignItems: 'end', borderTop: crew.length ? '1px solid var(--mmx-line)' : 0, paddingTop: crew.length ? 14 : 0 }}>
          <h3 className="wide" style={{ margin: 0 }}><UserPlus size={17} style={{ verticalAlign: '-3px' }} /> הוספת עובד</h3>
          <CrewFields />
          <div className="wide"><button className="btn btn-primary" type="submit">הוספת עובד</button></div>
        </form>
      </div>
    </MoverShell>
  );
}
