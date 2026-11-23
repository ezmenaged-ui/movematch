import { MoverLeadsPage } from '@/components/MoverLeads';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'סביבת מובילים · MoveMatch', robots: { index: false, follow: false } };

export default function Page() {
  return <MoverLeadsPage tab="new" />;
}
