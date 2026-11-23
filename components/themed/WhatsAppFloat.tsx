'use client';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { LEGAL } from '@/lib/legal';
import { funnelParams, track } from '@/lib/client';
import type { Funnel } from '@/lib/handoff';
import type { Theme } from '../CallbackForm';
import { DEFAULT_LOCALE, t, type Locale } from '@/lib/i18n';
import { WhatsAppIcon } from './WhatsAppCta';

/**
 * The starter typed (never sent for them) when a visitor taps the floating button. It passes the bot's starter check
 * (lib/waFunnel.ts → isStarter) and is labelled FW there (starterSource), so these chats are told apart from the
 * Google Ads WhatsApp ad (F2) and from /f's lead-card button (FL). Keep it in Hebrew: the bot matches it.
 */
export const FLOAT_STARTER = 'היי, הגעתי מהאתר של MoveMatch ואני רוצה הצעת מחיר להובלה.';
/** The English site's starter: the bot recognises it (also FW) and runs the whole chat in English. */
export const FLOAT_STARTER_EN = "Hi, I came from the MoveMatch website and I'd like a moving quote.";
/** The MoveMatch business WhatsApp number (the Twilio sender), from lib/legal.ts. Never the operator's personal number. */
export const floatWaUrl = (locale: Locale) => `https://wa.me/${LEGAL.whatsapp}?text=${encodeURIComponent(locale === 'en' ? FLOAT_STARTER_EN : FLOAT_STARTER)}`;

/** Desktop = a wide screen with a mouse. There the button opens a panel (WhatsApp Web button + QR for the phone). */
const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)').matches;

/**
 * Floating WhatsApp call to action, bottom-left on every landing page (not /qa).
 * Phone: a plain link to wa.me (the WhatsApp app opens with the starter typed).
 * Desktop: opens a small panel with a "open chat" button (WhatsApp Web / desktop app) and a QR code to continue on the phone.
 * Events: `wa_float_open` (desktop panel opened) and `wa_cta_click` with placement `float` (phone tap) or `float_panel`
 * (desktop button). A click is not a lead: no generate_lead.
 */
export function WhatsAppFloat({ funnel, theme, landing, locale = DEFAULT_LOCALE }: { funnel: Funnel; theme: Theme; landing: string; locale?: Locale }) {
  const d = t(locale).waFloat;
  const FLOAT_WA_URL = floatWaUrl(locale);
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState('');
  const fab = useRef<HTMLAnchorElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const params = { ...funnelParams(funnel, theme), landing_page: landing };

  useEffect(() => {
    if (!open) return;
    if (!qr) QRCode.toString(FLOAT_WA_URL, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0b1f4d', light: '#ffffff' } }).then(setQr).catch(() => {});
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onDown = (e: PointerEvent) => {
      const el = e.target as Node;
      if (!panel.current?.contains(el) && !fab.current?.contains(el)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function close() { setOpen(false); fab.current?.focus(); }

  function onFab(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isDesktop()) {
      e.preventDefault();
      if (!open) track('wa_float_open', params);
      setOpen(!open);
      return;
    }
    track('wa_cta_click', { ...params, placement: 'float' });
  }

  return (
    <div className="wa-float" data-open={open ? 'true' : undefined}>
      {open && (
        <div className="wa-panel" ref={panel} role="dialog" aria-labelledby={titleId}>
          <div className="wa-panel-head">
            <button type="button" className="wa-panel-x" ref={closeBtn} onClick={close} aria-label={d.close}><X size={18} strokeWidth={2.25} aria-hidden /></button>
            <span className="wa-panel-badge"><i aria-hidden /> <span>{d.badge}</span></span>
            <h2 id={titleId}>{d.title}</h2>
            <p>{d.sub}</p>
          </div>
          <div className="wa-panel-chat" aria-hidden>
            <div className="wa-bubble"><span>{d.bubble}</span><time>{d.bubbleTime}</time></div>
          </div>
          <div className="wa-panel-foot">
            <div className="wa-panel-go">
              <a className="wa-panel-btn" href={FLOAT_WA_URL} target="_blank" rel="noopener noreferrer"
                onClick={() => { track('wa_cta_click', { ...params, placement: 'float_panel' }); setOpen(false); }}>
                <WhatsAppIcon size={24} /> <span>{d.button}</span>
              </a>
              <span className="wa-panel-note">{d.note}</span>
            </div>
            <figure className="wa-panel-qr">
              <div className="wa-qr-box" role="img" aria-label={d.qrAria} dangerouslySetInnerHTML={{ __html: qr }} />
              <figcaption>{d.qr}</figcaption>
            </figure>
          </div>
        </div>
      )}
      <a ref={fab} className="wa-fab" href={FLOAT_WA_URL} target="_blank" rel="noopener noreferrer" onClick={onFab}
        aria-label={d.aria} aria-expanded={open} aria-haspopup="dialog">
        <span className="wa-fab-ico"><WhatsAppIcon size={30} /></span>
        <span className="wa-fab-label">{d.label}</span>
      </a>
    </div>
  );
}
