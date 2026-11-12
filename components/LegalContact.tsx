import { LEGAL } from '@/lib/legal';

/** Operator identity + contact block for the legal pages. */
export function LegalContact() {
  return (
    <ul>
      <li>מפעיל האתר: {LEGAL.entity || LEGAL.brand}{LEGAL.companyId ? `, ח.פ. ${LEGAL.companyId}` : ''}{LEGAL.address ? `, ${LEGAL.address}` : ''}</li>
      <li>וואטסאפ: <a href={`https://wa.me/${LEGAL.whatsapp}`} dir="ltr">{LEGAL.whatsappDisplay}</a></li>
      {LEGAL.email && <li>אימייל: <a href={`mailto:${LEGAL.email}`} dir="ltr">{LEGAL.email}</a></li>}
    </ul>
  );
}
