import { Footer, Header } from '@/components/ui';
import { LEGAL } from '@/lib/legal';

export const metadata = { title: 'הצהרת נגישות · MoveMatch' };

/** Date of the last automated check (axe-core, WCAG 2.0/2.1 A + AA rules) of the public pages. */
const CHECKED = '13.11.2026';

export default function Accessibility() {
  return (
    <>
      <Header />
      <main className="wrap legal">
        <h1>הצהרת נגישות</h1>
        <p className="legal-updated">עודכן לאחרונה: {LEGAL.updated}</p>
        <p>אנחנו רואים חשיבות בכך שהאתר יהיה נגיש לכל המשתמשים, כולל אנשים עם מוגבלות. האתר הותאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע&quot;ג-2013, ולתקן הישראלי ת&quot;י 5568 המבוסס על הנחיות WCAG 2.0 ברמה AA.</p>
        <p>האתר מופעל על ידי {LEGAL.entity}, ח.פ. {LEGAL.companyId}, {LEGAL.address}. השירות ניתן באופן מקוון בלבד, ואין ל-MoveMatch משרד או סניף פתוח לקהל.</p>

        <h2>מה עשינו</h2>
        <ul>
          <li>בתאריך {CHECKED} בדקנו את דפי האתר הציבוריים (דפי הנחיתה של כל המשפכים, טופס ההרשמה למובילים, דפי הכניסה והדפים המשפטיים) בכלי בדיקה אוטומטי (axe) מול כללי WCAG 2.0 ו-2.1 ברמות A ו-AA, בתצוגת מחשב ובתצוגת נייד, ותיקנו את מה שנמצא.</li>
          <li>האתר מותאם לנייד ולמחשב, ותומך בהגדלת טקסט בדפדפן.</li>
          <li>אפשר לנווט בטפסים באמצעות מקלדת, לשדות יש תוויות ברורות, והודעות שגיאה מוקראות לקוראי מסך.</li>
          <li>הקפדנו על ניגודיות צבעים, טקסט חלופי לתמונות משמעותיות, שפה וכיווניות מוגדרות (עברית, מימין לשמאל) ומבנה כותרות תקין.</li>
        </ul>

        <h2>רכז/ת נגישות ופניות בנושא נגישות</h2>
        <p>נתקלתם בבעיה? נשמח לקבל תיאור של הבעיה, הדף שבו נתקלתם בה והדפדפן או הטכנולוגיה המסייעת שבהם השתמשתם. אפשר לפנות לרכז/ת הנגישות של MoveMatch:</p>
        <ul>
          <li>רכז/ת נגישות: {LEGAL.brand}</li>
          <li>אימייל: <a href={`mailto:${LEGAL.email}`} dir="ltr">{LEGAL.email}</a></li>
          <li>וואטסאפ: <a href={`https://wa.me/${LEGAL.whatsapp}`} dir="ltr">{LEGAL.whatsappDisplay}</a></li>
          <li>כתובת: {LEGAL.address}</li>
        </ul>
        <p>נשיב לכל פנייה בנושא נגישות <b>תוך 14 יום</b> מיום קבלתה.</p>
        <p className="legal-updated">ההצהרה עודכנה לאחרונה בתאריך {LEGAL.updated}.</p>
      </main>
      <Footer />
    </>
  );
}
