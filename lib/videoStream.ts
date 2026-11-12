import 'server-only';
import { adminDb } from './db';

const TYPES: Record<string, string> = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/x-m4v', '3gp': 'video/3gpp' };

/** Serve a stored clip: single files redirect to a short-lived signed URL (supports seeking);
 *  multi-part uploads are stitched back together and streamed. */
export async function videoResponse(path: string, parts: number, download = false): Promise<Response> {
  if (!/^[0-9a-f-]{36}\/[\w.-]+$/.test(path)) return new Response('bad path', { status: 400 });
  parts = Math.min(50, Math.max(1, parts || 1));
  const names = parts === 1 ? [path] : Array.from({ length: parts }, (_, i) => `${path}.p${i}`);
  const { data, error } = await adminDb().storage.from('movematch-videos').createSignedUrls(names, 60 * 60 * 6, download ? { download: true } : undefined);
  if (error || !data || data.some((d) => !d.signedUrl)) return new Response('not found', { status: 404 });
  if (parts === 1) return Response.redirect(data[0].signedUrl!, 302);

  const urls = data.map((d) => d.signedUrl as string);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const u of urls) {
          const r = await fetch(u);
          if (!r.ok || !r.body) throw new Error(`part ${r.status}`);
          const reader = r.body.getReader();
          for (;;) { const { done, value } = await reader.read(); if (done) break; controller.enqueue(value); }
        }
        controller.close();
      } catch (e) { controller.error(e); }
    },
  });
  const ext = path.split('.').pop() || 'mp4';
  return new Response(stream, {
    headers: {
      'Content-Type': TYPES[ext] || 'video/mp4',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${path.split('/').pop()}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
