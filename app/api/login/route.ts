import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, adminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const pass = String(form.get('password') || '');
  let next = String(form.get('next') || '/admin');
  if (!next.startsWith('/admin')) next = '/admin';
  const base = new URL(req.url).origin;
  if (!process.env.ADMIN_PASSWORD || pass !== process.env.ADMIN_PASSWORD) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return NextResponse.redirect(`${base}/login?error=1&next=${encodeURIComponent(next)}`, 303);
  }
  const res = NextResponse.redirect(base + next, 303);
  res.cookies.set(ADMIN_COOKIE, await adminToken(), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: ADMIN_COOKIE_MAX_AGE });
  return res;
}
