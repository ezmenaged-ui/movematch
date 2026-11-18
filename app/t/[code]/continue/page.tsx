import { redirect } from 'next/navigation';
import { ResumeLead } from '@/components/ResumeLead';
import { getTender } from '@/lib/tender';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'השלמת פרטים · MoveMatch', robots: { index: false, follow: false } };

/** From the tender page back into the funnel, on any device: hands the lead to the wizard/form. */
export default async function Continue({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const t = await getTender(code);
  if (!t || !t.resume || t.variant === 'a') redirect(`/t/${code}`);
  return <ResumeLead funnel={t.variant === 'wizard' ? 'b' : t.variant === 'items' ? 'd' : t.variant === 'choice' || t.variant === 'chat' ? 'e' : 'c'} lead={t.resume} />;
}
