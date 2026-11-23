import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Old client-offers links now open the tender page. */
export default async function OldOffers({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID.test(token)) notFound();
  const { data } = await db().rpc('mm_client_offers', { p_token: token });
  const code = (data as { client_code?: string } | null)?.client_code;
  if (!code) notFound();
  redirect(`/t/${code}`);
}
