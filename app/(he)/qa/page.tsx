import Link from 'next/link';
import { QaBanner } from '@/components/QaBanner';

/**
 * /qa: the test area. Links to all 10 funnels; a lead made here is saved and marked as a test,
 * the owner gets the lead email, and nothing goes to movers or to the phone entered (lib/qa.ts, migration 023).
 */
export const metadata = { title: 'MoveMatch · סביבת בדיקות', robots: { index: false, follow: false } };

const FUNNELS = [
  ['a', 'A', 'חזרה טלפונית: שם, טלפון ועיר'],
  ['b', 'B', 'אשף: מאיפה, לאן, מתי ורשימת פריטים'],
  ['c', 'C', 'טופס בעמוד אחד עם סרטון'],
  ['d', 'D', 'אשף עם סרטון חובה ורשימת פריטים (כמו דף הבית)'],
  ['e', 'E', 'אשף עם בחירה: סרטון או רשימת פריטים'],
] as const;

export default function Page() {
  return (
    <main dir="rtl" style={{ minHeight: '100vh', background: '#f6f5fb', fontFamily: 'system-ui, sans-serif', color: '#1f1b2e' }}>
      <QaBanner always />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px' }}>
        <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>MoveMatch · סביבת בדיקות</h1>
        <p style={{ margin: '0 0 24px', lineHeight: 1.6 }}>
          כאן אפשר לעבור על כל המשפכים כמו לקוח אמיתי. הפרטים נשמרים כליד בדיקה, ולא נשלח שום וואטסאפ או SMS: לא למובילים ולא לטלפון שמוזן.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
          {FUNNELS.map(([f, letter, desc]) => (
            <li key={f} style={{ background: '#fff', borderRadius: 12, padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>משפך {letter}</div>
              <div style={{ margin: '4px 0 12px', color: '#5b5670' }}>{desc}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href={`/qa/${f}/photo`} style={btn}>עיצוב צילום</Link>
                <Link href={`/qa/${f}/art`} style={btn}>עיצוב איור</Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

const btn = { background: '#7c3aed', color: '#fff', padding: '10px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 } as const;
