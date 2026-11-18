'use client';
import { useEffect, useState } from 'react';
import { getEntry } from '@/lib/client';

/**
 * Strip at the top of every /qa page (and the follow-up pages of a /qa visit): this is the test area,
 * nothing is sent to movers or to the phone number entered. See lib/qa.ts.
 */
export function QaBanner({ always = false }: { always?: boolean }) {
  const [show, setShow] = useState(always);
  useEffect(() => { if (!always) setShow(getEntry() === 'qa'); }, [always]);
  if (!show) return null;
  return (
    <div role="note" dir="rtl" style={{
      position: 'sticky', top: 0, zIndex: 50, background: '#7c3aed', color: '#fff', textAlign: 'center',
      font: '600 14px/1.4 system-ui, sans-serif', padding: '8px 16px',
    }}>
      🧪 סביבת בדיקות (QA): שום דבר לא נשלח למובילים או לטלפון שמוזן כאן. <a href="/qa" style={{ color: '#fff', textDecoration: 'underline' }}>כל המשפכים</a>
    </div>
  );
}
