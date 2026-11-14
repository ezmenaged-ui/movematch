import { CircleCheck, Megaphone, Star, Truck } from 'lucide-react';
import { MoverSignupForm } from '@/components/MoverSignupForm';
import { Blueprint, Footer, Header } from '@/components/ui';

export const metadata = { title: 'הצטרפות למובילים · MoveMatch', description: 'מובילים? קבלו בוואטסאפ מכרזי הובלה של לקוחות עם כל הפרטים והסרטון, והגישו הצעת מחיר בקליק.' };

/** Public page where movers sign up. Submissions appear in /admin/movers as "pending approval". */
export default function JoinMovers() {
  return (
    <>
      <Header />
      <main className="tn wrap">
        <Blueprint as="section" className="tn-hero">
          <span className="kicker">למובילים</span>
          <h1>מקבלים עבודות הובלה ישירות לוואטסאפ</h1>
          <p className="muted" style={{ margin: 0 }}>לקוחות פותחים אצלנו מכרז עם כל פרטי ההובלה וסרטון של הדירה. אתם מקבלים הודעה, מגישים מחיר בקליק, והלקוח רואה את ההצעה שלכם עם הלוגו והדירוגים.</p>
          <ul className="join-perks">
            <li><Truck size={18} strokeWidth={1.5} /> מכרזים עם כתובות, קומות, מעלית וסרטון</li>
            <li><Megaphone size={18} strokeWidth={1.5} /> הודעה בוואטסאפ על כל מכרז חדש באזורי השירות שבחרתם</li>
            <li><Star size={18} strokeWidth={1.5} /> הפרופיל שלכם מוצג עם דירוגי Google ומדרג</li>
            <li><CircleCheck size={18} strokeWidth={1.5} /> אפשר להפסיק בכל רגע במענה &quot;הסר&quot;</li>
          </ul>
        </Blueprint>
        <Blueprint as="section" className="ml-card" style={{ background: '#fff' }}>
          <h2 style={{ fontSize: 24, margin: '0 0 6px' }}>פרטי החברה</h2>
          <p className="muted small" style={{ margin: '0 0 18px' }}>אחרי שנאשר את הפרטים תתחילו לקבל מכרזים. בדרך כלל תוך יום עסקים.</p>
          <MoverSignupForm />
        </Blueprint>
      </main>
      <Footer />
    </>
  );
}
