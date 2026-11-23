'use client';
import { Send, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { uploadVideo } from '@/lib/client';
import { addLeadVideo } from '@/app/(he)/admin/actions';

/** /admin: upload a video from the operator's computer or phone into a lead (same storage and format as client uploads). */
export function AdminVideoUpload({ leadId }: { leadId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pct, setPct] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  return (
    <>
      <input ref={input} type="file" accept="video/*" hidden onChange={async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('video/')) { setMsg('זה לא קובץ וידאו'); return; }
        setMsg(''); setPct(0);
        try {
          const { path, parts } = await uploadVideo(leadId, file, setPct);
          const r = await addLeadVideo(leadId, { path, parts, size: file.size, name: file.name });
          setMsg(r.ok ? '✅ הסרטון נוסף לליד' : 'ההעלאה הצליחה אבל השמירה בליד נכשלה');
          router.refresh();
        } catch { setMsg('ההעלאה נכשלה, נסו שוב'); }
        setPct(null);
      }} />
      <button type="button" className="btn btn-secondary adm-btn" disabled={pct !== null} onClick={() => input.current?.click()}>
        <Upload size={14} /> {pct !== null ? `מעלה… ${pct}%` : 'העלאת סרטון לליד'}
      </button>
      {msg && <span className="small" role="status">{msg}</span>}
    </>
  );
}

/** Submit button that asks first (sending alerts real movers and can't be undone). */
export function ConfirmSend({ question, label }: { question: string; label: string }) {
  return (
    <button type="submit" className="btn btn-primary adm-btn" onClick={(e) => { if (!window.confirm(question)) e.preventDefault(); }}>
      <Send size={14} /> {label}
    </button>
  );
}
