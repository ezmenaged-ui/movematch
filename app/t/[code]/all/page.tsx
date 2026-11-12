import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { OfferQuote } from '@/components/OfferQuote';
import { TenderShell } from '@/components/TenderShell';
import { getTender } from '@/lib/tender';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'כל ההצעות · MoveMatch', robots: { index: false, follow: false } };

/** Every offer in the tender, opened in full one under the other (cheapest first). */
export default async function AllOffers({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const t = await getTender(code);
  if (!t) notFound();
  const offers = t.offers.map((o, i) => ({ o, n: i + 1 })).sort((a, b) => a.o.price - b.o.price);
  const best = offers[0]?.o.price;
  return (
    <TenderShell tenderNo={t.tender_no}>
      <nav className="tp-crumbs"><Link href={`/t/${code}`}><ChevronRight size={16} /> חזרה למכרז</Link></nav>
      <h1 className="tp-all-h">כל ההצעות ({offers.length}), מהזולה ליקרה</h1>
      <div className="tp-all-list">
        {offers.map(({ o, n }) => <OfferQuote key={o.id} t={t} o={o} n={n} best={offers.length > 1 && o.price === best} compact />)}
      </div>
    </TenderShell>
  );
}
