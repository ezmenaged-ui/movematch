'use client';
import { Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { LeadRef } from '@/lib/client';

/** Desktop only: a QR code that opens the phone upload page for this same lead,
 *  plus a live count of videos that arrived from the phone. */
/** `ownCount`: videos this page already uploaded itself. The lead's video count includes them, so they are subtracted:
 *  only videos that really came from the phone count as "from the phone". */
/** `returnToDesktop`: the video is not the last step (funnel D: the item list comes after it). The phone then only films,
 *  and tells the client to come back to the computer to continue, instead of offering to finish there. */
export function QrHandoff({ leadRef, onRemoteCount, onCompleted, ownCount = 0, returnToDesktop = false }: { leadRef: LeadRef; onRemoteCount: (n: number) => void; onCompleted?: () => void; ownCount?: number; returnToDesktop?: boolean }) {
  const [svg, setSvg] = useState('');
  const [total, setTotal] = useState(0);
  const count = Math.max(0, total - ownCount);
  const cb = useRef(onRemoteCount);
  cb.current = onRemoteCount;
  const doneCb = useRef(onCompleted);
  doneCb.current = onCompleted;
  const { id, token } = leadRef;

  useEffect(() => {
    const url = `${window.location.origin}/u/${id}?k=${token}${returnToDesktop ? '&b=1' : ''}`;
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1d2d3d', light: '#ffffff' } }).then(setSvg).catch(() => {});
  }, [id, token, returnToDesktop]);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/leads/${id}/videos?k=${token}`, { cache: 'no-store' });
        if (r.ok) { const { count: n, status } = await r.json(); if (!stop) { setTotal(n); if (status === 'complete') doneCb.current?.(); } }
      } catch { /* ignore */ }
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => { stop = true; clearInterval(t); };
  }, [id, token]);

  useEffect(() => { cb.current(count); }, [count]);

  return (
    <div className="qr-handoff desktop-only">
      <div className="qr-box" role="img" aria-label="קוד QR לצילום בטלפון" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="qr-text">
        <b><Smartphone size={18} strokeWidth={1.5} aria-hidden /> נוח יותר לצלם בטלפון?</b>
        <span>{returnToDesktop ? 'סרקו את הקוד עם מצלמת הטלפון וצלמו שם. אחרי הצילום חזרו לכאן, למחשב, כדי להמשיך.' : 'סרקו את הקוד עם מצלמת הטלפון וצלמו שם. אפשר לסיים בטלפון, או לחזור לכאן ולשלוח מהמחשב.'}</span>
        {count > 0
          ? <span className="qr-got">✓ {count === 1 ? 'התקבל סרטון אחד' : `התקבלו ${count} סרטונים`}. {returnToDesktop ? 'לחצו "המשך" למטה.' : 'אפשר לשלוח.'}</span>
          : <span className="qr-wait"><i className="qr-dot" /> ממתינים לסרטונים מהטלפון…</span>}
      </div>
    </div>
  );
}
