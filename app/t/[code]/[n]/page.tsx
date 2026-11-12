import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Layers } from 'lucide-react';
import { OfferQuote } from '@/components/OfferQuote';
import { TenderShell } from '@/components/TenderShell';
import { getTender, nis, offerName } from '@/lib/tender';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'הצעת מחיר · MoveMatch', robots: { index: false, follow: false } };

/** One mover's offer as an official quote. */
export default async function OfferPage({ params }: { params: Promise<{ code: string; n: string }> }) {
  const { code, n: nStr } = await params;
  const n = Number(nStr);
  const t = await getTender(code);
  const o = t && Number.isInteger(n) && n >= 1 ? t.offers[n - 1] : null;
  if (!t || !o) notFound();
  const best = t.offers.length > 1 && o.price === Math.min(...t.offers.map((x) => x.price));
  const op = process.env.OPERATOR_WHATSAPP;

  return (
    <TenderShell tenderNo={t.tender_no}>
      <nav className="tp-crumbs">
        <Link href={`/t/${code}`}><ChevronRight size={16} /> כל ההצעות במכרז</Link>
        {t.offers.length > 1 && <Link href={`/t/${code}/all`}><Layers size={15} /> השוואת כל ההצעות</Link>}
      </nav>
      <OfferQuote t={t} o={o} n={n} best={best} />
      {t.offers.length > 1 && (
        <nav className="tp-others" aria-label="הצעות נוספות">
          <span>הצעות נוספות:</span>
          {t.offers.map((x, i) => i + 1 !== n && <Link key={x.id} href={`/t/${code}/${i + 1}`}>{offerName(x, i + 1)} · {nis(x.price)}</Link>)}
        </nav>
      )}
      {op && <p className="tp-help">שאלה? <a href={`https://wa.me/${op}?text=${encodeURIComponent(`שאלה על מכרז ${t.tender_no}: `)}`} target="_blank" rel="noreferrer">כתבו לצוות MoveMatch בוואטסאפ</a></p>}
    </TenderShell>
  );
}
