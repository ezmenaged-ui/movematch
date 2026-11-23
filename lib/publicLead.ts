import 'server-only';
import { db } from './db';

export type PublicLead = {
  id: string; tender_no: number | null; created_at: string; status: 'partial' | 'complete'; variant: string; city: string | null;
  move_from: Record<string, unknown> | null; move_to: Record<string, unknown> | null; move_when: Record<string, unknown> | null;
  videos: { path: string; parts?: number; size?: number; duration_s?: number; name?: string }[];
  video_skipped: boolean;
  closes_at?: string | null; now?: string;
  items?: import('./items').ItemsValue | null;
  lang?: 'en' | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Mover-safe view of a lead by its share token (no name / phone). */
export async function getPublicLead(token: string): Promise<PublicLead | null> {
  if (!UUID.test(token)) return null;
  const { data, error } = await db().rpc('mm_public_lead', { p_token: token });
  if (error || !data) return null;
  return data as PublicLead;
}

export const shortRef = (id: string) => id.replace(/-/g, '').slice(0, 6).toUpperCase();

/** The tender number shown everywhere (falls back to a short id for any row without one). */
export const tenderRef = (l: { id: string; tender_no?: number | null }) => (l.tender_no ? String(l.tender_no) : shortRef(l.id));
