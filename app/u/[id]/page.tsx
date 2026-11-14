import { PhoneUpload } from '@/components/PhoneUpload';
export const metadata = { title: 'צילום סרטון · MoveMatch', robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string; t?: string }> }) {
  const { id } = await params; const { k, t } = await searchParams;
  // ?t=<tender code>: opened from the client's tender page to add a video to a finished tender.
  return <PhoneUpload id={id} token={k || ''} tender={t && /^[a-z0-9]{4,12}$/i.test(t) ? t : undefined} />;
}
