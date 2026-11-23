import { Header } from '@/components/ui';
import { LEGAL } from '@/lib/legal';
import { FootLinks } from '@/components/themed/FootLinks';

/** Frame for the English legal pages (/en/terms, /en/privacy): the Hebrew version is the binding one. */
export function LegalShellEn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="wrap legal">
        <h1>{title}</h1>
        <p className="legal-updated">Last updated: {LEGAL.updated}</p>
        <p className="legal-note-en"><b>This is an English translation for convenience.</b> If there is any difference between it and the Hebrew version, the <a href={title === 'Privacy policy' ? '/privacy' : '/terms'} hrefLang="he">Hebrew version</a> prevails.</p>
        {children}
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <span>© {new Date().getFullYear()} MoveMatch · Adtech Martech Consulting Ltd., company no. {LEGAL.companyId}</span>
          <span>The service is free for customers.</span>
          <FootLinks locale="en" />
        </div>
      </footer>
    </>
  );
}

/** Operator identity + contact block, in English. */
export function LegalContactEn() {
  return (
    <ul>
      <li>Site operator: Adtech Martech Consulting Ltd. (אדטק, מרטק ייעוץ בע״מ), company no. {LEGAL.companyId}, 10 HaPortzim St., Jerusalem, Israel</li>
      <li>WhatsApp: <a href={`https://wa.me/${LEGAL.whatsapp}`} dir="ltr">{LEGAL.whatsappDisplay}</a></li>
      {LEGAL.email && <li>Email: <a href={`mailto:${LEGAL.email}`} dir="ltr">{LEGAL.email}</a></li>}
    </ul>
  );
}
