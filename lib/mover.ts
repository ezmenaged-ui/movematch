import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { MV_AT } from './moverSession';
import type { ItemsValue } from './items';
import type { Crew, DayJob, ManualJob } from './crew';
import { routeText } from './moverFormat';
import { tenderRef } from './publicLead';

/** Supabase client acting as the signed-in mover (auth.uid() in the mm_mover_* functions). */
export async function moverDb() {
  const at = (await cookies()).get(MV_AT)?.value || '';
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: at ? { Authorization: `Bearer ${at}` } : {} },
  });
}

export type Business = { slogan?: string; legal_name?: string; entity?: 'dealer' | 'company' | 'exempt'; tax_id?: string; address?: string; city?: string; postal?: string; email?: string; website?: string; phone?: string };
export type Me = {
  id: string; name: string; company_name: string; phone: string; email: string | null; active: boolean; has_logo: boolean;
  must_change_password: boolean; business: Business;
  google_url: string | null; google_rating: number | null; google_reviews: number | null;
  midrag_url: string | null; midrag_rating: number | null; midrag_reviews: number | null;
  facebook_url: string | null; facebook_recommend: number | null; facebook_reviews: number | null;
  slug?: string | null; profile_public?: boolean; profile?: { tagline?: string; people?: string; intro?: string; about?: string; services?: string[] };
};

/** The signed-in mover, or a redirect to the login page. Forces the first-login password change. */
export async function requireMe(opts: { allowPasswordChange?: boolean } = {}): Promise<Me> {
  const { data, error } = await (await moverDb()).rpc('mm_mover_me');
  if (error || !data) redirect('/movers/login?error=access');
  const me = data as Me;
  if (me.must_change_password && !opts.allowPasswordChange) redirect('/movers/password');
  return me;
}

export type MyBid = {
  id: string; lead_id: string; price: number; available_date: string | null; available_flexible: boolean; note: string | null;
  created_at: string; updated_at: string; booked_at: string | null; job_date: string | null; job_time: string | null; job_done_at: string | null;
  job_end_time: string | null; crew_ids: string[]; sheet_token: string;
};
type Addr = Record<string, unknown> | null;
export type MoverLead = {
  id: string; tender_no: number | null; share_token: string; created_at: string; closes_at: string | null; now: string; open: boolean;
  city: string | null; move_from: Addr; move_to: Addr; move_when: Record<string, unknown> | null;
  video_skipped: boolean; priority: number | null; bid_count: number; my_bid: MyBid | null;
};
export type MoverLeadSummary = MoverLead & { videos: number; items: number };
export type MoverLeadFull = MoverLead & {
  videos: { path: string; parts?: number; size?: number; duration_s?: number }[];
  items: ItemsValue | null; client: { name: string; phone: string };
};

export async function myLeads(): Promise<MoverLeadSummary[]> {
  const { data } = await (await moverDb()).rpc('mm_mover_leads');
  return (data || []) as MoverLeadSummary[];
}

/** Which tab a lead belongs to for this mover. */
export type Tab = 'new' | 'offers' | 'history';
export function tabOf(l: MoverLead): Tab {
  const b = l.my_bid;
  if (!b) return l.open ? 'new' : 'history';
  if (b.job_done_at) return 'history';
  if (b.booked_at || l.open) return 'offers';
  return 'history';
}

export type BidState = 'none' | 'sent' | 'booked' | 'done' | 'closed' | 'missed';
export function bidState(l: MoverLead): BidState {
  const b = l.my_bid;
  if (!b) return l.open ? 'none' : 'missed';
  if (b.job_done_at) return 'done';
  if (b.booked_at) return 'booked';
  return l.open ? 'sent' : 'closed';
}
export const BID_STATE_LABEL: Record<BidState, string> = {
  none: 'פתוח להצעות', sent: 'הצעה נשלחה', booked: 'הובלה נקבעה', done: 'הושלמה', closed: 'המכרז נסגר', missed: 'נסגר בלי הצעה',
};

export type CalEvent = { id: string; date: string; time: string | null; title: string };
export type Invoice = { id: string; number: number; created_at: string; bid_id: string | null; data: InvoiceData };
export type InvoiceData = {
  client: string; customer_tax?: string; customer_address?: string; date: string; due?: string; allocation?: string;
  description: string; total: number; net: number; vat: number; vat_rate: number; lead_ref?: string;
  issuer: Business & { company: string; name: string; mover_phone: string; has_logo: boolean; mover_id: string };
};

/** Everything on the mover's calendar: MoveMatch bookings + jobs added by hand, plus the crew list. */
export async function loadSchedule(): Promise<{ crew: Crew[]; manual: ManualJob[]; jobs: DayJob[] }> {
  const sb = await moverDb();
  const [leads, { data: c }, { data: mj }] = await Promise.all([myLeads(), sb.rpc('mm_mover_crew'), sb.rpc('mm_mover_jobs')]);
  const crew = (c || []) as Crew[];
  const manual = (mj || []) as ManualJob[];
  const t5 = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');
  const jobs: DayJob[] = [
    ...leads.filter((l) => l.my_bid?.booked_at && l.my_bid.job_date).map((l) => {
      const b = l.my_bid!;
      return { key: b.id, kind: 'lead' as const, title: routeText(l), date: b.job_date!, start: t5(b.job_time), end: t5(b.job_end_time),
        from: l.move_from || (l.city ? { city: l.city } : null), to: l.move_to, fromText: '', toText: '', crew: b.crew_ids || [], sheet: b.sheet_token,
        href: `/movers/leads/${l.id}`, done: !!b.job_done_at, tender: tenderRef(l) };
    }),
    ...manual.map((j) => ({ key: j.id, kind: 'manual' as const, title: j.title, date: j.date, start: t5(j.start_time), end: t5(j.end_time),
      from: null, to: null, fromText: j.from_text, toText: j.to_text, crew: j.crew_ids || [], sheet: j.sheet_token, href: `/movers/calendar/job/${j.id}` })),
  ].sort((a, b) => (a.date + (a.start || '99')).localeCompare(b.date + (b.start || '99')));
  return { crew, manual, jobs };
}
