/** Mover panel session: Supabase Auth tokens in httpOnly cookies. Edge-safe (used by middleware). */
export const MV_AT = 'mm_mv_at';
export const MV_RT = 'mm_mv_rt';
export const RT_MAX_AGE = 60 * 60 * 24 * 60; // 60 days; refresh token rotates on every refresh

const SB_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type Tokens = { access_token: string; refresh_token: string; expires_in: number };

export async function authToken(grant: 'password' | 'refresh_token', body: Record<string, string>): Promise<Tokens | null> {
  try {
    const r = await fetch(`${SB_URL()}/auth/v1/token?grant_type=${grant}`, {
      method: 'POST', headers: { apikey: SB_KEY(), 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store',
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.access_token ? (j as Tokens) : null;
  } catch { return null; }
}

/** Seconds until the JWT expires (no signature check — the database verifies it on every call). */
export function jwtTtl(token: string | undefined): number {
  if (!token) return -1;
  try {
    const p = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(p + '='.repeat((4 - (p.length % 4)) % 4)));
    return exp - Math.floor(Date.now() / 1000);
  } catch { return -1; }
}

export const cookieOpts = (maxAge: number) => ({ httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge });
