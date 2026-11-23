import { AdminHero, AdminShell, StatCard } from '@/components/AdminShell';
import { Banknote, CircleCheck, Hourglass, Truck } from 'lucide-react';
import { db, LeadRow } from '@/lib/db';
import { tenderRef } from '@/lib/publicLead';
import { COMMISSION_RATE, commissionDue, commissionOf, nis, VAT_RATE } from '@/lib/commission';
import { clearCommissionPaid, markJobDone, setCommissionPaid, undoJobDone } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Money · MoveMatch', robots: { index: false } };

type Bid = {
  id: string; lead_id: string; price: number; mover_id: string | null; mover_phone: string; mover_name: string | null; hidden: boolean;
  booked_at: string | null; job_done_at: string | null; final_price: number | null;
  commission_paid_at: string | null; commission_paid_amount: number | null; commission_note: string | null;
};
type Mover = { id: string; company_name: string; name: string; phone: string; status: string };

const day = (d: string) => new Date(d).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'numeric', year: '2-digit' });
const cityOf = (a: Record<string, unknown> | null | undefined) => (a?.city as string) || '';

/**
 * Money tab: which mover did which job, what commission each owes (10% of the final price + VAT), and what was paid.
 * The operator marks an offer as "job done" with the final price, then records the payment when it arrives.
 */
export default async function Money() {
  const secret = process.env.MM_ADMIN_SECRET;
  const [{ data: leadData, error }, { data: bidData }, { data: moverData }] = await Promise.all([
    db().rpc('mm_admin_list', { p_secret: secret, p_limit: 5000 }),
    db().rpc('mm_admin_bids', { p_secret: secret }),
    db().rpc('mm_admin_movers', { p_secret: secret }),
  ]);
  if (error) return <main style={{ padding: 24 }}>שגיאה בטעינה: {error.message}</main>;
  const leads = new Map(((leadData || []) as LeadRow[]).map((l) => [l.id, l]));
  const movers = (moverData || []) as Mover[];
  const bids = (bidData || []) as Bid[];
  const pending = movers.filter((m) => m.status === 'pending').length;

  const moverOf = (b: Bid) => movers.find((m) => m.id === b.mover_id) || movers.find((m) => m.phone === b.mover_phone);
  const moverLabel = (b: Bid) => moverOf(b)?.company_name || b.mover_name || b.mover_phone;
  const leadLabel = (b: Bid) => {
    const l = leads.get(b.lead_id);
    if (!l) return '—';
    return `${tenderRef(l)} · ${l.name} · ${cityOf(l.move_from) || l.city || '?'} ← ${cityOf(l.move_to) || '?'}`;
  };

  const done = bids.filter((b) => b.job_done_at).sort((a, b) => (b.job_done_at! > a.job_done_at! ? 1 : -1));
  const open = bids.filter((b) => !b.job_done_at && !b.hidden && leads.has(b.lead_id) && !done.some((d) => d.lead_id === b.lead_id));
  const due = (b: Bid) => commissionDue(b.final_price ?? b.price);
  const paid = (b: Bid) => (b.commission_paid_at ? b.commission_paid_amount ?? due(b) : 0);
  const totalDue = done.reduce((s, b) => s + due(b), 0);
  const totalPaid = done.reduce((s, b) => s + paid(b), 0);

  const byMover = new Map<string, { label: string; jobs: number; due: number; paid: number }>();
  for (const b of done) {
    const key = moverOf(b)?.id || b.mover_phone;
    const r = byMover.get(key) || { label: moverLabel(b), jobs: 0, due: 0, paid: 0 };
    r.jobs++; r.due += due(b); r.paid += paid(b);
    byMover.set(key, r);
  }
  const moverRows = [...byMover.values()].sort((a, b) => (b.due - b.paid) - (a.due - a.paid));

  return (
    <AdminShell active="money" title="כספים ועמלות" counts={{ leads: leads.size, movers: movers.length - pending, pending }}>
      <AdminHero kicker="סביבת ניהול" title="כספים ועמלות"
        sub={`עמלה של ${COMMISSION_RATE * 100}% מהמחיר הסופי של כל הובלה, בתוספת מע״מ (${VAT_RATE * 100}%). כאן רואים מי חייב, מי שילם וכמה נכנס.`} />
      <div className="mmx-stats">
        <StatCard icon={<Truck size={20} />} n={done.length} label="הובלות שבוצעו" />
        <StatCard icon={<Banknote size={20} />} n={nis(totalDue)} label="סה״כ עמלות (כולל מע״מ)" />
        <StatCard icon={<CircleCheck size={20} />} n={nis(totalPaid)} label="התקבל" />
        <StatCard icon={<Hourglass size={20} />} n={nis(totalDue - totalPaid)} label="פתוח לגבייה" />
      </div>

      <h2 className="mmx-h2">לפי מוביל</h2>
      {moverRows.length === 0 ? <div className="mmx-empty">עדיין אין הובלות שסומנו כבוצעו. סמנו הובלה למטה כדי להתחיל לעקוב.</div> : (
        <div className="mmx-tablebox">
          <table className="mmx-table">
            <thead><tr><th>מוביל</th><th className="num">הובלות</th><th className="num">עמלות</th><th className="num">שולם</th><th className="num">יתרה לגבייה</th></tr></thead>
            <tbody>
              {moverRows.map((r) => (
                <tr key={r.label}><td>{r.label}</td><td className="num">{r.jobs}</td><td className="num">{nis(r.due)}</td><td className="num">{nis(r.paid)}</td>
                  <td className="num">{r.due - r.paid > 0 ? <span className="mmx-tag due">{nis(r.due - r.paid)}</span> : <span className="mmx-tag ok">שולם</span>}</td></tr>
              ))}
            </tbody>
            <tfoot><tr><td>סה״כ</td><td className="num">{done.length}</td><td className="num">{nis(totalDue)}</td><td className="num">{nis(totalPaid)}</td><td className="num">{nis(totalDue - totalPaid)}</td></tr></tfoot>
          </table>
        </div>
      )}

      <h2 className="mmx-h2">הובלות שבוצעו</h2>
      <p className="mmx-sub">כשמוביל משלם, רשמו את הסכום שהתקבל. אפשר לבטל סימון אם נעשתה טעות.</p>
      {done.length === 0 ? <div className="mmx-empty">אין עדיין הובלות שבוצעו.</div> : (
        <div className="mmx-tablebox">
          <table className="mmx-table">
            <thead><tr><th>בוצע</th><th>מכרז</th><th>מוביל</th><th className="num">מחיר סופי</th><th className="num">עמלה</th><th className="num">כולל מע״מ</th><th>תשלום</th><th></th></tr></thead>
            <tbody>
              {done.map((b) => {
                const fp = b.final_price ?? b.price;
                return (
                  <tr key={b.id}>
                    <td>{day(b.job_done_at!)}</td><td>{leadLabel(b)}</td><td>{moverLabel(b)}</td>
                    <td className="num">{nis(fp)}</td><td className="num">{nis(commissionOf(fp))}</td><td className="num"><b>{nis(due(b))}</b></td>
                    <td>
                      {b.commission_paid_at ? (
                        <span className="mmx-inline"><span className="mmx-tag ok">שולם {nis(paid(b))} · {day(b.commission_paid_at)}</span>{b.commission_note ? <small>{b.commission_note}</small> : null}</span>
                      ) : (
                        <form action={setCommissionPaid} className="mmx-inline">
                          <input type="hidden" name="id" value={b.id} />
                          <input name="amount" inputMode="numeric" defaultValue={due(b)} aria-label="סכום שהתקבל" dir="ltr" />
                          <input name="note" className="wide" placeholder="הערה (העברה, ביט…)" aria-label="הערה" />
                          <button className="mmx-btn">סמן ששולם</button>
                        </form>
                      )}
                    </td>
                    <td>
                      {b.commission_paid_at
                        ? <form action={clearCommissionPaid.bind(null, b.id)}><button className="mmx-btn ghost">בטל תשלום</button></form>
                        : <form action={undoJobDone.bind(null, b.id)}><button className="mmx-btn ghost">לא בוצע</button></form>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mmx-h2">סימון הובלה שבוצעה</h2>
      <p className="mmx-sub">כל ההצעות במכרזים שעוד לא נסגרו. בחרו את המוביל שביצע את ההובלה, עדכנו את המחיר הסופי אם השתנה, וסמנו.</p>
      {open.length === 0 ? <div className="mmx-empty">אין הצעות פתוחות כרגע.</div> : (
        <div className="mmx-tablebox">
          <table className="mmx-table">
            <thead><tr><th>מכרז</th><th>מוביל</th><th className="num">הצעה</th><th>מצב</th><th>מחיר סופי (אחרי הנחת 50 ₪, לפני מע״מ) וסימון</th></tr></thead>
            <tbody>
              {open.map((b) => (
                <tr key={b.id}>
                  <td>{leadLabel(b)}</td><td>{moverLabel(b)}</td><td className="num">{nis(b.price)}</td>
                  <td>{b.booked_at ? <span className="mmx-tag ok">המוביל סימן שנסגר</span> : <span className="mmx-tag due">הצעה</span>}</td>
                  <td>
                    <form action={markJobDone} className="mmx-inline">
                      <input type="hidden" name="id" value={b.id} />
                      <input name="final_price" inputMode="numeric" defaultValue={b.price} aria-label="מחיר סופי" dir="ltr" />
                      <button className="mmx-btn">ההובלה בוצעה</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
