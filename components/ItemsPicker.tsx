'use client';
import { Check, Minus, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { ALL_ITEMS, ItemsValue, itemsCount, PickedItem, ROOMS, searchItems } from '@/lib/items';
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

function Flags({ it, canD, canA, onChange }: { it?: PickedItem; canD: boolean; canA: boolean; onChange: (p: Partial<PickedItem>) => void }) {
  if (!it || (!canD && !canA)) return null;
  return (
    <div className="it-flags">
      {canD && <label><input type="checkbox" checked={!!it.dis} onChange={(e) => onChange({ dis: e.target.checked })} /> פירוק</label>}
      {canA && <label><input type="checkbox" checked={!!it.asm} onChange={(e) => onChange({ asm: e.target.checked })} /> הרכבה</label>}
    </div>
  );
}

/** "Not on the list?" → a text box that adds the client's own item. Stays open so several can be added in a row. */
function AddOwn({ onAdd, label, variant }: { onAdd: (name: string) => void; label: string; variant: 'card' | 'row' }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [added, setAdded] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const submit = () => {
    const t = text.trim();
    if (!t) { input.current?.focus(); return; }
    onAdd(t); setAdded(t); setText(''); input.current?.focus();
  };
  if (!open) {
    return (
      <button type="button" className={`it-own-btn it-own-${variant}`} onClick={() => { setOpen(true); setTimeout(() => input.current?.focus(), 0); }}>
        <Plus size={variant === 'card' ? 26 : 18} strokeWidth={2.5} aria-hidden /> <span>{label}</span>
      </button>
    );
  }
  return (
    <div className={`it-own it-own-${variant}`}>
      <label className="it-own-label">
        <span>מה הפריט?</span>
        <input ref={input} value={text} onChange={(e) => { setText(e.target.value); setAdded(''); }} maxLength={60}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } if (e.key === 'Escape') setOpen(false); }}
          placeholder="למשל: אקווריום, אופנוע ילדים" enterKeyHint="done" autoComplete="off" />
      </label>
      <div className="it-own-actions">
        <button type="button" className="it-own-add" onClick={submit} disabled={!text.trim()}><Plus size={16} strokeWidth={2.5} aria-hidden /> הוספה לרשימה</button>
        <button type="button" className="it-own-close" onClick={() => { setOpen(false); setText(''); setAdded(''); }}>סגירה</button>
      </div>
      {added && <p className="it-own-ok" role="status"><Check size={14} strokeWidth={3} aria-hidden /> &quot;{added}&quot; נוסף לרשימה. אפשר להוסיף עוד.</p>}
    </div>
  );
}

/**
 * Funnels B and D: pick items from the room-by-room list (open from the start), or add anything that is not on it.
 * Quantities + disassembly/assembly per item. A search box on top jumps straight to an item.
 */
export function ItemsPicker({ value, onChange, flagsMissing = false }: { value: ItemsValue; onChange: (v: ItemsValue) => void; flagsMissing?: boolean }) {
  const [q, setQ] = useState('');
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
    // ticking disassembly/assembly on any item answers the "does anything need it?" question
    onChange({ ...value, list, ...(patch.dis || patch.asm ? { noAsm: false } : {}) });
  };
  const add = (id: string) => setItem(id, { qty: (picked(id)?.qty || 0) + 1 });
  const addCustom = (text: string) => {
    const name = text.trim().slice(0, 60);
    if (!name) return;
    const id = 'custom:' + name;
    setItem(id, { qty: (picked(id)?.qty || 0) + 1 }, { name, custom: true });
  };

  /** Enter in the search box: one match → add it; none → add as the client's own item; several → keep the list open. */
  function send() {
    const text = q.trim();
    if (!text) return;
    const res = searchItems(text, 12);
    if (res.length === 1) { add(res[0].id); setQ(''); }
    else if (res.length === 0) { addCustom(text); setQ(''); }
    input.current?.focus();
  }

  const cur = ROOMS.find((r) => r.id === room)!;
  const custom = value.list.filter((i) => i.custom);

  return (
    <div className="it">
      <div className="it-head">
        <h2>מה עובר איתכם?</h2>
        <p>בחרו מהרשימה לפי חדרים. <b>משהו חסר? הוסיפו אותו בעצמכם</b> בכפתור &quot;פריט שלא ברשימה&quot;.</p>
      </div>

      <div className="it-input it-input-sm" role="search">
        <Search size={18} strokeWidth={2} aria-hidden className="it-input-ico" />
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }} placeholder="חיפוש מהיר, למשל: מקרר" aria-label="חיפוש פריט" enterKeyHint="search" autoComplete="off" />
        {q.trim().length >= 2 && (
          <ul className="it-suggest" role="listbox">
            {live.map((it) => {
              const p = picked(it.id);
              return (
                <li key={it.id}><button type="button" className={p ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => { add(it.id); if (live.length === 1) setQ(''); input.current?.focus(); }}>
                  <span aria-hidden>{it.icon}</span> {it.name} {p ? <em>✓ ×{p.qty}</em> : <small>{it.room}</small>}
                </button></li>
              );
            })}
            {live.length === 0 && <li className="it-suggest-hint">לא מצאנו &quot;{q.trim()}&quot; ברשימה. אפשר להוסיף אותו:</li>}
            {live.length > 1 && <li><button type="button" className="it-suggest-done" onClick={() => setQ('')}>סיום הבחירה</button></li>}
            <li><button type="button" className="it-add-new" onClick={() => { addCustom(q); setQ(''); input.current?.focus(); }}>
              <Plus size={16} strokeWidth={2.5} aria-hidden /> הוספת &quot;{q.trim()}&quot; כפריט שלא ברשימה
            </button></li>
          </ul>
        )}
      </div>

      {/* room-by-room list, open from the start */}
      <div className="it-browse">
        <p className="it-tabs-label" id="it-rooms-label">בחרו חדר:</p>
        <div className="it-tabs" role="tablist" aria-labelledby="it-rooms-label">
          {ROOMS.map((r) => {
            const n = r.sections.reduce((s, sec) => s + sec.items.reduce((m, it) => m + (picked(it.id)?.qty || 0), 0), 0);
            return (
              <button key={r.id} type="button" role="tab" aria-selected={room === r.id} className={room === r.id ? 'on' : ''} onClick={() => setRoom(r.id)}>
                <span aria-hidden>{r.icon}</span> {r.name}{n > 0 && <em aria-label={`${n} נבחרו`}>{n}</em>}
              </button>
            );
          })}
        </div>
        {cur.sections.map((s) => (
          <div key={s.title} className="it-sec">
            <h3>{s.title}</h3>
            <div className="it-grid">
              {s.items.map((it) => {
                const p = picked(it.id);
                return (
                  <div key={it.id} className={`it-card ${p ? 'on' : ''}`}>
                    <span className="it-card-ico" aria-hidden>{it.icon}</span>
                    <span className="it-card-name">{it.name}</span>
                    <Stepper value={p?.qty || 0} label={it.name} onChange={(n) => setItem(it.id, { qty: n })} />
                    <Flags it={p} canD canA onChange={(patch) => setItem(it.id, patch)} />
                    {p && <Check size={16} strokeWidth={3} className="it-card-ok" aria-label="נבחר" />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="it-own-wrap">
          <AddOwn key={room} variant="card" label={`פריט שלא ברשימה של ${cur.name}`} onAdd={addCustom} />
        </div>
        {custom.length > 0 && <p className="it-own-note">הוספתם {custom.length === 1 ? 'פריט אחד משלכם' : `${custom.length} פריטים משלכם`}. הם מופיעים ב&quot;הרשימה שלי&quot; למטה.</p>}
      </div>

      {/* my list */}
      <section id="it-list" className={`it-list ${flagsMissing ? 'it-list-missing' : ''}`} aria-label="הרשימה שלי">
        <div className="it-list-head">
          <h3>הרשימה שלי</h3>
          <span className="it-badge">{count} פריטים</span>
        </div>
        {value.list.length === 0 ? <p className="it-empty">עוד לא נבחרו פריטים. בחרו מהרשימה למעלה או הוסיפו פריט משלכם.</p> : (
          <ul>
            {value.list.map((p) => {
              const c = byId.get(p.id);
              return (
                <li key={p.id}>
                  <span className="it-row-name"><span aria-hidden>{c?.icon || '📦'}</span> {p.name}{p.custom && <small className="it-own-tag">פריט שהוספתם</small>}</span>
                  <Flags it={p} canD canA onChange={(patch) => setItem(p.id, patch)} />
                  <Stepper value={p.qty} label={p.name} onChange={(n) => setItem(p.id, { qty: n })} />
                  <button type="button" className="it-del" onClick={() => setItem(p.id, { qty: 0 })} aria-label={`הסרת ${p.name}`}><Trash2 size={16} /></button>
                </li>
              );
            })}
          </ul>
        )}
        {value.list.length > 0 && (
          <div className={`it-asm-q ${flagsMissing ? 'missing' : ''}`}>
            {flagsMissing && <p role="alert"><b>צריך פירוק או הרכבה?</b> סמנו ליד כל פריט שצריך &quot;פירוק&quot; ו/או &quot;הרכבה&quot;, או סמנו שאף פריט לא צריך.</p>}
            <label><input type="checkbox" checked={!!value.noAsm} onChange={(e) => onChange({ ...value, noAsm: e.target.checked, ...(e.target.checked ? { list: value.list.map((i) => ({ ...i, dis: false, asm: false })) } : {}) })} /> אף פריט לא צריך פירוק או הרכבה</label>
          </div>
        )}
        <AddOwn variant="row" label="הוספת פריט שלא ברשימה" onAdd={addCustom} />
        <div className="it-boxes">
          <span><b>כמה קרטונים בערך?</b><small>ספרים, כלים, בגדים וחפצים קטנים</small></span>
          <Stepper step={5} value={value.boxes} label="קרטונים" onChange={(n) => onChange({ ...value, boxes: Math.min(500, n) })} />
        </div>
      </section>
    </div>
  );
}
