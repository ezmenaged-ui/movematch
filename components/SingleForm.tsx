'use client';
import { Check, PhoneCall } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { funnelParams, LeadRef, track, trackStep, updateLead } from '@/lib/client';
import { FlowTheme, liveHandoff, loadHandoff } from '@/lib/handoff';
import { FlowShell } from './themed/FlowShell';
import { Address, emptyAddress, emptyWhen, MSG, validateAddress, validateWhen, When } from '@/lib/validate';
import { WhenFields } from './WhenFields';
import { PriorityScale } from './PriorityScale';
import { QrHandoff } from './QrHandoff';
import { AddressFields } from './AddressFields';
import { CityDatalist } from './fields';
import { useUploads } from './useUploads';
import { Checklist, ClipList, VideoButtons, VideoRules } from './VideoUploader';
import { Blueprint, Corners, Spinner } from './ui';

/** Funnel C, after the shared first step: from, to and video on one page, one submit. */
export function SingleForm() {
  const router = useRouter();
  const [ref, setRef] = useState<LeadRef | null>(null);
  const [theme, setTheme] = useState<FlowTheme>('photo');
  const [name, setName] = useState('');
  const [from, setFrom] = useState<Address>(emptyAddress);
  const [to, setTo] = useState<Address>(emptyAddress);
  const [when, setWhen] = useState<When>(emptyWhen);
  const [priority, setPriority] = useState(3);
  const [remote, setRemote] = useState(0);
  const onRemote = useCallback((n: number) => setRemote(n), []);
  const [skipped, setSkipped] = useState(false);
  const [errs, setErrs] = useState<{ from?: Partial<Record<keyof Address, string>>; to?: Partial<Record<keyof Address, string>>; when?: string; video?: string }>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [fail, setFail] = useState('');
  const up = useUploads();

  useEffect(() => {
    const h0 = loadHandoff('c');
    if (!h0) { router.replace('/c/photo' + window.location.search); return; }
    liveHandoff(h0).then((h) => {
      if (!h) { router.replace('/c/photo' + window.location.search); return; }
      setRef(h.ref); setName(h.name); up.attach(h.ref); setTheme(h.theme || 'photo');
      trackStep('c', h.theme, 2, 'details');
      setFrom({ ...emptyAddress(), city: h.city || '' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save what's typed so far (debounced), so the customer can also finish from their phone via the QR code.
  useEffect(() => {
    if (!ref || done) return;
    const t = setTimeout(() => {
      updateLead(ref, { move_from: { ...from, elevator: from.elevator ?? false }, move_to: { ...to, elevator: to.elevator ?? false }, move_when: when, priority }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [ref, from, to, when, priority, done]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFail('');
    const er: typeof errs = {};
    const f = validateAddress(from), t = validateAddress(to);
    if (Object.keys(f).length) er.from = f;
    if (Object.keys(t).length) er.to = t;
    const w = validateWhen(when);
    if (w.date) er.when = w.date;
    const hasVideo = up.usable.length > 0 || remote > 0;
    if (!hasVideo && !skipped) er.video = MSG.video;
    setErrs(er);
    if (Object.keys(er).length) {
      track('form_error', { ...funnelParams('c', theme), fields: Object.keys(er).join(',') });
      requestAnimationFrame(() => {
        const el = document.querySelector('[aria-invalid="true"], .drop.invalid') as HTMLElement | null;
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
      });
      return;
    }
    if (!ref) return;
    setBusy(true);
    try {
      await updateLead(ref, {
        status: 'complete', furthest_step: 5, video_skipped: skipped && !hasVideo, move_when: when, priority,
        move_from: { ...from, elevator: from.elevator ?? false }, move_to: { ...to, elevator: to.elevator ?? false },
      });
      track('lead_complete', funnelParams('c', theme));
      trackStep('c', theme, 3, 'done');
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { setFail('משהו השתבש. נסו שוב בעוד רגע.'); } finally { setBusy(false); }
  }

  const uploading = up.clips.some((c) => c.state === 'uploading' || c.state === 'queued');

  if (!ref) return <FlowShell theme={null} />;

  if (done) {
    return (
      <FlowShell theme={theme}>
        <div className="wiz">
          <Blueprint className="wiz-card done-wrap">
            <span className="done-icon blueprint"><Corners /><Check size={28} strokeWidth={1.5} /></span>
            <h2 style={{ marginBottom: 14 }}>קיבלנו. ההצעות בדרך.</h2>
            <p className="muted">{skipped && !up.usable.length && !remote ? 'נחזור אליכם בקרוב כדי לקבל את הסרטון, ואז נשלח אותו למובילים מדורגים באזור שלכם.' : 'שלחנו את הסרטון למובילים מדורגים באזור שלכם.'} ההצעות יגיעו אליכם לטלפון.</p>
            {uploading && <><p className="small" style={{ color: 'var(--color-accent-700)' }}>הסרטונים עדיין עולים. השאירו את הדף פתוח עד שההעלאה תסתיים.</p><ClipList clips={up.clips} onRemove={up.remove} /></>}
          </Blueprint>
        </div>
      </FlowShell>
    );
  }

  return (
    <FlowShell theme={theme}>
        <form className="f-page wrap" onSubmit={submit} noValidate>
          <CityDatalist />
          <div className="f-head f-head-next">
            <div className="saved-line"><Check size={15} strokeWidth={2} /> {name ? `תודה ${name.split(' ')[0]}, ` : ''}שמרנו את הפרטים. נחזור אליכם בכל מקרה.</div>
            <h1>עוד דקה ומקבלים 5 הצעות מחיר אמיתיות</h1>
            <p>ספרו לנו מאיפה ולאן עוברים וצרפו סרטון קצר, כדי שהמובילים יתנו מחיר מדויק ולא הערכה.</p>
          </div>
          <div className="f-grid">
            <Blueprint as="section" className="f-sec">
              <h2><span className="f-num">1</span> מאיפה עוברים</h2>
              <AddressFields value={from} onChange={setFrom} errors={errs.from} />
            </Blueprint>
            <Blueprint as="section" className="f-sec">
              <h2><span className="f-num">2</span> לאן עוברים</h2>
              <AddressFields value={to} onChange={setTo} errors={errs.to} />
            </Blueprint>
            <Blueprint as="section" className="f-sec full">
              <h2><span className="f-num">3</span> מתי עוברים</h2>
              <div className="f-when"><WhenFields value={when} onChange={(v) => { setWhen(v); setErrs((e) => ({ ...e, when: '' })); }} error={errs.when} /></div>
              <PriorityScale value={priority} onChange={setPriority} />
            </Blueprint>
            <Blueprint as="section" className="f-sec full">
              <h2><span className="f-num">4</span> סרטון של מה שעובר</h2>
              {ref && <div style={{ marginBottom: 18 }}><QrHandoff leadRef={ref} onRemoteCount={(n) => { onRemote(n); if (n) setErrs((e) => ({ ...e, video: '' })); }} onCompleted={() => { setDone(true); window.scrollTo({ top: 0 }); }} /></div>}
              <div className="f-video">
                <div className={`drop ${errs.video ? 'invalid' : ''}`}>
                  <VideoRules />
                  <ClipList clips={up.clips} onRemove={up.remove} />
                  {!(skipped && !up.usable.length) && <VideoButtons onFiles={(f) => { up.add(f); setSkipped(false); setErrs((e) => ({ ...e, video: '' })); }} compact more={up.usable.length > 0} />}
                  {skipped && !up.usable.length && !remote
                    ? <div className="skip-box"><PhoneCall size={18} strokeWidth={1.5} aria-hidden /><span>אין בעיה. נחזור אליכם טלפונית כדי לקבל את הסרטון. <button type="button" className="btn-link" style={{ padding: 0, minHeight: 0 }} onClick={() => setSkipped(false)}>בעצם, אצלם עכשיו</button></span></div>
                    : !up.usable.length && !remote && <button type="button" className="btn-link" onClick={() => { setSkipped(true); setErrs((e) => ({ ...e, video: '' })); }}>אין סרטון עכשיו? דלגו ונחזור אליכם לקבלת הסרטון</button>}
                  {errs.video && <div className="field-error" role="alert">{errs.video}</div>}
                </div>
                <div>
                  <div className="small" style={{ fontWeight: 700, marginBottom: 10 }}>מה חשוב לצלם</div>
                  <Checklist />
                </div>
              </div>
            </Blueprint>
            <div className="f-submit full">
              <button type="submit" className="btn btn-primary btn-lg blueprint" disabled={busy} aria-busy={busy}><Corners />{busy && <Spinner />} שלחו וקבלו 5 הצעות</button>
              {fail && <div className="field-error" role="alert">{fail}</div>}
            </div>
          </div>
        </form>
    </FlowShell>
  );
}
