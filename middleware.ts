import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminToken } from '@/lib/auth';
import { authToken, cookieOpts, jwtTtl, MV_AT, MV_RT, RT_MAX_AGE } from '@/lib/moverSession';

const MOVER_PUBLIC = ['/movers/login', '/movers/forgot', '/movers/reset', '/movers/join']; // join = public mover sign-up form

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.startsWith('/movers')) return moverGate(req, path);

  /** /admin requires the admin cookie (set once by /login, remembered for 180 days). */
  if (process.env.ADMIN_PASSWORD && req.cookies.get(ADMIN_COOKIE)?.value === (await adminToken())) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

/** /movers/*: keep the access token fresh; send signed-out visitors to the mover login. */
async function moverGate(req: NextRequest, path: string) {
  if (MOVER_PUBLIC.some((p) => path === p)) return NextResponse.next();
  const at = req.cookies.get(MV_AT)?.value;
  const rt = req.cookies.get(MV_RT)?.value;
  if (at && jwtTtl(at) > 60) return NextResponse.next();

  const t = rt ? await authToken('refresh_token', { refresh_token: rt }) : null;
  if (!t) {
    const url = req.nextUrl.clone();
    url.pathname = '/movers/login';
    url.search = path === '/movers' ? '' : `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
    const res = NextResponse.redirect(url);
    res.cookies.delete(MV_AT); res.cookies.delete(MV_RT);
    return res;
  }
  // Pass the new tokens to this request's server components and save them in the browser.
  req.cookies.set(MV_AT, t.access_token);
  req.cookies.set(MV_RT, t.refresh_token);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set(MV_AT, t.access_token, cookieOpts(t.expires_in));
  res.cookies.set(MV_RT, t.refresh_token, cookieOpts(RT_MAX_AGE));
  return res;
}

export const config = { matcher: ['/admin/:path*', '/movers', '/movers/:path*'] };
