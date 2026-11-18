import { NextRequest, NextResponse } from 'next/server';
import { fetchTwilioMedia, validMediaSig } from '@/lib/inbox';

export const dynamic = 'force-dynamic';

/**
 * Signed proxy for WhatsApp media stored on Twilio (Twilio media needs our credentials).
 * Used by /admin/inbox to show images, and by Twilio itself when we forward an image to the operator or a customer.
 * Only Twilio media URLs signed by lib/inbox.ts → mediaProxyUrl are served.
 */
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u') || '';
  if (!validMediaSig(u, req.nextUrl.searchParams.get('s') || '')) return new NextResponse('not found', { status: 404 });
  try {
    const r = await fetchTwilioMedia(u);
    return new NextResponse(r.body, {
      headers: {
        'Content-Type': r.headers.get('content-type') || 'application/octet-stream',
        'Cache-Control': 'private, max-age=86400',
        'X-Robots-Tag': 'noindex',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (e) {
    console.error('[media]', e instanceof Error ? e.message : e);
    return new NextResponse('not found', { status: 404 });
  }
}
