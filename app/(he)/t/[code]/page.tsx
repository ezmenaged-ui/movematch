import { TenderView } from '@/components/tender/views';
import { t } from '@/lib/i18n';
export const dynamic = 'force-dynamic';
export const metadata = { title: t('he').meta.tender, robots: { index: false, follow: false } };
/** Client tender page (components/tender/views.tsx). */
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  return <TenderView code={(await params).code} locale="he" />;
}
