import 'server-only';
import { db } from './db';

/** Profile content of a mover (movers.profile, migration 023). Every key is optional. */
export type MoverProfile = {
  tagline?: string; people?: string; people_role?: string; intro?: string; about?: string;
  years?: number; founded?: number;
  facts?: { label: string; value: string }[];
  services?: string[];
  promises?: { title: string; text: string }[];
  testimonials?: { name: string; place?: string; text: string; source?: string }[];
  extra_ratings?: { label: string; score: string; out_of?: string; reviews?: number; url?: string }[];
  website?: string; instagram?: string; facebook?: string;
  public_phone?: string; rank?: number;
};

/** What the public pages get. No phone, email or token: the number is shown only through the reveal form. */
export type PublicMover = {
  id: string; slug: string; company_name: string; name: string; has_logo: boolean; areas: string[];
  google_url: string | null; google_rating: number | null; google_reviews: number | null;
  midrag_url: string | null; midrag_rating: number | null; midrag_reviews: number | null;
  facebook_url: string | null; facebook_recommend: number | null; facebook_reviews: number | null;
  profile: MoverProfile;
};

export async function publicMovers(): Promise<PublicMover[]> {
  try {
    const { data, error } = await db().rpc('mm_public_movers');
    if (error) { console.error('[public movers]', error); return []; }
    return (data || []) as PublicMover[];
  } catch (e) { console.error('[public movers]', e); return []; }
}

export async function publicMover(slug: string): Promise<PublicMover | null> {
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) return null;
  try {
    const { data, error } = await db().rpc('mm_public_mover', { p_slug: slug });
    if (error) { console.error('[public mover]', error); return null; }
    return (data as PublicMover) || null;
  } catch (e) { console.error('[public mover]', e); return null; }
}

/** "Founders: Eliran and Gabriel" etc., for the card subtitle. */
export const peopleLine = (m: PublicMover) => {
  const who = m.profile.people || m.name;
  return who ? (m.profile.people_role ? `${who} · ${m.profile.people_role}` : who) : m.profile.people_role || '';
};

export const paragraphs = (t?: string) => (t || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

/** Only https links are rendered. */
export const safeUrl = (u?: string | null) => (u && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : null);
