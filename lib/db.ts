import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let _pub: SupabaseClient | null = null;
/** Anon client: may only call the token-checked mm_* functions. */
export function db() {
  if (!_pub) _pub = createClient(URL, KEY, { auth: { persistSession: false } });
  return _pub;
}

/** Admin client: adds the secret header that unlocks reading videos (see storage policy). */
export function adminDb() {
  return createClient(URL, KEY, {
    auth: { persistSession: false },
    global: { headers: { 'x-mm-admin': process.env.MM_ADMIN_SECRET || '' } },
  });
}

export type LeadRow = {
  id: string;
  created_at: string;
  updated_at: string;
  variant: 'a' | 'wizard' | 'form' | 'items' | 'choice' | 'chat';
  items?: { list: { id: string; name: string; qty: number; dis?: boolean; asm?: boolean; custom?: boolean }[]; boxes: number } | null;
  status: 'partial' | 'complete';
  furthest_step: number;
  name: string;
  phone: string;
  city: string | null;
  move_from: Record<string, unknown> | null;
  move_to: Record<string, unknown> | null;
  move_when: Record<string, unknown> | null;
  videos: { path: string; parts?: number; size?: number; duration_s?: number; name?: string }[];
  video_skipped: boolean;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  landing_path?: string | null;
  ga_client_id?: string | null;
  ga_session_id?: string | null;
  info_choice?: 'video' | 'items' | null;
  qualified_at?: string | null;
  theme?: 'photo' | 'art' | null;
  user_agent: string | null;
  handled: boolean;
  share_token: string;
  client_token?: string;
  tender_no: number | null;
  client_code: string | null;
  /** 'home' = homepage while it is the test area, 'qa' = /qa test area, null = live funnel (migration 023). */
  entry?: 'home' | 'qa' | null;
  is_test?: boolean;
};

/** The DB refuses a phone number that opened a tender in the last 30 days (see migration 007). */
export function phoneRecent(error: { message?: string; details?: string } | null): { until: string } | null {
  return error?.message === 'phone_recent' ? { until: error.details || '' } : null;
}
