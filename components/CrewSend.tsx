'use client';
import { createContext, useContext, useState } from 'react';
import { Eye, Languages, MessageCircle, Send } from 'lucide-react';
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

/** WhatsApp buttons for one crew member: their day schedule, or a plain chat. */
export function CrewSend({ name, phone, memberLang, date, jobs, company, site }: {
  name: string; phone: string; memberLang: Lang; date: string; jobs: DayJob[]; company: string; site: string;
}) {
  const { lang } = useContext(LangCtx);
  const [show, setShow] = useState(false);
  const l = lang ?? memberLang;
  const text = scheduleMessage({ name, date, jobs, company, site, lang: l });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <a className="btn btn-primary mv-wa" href={waUrl(phone, text)} target="_blank" rel="noreferrer"><Send size={15} /> {l === 'ru' ? 'שליחת הלו״ז (Русский)' : 'שליחת הלו״ז בוואטסאפ'}</a>
        <a className="btn btn-secondary" href={waUrl(phone)} target="_blank" rel="noreferrer" aria-label={`וואטסאפ ל${name}`}><MessageCircle size={15} /> וואטסאפ</a>
        <button type="button" className="btn btn-secondary" aria-expanded={show} onClick={() => setShow((s) => !s)}><Eye size={15} /> {show ? 'הסתרה' : 'תצוגה'}</button>
      </div>
      {show && <pre className="mv-preview" dir={l === 'ru' ? 'ltr' : 'rtl'} style={{ alignSelf: 'stretch' }}>{text}</pre>}
    </div>
  );
}
