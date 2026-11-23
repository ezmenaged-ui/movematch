'use client';
import { Check, ClipboardList, Video } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearHandoff, FlowTheme, liveHandoff, loadHandoff, saveHandoff, VARIANT } from '@/lib/handoff';
import { FlowShell } from './themed/FlowShell';
import { createLead, fmtDuration, funnelParams, LeadGoneError, LeadRef, PhoneRecentError, track, trackOnce, trackStep, updateLead } from '@/lib/client';
import { Address, emptyAddress, emptyWhen, isValidName, isValidPhone, msgs, phoneRecentMsg, normalizePhone, validateAddress, validateWhen, When, whenText } from '@/lib/validate';
import { lp } from '@/lib/i18n';
import { cityEn } from '@/lib/cities';
import { useLocale, useT } from './Locale';
import { PriorityScale } from './PriorityScale';
import { ItemsPicker } from './ItemsPicker';
import { asmAnswered, emptyItems, ItemsValue, itemsCount } from '@/lib/items';
import { WhenFields } from './WhenFields';
import { QrHandoff } from './QrHandoff';
import { AddressFields } from './AddressFields';
import { CityDatalist, Field, PhoneField } from './fields';
import { useUploads } from './useUploads';
import { ClipList, VideoButtons, VideoGuide } from './VideoUploader';
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
 * D: from → to → when → video (required) → items (optional, earns the ₪50 discount) → done.
 * E has one information page instead: from → to → when → info (a full 3-minute video OR the item list; the other is optional
 * and earns the ₪50 discount) → done. The ₪50 discount = a video of the apartment AND the full item list (see /terms §11).
 */
export function Wizard({ funnel = 'b' }: { funnel?: 'b' | 'd' | 'e' }) {
  const isD = funnel === 'd', isE = funnel === 'e';
  const locale = useLocale();
  const T = useT(), w = T.wiz, MSG = msgs(locale);
  const LABELS = isD ? w.labelsD : isE ? w.labelsE : w.labelsB;
  const S_ITEMS = isE ? -1 : isD ? 6 : 5, S_INFO = isE ? 5 : -1, S_VIDEO = isD ? 5 : -1, S_DONE = isD ? 7 : 6, TOTAL = S_DONE, S_LAST = S_DONE - 1;
  const STORE = isD ? 'mm_wizard_d2' : isE ? 'mm_wizard_e1' : 'mm_wizard_b5';
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
  const [savedVideos, setSavedVideos] = useState(0); // videos on the lead when it was sent (incl. ones uploaded before a reload)
  const onRemote = useCallback((n: number) => setRemote(n), []);
  const [err, setErr] = useState<Record<string, string>>({});
  const [addrErr, setAddrErr] = useState<Partial<Record<keyof Address, string>>>({});
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState('');
  const [flagsMissing, setFlagsMissing] = useState(false);
  const [hp, setHp] = useState('');
  const up = useUploads();

  // One funnel_step event each time a step is shown (from step 2; steps 0-1 are tracked on the landing page).
  const STEP_NAMES = isD ? ['contact', 'from', 'to', 'when', 'video', 'items', 'done'] : isE ? ['contact', 'from', 'to', 'when', 'info', 'done'] : ['contact', 'from', 'to', 'when', 'items', 'done'];
  useEffect(() => {
    if (ready && step >= 2) trackStep(funnel, theme, step, STEP_NAMES[step - 1] || `step${step}`, isE && step === S_DONE && mode ? { info_choice: mode } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, step]);

  // Start from the lead created on the first page (/b). Resume mid-way after a refresh.
  useEffect(() => {
    const h0 = loadHandoff(funnel);
    if (!h0) { router.replace(lp(locale, `/${funnel}/photo`) + window.location.search); return; }
    (async () => {
    const h = await liveHandoff(h0);
    if (!h) { router.replace(lp(locale, `/${funnel}/photo`) + window.location.search); return; }
    // The English site shows English city names (a lead resumed from the tender page has the saved Hebrew name).
    const startCity = locale === 'en' ? cityEn(h.city) : h.city || '';
    try {
      const s: Saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (s && (s.ref?.id === h.ref.id || s.ref?.id === h0.ref.id) && s.step < S_DONE) {
        setStep(Math.max(2, Math.min(s.step, S_LAST))); setFurthest(Math.max(2, Math.min(Math.max(s.furthest || 0, s.step), S_LAST))); setFrom(s.from); setTo(s.to); setWhen(s.when || emptyWhen()); setPriority(s.priority || 3); if (s.items) setItems(s.items); if (s.mode) setMode(s.mode);
      } else {
        setFrom({ ...emptyAddress(), city: startCity });
      }
    } catch { setFrom({ ...emptyAddress(), city: startCity }); }
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
      if (stepRef.current >= S_DONE) { router.replace(lp(locale, `/${funnel}/${locale === 'en' ? 'photo' : theme}`) + window.location.search); return; }
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
      if ((step === 2 || step === 3) && !Object.keys(validateAddress(step === 2 ? from : to, step === 2, locale)).length) {
        const a = step === 2 ? from : to, norm = { ...a, elevator: a.elevator ?? false };
        updateLead(ref, step === 2 ? { move_from: norm } : { move_to: norm }).catch(() => {});
      }
      if (step === S_WHEN && !validateWhen(when, locale).date) updateLead(ref, { move_when: when, priority }).catch(() => {});
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
        else { r = await createLead('wizard', { ...fields, furthest_step: 1 }, hp); setRef(r); up.attach(r); track('lead_created', funnelParams(funnel, theme)); trackOnce('generate_lead', r.id, funnelParams(funnel, theme)); trackStep(funnel, theme, 1, 'contact'); }
        go(2);
      } catch (e) {
        if (e instanceof PhoneRecentError) setErr({ phone: phoneRecentMsg(e.until, locale) });
        else setFail(T.common.fail);
      } finally { setBusy(false); }
      return;
    }
    if (step === 2 || step === 3) {
      const a = step === 2 ? from : to;
      const er = validateAddress(a, step === 2, locale);
      setAddrErr(er);
      if (Object.keys(er).length) return;
      const norm = { ...a, elevator: a.elevator ?? false };
      if (ref) updateLead(ref, step === 2 ? { move_from: norm, furthest_step: 2 } : { move_to: norm, furthest_step: 3 }).catch(() => {});
      go(step + 1);
      return;
    }
    if (step === S_WHEN) {
      const er = validateWhen(when, locale);
      setWhenErr(er.date || '');
      if (er.date) return;
      if (ref) updateLead(ref, { move_when: when, priority, furthest_step: S_WHEN }).catch(() => {});
      go(isE ? S_INFO : isD ? S_VIDEO : S_ITEMS);
      return;
    }
    if (step === S_VIDEO) {
      if (!(up.usable.length > 0 || remote > 0)) { setFail(w.errNeedVideo); return; }
      // Same soft warning as E: under 3 minutes of known length, warn once, then let them continue.
      const known = !remote && up.usable.every((c) => c.duration != null);
      if (known && up.totalDuration < E_VIDEO_TARGET_S && !shortWarn) {
        setShortWarn(true);
        requestAnimationFrame(() => document.getElementById('e-short')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        return;
      }
      if (ref) updateLead(ref, { furthest_step: S_VIDEO }).catch(() => {});
      go(S_ITEMS);
      return;
    }
    if (step === S_INFO) {
      if (!mode) { setFail(w.errChooseMode); return; }
      const hasVideo = up.usable.length > 0 || remote > 0;
      if (mode === 'video') {
        if (!hasVideo) { setFail(w.errNeedVideoE); return; }
        // Warn (once) when the known length is under 3 minutes. Videos sent from the phone (QR) have no known length here.
        const known = !remote && up.usable.every((c) => c.duration != null);
        if (known && up.totalDuration < E_VIDEO_TARGET_S && !shortWarn) {
          setShortWarn(true);
          requestAnimationFrame(() => document.getElementById('e-short')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
          return;
        }
      } else if (!items.list.length) { setFail(w.errNeedItem); return; }
      // Items are the main option, or were added as an extra: they need the disassembly answer like in B and D.
      if (items.list.length && !asmAnswered(items)) {
        // In video mode the list is the optional extra and may be folded away (e.g. items were added before switching
        // to video): open it, so the client sees which items the question is about.
        if (mode === 'video') setExtraOpen(true);
        setFlagsMissing(true);
        setFail(w.errNeedAsm);
        requestAnimationFrame(() => document.getElementById('it-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        return;
      }
    }
    if (step === S_ITEMS && !(isD && !items.list.length)) { // D: the list is optional (an empty list goes straight on)
      if (!items.list.length) { setFail(w.errNeedItem); return; }
      if (!asmAnswered(items)) {
        setFlagsMissing(true);
        setFail(w.errNeedAsm);
        requestAnimationFrame(() => document.getElementById('it-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        return;
      }
    }
    if (step === S_LAST) {
      // Steps can be reached without passing their checks (progress bar, browser Forward): check everything once more.
      const fromErr = validateAddress(from, true, locale), toErr = validateAddress(to, false, locale);
      if (Object.keys(fromErr).length) { go(2); setAddrErr(fromErr); return; }
      if (Object.keys(toErr).length) { go(3); setAddrErr(toErr); return; }
      if (validateWhen(when, locale).date) { go(S_WHEN); setWhenErr(validateWhen(when, locale).date || ''); return; }
      // (Funnel E's last step is its own info step, checked just above.)
      if (isD && !up.usable.length && !remote) { go(S_VIDEO); setFail(w.errNeedVideoShort); return; }
      if (!isD && S_ITEMS > 0 && (!items.list.length || !asmAnswered(items))) { go(S_ITEMS); setFlagsMissing(!asmAnswered(items)); return; }
      setBusy(true);
      try {
        // send every detail again: if the lead was re-opened (see liveHandoff), the earlier step saves went to the old one
        const all = {
          status: 'complete', furthest_step: S_DONE, video_skipped: isD && !up.usable.length && !remote, items, move_when: when, priority,
          move_from: { ...from, elevator: from.elevator ?? false }, move_to: { ...to, elevator: to.elevator ?? false },
          ...(isE && mode ? { info_choice: mode } : {}),
        };
        let sent = ref;
        let res: { new_qualified?: boolean; has_inventory?: boolean } | null = null;
        if (ref) {
          try { res = await updateLead(ref, all); } catch (e) {
            if (!(e instanceof LeadGoneError)) throw e;
            // The lead was deleted while the page was open (e.g. a cleanup): open a fresh one with every detail, once.
            // Videos already uploaded belonged to the old lead and are not carried over. No new generate_lead event.
            const fresh = await createLead(VARIANT[funnel], { name, phone, city: from.city, theme, status: 'partial', furthest_step: 1 });
            setRef(fresh); up.attach(fresh);
            saveHandoff({ funnel, ref: fresh, name, phone, city: from.city, theme });
            res = await updateLead(fresh, all);
            sent = fresh;
          }
        }
        if (sent && (isD || isE)) { // for the summary: what the server actually has
          const v = await fetch(`/api/leads/${sent.id}/videos?k=${sent.token}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
          if (v && typeof v.count === 'number') setSavedVideos(v.count);
        }
        // Fired only after the backend saved the request as complete (updateLead throws otherwise).
        // lead_id = the lead's database id: the same value is in /admin, so GA4 / Ads numbers can be checked lead by lead.
        if (sent) {
          const ev = {
            ...funnelParams(funnel, theme), ...(isE && mode ? { info_choice: mode } : {}),
            has_video: up.usable.length > 0 || remote > 0, has_items: items.list.length > 0,
          };
          trackOnce('lead_complete', sent.id, ev);
          if (res?.new_qualified) trackOnce('qualify_lead', sent.id, { ...ev, has_inventory: !!res.has_inventory });
        }
        go(S_DONE);
      } catch { setFail(T.common.fail); } finally { setBusy(false); }
    }
  }

  const uploading = up.clips.some((c) => c.state === 'uploading' || c.state === 'queued');

  if (!ready) return <FlowShell theme={null} />;

  return (
    <FlowShell theme={theme} progress={`${step}/${TOTAL}${isD && step === S_ITEMS ? ` · ${w.optional}` : ''}`}>
        <div className="wiz">
          <div className="progress progress-labeled" style={{ gridTemplateColumns: `repeat(${TOTAL}, 1fr)` }} aria-label={w.stepAria(step, TOTAL)}>
            {LABELS.map((l, i) => {
              const n = i + 1, reachable = step < S_DONE && n <= furthest && n !== step;
              const cls = `item ${n < step || (n <= furthest && n !== step && step < S_DONE) ? 'done' : ''} ${n === step ? 'cur' : ''}`;
              const body = <><i className={`seg ${n <= Math.max(step, step < S_DONE ? furthest : step) ? 'on' : ''}`} /><b><span>{l}{isD && n === S_ITEMS && <small className="opt-tag">{w.optionalParen}</small>}{n !== step && n <= (step < S_DONE ? furthest : step) && n < S_DONE && <Check size={13} strokeWidth={2} />}</span></b></>;
              return reachable
                ? <button key={l} type="button" className={`${cls} item-btn`} onClick={() => jump(n)} aria-label={w.jumpAria(l)}>{body}</button>
                : <div key={l} className={cls} aria-current={n === step ? 'step' : undefined}>{body}</div>;
            })}
          </div>

          <Blueprint className="wiz-card">
            <form onSubmit={next} noValidate key={step} className="step-anim">
              <CityDatalist />
              {step !== 1 && <h1 className="visually-hidden">{w.hiddenH1}</h1>}
              {step === 1 && (
                <>
                  <h1>{w.step1Title}</h1>
                  <p className="lead-sub">{w.step1Sub}</p>
                  <div className="stack">
                    <Field label={w.name} value={name} onChange={(v) => { setName(v); setErr((e) => ({ ...e, name: '' })); }} error={err.name} autoComplete="name" />
                    <PhoneField value={phone} onChange={(v) => { setPhone(v); setErr((e) => ({ ...e, phone: '' })); }} error={err.phone} />
                    <input className="visually-hidden" tabIndex={-1} autoComplete="off" aria-hidden value={hp} onChange={(e) => setHp(e.target.value)} />
                    <div className="mobile-only">{HAS_MOVERS_PHOTO ? <MoversTrustRow /> : <MidragBadge />}</div>
                  </div>
                  {!HAS_MOVERS_PHOTO && <div className="wiz-step1-art" aria-hidden><MoversScene compact /></div>}
                </>
              )}

              {step === 2 && (
                <>
                  <div className="saved-line"><Check size={15} strokeWidth={2} /> {w.saved}</div>
                  <h2>{w.fromQ}</h2>
                  <AddressFields value={from} onChange={setFrom} errors={addrErr} origin />
                </>
              )}

              {step === 3 && (
                <>
                  <h2>{w.toQ}</h2>
                  <AddressFields value={to} onChange={setTo} errors={addrErr} />
                </>
              )}

              {step === S_WHEN && (
                <>
                  <h2>{w.whenQ}</h2>
                  <WhenFields value={when} onChange={(w) => { setWhen(w); setWhenErr(''); }} error={whenErr} />
                  <PriorityScale value={priority} onChange={setPriority} />
                </>
              )}

              {isD && step === S_ITEMS && (
                <p className="vid-bonus" role="note">🎁 <b>{w.bonusD[0]}</b>{w.bonusD[1]}</p>
              )}
              {step === S_ITEMS && (
                <ItemsPicker value={items} flagsMissing={flagsMissing && !asmAnswered(items)} onChange={(v) => { setItems(v); setFail(''); if (asmAnswered(v)) setFlagsMissing(false); }} />
              )}
              {isD && step === S_ITEMS && (
                // The list is optional in D: the request can be sent without it (it only earns the ₪50 discount).
                <p className="items-optional" role="note"><b>{w.itemsOptional[0]}</b>{w.itemsOptional[1]}</p>
              )}

              {isD && step === S_VIDEO && (
                <>
                  <h2>{w.videoTitle}</h2>
                  <p className="lead-sub">{w.videoSub}</p>
                  <div className="stack">
                    <VideoGuide />
                    {ref && <div className="qr-compact"><QrHandoff leadRef={ref} returnToDesktop ownCount={up.clips.filter((c) => c.state === 'done').length} onRemoteCount={onRemote} onCompleted={() => { if (stepRef.current === S_VIDEO) go(S_DONE); }} /></div>}
                    {up.usable.length > 0 && up.totalDuration > 0 && (
                      <div className={`e-meter ${up.totalDuration >= E_VIDEO_TARGET_S ? 'ok' : ''}`} aria-live="polite">
                        <span>{w.meter(fmtMin(up.totalDuration))[0]}<b>{fmtMin(up.totalDuration)}</b>{w.meter('')[2]}</span>
                        <i><em style={{ width: `${Math.min(100, (up.totalDuration / E_VIDEO_TARGET_S) * 100)}%` }} /></i>
                      </div>
                    )}
                    <ClipList clips={up.clips} onRemove={(k) => { up.remove(k); setShortWarn(false); }} />
                    {up.clips.some((c) => c.state === 'error') && (
                      <button type="button" className="btn-link" onClick={up.retryFailed} style={{ alignSelf: 'flex-start' }}>{T.common.retryUpload}</button>
                    )}
                    {up.usable.length > 0 && <VideoButtons onFiles={(f) => { up.add(f); setShortWarn(false); }} more />}
                    {shortWarn && (
                      <div id="e-short" className="e-warn" role="alert">
                        <b>{w.short(fmtMin(up.totalDuration))}</b>{w.shortContinue}
                      </div>
                    )}
                  </div>
                </>
              )}

              {step === S_INFO && (
                <>
                  <h2>{w.infoTitle}</h2>
                  <p className="lead-sub">{w.infoSub}</p>
                  <div className="e-choice" role="radiogroup" aria-label={w.infoAria}>
                    {([
                      ['video', <Video key="v" size={30} strokeWidth={1.5} aria-hidden />, w.optVideo[0], w.optVideo[1]],
                      ['items', <ClipboardList key="i" size={30} strokeWidth={1.5} aria-hidden />, w.optItems[0], w.optItems[1]],
                    ] as const).map(([m, ico, t, sub]) => (
                      <button key={m} type="button" role="radio" aria-checked={mode === m} className={`e-opt ${mode === m ? 'on' : ''}`}
                        onClick={() => { if (mode !== m) { setMode(m); setExtraOpen(false); setShortWarn(false); setFail(''); track('info_choice', { ...funnelParams(funnel, theme), choice: m, info_choice: m, ...(ref ? { lead_id: ref.id } : {}) }); if (ref) updateLead(ref, { info_choice: m }).catch(() => {}); } }}>
                        {ico}<b>{t}</b><span>{sub}</span>{mode === m && <Check className="e-opt-ok" size={18} strokeWidth={2.5} aria-hidden />}
                      </button>
                    ))}
                  </div>

                  {mode === 'video' && (
                    <div className="stack" style={{ marginTop: 18 }}>
                      <p className="lead-sub" style={{ margin: 0 }}><b>{w.expectVideo}</b></p>
                      <VideoGuide />
                      {ref && <div className="qr-compact"><QrHandoff leadRef={ref} returnToDesktop nextLabel={T.common.send5} ownCount={up.clips.filter((c) => c.state === 'done').length} onRemoteCount={onRemote} onCompleted={() => { if (stepRef.current === S_INFO) go(S_DONE); }} /></div>}
                      {up.usable.length > 0 && up.totalDuration > 0 && (
                        <div className={`e-meter ${up.totalDuration >= E_VIDEO_TARGET_S ? 'ok' : ''}`} aria-live="polite">
                          <span>{w.meterE('')[0]}<b>{fmtMin(up.totalDuration)}</b>{w.meterE('')[2]}</span>
                          <i><em style={{ width: `${Math.min(100, (up.totalDuration / E_VIDEO_TARGET_S) * 100)}%` }} /></i>
                        </div>
                      )}
                      <ClipList clips={up.clips} onRemove={(k) => { up.remove(k); setShortWarn(false); }} />
                      {up.clips.some((c) => c.state === 'error') && (
                        <button type="button" className="btn-link" onClick={up.retryFailed} style={{ alignSelf: 'flex-start' }}>{T.common.retryUpload}</button>
                      )}
                      <VideoButtons onFiles={(f) => { up.add(f); setFail(''); setShortWarn(false); }} more={up.usable.length > 0} />
                      {shortWarn && (
                        <div id="e-short" className="e-warn" role="alert">
                          <b>{w.short(fmtMin(up.totalDuration))}</b>{w.shortSend}
                        </div>
                      )}
                      <details className="e-extra" open={extraOpen} onToggle={(e) => setExtraOpen((e.target as HTMLDetailsElement).open)}>
                        <summary>{w.extraItems} <span>{w.optionalParen}</span></summary>
                        {extraOpen && <ItemsPicker value={items} flagsMissing={flagsMissing && !asmAnswered(items)} onChange={(v) => { setItems(v); setFail(''); if (asmAnswered(v)) setFlagsMissing(false); }} />}
                      </details>
                    </div>
                  )}

                  {mode === 'items' && (
                    <div className="stack" style={{ marginTop: 18 }}>
                      <ItemsPicker value={items} flagsMissing={flagsMissing && !asmAnswered(items)} onChange={(v) => { setItems(v); setFail(''); if (asmAnswered(v)) setFlagsMissing(false); }} />
                      <details className="e-extra" open={extraOpen} onToggle={(e) => setExtraOpen((e.target as HTMLDetailsElement).open)}>
                        <summary>{w.extraVideo} <span>{w.optionalParen}</span></summary>
                        {extraOpen && (
                          <div className="stack" style={{ marginTop: 12 }}>
                            <VideoGuide compact />
                            <ClipList clips={up.clips} onRemove={up.remove} />
                            {up.clips.some((c) => c.state === 'error') && (
                              <button type="button" className="btn-link" onClick={up.retryFailed} style={{ alignSelf: 'flex-start' }}>{T.common.retryUpload}</button>
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
                  <h2 style={{ marginBottom: 14 }}>{w.doneTitle}</h2>
                  <p className="muted" style={{ maxWidth: 420, marginInline: 'auto' }}>
                    {isE
                      ? w.doneE({ video: !!(up.usable.length || remote || savedVideos), items: items.list.length > 0 })
                      : isD ? w.doneD(items.list.length > 0) : w.doneB}
                  </p>
                  {uploading && <p className="small" style={{ color: 'var(--color-accent-700)' }}>{w.stillUploading}</p>}
                  {uploading && <ClipList clips={up.clips} onRemove={up.remove} />}
                  <table className="summary"><tbody>
                    <tr><td>{w.sumFrom}</td><td>{[from.city, from.floor && w.floorN(from.floor)].filter(Boolean).join(' · ')}</td></tr>
                    <tr><td>{w.sumTo}</td><td>{[to.city, to.floor && w.floorN(to.floor)].filter(Boolean).join(' · ')}</td></tr>
                    <tr><td>{w.sumWhen}</td><td>{whenText(when, locale) || '—'}</td></tr>
                    {(!isE || items.list.length > 0) && <tr><td>{w.sumItems}</td><td>{items.list.length
                      ? w.itemsSum(itemsCount(items), items.boxes)
                      // No list (optional in D): don't show the boxes stepper's default 20 as if the client chose it.
                      : w.noList}</td></tr>}
                    {(isD || isE) && <tr><td>{w.sumVideo}</td><td>{up.usable.length ? (up.totalDuration ? fmtDuration(up.totalDuration) : w.videosN(up.usable.length)) : remote ? w.phoneVideosN(remote) : savedVideos ? w.videosN(savedVideos) : '—'}</td></tr>}
                  </tbody></table>
                </div>
              )}

              {fail && <div className="field-error" role="alert" style={{ marginTop: 16 }}>{fail}</div>}

              {step < S_DONE && (
                <div className={`wiz-actions ${step === S_ITEMS || (step === S_INFO && mode === 'items') ? 'wiz-actions-sticky' : ''} ${isD && step === S_VIDEO ? 'vid-d' : ''}`}>
                  {step > 2 && !(isD && step === S_VIDEO) ? <button type="button" className="btn-link" onClick={() => go(step - 1)}>{T.common.back}</button> : !(isD && step === S_VIDEO) && <span />}
                  {isD && step === S_VIDEO ? (
                    <>
                      <div className={`vid-d-row ${up.usable.length || remote ? 'has' : ''}`}>
                        {!up.usable.length && !remote && <VideoButtons compact onFiles={(f) => { up.add(f); setFail(''); }} />}
                        {(up.usable.length > 0 || remote > 0) && <button type="submit" className="btn btn-primary btn-lg blueprint" disabled={busy} aria-busy={busy}><Corners />{busy && <Spinner />} {shortWarn ? T.common.nextAnyway : T.common.next}</button>}
                      </div>
                      <button type="button" className="btn-link" onClick={() => go(step - 1)}>{T.common.back}</button>
                    </>
                  ) : step === S_INFO ? (
                    <button type="submit" className="btn btn-primary btn-lg blueprint" disabled={busy || !mode} aria-busy={busy}><Corners />{busy && <Spinner />} {shortWarn && mode === 'video' ? w.sendAnyway : T.common.send5}{mode === 'items' && itemsCount(items) > 0 ? w.itemsSuffix(itemsCount(items)) : ''}</button>
                  ) : step === S_ITEMS ? (
                    <button type="submit" className={`btn ${isD && !items.list.length ? 'btn-secondary' : 'btn-primary'} btn-lg blueprint`} disabled={busy} aria-busy={busy}><Corners />{busy && <Spinner />} {isD && !items.list.length ? w.sendNoList : T.common.send5}{itemsCount(items) > 0 ? w.itemsSuffix(itemsCount(items)) : ''}</button>
                  ) : (
                    <button type="submit" className="btn btn-primary btn-lg blueprint" disabled={busy} aria-busy={busy}><Corners />{busy && <Spinner />} {T.common.next}</button>
                  )}
                </div>
              )}
            </form>
          </Blueprint>
          {step > 1 && step < S_DONE && <p className="wiz-note">{w.note}</p>}
        </div>
    </FlowShell>
  );
}
