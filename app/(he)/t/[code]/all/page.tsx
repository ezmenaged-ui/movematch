import { AllOffersView } from '@/components/tender/views';
import { t } from '@/lib/i18n';
export const dynamic = 'force-dynamic';
export const metadata = { title: t('he').meta.allOffers, robots: { index: false, follow: false } };
/** Every offer in the tender, cheapest first. */
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  return <AllOffersView code={(await params).code} locale="he" />;
}
