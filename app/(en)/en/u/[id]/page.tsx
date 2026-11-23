import { PhoneUpload } from '@/components/PhoneUpload';
import { t } from '@/lib/i18n';
export const metadata = { title: t('en').meta.upload, robots: { index: false, follow: false } };
/** English phone upload page (the QR code on /en/…/steps and the "add a video" link on /en/t/<code>). Same as /u. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string; t?: string; b?: string }> }) {
  const { id } = await params; const { k, t: code, b } = await searchParams;
  return <PhoneUpload id={id} token={k || ''} tender={code && /^[a-z0-9]{4,12}$/i.test(code) ? code : undefined} backToDesktop={b === '1'} />;
}
