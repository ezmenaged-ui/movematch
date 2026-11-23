import { ContinueView } from '@/components/tender/views';
import { t } from '@/lib/i18n';
export const dynamic = 'force-dynamic';
export const metadata = { title: t('he').meta.continue, robots: { index: false, follow: false } };
/** From the tender page back into the funnel. */
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  return <ContinueView code={(await params).code} locale="he" />;
}
