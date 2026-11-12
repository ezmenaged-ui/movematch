import { PhoneUpload } from '@/components/PhoneUpload';
export const metadata = { title: 'צילום סרטון · MoveMatch', robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string }> }) {
  const { id } = await params; const { k } = await searchParams;
  return <PhoneUpload id={id} token={k || ''} />;
}
