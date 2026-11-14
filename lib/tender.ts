import 'server-only';
import { db } from './db';

export type TenderOffer = {
  id: string; price: number; available_date: string | null; available_flexible: boolean; note: string | null;
  created_at: string; company: string; mover_id: string | null; has_logo: boolean;
  contact: string; phone: string;
  google_url: string | null; google_rating: number | null; google_reviews: number | null;
  midrag_url: string | null; midrag_rating: number | null; midrag_reviews: number | null;
};
export type Tender = {
  id: string; tender_no: number; created_at: string; status: 'partial' | 'complete'; variant: 'a' | 'wizard' | 'form' | 'items';
  name: string; city: string | null; move_from: Record<string, unknown> | null; move_to: Record<string, unknown> | null;
  move_when: Record<string, unknown> | null; videos: number; video_skipped: boolean;
  closes_at: string | null; now: string;
  offers: TenderOffer[]; // in arrival order: offer #n = offers[n-1]
  resume: { id: string; token: string; name: string; phone: string; city: string | null } | null;
  /** Finished tenders: lets the client add a video from the tender page (migration 019). */
  upload?: { id: string; token: string } | null;
};

const CODE = /^[a-z0-9]{4,12}$/i;

export async function getTender(code: string): Promise<Tender | null> {
  if (!CODE.test(code)) return null;
  const { data, error } = await db().rpc('mm_client_tender', { p_code: code });
  if (error || !data) return null;
  return data as Tender;
}

export const cityOf = (a: Record<string, unknown> | null, fb?: string | null) => (a?.city as string) || fb || '';
export const nis = (n: number) => `₪${n.toLocaleString('he-IL')}`;
export const dateHe = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' });
export const offerDate = (o: TenderOffer) => (o.available_flexible ? 'גמיש בתאריך' : o.available_date ? `פנוי ב${dateHe(o.available_date)}` : 'תאריך יתואם');
export const offerName = (o: TenderOffer, n: number) => o.company || `מוביל ${n}`;

export const phoneDisplay = (p: string) => (p.length === 10 ? `${p.slice(0, 3)}-${p.slice(3)}` : p);
export const waLink = (p: string, text: string) => `https://wa.me/972${p.replace(/^0/, '')}?text=${encodeURIComponent(text)}`;
