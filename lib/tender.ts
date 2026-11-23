import 'server-only';
import { db } from './db';
import { t, type Locale } from './i18n';
import { cityEn } from './cities';

export type TenderOffer = {
  id: string; price: number; available_date: string | null; available_flexible: boolean; note: string | null;
  created_at: string; company: string; mover_id: string | null; has_logo: boolean;
  contact: string; phone: string;
  google_url: string | null; google_rating: number | null; google_reviews: number | null;
  midrag_url: string | null; midrag_rating: number | null; midrag_reviews: number | null;
  facebook_url: string | null; facebook_recommend: number | null; facebook_reviews: number | null;
};
export type Tender = {
  id: string; tender_no: number; created_at: string; status: 'partial' | 'complete'; variant: 'a' | 'wizard' | 'form' | 'items' | 'choice' | 'chat';
  name: string; city: string | null; move_from: Record<string, unknown> | null; move_to: Record<string, unknown> | null;
  move_when: Record<string, unknown> | null; videos: number; video_skipped: boolean;
  closes_at: string | null; now: string;
  offers: TenderOffer[]; // in arrival order: offer #n = offers[n-1]
  resume: { id: string; token: string; name: string; phone: string; city: string | null } | null;
  /** Finished tenders: lets the client add a video from the tender page (migration 019). */
  upload?: { id: string; token: string } | null;
  /** 'en' = the client came from the English site (migration 029): /t/<code> forwards to /en/t/<code>. */
  lang?: 'en' | null;
};

const CODE = /^[a-z0-9]{4,12}$/i;

export async function getTender(code: string): Promise<Tender | null> {
  if (!CODE.test(code)) return null;
  const { data, error } = await db().rpc('mm_client_tender', { p_code: code });
  if (error || !data) return null;
  return data as Tender;
}

/** The city of an address (saved in Hebrew); in English on the English pages. */
export const cityOf = (a: Record<string, unknown> | null, fb?: string | null, locale: Locale = 'he') => {
  const c = (a?.city as string) || fb || '';
  return locale === 'en' ? cityEn(c) : c;
};
export const nis = (n: number) => `₪${n.toLocaleString('he-IL')}`;
export const dateHe = (d: string, locale: Locale = 'he') => new Date(d + 'T12:00:00').toLocaleDateString(t(locale).dateLocale, { weekday: 'long', day: 'numeric', month: locale === 'he' ? 'numeric' : 'short' });
export const offerDate = (o: TenderOffer, locale: Locale = 'he') => {
  const d = t(locale).tender;
  return o.available_flexible ? d.flexibleDate : o.available_date ? d.freeOn(dateHe(o.available_date, locale)) : d.dateTbd;
};
export const offerName = (o: TenderOffer, n: number, locale: Locale = 'he') => o.company || t(locale).tender.mover(n);

export const phoneDisplay = (p: string) => (p.length === 10 ? `${p.slice(0, 3)}-${p.slice(3)}` : p);
export const waLink = (p: string, text: string) => `https://wa.me/972${p.replace(/^0/, '')}?text=${encodeURIComponent(text)}`;
