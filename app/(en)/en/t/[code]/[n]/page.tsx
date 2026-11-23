import { OfferView } from '@/components/tender/views';
import { t } from '@/lib/i18n';
export const dynamic = 'force-dynamic';
export const metadata = { title: t('en').meta.offer, robots: { index: false, follow: false } };
/** One mover's offer as an official quote. */
export default async function Page({ params }: { params: Promise<{ code: string; n: string }> }) {
  const { code, n } = await params;
  return <OfferView code={code} n={n} locale="en" />;
}
