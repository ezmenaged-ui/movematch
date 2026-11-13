'use client';
import { Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { LeadRef } from '@/lib/client';

/** Desktop only: a QR code that opens the phone upload page for this same lead,
 *  plus a live count of videos that arrived from the phone. */
export function QrHandoff({ leadRef, onRemoteCount, onCompleted }: { leadRef: LeadRef; onRemoteCount: (n: number) => void; onCompleted?: () => void }) {
  const [svg, setSvg] = useState('');
  const [count, setCount] = useState(0);
  const cb = useRef(onRemoteCount);
  cb.current = onRemoteCount;
  const doneCb = useRef(onCompleted);
  doneCb.current = onCompleted;
  const { id, token } = leadRef;

  useEffect(() => {
    const url = `${window.location.origin}/u/${id}?k=${token}`;
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1d2d3d', light: '#ffffff' } }).then(setSvg).catch(() => {});
  }, [id, token]);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/leads/${id}/videos?k=${token}`, { cache: 'no-store' });
        if (r.ok) { const { count: n, status } = await r.json(); if (!stop) { setCount(n); cb.current(n); if (status === 'complete') doneCb.current?.(); } }
      } catch { /* ignore */ }
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => { stop = true; clearInterval(t); };
  }, [id, token]);

  return (
    <div className="qr-handoff desktop-only">
      <div className="qr-box" role="img" aria-label="קוד QR לצילום בטלפון" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="qr-text">
        <b><Smartphone size={18} strokeWidth={1.5} aria-hidden /> נוח יותר לצלם בטלפון?</b>
        <span>סרקו את הקוד עם מצלמת הטלפון וצלמו שם. אפשר לסיים בטלפון, או לחזור לכאן ולשלוח מהמחשב.</span>
        {count > 0
          ? <span className="qr-got">✓ {count === 1 ? 'התקבל סרטון אחד' : `התקבלו ${count} סרטונים`}. אפשר לשלוח.</span>
          : <span className="qr-wait"><i className="qr-dot" /> ממתינים לסרטונים מהטלפון…</span>}
      </div>
    </div>
  );
}
