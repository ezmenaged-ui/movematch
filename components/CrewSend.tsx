'use client';
import { createContext, useContext, useState } from 'react';
import { Eye, Languages, MessageCircle, Pencil, Send } from 'lucide-react';
import { scheduleMessage, waUrl, type DayJob, type Lang } from '@/lib/crew';

type Ctx = { lang: Lang | null; setLang: (l: Lang | null) => void };
const LangCtx = createContext<Ctx>({ lang: null, setLang: () => {} });

/** Wraps the crew list: one switch translates every schedule message to Russian. */
export function CrewLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang | null>(null);
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export function CrewLangSwitch() {
  const { lang, setLang } = useContext(LangCtx);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span className="mv-meta"><Languages size={15} style={{ verticalAlign: '-3px' }} /> שפת ההודעות:</span>
      <div className="mv-lang" role="group" aria-label="שפת ההודעות">
        <button type="button" aria-pressed={lang === null} onClick={() => setLang(null)}>לפי העובד</button>
        <button type="button" aria-pressed={lang === 'he'} onClick={() => setLang('he')}>עברית לכולם</button>
        <button type="button" aria-pressed={lang === 'ru'} onClick={() => setLang('ru')}>Русский לכולם</button>
      </div>
    </div>
  );
}

/** Actions for one crew member's closed card: send their day schedule, open a chat, preview the message, edit their details.
 *  Renders the button cell plus a full-width panel (preview or edit form) as siblings inside `.mv-crew-row`. */
export function CrewSend({ name, phone, memberLang, date, jobs, company, site, editForm }: {
  name: string; phone: string; memberLang: Lang; date: string; jobs: DayJob[]; company: string; site: string; editForm?: React.ReactNode;
}) {
  const { lang } = useContext(LangCtx);
  const [open, setOpen] = useState<'preview' | 'edit' | null>(null);
  const toggle = (p: 'preview' | 'edit') => setOpen((o) => (o === p ? null : p));
  const l = lang ?? memberLang;
  const text = scheduleMessage({ name, date, jobs, company, site, lang: l });
  return (
    <>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <a className="btn btn-primary mv-wa" href={waUrl(phone, text)} target="_blank" rel="noreferrer"><Send size={15} /> {l === 'ru' ? 'שליחת הלו״ז (Русский)' : 'שליחת הלו״ז בוואטסאפ'}</a>
        <a className="btn btn-secondary" href={waUrl(phone)} target="_blank" rel="noreferrer" aria-label={`וואטסאפ ל${name}`}><MessageCircle size={15} /> וואטסאפ</a>
        <button type="button" className="btn btn-secondary" aria-expanded={open === 'preview'} onClick={() => toggle('preview')}><Eye size={15} /> {open === 'preview' ? 'הסתרה' : 'תצוגה'}</button>
        {editForm && <button type="button" className="btn btn-secondary" aria-expanded={open === 'edit'} onClick={() => toggle('edit')}><Pencil size={15} /> {open === 'edit' ? 'סגירה' : 'עריכה'}</button>}
      </div>
      {open === 'preview' && <pre className="mv-preview mv-crew-panel" dir={l === 'ru' ? 'ltr' : 'rtl'}>{text}</pre>}
      {open === 'edit' && <div className="mv-crew-panel">{editForm}</div>}
    </>
  );
}
