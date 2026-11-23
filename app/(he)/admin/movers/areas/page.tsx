import { AdminHero, AdminShell, StatCard } from '@/components/AdminShell';
import { CircleCheck, MapPinned, TriangleAlert } from 'lucide-react';
import { db } from '@/lib/db';
import { waEnabled } from '@/lib/whatsapp';
import { messagesPaused } from '@/lib/pause';
import { homeLeadsLive, waFunnelLive } from '@/lib/qa';
import { AREAS, areasOfCity, citiesOfArea, type Area } from '@/lib/areas';
import { MoverLogo } from '@/components/MoverLogo';
import { MoversTabs } from '../MoversTabs';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Movers by area · MoveMatch', robots: { index: false } };

type Mover = { id: string; name: string; company_name: string; phone: string; active: boolean; has_logo: boolean;
  status: 'pending' | 'approved' | 'prospect'; opted_out_at: string | null; is_demo?: boolean };

/**
 * Who receives a new tender, per area. Mirrors routeByArea() in lib/automations.ts: a completed lead goes to every
 * ACTIVE mover whose service areas include an area of the move's origin city. Read live from the database on every
 * load, so a mover added, approved, paused or re-areaed shows up here at once.
 */
const receives = (m: Mover) => m.active;
const whyNot = (m: Mover) =>
  m.status === 'prospect' ? 'טרם הצטרף' : m.status === 'pending' ? 'ממתין לאישור' : m.opted_out_at ? 'ביקש הסרה' : 'מושהה';

function MoverChip({ m, dim }: { m: Mover; dim?: boolean }) {
  return (
    <div className="adm-bid-main" style={{ alignItems: 'center', opacity: dim ? 0.6 : 1, padding: '4px 0' }}>
      <MoverLogo id={m.id} hasLogo={m.has_logo} name={m.company_name || m.name} size={28} />
      <b>{m.company_name || m.name || 'ללא שם'}</b>
      <span dir="ltr" className="small">{m.phone}</span>
      {dim && <span className="adm-tag warn">{whyNot(m)}</span>}
      {m.is_demo && <span className="adm-tag warn">{m.active ? 'דמו פעיל! להשהות' : 'דמו'}</span>}
    </div>
  );
}

export default async function MoversByArea({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  const { city = '' } = await searchParams;
  const [{ data, error }, ar] = await Promise.all([
    db().rpc('mm_admin_movers', { p_secret: process.env.MM_ADMIN_SECRET }),
    db().rpc('mm_admin_mover_areas', { p_secret: process.env.MM_ADMIN_SECRET }),
  ]);
  if (error) return <main style={{ padding: 24 }}>שגיאה: {error.message}</main>;

  const areasOf = new Map(((ar.data || []) as { mover_id: string; areas: string[] }[]).map((r) => [r.mover_id, r.areas]));
  const all = ((data || []) as Mover[]).sort((a, b) => Number(b.active) - Number(a.active) || (a.company_name || '').localeCompare(b.company_name || '', 'he'));
  const hasArea = (m: Mover, a: Area) => (areasOf.get(m.id) || []).includes(a);
  const inArea = (a: Area) => all.filter((m) => hasArea(m, a));
  const active = all.filter(receives);
  const noAreas = active.filter((m) => !(areasOf.get(m.id) || []).length);
  const emptyAreas = AREAS.filter((a) => !inArea(a).some(receives));
  const listed = all.filter((m) => m.status !== 'prospect' || (areasOf.get(m.id) || []).length);

  // City lookup: exactly what a lead from this origin city would do right now.
  const q = city.trim();
  const qAreas = q ? areasOfCity(q) : [];
  const qMovers = active.filter((m) => qAreas.some((a) => hasArea(m, a)));

  const held = [
    !homeLeadsLive() && 'דף הבית (/) — עד HOME_LEADS_LIVE=1',
    !waFunnelLive() && 'משפך F (צ׳אט וואטסאפ) — עד WA_FUNNEL_LIVE=1',
  ].filter(Boolean) as string[];

  return (
    <AdminShell active="movers" title="מובילים לפי אזור" counts={{ movers: all.filter((m) => m.status === 'approved').length, pending: all.filter((m) => m.status === 'pending').length }}>
      <AdminHero kicker="סביבת מובילים" title="מי מקבל מכרזים לפי אזור" sub="ליד חדש נשלח לכל מוביל פעיל שאזורי השירות שלו כוללים את אזור עיר המוצא של ההובלה. העמוד מתעדכן אוטומטית מכל שינוי ברשימת המובילים." />
      <MoversTabs on="areas" movers={all.filter((m) => m.status === 'approved').length} />

      <div className="mmx-stats">
        <StatCard icon={<CircleCheck size={20} />} n={active.length} label="מובילים פעילים (מקבלים מכרזים)" />
        <StatCard icon={<MapPinned size={20} />} n={AREAS.length - emptyAreas.length} label={`אזורים מכוסים מתוך ${AREAS.length}`} />
        <StatCard icon={<TriangleAlert size={20} />} n={emptyAreas.length} label="אזורים בלי אף מוביל פעיל" />
      </div>

      {ar.error && <p className="adm-tag warn" style={{ display: 'block', padding: '6px 10px' }}>אזורי השירות לא נטענו (מיגרציה 013). כרגע אף מוביל לא מקבל מכרזים: המפעיל מעביר ידנית.</p>}
      {messagesPaused() && <p className="adm-tag warn" style={{ display: 'block', padding: '6px 10px' }}>⏸️ שליחת הודעות מושהית (MESSAGES_PAUSED): כרגע לא יוצאת שום הודעה, גם לא למובילים שמופיעים כאן.</p>}
      {!waEnabled() && !messagesPaused() && <p className="adm-tag warn" style={{ display: 'block', padding: '6px 10px' }}>וואטסאפ לא מחובר: ההתראות למובילים יוצאות ב-SMS בלבד.</p>}

      <div className="adm-box" style={{ margin: '14px 0' }}>
        <h4>בדיקה לפי עיר מוצא</h4>
        <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
          <div className="field" style={{ margin: 0, flex: '1 1 200px' }}>
            <label htmlFor="city">עיר המוצא של ההובלה</label>
            <input id="city" name="city" className="input" defaultValue={q} placeholder="למשל: ראשון לציון" />
          </div>
          <button className="btn btn-primary adm-btn" type="submit">מי יקבל?</button>
        </form>
        {q && (qAreas.length === 0
          ? <p className="adm-tag warn" style={{ display: 'block', padding: '6px 10px', marginTop: 10 }}>העיר “{q}” לא מזוהה: ליד ממנה לא יישלח לאף מוביל, וההתראה למפעיל תבקש לשלוח ידנית.</p>
          : <div style={{ marginTop: 10 }}>
              <p className="small" style={{ margin: '0 0 6px' }}>“{q}” שייכת ל: <b>{qAreas.join(' · ')}</b>. ליד מכאן יישלח ל-<b>{qMovers.length}</b> מובילים:</p>
              {qMovers.length ? qMovers.map((m) => <MoverChip key={m.id} m={m} />) : <span className="adm-tag warn">אין מוביל פעיל באזור: המפעיל יקבל התראה לשלוח ידנית.</span>}
            </div>)}
      </div>

      <div className="adm-box" style={{ margin: '14px 0' }}>
        <h4>מתי לא נשלח לאף מוביל, בכל אזור</h4>
        <ul className="small" style={{ margin: 0, paddingInlineStart: 18, lineHeight: 1.8 }}>
          <li>לידי בדיקה (שם שמתחיל ב-QA או utm_source=qa), ודף הבדיקות /qa.</li>
          <li>משפך A (בקשת שיחה בלבד, בלי פרטי הובלה).</li>
          <li>עיר מוצא שלא מזוהה ברשימת הערים.</li>
          {held.map((h) => <li key={h}>מוחזק כרגע: {h}</li>)}
        </ul>
      </div>

      {noAreas.length > 0 && (
        <div className="adm-box" style={{ margin: '14px 0', borderColor: '#e0a43a', background: '#fff6e5' }}>
          <h4>פעילים בלי אזורי שירות ({noAreas.length}): לא מקבלים שום מכרז</h4>
          <p className="small muted" style={{ margin: '0 0 6px' }}>מוסיפים אזורים בלשונית “רשימת המובילים”.</p>
          {noAreas.map((m) => <MoverChip key={m.id} m={m} />)}
        </div>
      )}

      <h2 style={{ fontSize: 20 }}>לפי אזור</h2>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' }}>
        {AREAS.map((a) => {
          const ms = inArea(a), yes = ms.filter(receives), no = ms.filter((m) => !receives(m));
          return (
            <div key={a} className="adm-box" style={{ margin: 0, ...(yes.length ? {} : { borderColor: '#e0a43a', background: '#fff6e5' }) }}>
              <h4 style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{a}</span>
                <span className={`adm-tag ${yes.length ? 'ok' : 'warn'}`}>{yes.length ? `${yes.length} יקבלו` : 'אף מוביל'}</span>
              </h4>
              {yes.length === 0 && <p className="small muted" style={{ margin: '0 0 6px' }}>ליד מאזור זה לא יישלח לאף מוביל (המפעיל מעביר ידנית).</p>}
              {yes.map((m) => <MoverChip key={m.id} m={m} />)}
              {no.length > 0 && <>
                <p className="small muted" style={{ margin: '8px 0 2px' }}>בחרו באזור אבל לא יקבלו כרגע:</p>
                {no.map((m) => <MoverChip key={m.id} m={m} dim />)}
              </>}
              <details style={{ marginTop: 8 }}>
                <summary className="small" style={{ cursor: 'pointer', color: 'var(--color-accent-700)', fontWeight: 600 }}>ערים באזור</summary>
                <p className="small muted" style={{ margin: '6px 0 0', lineHeight: 1.7 }}>{citiesOfArea(a).join(' · ')}. עיר גבולית שייכת לשני אזורים, ומוביל של כל אחד מהם מקבל את הליד.</p>
              </details>
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: 20, marginTop: 24 }}>טבלה: מוביל × אזור</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="adm-table" style={{ fontSize: 13, minWidth: 760, width: '100%' }}>
          <thead><tr>
            <th style={{ textAlign: 'start' }}>מוביל</th><th>סטטוס</th>
            {AREAS.map((a) => <th key={a} style={{ whiteSpace: 'nowrap' }}>{a}</th>)}
          </tr></thead>
          <tbody>
            {listed.length === 0 && <tr><td colSpan={AREAS.length + 2} className="muted">עוד אין מובילים.</td></tr>}
            {listed.map((m) => (
              <tr key={m.id} style={{ opacity: receives(m) ? 1 : 0.55 }}>
                <td><b>{m.company_name || m.name}</b></td>
                <td><span className={`adm-tag ${receives(m) ? 'ok' : 'warn'}`}>{receives(m) ? 'פעיל' : whyNot(m)}</span></td>
                {AREAS.map((a) => <td key={a} style={{ textAlign: 'center' }}>{hasArea(m, a) ? (receives(m) ? '✅' : '○') : ''}</td>)}
              </tr>
            ))}
            <tr>
              <td colSpan={2}><b>יקבלו בפועל</b></td>
              {AREAS.map((a) => { const n = inArea(a).filter(receives).length; return <td key={a} style={{ textAlign: 'center', fontWeight: 700, color: n ? undefined : '#b45309' }}>{n}</td>; })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="small muted">✅ = מקבל מכרזים מהאזור · ○ = בחר באזור אבל לא פעיל כרגע.</p>
    </AdminShell>
  );
}
