'use client';
import { Check, ChevronDown, LayoutGrid, Minus, Plus, Search, SendHorizontal, Trash2, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { ALL_ITEMS, itemAsks, ItemsValue, itemsCount, PickedItem, ROOMS, searchItems } from '@/lib/items';
import '@/app/items.css';

const byId = new Map(ALL_ITEMS.map((i) => [i.id, i]));

function Stepper({ value, onChange, label, step = 1 }: { value: number; onChange: (n: number) => void; label: string; step?: number }) {
  return (
    <div className="it-step" role="group" aria-label={`כמות ${label}`}>
      <button type="button" onClick={() => onChange(value + step)} aria-label={step > 1 ? `הוספת ${step}` : 'הוספה'}><Plus size={16} strokeWidth={2.5} /></button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(Math.max(0, value - step))} aria-label={step > 1 ? `הפחתת ${step}` : 'הפחתה'} disabled={value === 0}><Minus size={16} strokeWidth={2.5} /></button>
    </div>
  );
}

function YesNo({ label, value, onChange }: { label: string; value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={`it-yn ${value === undefined ? 'unset' : ''}`} role="radiogroup" aria-label={label}>
      <span className="it-yn-label">{label}</span>
      <span className="it-yn-btns">
        <button type="button" role="radio" aria-checked={value === true} className={value === true ? 'on' : ''} onClick={() => onChange(true)}>כן</button>
        <button type="button" role="radio" aria-checked={value === false} className={value === false ? 'on no' : ''} onClick={() => onChange(false)}>לא</button>
      </span>
    </div>
  );
}

/** Explicit yes/no for disassembly and assembly, so "not answered" is never mistaken for "no". */
function Flags({ it, onChange }: { it?: PickedItem; onChange: (p: Partial<PickedItem>) => void }) {
  if (!it) return null;
  const k = itemAsks(it);
  if (!k.d && !k.a) return null;
  return (
    <div className="it-flags">
      {k.d && <YesNo label="צריך פירוק?" value={it.dis} onChange={(v) => onChange({ dis: v })} />}
      {k.a && <YesNo label="צריך הרכבה?" value={it.asm} onChange={(v) => onChange({ asm: v })} />}
    </div>
  );
}

/** Reminder shown when "continue" is pressed while some items have no disassembly/assembly answer. Closable; never blocks. */
export function FlagsNote({ missing, onBack, onContinue }: { missing: PickedItem[]; onBack: () => void; onContinue: () => void }) {
  const names = missing.slice(0, 4).map((m) => m.name).join(', ') + (missing.length > 4 ? ` ועוד ${missing.length - 4}` : '');
  return (
    <div className="it-note-back" onClick={onBack}>
      <div className="it-note" role="dialog" aria-modal="true" aria-labelledby="it-note-t" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="it-note-x" onClick={onBack} aria-label="סגירה"><X size={20} strokeWidth={2.5} /></button>
        <b id="it-note-t">סימנתם בכל פריט אם צריך פירוק והרכבה?</b>
        <p>חסר סימון כן / לא ב: {names}.</p>
        <p className="it-note-sub">כך המובילים יתמחרו נכון ולא יהיו הפתעות ביום ההובלה.</p>
        <div className="it-note-actions">
          <button type="button" className="btn btn-primary" onClick={onBack}>חזרה לסימון</button>
          <button type="button" className="btn-link" onClick={onContinue}>המשך בכל זאת</button>
        </div>
      </div>
    </div>
  );
}

/** Funnel D: type items chat-style (primary) or browse by room; quantities + disassembly/assembly per item. */
export function ItemsPicker({ value, onChange, attn }: { value: ItemsValue; onChange: (v: ItemsValue) => void; attn?: boolean }) {
  const [q, setQ] = useState('');
  const [browse, setBrowse] = useState(false);
  const [room, setRoom] = useState(ROOMS[0].id);
  const input = useRef<HTMLInputElement>(null);

  const live = useMemo(() => (q.trim().length >= 2 ? searchItems(q, 8) : []), [q]);
  const picked = (id: string) => value.list.find((i) => i.id === id);
  const count = itemsCount(value);

  const setItem = (id: string, patch: Partial<PickedItem> & { qty?: number }, base?: { name: string; custom?: boolean }) => {
    const cur = picked(id);
    let list: PickedItem[];
    if (!cur) {
      if ((patch.qty ?? 1) <= 0) return;
      list = [...value.list, { id, name: base?.name || byId.get(id)?.name || id, qty: 1, ...(base?.custom ? { custom: true } : {}), ...patch }];
    } else {
      const next = { ...cur, ...patch };
      list = next.qty <= 0 ? value.list.filter((i) => i.id !== id) : value.list.map((i) => (i.id === id ? next : i));
    }
    onChange({ ...value, list });
  };
  const add = (id: string) => setItem(id, { qty: (picked(id)?.qty || 0) + 1 });

  /** Enter / send: one match → add it; several → keep the list open to pick; none → add as a new item. */
  function send() {
    const text = q.trim();
    if (!text) return;
    const res = searchItems(text, 12);
    if (res.length === 1) { add(res[0].id); setQ(''); }
    else if (res.length === 0) { addCustom(text); setQ(''); }
    input.current?.focus();
  }

  const addCustom = (text: string) => {
    const id = 'custom:' + text.slice(0, 60);
    setItem(id, { qty: (picked(id)?.qty || 0) + 1 }, { name: text.slice(0, 60), custom: true });
  };

  return (
    <div className={`it ${attn ? 'it-attn' : ''}`}>
      <div className="it-input" role="search">
        <Search size={20} strokeWidth={2} aria-hidden className="it-input-ico" />
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }} placeholder="כתבו פריט, למשל: ספה" aria-label="חיפוש פריט" enterKeyHint="send" autoComplete="off" />
        <button type="button" onClick={() => send()} aria-label="שליחה" disabled={!q.trim()}><SendHorizontal size={20} strokeWidth={2} style={{ transform: 'scaleX(-1)' }} /></button>
        {q.trim().length >= 2 && (
          <ul className="it-suggest" role="listbox">
            {live.length > 1 && <li className="it-suggest-hint">אפשר לבחור כמה סוגים</li>}
            {live.map((it) => {
              const p = picked(it.id);
              return (
                <li key={it.id}><button type="button" className={p ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => { add(it.id); if (live.length === 1) setQ(''); input.current?.focus(); }}>
                  <span aria-hidden>{it.icon}</span> {it.name} {p ? <em>✓ ×{p.qty}</em> : <small>{it.room}</small>}
                </button></li>
              );
            })}
            {live.length > 1 && <li><button type="button" className="it-suggest-done" onClick={() => setQ('')}>סיום הבחירה</button></li>}
            <li><button type="button" className="it-add-new" onClick={() => { addCustom(q.trim()); setQ(''); input.current?.focus(); }}>
              <Plus size={16} strokeWidth={2.5} aria-hidden /> הוספת &quot;{q.trim()}&quot; כפריט חדש
            </button></li>
          </ul>
        )}
      </div>

      {/* browse */}
      <button type="button" className={`it-browse-toggle ${browse ? 'open' : ''}`} onClick={() => setBrowse((b) => !b)} aria-expanded={browse}>
        {browse ? <X size={20} strokeWidth={2.5} /> : <LayoutGrid size={20} strokeWidth={2} />}
        {browse ? 'סגירת הרשימה' : 'או בחרו מהרשימה לפי חדרים'}
        {!browse && <ChevronDown size={20} strokeWidth={2.5} />}
      </button>
      {browse && (
        <div className="it-browse">
          <div className="it-tabs" role="tablist">
            {ROOMS.map((r) => (
              <button key={r.id} type="button" role="tab" aria-selected={room === r.id} className={room === r.id ? 'on' : ''} onClick={() => setRoom(r.id)}>
                <span aria-hidden>{r.icon}</span> {r.name}
              </button>
            ))}
          </div>
          {ROOMS.find((r) => r.id === room)!.sections.map((s) => (
            <div key={s.title} className="it-sec">
              <h4>{s.title}</h4>
              <div className="it-grid">
                {s.items.map((it) => {
                  const p = picked(it.id);
                  return (
                    <div key={it.id} className={`it-card ${p ? 'on' : ''}`}>
                      <span className="it-card-ico" aria-hidden>{it.icon}</span>
                      <span className="it-card-name">{it.name}</span>
                      <Stepper value={p?.qty || 0} label={it.name} onChange={(n) => setItem(it.id, { qty: n })} />
                      <Flags it={p} onChange={(patch) => setItem(it.id, patch)} />
                      {p && <Check size={16} strokeWidth={3} className="it-card-ok" aria-label="נבחר" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* my list */}
      <section className="it-list" aria-label="הרשימה שלי">
        <div className="it-list-head">
          <h3>הרשימה שלי</h3>
          <span className="it-badge">{count} פריטים</span>
        </div>
        {value.list.length === 0 ? <p className="it-empty">עוד לא נוספו פריטים. כתבו למעלה או בחרו מהרשימה למטה.</p> : (
          <ul>
            {value.list.map((p) => {
              const c = byId.get(p.id);
              return (
                <li key={p.id}>
                  <span className="it-row-name"><span aria-hidden>{c?.icon || '📦'}</span> {p.name}</span>
                  <Flags it={p} onChange={(patch) => setItem(p.id, patch)} />
                  <Stepper value={p.qty} label={p.name} onChange={(n) => setItem(p.id, { qty: n })} />
                  <button type="button" className="it-del" onClick={() => setItem(p.id, { qty: 0 })} aria-label={`הסרת ${p.name}`}><Trash2 size={16} /></button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="it-boxes">
          <span><b>כמה קרטונים בערך?</b><small>ספרים, כלים, בגדים וחפצים קטנים</small></span>
          <Stepper step={5} value={value.boxes} label="קרטונים" onChange={(n) => onChange({ ...value, boxes: Math.min(500, n) })} />
        </div>
      </section>

    </div>
  );
}
