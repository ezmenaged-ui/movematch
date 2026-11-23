import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Trash2 } from 'lucide-react';
import { MoverShell } from '@/components/MoverShell';
import { loadSchedule, requireMe } from '@/lib/mover';
import { israelDate } from '@/lib/moverFormat';
import { deleteJob, saveJob } from '../../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'הובלה ביומן · סביבת מובילים', robots: { index: false, follow: false } };

const ERR: Record<string, string> = { title: 'נא לתת שם להובלה.', date: 'נא לבחור תאריך.', hours: 'שעת הסיום צריכה להיות אחרי שעת ההתחלה.', db: 'השמירה נכשלה. נסו שוב.' };

export default async function JobForm({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ d?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const me = await requireMe();
  const { crew, manual } = await loadSchedule();
  const j = id === 'new' ? null : manual.find((x) => x.id === id);
  if (id !== 'new' && !j) notFound();
  const date = j?.date || (/^\d{4}-\d{2}-\d{2}$/.test(sp.d || '') ? sp.d! : israelDate());
  const t5 = (t?: string | null) => (t ? t.slice(0, 5) : '');
  return (
    <MoverShell me={me} active="calendar" title={j ? 'עריכת הובלה' : 'הובלה חדשה'}>
      <div className="mv-sticky">
        <Link href={`/movers/calendar?w=${date}`} className="btn btn-secondary mv-sticky-back"><ArrowRight size={17} /> חזרה ליומן</Link>
        <span className="mv-sticky-title"><b>{j ? j.title : 'הובלה חדשה ביומן'}</b></span>
        {j && <a href={`/j/${j.sheet_token}`} target="_blank" rel="noreferrer" className="btn btn-secondary mv-sticky-cta">דף עבודה לצוות</a>}
      </div>
      {sp.error && <p className="mv-note warn" role="alert">{ERR[sp.error] || ERR.db}</p>}
      <form action={saveJob} className="mv-card">
        <input type="hidden" name="id" value={j?.id || ''} />
        <h2>{j ? 'עריכת הובלה' : 'הוספת הובלה ליומן'}</h2>
        <div className="mv-fields">
          <div className="field wide"><label htmlFor="jt">שם ההובלה</label><input id="jt" name="title" className="input" required maxLength={120} defaultValue={j?.title || ''} placeholder="למשל: הובלת משפחת כהן" autoFocus={!j} /></div>
          <div className="field"><label htmlFor="jd">תאריך</label><input id="jd" name="date" type="date" className="input" required defaultValue={date} dir="ltr" /></div>
          <div className="mv-grid2" style={{ gap: 10 }}>
            <div className="field"><label htmlFor="js">משעה</label><input id="js" name="start_time" type="time" className="input" defaultValue={t5(j?.start_time) || '08:00'} dir="ltr" /></div>
            <div className="field"><label htmlFor="je">עד שעה</label><input id="je" name="end_time" type="time" className="input" defaultValue={t5(j?.end_time) || '12:00'} dir="ltr" /></div>
          </div>
          <div className="field"><label htmlFor="jf">מאיפה (כתובת איסוף)</label><input id="jf" name="from_text" className="input" maxLength={300} defaultValue={j?.from_text || ''} placeholder="רחוב, עיר, קומה, מעלית" /></div>
          <div className="field"><label htmlFor="jto">לאן (כתובת פריקה)</label><input id="jto" name="to_text" className="input" maxLength={300} defaultValue={j?.to_text || ''} placeholder="רחוב, עיר, קומה, מעלית" /></div>
          <fieldset className="wide mv-crew-pick"><legend>מי בצוות של ההובלה הזו? {crew.length === 0 && <Link href="/movers/crew" className="mv-back">הוספת עובדים ‹</Link>}</legend>
            {crew.map((c) => <label key={c.id}><input type="checkbox" name="crew" value={c.id} defaultChecked={j?.crew_ids.includes(c.id)} /> {c.full_name}</label>)}
          </fieldset>
          <div className="field wide"><label htmlFor="ji">רשימת פריטים (לא חובה)</label><textarea id="ji" name="items_text" className="input" rows={4} maxLength={3000} defaultValue={j?.items_text || ''} placeholder={'פריט בכל שורה, למשל:\nספה תלת מושבית\nמקרר\n20 קרטונים'} /></div>
          <div className="field wide"><label htmlFor="jn">הערות לצוות (לא חובה)</label><textarea id="jn" name="notes" className="input" rows={2} maxLength={1000} defaultValue={j?.notes || ''} placeholder="למשל: חניה ברחוב הסמוך, להביא מנוף" /></div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary">{j ? 'שמירת שינויים' : 'הוספה ליומן'}</button>
          <Link href={`/movers/calendar?w=${date}`} className="btn btn-secondary">ביטול</Link>
        </div>
      </form>
      {j && <form action={deleteJob.bind(null, j.id, j.date)}><button type="submit" className="btn btn-secondary"><Trash2 size={15} /> מחיקת ההובלה</button></form>}
    </MoverShell>
  );
}
