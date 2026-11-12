'use client';
import { useCallback, useRef, useState } from 'react';
import { LeadRef, updateLead, uploadVideo, videoDuration } from '@/lib/client';
import { Clip, tooBig, tooLong } from './VideoUploader';

/** Queue of clips; uploads start as soon as a lead exists and run in the background. */
export function useUploads() {
  const [clips, setClips] = useState<Clip[]>([]);
  const leadRef = useRef<LeadRef | null>(null);
  const started = useRef(new Set<string>());

  const patch = (key: string, p: Partial<Clip>) => setClips((cs) => cs.map((c) => (c.key === key ? { ...c, ...p } : c)));

  const start = useCallback((c: Clip) => {
    const ref = leadRef.current;
    if (!ref || started.current.has(c.key) || c.state === 'too_big' || c.state === 'too_long') return;
    started.current.add(c.key);
    patch(c.key, { state: 'uploading' });
    uploadVideo(ref.id, c.file, (pct) => patch(c.key, { progress: pct }))
      .then(async ({ path, parts }) => {
        patch(c.key, { state: 'done', progress: 100, path });
        await updateLead(ref, { add_video: { path, parts, size: c.size, duration_s: c.duration, name: c.name } }).catch(() => {});
      })
      .catch(() => { started.current.delete(c.key); patch(c.key, { state: 'error' }); });
  }, []);

  const add = useCallback(async (files: File[]) => {
    const fresh: Clip[] = await Promise.all(files.map(async (f) => {
      const duration = await videoDuration(f);
      const state: Clip['state'] = tooLong(duration) ? 'too_long' : tooBig(f) ? 'too_big' : 'queued';
      return { key: `${f.name}-${f.size}-${Math.random()}`, file: f, name: f.name, size: f.size, duration, progress: 0, state };
    }));
    setClips((cs) => [...cs, ...fresh]);
    fresh.forEach(start);
  }, [start]);

  const attach = useCallback((ref: LeadRef) => {
    leadRef.current = ref;
    setClips((cs) => { cs.forEach(start); return cs; });
  }, [start]);

  const retryFailed = useCallback(() => setClips((cs) => { cs.filter((c) => c.state === 'error').forEach(start); return cs; }), [start]);
  const remove = useCallback((key: string) => setClips((cs) => cs.filter((c) => c.key !== key)), []);

  const usable = clips.filter((c) => c.state !== 'too_big' && c.state !== 'too_long' && c.state !== 'error');
  const totalDuration = usable.reduce((s, c) => s + (c.duration || 0), 0);
  return { clips, add, attach, remove, retryFailed, usable, totalDuration };
}
