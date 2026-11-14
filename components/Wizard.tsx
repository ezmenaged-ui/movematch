'use client';
import { Check, ClipboardList, Video } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearHandoff, FlowTheme, liveHandoff, loadHandoff, saveHandoff, VARIANT } from '@/lib/handoff';
import { FlowShell } from './themed/FlowShell';
import { createLead, fmtDuration, funnelParams, LeadGoneError, LeadRef, PhoneRecentError, track, trackStep, updateLead } from '@/lib/client';
import { Address, emptyAddress, emptyWhen, isValidName, isValidPhone, MSG, phoneRecentMsg, normalizePhone, validateAddress, validateWhen, When, whenText } from '@/lib/validate';
import { PriorityScale } from './PriorityScale';
import { ItemsPicker } from './ItemsPicker';
import { asmAnswered, emptyItems, ItemsValue, itemsCount } from '@/lib/items';
import { WhenFields } from './WhenFields';
import { QrHandoff } from './QrHandoff';
import { AddressFields } from './AddressFields';
import { CityDatalist, Field, PhoneField } from './fields';
import { useUploads } from './useUploads';
import { ClipList, VideoButtons } from './VideoUploader';
import { Blueprint, Corners, MidragBadge, Spinner } from './ui';
import { MoversScene } from './Illustrations';
import { HAS_MOVERS_PHOTO, MoversTrustRow } from './MoversVisual';

const S_WHEN = 4;

type Saved = { step: number; furthest?: number; ref: LeadRef | null; name: string; phone: string; from: Address; to: Address; when: When; priority?: number; items?: ItemsValue; mode?: InfoMode; t: number };
/** Funnel E: how the client tells the movers what is moving. The other option stays available as an optional extra. */
type InfoMode = 'video' | 'items';
/** Funnel E asks for a full walk-through of about 3 minutes; shorter videos get a warning but can still be sent. */
const E_VIDEO_TARGET_S = 180;
const fmtMin = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/**
 * Funnels B and D, after the shared first step: from → to → when → items (picked from the room list, or added by the client).
 * B ends there: from → to → when → items → done.
 * D adds an optional video step: from → to → when → items → videos → done.
 * E has one information page instead: from → to → when → info (a full 3-minute video OR the item list; the other is optional) → done.
 */
export function Wizard({ funnel = 'b' }: { funnel?: 'b' | 'd' | 'e' }) {
  const isD = funnel === 'd', isE = funnel === 'e';
  const LABELS = isD ? ['פרטים', 'מאיפה', 'לאן', 'מתי', 'פריטים', 'סרטונים', 'סיום'] : isE ? ['פרטים', 'מאיפה', 'לאן', 'מתי', 'מה עובר', 'סיום'] : ['פרטים', 'מאיפה', 'לאן', 'מתי', 'פריטים', 'סיום'];
  const S_ITEMS = isE ? -1 : 5, S_INFO = isE ? 5 : -1, S_VIDEO = isD ? 6 : -1, S_DONE = isD ? 7 : 6, TOTAL = S_DONE, S_LAST = S_DONE - 1;
  const STORE = isD ? 'mm_wizard_d1' : isE ? 'mm_wizard_e1' : 'mm_wizard_b5';
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<FlowTheme>('photo');
  const [step, setStep] = useState(2);
  const [furthest, setFurthest] = useState(2); // highest step reached: every step up to here is clickable in the progress bar
  const [ref, setRef] = useState<LeadRef | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [from, setFrom] = useState<Address>(emptyAddress);
  const [to, setTo] = useState<Address>(emptyAddress);
  const [when, setWhen] = useState<When>(emptyWhen);
  const [whenErr, setWhenErr] = useState('');
  const [priority, setPriority] = useState(3);
  const [items, setItems] = useState<ItemsValue>(emptyItems);
  const [mode, setMode] = useState<InfoMode | null>(null);
  const [extraOpen, setExtraOpen] = useState(false);
  const [shortWarn, setShortWarn] = useState(false);
  const [remote, setRemote] = useState(0);
  const onRemote = useCallback((n: number) => setRemote(n), []);
  const [err, setErr] = useState<Record<string, string>>({});
  const [addrErr, setAddrErr] = useState<Partial<Record<keyof Address, string>>>({});
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState('');
  const [flagsMissing, setFlagsMissing] = useState(false);
  const [hp, setHp] = useState('');
  const up = useUploads();

  // One funnel_step event each time a step is shown (from step 2; steps 0-1 are tracked on the landing page).
  const STEP_NAMES = isD ? ['contact', 'from', 'to', 'when', 'items', 'video', 'done'] : isE ? ['contact', 'from', 'to', 'when', 'info', 'done'] : ['contact', 'from', 'to', 'when', 'items', 'done'];
  useEffect(() => {
    if (ready && step >= 2) trackStep(funnel, theme, step, STEP_NAMES[step - 1] || `step${step}`, isE && step === S_DONE && mode ? { info_choice: mode } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, step]);

  // Start from the lead created on the first page (/b). Resume mid-way after a refresh.
  useEffect(() => {
    const h0 = loadHandoff(funnel);
    if (!h0) { router.replace(`/${funnel}/photo` + window.location.search); return; }
    (async () => {
    const h = await liveHandoff(h0);
    if (!h) { router.replace(`/${funnel}/photo` + window.location.search); return; }
    try {
      const s: Saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (s && (s.ref?.id === h.ref.id || s.ref?.id === h0.ref.id) && s.step < S_DONE) {
        setStep(Math.max(2, Math.min(s.step, S_LAST))); setFurthest(Math.max(2, Math.min(Math.max(s.furthest || 0, s.step), S_LAST))); setFrom(s.from); setTo(s.to); setWhen(s.when || emptyWhen()); setPriority(s.priority || 3); if (s.items) setItems(s.items); if (s.mode) setMode(s.mode);
      } else {
        setFrom({ ...emptyAddress(), city: h.city || '' });
      }
    } catch { setFrom({ ...emptyAddress(), city: h.city || '' }); }
    setRef(h.ref); setName(h.name); setPhone(h.phone); up.attach(h.ref); setTheme(h.theme || 'photo');
    setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ref) return;
    try {
      if (step >= S_DONE) localStorage.removeItem(STORE);
      else localStorage.setItem(STORE, JSON.stringify({ step, furthest, ref, name, phone, from, to, when, priority, items, mode: mode || undefined, t: Date.now() } satisfies Saved));
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, furthest, ref, name, phone, from, to, when, priority, items, mode]);

  const show = (n: number) => { setStep(n); setFurthest((f) => Math.max(f, Math.min(n, S_LAST))); setFail(''); setAddrErr({}); setErr({}); setWhenErr(''); window.scrollTo({ top: 0 }); };
  /** Open a step. Each step gets its own browser history entry, so the phone's Back button goes to the previous step
   *  instead of leaving the funnel. (Spread the current state: Next.js keeps its router state in it.) */
  const go = (n: number) => {
    if (n !== stepRef.current) { try { window.history.pushState({ ...(window.history.state || {}), mmStep: n }, ''); } catch { /* ignore */ } }
    show(n);
  };
  const stepRef = useRef(step);
  stepRef.current = step;

  // Browser Back / Forward between steps. After the request is sent, Back leaves to the landing page:
  // a finished request is never reopened (its handoff is cleared below).
  useEffect(() => {
    if (!ready) return;
    try { window.history.replaceState({ ...(window.history.state || {}), mmStep: stepRef.current }, ''); } catch { /* ignore */ }
    const onPop = (e: PopStateEvent) => {
      if (stepRef.current >= S_DONE) { router.replace(`/${funnel}/${theme}` + window.location.search); return; }
      const n = Number((e.state as { mmStep?: unknown } | null)?.mmStep);
      if (Number.isInteger(n) && n >= 2 && n <= S_LAST) show(n);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  useEffect(() => { if (ready && step >= S_DONE) clearHandoff(); }, [ready, step, S_DONE]);

  /** Progress bar click: save what's valid on this step (no blocking), then open the chosen step. */
  function jump(n: number) {
    if (n === step || busy) return;
    if (ref) {
      if (step === 1 && isValidName(name) && isValidPhone(phone)) updateLead(ref, { name: name.trim(), phone: normalizePhone(phone) }).catch(() => {});
      if ((step === 2 || step === 3) && !Object.keys(validateAddress(step === 2 ? from : to)).length) {
        const a = step === 2 ? from : to, norm = { ...a, elevator: a.elevator ?? false };
        updateLead(ref, step === 2 ? { move_from: norm } : { move_to: norm }).catch(() => {});
      }
      if (step === S_WHEN && !validateWhen(when).date) updateLead(ref, { move_when: when, priority }).catch(() => {});
      if ((step === S_ITEMS || step === S_INFO) && items.list.length) updateLead(ref, { items }).catch(() => {});
    }
    setErr({}); setWhenErr('');
    go(n);
  }

  async function next(e?: FormEvent) {
    e?.preventDefault();
    setFail('');
    if (step === 1) {
      const er: Record<string, string> = {};
      if (!isValidName(name)) er.name = MSG.name;
      if (!isValidPhone(phone)) er.phone = MSG.phone;
      setErr(er);
      if (Object.keys(er).length) return;
      setBusy(true);
      try {
        const fields = { name: name.trim(), phone: normalizePhone(phone) };
        let r = ref;
        if (r) await updateLead(r, fields);
        else { r = await createLead('wizard', { ...fields, furthest_step: 1 }, hp); setRef(r); up.attach(r); track('lead_created', funnelParams(funnel, theme)); track('generate_lead', funnelParams(funnel, theme)); trackStep(funnel, theme, 1, 'contact'); }
        go(2);
      } catch (e) {
        if (e instanceof PhoneRecentError) setErr({ phone: phoneRecentMsg(e.until) });
        else setFail('משהו השתבש. נסו שוב בעוד רגע.');
      } finally { setBusy(false); }
      return;
    }
    if (step === 2 || step === 3) {
      const a = step === 2 ? from : to;
      const er = validateAddress(a);
      setAddrErr(er);
      if (Object.keys(er).length) return;
      const norm = { ...a, elevator: a.elevator ?? false };
      if (ref) updateLead(ref, step === 2 ? { move_from: norm, furthest_step: 2 } : { move_to: norm, furthest_step: 3 }).catch(() => {});
      go(step + 1);
      return;
    }
    if (step === S_WHEN) {
      const er = validateWhen(when);
      setWhenErr(er.date || '');
      if (er.date) return;
      if (ref) updateLead(ref, { move_when: when, priority, furthest_step: S_WHEN }).catch(() => {});
      go(isE ? S_INFO : S_ITEMS);
      return;
    }
    if (step === S_INFO) {
      if (!mode) { setFail('בחרו איך לספר למובילים מה עובר: סרטון של הדירה או רשימת פריטים.'); return; }
      const hasVideo = up.usable.length > 0 || remote > 0;
      if (mode === 'video') {
        if (!hasVideo) { setFail('צלמו או העלו את סרטון הדירה. אפשר גם לבחור ברשימת פריטים במקום.'); return; }
        // Warn (once) when the known length is under 3 minutes. Videos sent from the phone (QR) have no known length here.
        const known = !remote && up.usable.every((c) => c.duration != null);
        if (known && up.totalDuration < E_VIDEO_TARGET_S && !shortWarn) {
          setShortWarn(true);
          requestAnimationFrame(() => document.getElementById('e-short')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
          return;
        }
      } else if (!items.list.length) { setFail('הוסיפו לפחות פריט אחד: בחרו מהרשימה, או הוסיפו פריט שלא ברשימה.'); return; }
      // Items are the main option, or were added as an extra: they need the disassembly answer like in B and D.
      if (items.list.length && !asmAnswered(items)) {
        setFlagsMissing(true);
        setFail('סמנו אילו פריטים צריכים פירוק או הרכבה, או סמנו שאף פריט לא צריך.');
        requestAnimationFrame(() => document.getElementById('it-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        return;
      }
    }
    if (step === S_ITEMS) {
      if (!items.list.length) { setFail('הוסיפו לפחות פריט אחד: בחרו מהרשימה, או הוסיפו פריט שלא ברשימה.'); return; }
      if (!asmAnswered(items)) {
        setFlagsMissing(true);
        setFail('סמנו אילו פריטים צריכים פירוק או הרכבה, או סמנו שאף פריט לא צריך.');
        requestAnimationFrame(() => document.getElementById('it-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        return;
      }
      if (isD) {
        if (ref) updateLead(ref, { items, furthest_step: S_ITEMS }).catch(() => {});
        go(S_VIDEO);
        return;
      }
    }
    if (step === S_LAST) {
      // Steps can be reached without passing their checks (progress bar, browser Forward): check everything once more.
      const fromErr = validateAddress(from), toErr = validateAddress(to);
      if (Object.keys(fromErr).length) { go(2); setAddrErr(fromErr); return; }
      if (Object.keys(toErr).length) { go(3); setAddrErr(toErr); return; }
      if (validateWhen(when).date) { go(S_WHEN); setWhenErr(validateWhen(when).date || ''); return; }
      if (!items.list.length || !asmAnswered(items)) { go(S_ITEMS); setFlagsMissing(!asmAnswered(items)); return; }
      setBusy(true);
      try {
        // send every detail again: if the lead was re-opened (see liveHandoff), the earlier step saves went to the old one
        const all = {
          status: 'complete', furthest_step: S_DONE, video_skipped: isD && !up.usable.length && !remote, items, move_when: when, priority,
          move_from: { ...from, elevator: from.elevator ?? false }, move_to: { ...to, elevator: to.elevator ?? false },
        };
        if (ref) {
          try { await updateLead(ref, all); } catch (e) {
            if (!(e instanceof LeadGoneError)) throw e;
            // The lead was deleted while the page was open (e.g. a cleanup): open a fresh one with every detail, once.
            // Videos already uploaded belonged to the old lead and are not carried over. No new generate_lead event.
            const fresh = await createLead(VARIANT[funnel], { name, phone, city: from.city, theme, status: 'partial', furthest_step: 1 });
            setRef(fresh); up.attach(fresh);
            saveHandoff({ funnel, ref: fresh, name, phone, city: from.city, theme });
            await updateLead(fresh, all);
          }
        }
        track('lead_complete', funnelParams(funnel, theme));
        go(S_DONE);
      } catch { setFail('משהו השתבש. נסו שוב בעוד רגע.'); } finally { setBusy(false); }
    }
  }

  const uploading = up.clips.some((c) => c.state === 'uploading' || c.state === 'queued');

  if (!ready) return <FlowShell theme={null} />;

  return (
    <FlowShell theme={theme} progress={`${step}/${TOTAL}`}>
        <div className="wiz">
          <div className="progress progress-labeled" style={{ gridTemplateColumns: `repeat(${TOTAL}, 1fr)` }} aria-label={`שלב ${step} מתוך ${TOTAL}`}>
            {LABELS.map((l, i) => {
              const n = i + 1, reachable = step < S_DONE && n <= furthest && n !== step;
              const cls = `item ${n < step || (n <= furthest && n !== step && step < S_DONE) ? 'done' : ''} ${n === step ? 'cur' : ''}`;
              const body = <><i className={`seg ${n <= Math.max(step, step < S_DONE ? furthest : step) ? 'on' : ''}`} /><b><span>{l}{n !== step && n <= (step < S_DONE ? furthest : step) && n < S_DONE && <Check size={13} strokeWidth={2} />}</span></b></>;
              return reachable
                ? <button key={l} type="button" className={`${cls} item-btn`} onClick={() => jump(n)} aria-label={`מעבר לשלב ${l}`}>{body}</button>
                : <div key={l} className={cls} aria-current={n === step ? 'step' : undefined}>{body}</div>;
            })}
          </div>

          <Blueprint className="wiz-card">
            <form onSubmit={next} noValidate key={step} className="step-anim">
              <CityDatalist />
              {step !== 1 && <h1 className="visually-hidden">בקשת הצעות מחיר להובלה עם רשימת פריטים</h1>}
              {step === 1 && (
                <>
                  <h1>עוברים דירה? מעלים את כל פרטי ההובלה פעם אחת, מקבלים כמה הצעות מחיר ובוחרים את המחיר הטוב ביותר.</h1>
                  <p className="lead-sub">תנו לנו קצת פרטים ו־2 דקות ואנחנו חוזרים אליכם עם 5 הצעות מחברות הובלה מדורגות.</p>
                  <div className="stack">
                    <Field label="שם מלא" value={name} onChange={(v) => { setName(v); setErr((e) => ({ ...e, name: '' })); }} error={err.name} autoComplete="name" />
                    <PhoneField value={phone} onChange={(v) => { setPhone(v); setErr((e) => ({ ...e, phone: '' })); }} error={err.phone} />
                    <input className="visually-hidden" tabIndex={-1} autoComplete="off" aria-hidden value={hp} onChange={(e) => setHp(e.target.value)} />
                    <div className="mobile-only">{HAS_MOVERS_PHOTO ? <MoversTrustRow /> : <MidragBadge />}</div>
                  </div>
                  {!HAS_MOVERS_PHOTO && <div className="wiz-step1-art" aria-hidden><MoversScene compact /></div>}
                </>
              )}

              {step === 2 && (
                <>
                  <div className="saved-line"><Check size={15} strokeWidth={2} /> שמרנו את הפרטים. נחזור אליכם בכל מקרה.</div>
                  <h2>מאיפה עוברים?</h2>
                  <AddressFields value={from} onChange={setFrom} errors={addrErr} />
                </>
              )}

              {step === 3 && (
                <>
                  <h2>לאן עוברים?</h2>
                  <AddressFields value={to} onChange={setTo} errors={addrErr} />
                </>
              )}

              {step === S_WHEN && (
                <>
                  <h2>מתי עוברים?</h2>
                  <WhenFields value={when} onChange={(w) => { setWhen(w); setWhenErr(''); }} error={whenErr} />
                  <PriorityScale value={priority} onChange={setPriority} />
                </>
              )}

              {step === S_ITEMS && (
                <ItemsPicker value={items} flagsMissing={flagsMissing && !asmAnswered(items)} onChange={(v) => { setItems(v); setFail(''); if (asmAnswered(v)) setFlagsMissing(false); }} />
              )}

              {isD && step === S_VIDEO && (
                <>
                  <h2>צלמו כמה סרטונים קצרים של הדירה</h2>
                  <p className="vid-bonus" role="note">🎁 <b>מצלמים סרטון? מקבלים 50 ₪ הנחה</b> על התשלום הסופי להובלה.</p>
                  <p className="vid-optional" role="note"><b>רשות, לא חובה.</b> סרטונים בדרך כלל מורידים את המחיר שתקבלו מהמובילים.</p>
                  <div className="stack">
                    {ref && <div className="qr-compact"><QrHandoff leadRef={ref} onRemoteCount={onRemote} onCompleted={() => { if (stepRef.current === S_VIDEO) go(S_DONE); }} /></div>}
                    <div className="vid-guide" role="note">
                      <b>מה לצלם: סרטון אחד או כמה, עד 4 דקות כל אחד</b>
                      <ol>
                        <li><b>חדר חדר:</b> סרטון נפרד לכל חדר. בדירה גדולה, יותר סרטונים.</li>
                        <li><b>הרהיטים הגדולים מקרוב:</b> ארונות, מיטות, ספות ומוצרי חשמל.</li>
                        <li><b>הבניין:</b> חדר מדרגות, מעלית, מעברים צרים.</li>
                        <li><b>מה צריך פירוק,</b> ומה שביר או כבד (ספרו בקול).</li>
                      </ol>
                    </div>
                    <ClipList clips={up.clips} onRemove={up.remove} />
                    {up.clips.some((c) => c.state === 'error') && (
                      <button type="button" className="btn-link" onClick={up.retryFailed} style={{ alignSelf: 'flex-start' }}>נסו להעלות שוב</button>
                    )}
                    {up.usable.length > 0 && <VideoButtons onFiles={up.add} more />}
                  </div>
                </>
              )}

              {step === S_INFO && (
                <>
                  <h2>ספרו למובילים מה עובר</h2>
                  <p className="lead-sub">כדי לתת מחיר מדויק, המוביל צריך לדעת בדיוק מה הוא מעביר. בחרו דרך אחת:</p>
                  <div className="e-choice" role="radiogroup" aria-label="איך לספר למובילים מה עובר">
                    {([
                      ['video', <Video key="v" size={30} strokeWidth={1.5} aria-hidden />, 'סרטון מלא של הדירה', 'כ-3 דקות, חדר אחרי חדר, ומסבירים בקול'],
                      ['items', <ClipboardList key="i" size={30} strokeWidth={1.5} aria-hidden />, 'רשימת פריטים', 'בוחרים מהרשימה את כל מה שעובר'],
                    ] as const).map(([m, ico, t, sub]) => (
                      <button key={m} type="button" role="radio" aria-checked={mode === m} className={`e-opt ${mode === m ? 'on' : ''}`}
                        onClick={() => { if (mode !== m) { setMode(m); setExtraOpen(false); setShortWarn(false); setFail(''); track('info_choice', { ...funnelParams(funnel, theme), choice: m }); } }}>
                        {ico}<b>{t}</b><span>{sub}</span>{mode === m && <Check className="e-opt-ok" size={18} strokeWidth={2.5} aria-hidden />}
                      </button>
                    ))}
                  </div>

                  {mode === 'video' && (
                    <div className="stack" style={{ marginTop: 18 }}>
                      <div className="vid-guide e-guide" role="note">
                        <b>מה אנחנו מצפים לקבל: סרטון מלא של כ-3 דקות</b>
                        <ol>
                          <li><b>חדר אחרי חדר:</b> עוברים על כל הדירה, בלי לדלג. גם מרפסת, מחסן וחניה.</li>
                          <li><b>כל פריט, בקול:</b> מה הוא, האם צריך לפרק ולהרכיב אותו, והאם הוא כבד.</li>
                          <li><b>מה מיוחד בדירה:</b> חדר מדרגות צר, אין מעלית או מעלית קטנה, מעברים צרים, חניה רחוקה, וכל דבר אחר שהמוביל צריך לדעת.</li>
                          <li><b>תאורה טובה:</b> הדליקו את האורות ופתחו תריסים, כדי שהמוביל יראה בדיוק מה הוא מעביר.</li>
                        </ol>
                        <p className="e-guide-key">הפרטים כאן קריטיים: לפיהם המוביל קובע את המחיר. ככל שהסרטון מלא וברור יותר, ההצעה מדויקת יותר.</p>
                        <small>אפשר סרטון אחד ארוך (עד 4 דקות) או כמה סרטונים, למשל אחד לכל חדר.</small>
                      </div>
                      {ref && <div className="qr-compact"><QrHandoff leadRef={ref} onRemoteCount={onRemote} onCompleted={() => { if (stepRef.current === S_INFO) go(S_DONE); }} /></div>}
                      {up.usable.length > 0 && up.totalDuration > 0 && (
                        <div className={`e-meter ${up.totalDuration >= E_VIDEO_TARGET_S ? 'ok' : ''}`} aria-live="polite">
                          <span>אורך הסרטון: <b>{fmtMin(up.totalDuration)}</b> מתוך 3:00</span>
                          <i><em style={{ width: `${Math.min(100, (up.totalDuration / E_VIDEO_TARGET_S) * 100)}%` }} /></i>
                        </div>
                      )}
                      <ClipList clips={up.clips} onRemove={(k) => { up.remove(k); setShortWarn(false); }} />
                      {up.clips.some((c) => c.state === 'error') && (
                        <button type="button" className="btn-link" onClick={up.retryFailed} style={{ alignSelf: 'flex-start' }}>נסו להעלות שוב</button>
                      )}
                      <VideoButtons onFiles={(f) => { up.add(f); setFail(''); setShortWarn(false); }} more={up.usable.length > 0} />
                      {shortWarn && (
                        <div id="e-short" className="e-warn" role="alert">
                          <b>הסרטון קצר מ-3 דקות ({fmtMin(up.totalDuration)}).</b> סרטון קצר עלול לא להראות למובילים את כל מה שעובר, ואז קשה להם לתת מחיר מדויק. מומלץ להוסיף סרטון של מה שחסר. אפשר גם לשלוח כך.
                        </div>
                      )}
                      <details className="e-extra" open={extraOpen} onToggle={(e) => setExtraOpen((e.target as HTMLDetailsElement).open)}>
                        <summary>רוצים להוסיף גם רשימת פריטים? <span>(רשות)</span></summary>
                        {extraOpen && <ItemsPicker value={items} flagsMissing={flagsMissing && !asmAnswered(items)} onChange={(v) => { setItems(v); setFail(''); if (asmAnswered(v)) setFlagsMissing(false); }} />}
                      </details>
                    </div>
                  )}

                  {mode === 'items' && (
                    <div className="stack" style={{ marginTop: 18 }}>
                      <ItemsPicker value={items} flagsMissing={flagsMissing && !asmAnswered(items)} onChange={(v) => { setItems(v); setFail(''); if (asmAnswered(v)) setFlagsMissing(false); }} />
                      <details className="e-extra" open={extraOpen} onToggle={(e) => setExtraOpen((e.target as HTMLDetailsElement).open)}>
                        <summary>רוצים להוסיף גם סרטון של הדירה? <span>(רשות)</span></summary>
                        {extraOpen && (
                          <div className="stack" style={{ marginTop: 12 }}>
                            <p className="small" style={{ margin: 0 }}>סרטון עוזר למובילים לראות את הפריטים ואת הבניין (מדרגות, מעלית, מעברים). צלמו באור טוב וספרו בקול מה צריך פירוק ומה כבד. עד 4 דקות לכל סרטון.</p>
                            <ClipList clips={up.clips} onRemove={up.remove} />
                            {up.clips.some((c) => c.state === 'error') && (
                              <button type="button" className="btn-link" onClick={up.retryFailed} style={{ alignSelf: 'flex-start' }}>נסו להעלות שוב</button>
                            )}
                            <VideoButtons compact onFiles={(f) => { up.add(f); setFail(''); }} more={up.usable.length > 0} />
                          </div>
                        )}
                      </details>
                    </div>
                  )}
                </>
              )}

              {step === S_DONE && (
                <div className="done-wrap">
                  <span className="done-icon blueprint"><Corners /><Check size={28} strokeWidth={1.5} /></span>
                  <h2 style={{ marginBottom: 14 }}>קיבלנו. ההצעות בדרך.</h2>
                  <p className="muted" style={{ maxWidth: 420, marginInline: 'auto' }}>
                    {isE
                      ? `שלחנו את ${[(up.usable.length || remote) && 'הסרטון', items.list.length && 'רשימת הפריטים'].filter(Boolean).join(' ואת ') || 'הפרטים'} למובילים מדורגים באזור שלכם. ההצעות יגיעו אליכם לטלפון.`
                      : isD && (up.usable.length || remote)
                      ? 'שלחנו את רשימת הפריטים והסרטונים למובילים מדורגים באזור שלכם. ההצעות יגיעו אליכם לטלפון.'
                      : 'שלחנו את רשימת הפריטים למובילים מדורגים באזור שלכם. ההצעות יגיעו אליכם לטלפון.'}
                  </p>
                  {uploading && <p className="small" style={{ color: 'var(--color-accent-700)' }}>הסרטונים עדיין עולים. השאירו את הדף פתוח עד שההעלאה תסתיים.</p>}
                  {uploading && <ClipList clips={up.clips} onRemove={up.remove} />}
                  <table className="summary"><tbody>
                    <tr><td>מאיפה</td><td>{[from.city, from.floor && `קומה ${from.floor}`].filter(Boolean).join(' · ')}</td></tr>
                    <tr><td>לאן</td><td>{[to.city, to.floor && `קומה ${to.floor}`].filter(Boolean).join(' · ')}</td></tr>
                    <tr><td>מתי</td><td>{whenText(when) || '—'}</td></tr>
                    {(!isE || items.list.length > 0) && <tr><td>פריטים</td><td>{itemsCount(items)} פריטים{items.boxes ? ` · כ-${items.boxes} קרטונים` : ''}</td></tr>}
                    {(isD || isE) && <tr><td>סרטון</td><td>{up.usable.length ? (up.totalDuration ? fmtDuration(up.totalDuration) : up.usable.length === 1 ? 'סרטון אחד' : `${up.usable.length} סרטונים`) : remote ? (remote === 1 ? 'סרטון אחד מהטלפון' : `${remote} סרטונים מהטלפון`) : '—'}</td></tr>}
                  </tbody></table>
                </div>
              )}

              {fail && <div className="field-error" role="alert" style={{ marginTop: 16 }}>{fail}</div>}

              {step < S_DONE && (
                <div className={`wiz-actions ${step === S_ITEMS || (step === S_INFO && mode === 'items') ? 'wiz-actions-sticky' : ''} ${isD && step === S_VIDEO ? 'vid-d' : ''}`}>
                  {step > 2 && !(isD && step === S_VIDEO) ? <button type="button" className="btn-link" onClick={() => go(step - 1)}>חזרה</button> : !(isD && step === S_VIDEO) && <span />}
                  {isD && step === S_VIDEO ? (
                    <>
                      <div className={`vid-d-row ${up.usable.length || remote ? 'has' : ''}`}>
                        {!up.usable.length && !remote && <VideoButtons compact onFiles={(f) => { up.add(f); setFail(''); }} />}
                        <button type="submit" className={`btn ${up.usable.length || remote ? 'btn-primary' : 'btn-secondary'} btn-lg blueprint`} disabled={busy} aria-busy={busy}><Corners />{busy && <Spinner />} {up.usable.length || remote ? 'שליחה וקבלת הצעות' : 'שליחה בלי סרטון'}</button>
                      </div>
                      <button type="button" className="btn-link" onClick={() => go(step - 1)}>חזרה</button>
                    </>
                  ) : step === S_INFO ? (
                    <button type="submit" className="btn btn-primary btn-lg blueprint" disabled={busy || !mode} aria-busy={busy}><Corners />{busy && <Spinner />} {shortWarn && mode === 'video' ? 'שליחה בכל זאת' : 'שלחו לי 5 הצעות'}{mode === 'items' && itemsCount(items) > 0 ? ` (${itemsCount(items)} פריטים)` : ''}</button>
                  ) : !isD && step === S_ITEMS ? (
                    <button type="submit" className="btn btn-primary btn-lg blueprint" disabled={busy} aria-busy={busy}><Corners />{busy && <Spinner />} שלחו לי 5 הצעות{itemsCount(items) > 0 ? ` (${itemsCount(items)} פריטים)` : ''}</button>
                  ) : (
                    <button type="submit" className="btn btn-primary btn-lg blueprint" disabled={busy} aria-busy={busy}><Corners />{busy && <Spinner />} המשך{step === S_ITEMS && itemsCount(items) > 0 ? ` (${itemsCount(items)} פריטים)` : ''}</button>
                  )}
                </div>
              )}
            </form>
          </Blueprint>
          {step > 1 && step < S_DONE && <p className="wiz-note">שמרנו את השם והטלפון. אם תצטרכו לעצור, נחזור אליכם.</p>}
        </div>
    </FlowShell>
  );
}
