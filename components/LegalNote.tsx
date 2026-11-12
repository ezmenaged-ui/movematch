/** Consent line shown under the first-step submit button (Israeli Privacy Protection Law §11 notice + messaging consent). */
export function LegalNote({ className = '' }: { className?: string }) {
  return (
    <p className={`legal-note ${className}`}>
      בלחיצה אני מאשר/ת לקבל עדכונים על המכרז והצעות המחיר ב-SMS ובוואטסאפ, ושפרטי ההובלה, יחד עם השם והטלפון שלי, יועברו למובילים לצורך הצעת מחיר ויצירת קשר.
      {' '}<a href="/terms" target="_blank">תנאי השימוש</a> · <a href="/privacy" target="_blank">מדיניות הפרטיות</a>
    </p>
  );
}
