'use client';
import { Check, Minus, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { ALL_ITEMS, ItemsValue, itemsCount, PickedItem, ROOMS, searchItems } from '@/lib/items';
import '@/app/items.css';
import { ITEMS_EN, ROOMS_EN, SECTIONS_EN } from '@/lib/itemsEn';
import { useLocale, useT } from './Locale';

const byId = new Map(ALL_ITEMS.map((i) => [i.id, i]));
const roomIdByName = new Map(ROOMS.map((r) => [r.name, r.id]));

/** English search (the English site): every typed word must appear in the English name or keywords. */
function searchEn(q: string, limit = 12) {
  const words = q.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).map((w) => (w.length > 3 ? w.replace(/(es|s)$/, '') : w));
  if (!words.length) return [];
  return ALL_ITEMS.map((i) => {
    const e = ITEMS_EN[i.id];
    if (!e) return null;
    const name = e.name.toLowerCase(), hay = `${name} ${(e.k || '').toLowerCase()}`;
    if (!words.every((w) => hay.includes(w))) return null;
    return { i, score: (name.startsWith(words[0]) ? 0 : 1) + (words.every((w) => name.includes(w)) ? 0 : 1) };
  }).filter((x): x is { i: (typeof ALL_ITEMS)[number]; score: number } => !!x).sort((a, b) => a.score - b.score).slice(0, limit).map((x) => x.i);
}

function Stepper({ value, onChange, label, step = 1 }: { value: number; onChange: (n: number) => void; label: string; step?: number }) {
  const d = useT().items;
  return (
    <div className="it-step" role="group" aria-label={d.qtyAria(label)}>
      <button type="button" onClick={() => onChange(value + step)} aria-label={step > 1 ? d.addN(step) : d.add}><Plus size={16} strokeWidth={2.5} /></button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(Math.max(0, value - step))} aria-label={step > 1 ? d.removeN(step) : d.remove} disabled={value === 0}><Minus size={16} strokeWidth={2.5} /></button>
    </div>
  );
}

function Flags({ it, canD, canA, onChange }: { it?: PickedItem; canD: boolean; canA: boolean; onChange: (p: Partial<PickedItem>) => void }) {
  const d = useT().items;
  if (!it || (!canD && !canA)) return null;
  return (
    <div className="it-flags">
      {canD && <label><input type="checkbox" checked={!!it.dis} onChange={(e) => onChange({ dis: e.target.checked })} /> {d.dis}</label>}
      {canA && <label><input type="checkbox" checked={!!it.asm} onChange={(e) => onChange({ asm: e.target.checked })} /> {d.asm}</label>}
    </div>
  );
}

/** "Not on the list?" → a text box that adds the client's own item. Stays open so several can be added in a row. */
function AddOwn({ onAdd, label, variant }: { onAdd: (name: string) => void; label: string; variant: 'card' | 'row' }) {
  const d = useT().items;
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
        <span>{d.whatItem}</span>
        <input ref={input} value={text} onChange={(e) => { setText(e.target.value); setAdded(''); }} maxLength={60}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } if (e.key === 'Escape') setOpen(false); }}
          placeholder={d.ownPh} enterKeyHint="done" autoComplete="off" />
      </label>
      <div className="it-own-actions">
        <button type="button" className="it-own-add" onClick={submit} disabled={!text.trim()}><Plus size={16} strokeWidth={2.5} aria-hidden /> {d.addToList}</button>
        <button type="button" className="it-own-close" onClick={() => { setOpen(false); setText(''); setAdded(''); }}>{d.close}</button>
      </div>
      {added && <p className="it-own-ok" role="status"><Check size={14} strokeWidth={3} aria-hidden /> {d.added(added)}</p>}
    </div>
  );
}

/**
 * Funnels B and D: pick items from the room-by-room list (open from the start), or add anything that is not on it.
 * Quantities + disassembly/assembly per item. A search box on top jumps straight to an item.
 */
export function ItemsPicker({ value, onChange, flagsMissing = false }: { value: ItemsValue; onChange: (v: ItemsValue) => void; flagsMissing?: boolean }) {
  const en = useLocale() === 'en';
  const d = useT().items;
  /** What the client sees: English names on the English site. The saved list keeps the Hebrew names (movers read Hebrew). */
  const nm = (id: string, fallback: string) => (en ? ITEMS_EN[id]?.name || fallback : fallback);
  const roomName = (r: { id: string; name: string }) => (en ? ROOMS_EN[r.id] || r.name : r.name);
  const secName = (t: string) => (en ? SECTIONS_EN[t] || t : t);
  const search = (text: string, n: number) => (en ? searchEn(text, n) : searchItems(text, n));
  const [q, setQ] = useState('');
  const [room, setRoom] = useState(ROOMS[0].id);
  const [justAdded, setJustAdded] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const live = useMemo(() => (q.trim().length >= 2 ? search(q, 8) : []), [q, en]); // eslint-disable-line react-hooks/exhaustive-deps
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

  /** After any pick from the search: tick it, clear the box and keep focus so the next item can be typed straight away. */
  const afterPick = (name: string) => { setQ(''); setJustAdded(name); input.current?.focus(); };
  const pickFromSearch = (id: string, name: string) => { add(id); afterPick(name); };

  /** Enter in the search box: exact name or single match → add it; none → add as the client's own item; several → keep the list open. */
  function send() {
    const text = q.trim();
    if (!text) return;
    const res = search(text, 12);
    const exact = res.find((r) => nm(r.id, r.name).toLowerCase() === text.toLowerCase());
    const hit = exact || (res.length === 1 ? res[0] : null);
    if (hit) pickFromSearch(hit.id, nm(hit.id, hit.name));
    else if (res.length === 0) { addCustom(text); afterPick(text); }
    else input.current?.focus();
  }

  const cur = ROOMS.find((r) => r.id === room)!;
  const custom = value.list.filter((i) => i.custom);

  return (
    <div className="it">
      <div className="it-head">
        <h2>{d.title}</h2>
        <p>{d.intro[0]}<b>{d.intro[1]}</b>{d.intro[2]}</p>
      </div>

      <div className="it-input it-input-sm" role="search">
        <Search size={18} strokeWidth={2} aria-hidden className="it-input-ico" />
        <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setJustAdded(''); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
          onFocus={(e) => { // phones: bring the box to the top so its suggestions fit above the keyboard
            const el = e.currentTarget;
            if (window.matchMedia('(max-width: 640px)').matches) setTimeout(() => el.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50);
          }}
          placeholder={d.searchPh} aria-label={d.searchAria} enterKeyHint="search" autoComplete="off" />
        {q.trim().length >= 2 && (
          <ul className="it-suggest" role="listbox">
            {live.map((it) => {
              const p = picked(it.id);
              return (
                <li key={it.id}><button type="button" className={p ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => pickFromSearch(it.id, nm(it.id, it.name))}>
                  <span aria-hidden>{it.icon}</span> {nm(it.id, it.name)} {p ? <em>✓ ×{p.qty}</em> : <small>{en ? ROOMS_EN[roomIdByName.get(it.room) || ''] || it.room : it.room}</small>}
                </button></li>
              );
            })}
            {live.length === 0 && <li className="it-suggest-hint">{d.notFound(q.trim())}</li>}
            <li><button type="button" className="it-add-new" onClick={() => { addCustom(q); afterPick(q.trim()); }}>
              <Plus size={16} strokeWidth={2.5} aria-hidden /> {d.addAsOwn(q.trim())}
            </button></li>
          </ul>
        )}
      </div>
      {justAdded && !q && <p className="it-own-ok it-search-ok" role="status"><Check size={14} strokeWidth={3} aria-hidden /> {d.addedSearch(justAdded)}</p>}

      {/* room-by-room list, open from the start */}
      <div className="it-browse">
        <p className="it-tabs-label" id="it-rooms-label">{d.pickRoom}</p>
        <div className="it-tabs" role="tablist" aria-labelledby="it-rooms-label">
          {ROOMS.map((r) => {
            const n = r.sections.reduce((s, sec) => s + sec.items.reduce((m, it) => m + (picked(it.id)?.qty || 0), 0), 0);
            return (
              <button key={r.id} type="button" role="tab" aria-selected={room === r.id} className={room === r.id ? 'on' : ''} onClick={() => setRoom(r.id)}>
                <span aria-hidden>{r.icon}</span> {roomName(r)}{n > 0 && <em aria-label={d.pickedAria(n)}>{n}</em>}
              </button>
            );
          })}
        </div>
        {cur.sections.map((s) => (
          <div key={s.title} className="it-sec">
            <h3>{secName(s.title)}</h3>
            <div className="it-grid">
              {s.items.map((it) => {
                const p = picked(it.id);
                return (
                  <div key={it.id} className={`it-card ${p ? 'on' : ''}`}>
                    <span className="it-card-ico" aria-hidden>{it.icon}</span>
                    <span className="it-card-name">{nm(it.id, it.name)}</span>
                    <Stepper value={p?.qty || 0} label={nm(it.id, it.name)} onChange={(n) => setItem(it.id, { qty: n })} />
                    <Flags it={p} canD canA onChange={(patch) => setItem(it.id, patch)} />
                    {p && <Check size={16} strokeWidth={3} className="it-card-ok" aria-label={d.chosen} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="it-own-wrap">
          <AddOwn key={room} variant="card" label={d.ownFor(roomName(cur))} onAdd={addCustom} />
        </div>
        {custom.length > 0 && <p className="it-own-note">{d.ownNote(custom.length)}</p>}
      </div>

      {/* my list */}
      <section id="it-list" className={`it-list ${flagsMissing ? 'it-list-missing' : ''}`} aria-label={d.myList}>
        <div className="it-list-head">
          <h3>{d.myList}</h3>
          <span className="it-badge">{d.countItems(count)}</span>
        </div>
        {value.list.length === 0 ? <p className="it-empty">{d.empty}</p> : (
          <ul>
            {value.list.map((p) => {
              const c = byId.get(p.id);
              return (
                <li key={p.id}>
                  <span className="it-row-name"><span aria-hidden>{c?.icon || '📦'}</span> {p.custom ? p.name : nm(p.id, p.name)}{p.custom && <small className="it-own-tag">{d.customTag}</small>}</span>
                  <Flags it={p} canD canA onChange={(patch) => setItem(p.id, patch)} />
                  <Stepper value={p.qty} label={p.custom ? p.name : nm(p.id, p.name)} onChange={(n) => setItem(p.id, { qty: n })} />
                  <button type="button" className="it-del" onClick={() => setItem(p.id, { qty: 0 })} aria-label={d.removeAria(p.custom ? p.name : nm(p.id, p.name))}><Trash2 size={16} /></button>
                </li>
              );
            })}
          </ul>
        )}
        {value.list.length > 0 && (
          <div className={`it-asm-q ${flagsMissing ? 'missing' : ''}`}>
            {flagsMissing && <p role="alert"><b>{d.asmMissing[0]}</b>{d.asmMissing[1]}</p>}
            <label><input type="checkbox" checked={!!value.noAsm} onChange={(e) => onChange({ ...value, noAsm: e.target.checked, ...(e.target.checked ? { list: value.list.map((i) => ({ ...i, dis: false, asm: false })) } : {}) })} /> {d.noAsm}</label>
          </div>
        )}
        <AddOwn variant="row" label={d.addOwnRow} onAdd={addCustom} />
        <div className="it-boxes">
          <span><b>{d.boxesQ}</b><small>{d.boxesHint}</small></span>
          <Stepper step={5} value={value.boxes} label={d.boxesLabel} onChange={(n) => onChange({ ...value, boxes: Math.min(500, n) })} />
        </div>
      </section>
    </div>
  );
}
