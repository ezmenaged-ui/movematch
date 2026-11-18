import type { MoverProfile } from './publicMovers';

/**
 * The admin edits a profile as plain text fields. These helpers turn the stored JSON into that text and back.
 * Line formats:
 *   services        one per line
 *   facts           "label: value"
 *   promises        "title: text"
 *   extra_ratings   "label | score | out of | reviews | url"   e.g. "המקצוענים | 4.77 | /5 | 65 | https://…"
 *   testimonials    blocks split by a blank line; first line "name | place | source", the next lines are the quote
 */
const lines = (t: string) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const cut = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n);
const https = (u: string) => (/^https:\/\/[^\s"'<>]+$/.test(u) ? u.slice(0, 500) : '');

export function profileToText(p: MoverProfile) {
  return {
    services: (p.services || []).join('\n'),
    facts: (p.facts || []).map((f) => `${f.label}: ${f.value}`).join('\n'),
    promises: (p.promises || []).map((f) => `${f.title}: ${f.text}`).join('\n'),
    extra_ratings: (p.extra_ratings || []).map((r) => [r.label, r.score, r.out_of || '', r.reviews ?? '', r.url || ''].join(' | ')).join('\n'),
    testimonials: (p.testimonials || []).map((t) => `${[t.name, t.place || '', t.source || ''].join(' | ')}\n${t.text}`).join('\n\n'),
  };
}

const pair = (l: string) => { const i = l.indexOf(':'); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null; };

/** Build the profile JSON from the admin form. Unknown or empty fields are dropped. */
export function profileFromForm(f: FormData): MoverProfile {
  const g = (k: string) => String(f.get(k) || '');
  const int = (k: string, min: number, max: number) => { const n = parseInt(g(k), 10); return Number.isFinite(n) && n >= min && n <= max ? n : undefined; };
  const p: MoverProfile = {
    tagline: cut(g('tagline'), 120), people: cut(g('people'), 120), people_role: cut(g('people_role'), 80),
    intro: cut(g('intro'), 400), about: g('about').replace(/\r\n/g, '\n').trim().slice(0, 4000),
    years: int('years', 1, 99), founded: int('founded', 1900, 2100), rank: int('rank', 1, 999),
    public_phone: /^0\d{8,9}$/.test(g('public_phone').replace(/\D/g, '')) ? g('public_phone').replace(/\D/g, '') : '',
    website: https(g('website').trim()), instagram: https(g('instagram').trim()), facebook: https(g('facebook').trim()),
    services: lines(g('services')).slice(0, 16).map((l) => cut(l, 100)),
    facts: lines(g('facts')).map(pair).filter(Boolean).slice(0, 8).map((x) => ({ label: cut(x![0], 40), value: cut(x![1], 80) })),
    promises: lines(g('promises')).map(pair).filter(Boolean).slice(0, 6).map((x) => ({ title: cut(x![0], 60), text: cut(x![1], 240) })),
    extra_ratings: lines(g('extra_ratings')).slice(0, 4).map((l) => {
      const [label, score, out_of, reviews, url] = l.split('|').map((x) => x.trim());
      return { label: cut(label, 40), score: cut(score, 10), out_of: cut(out_of, 12), reviews: parseInt(reviews, 10) || undefined, url: https(url || '') || undefined };
    }).filter((r) => r.label && r.score),
    testimonials: g('testimonials').replace(/\r\n/g, '\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).slice(0, 8).map((b) => {
      const [head, ...rest] = b.split('\n');
      const [name, place, source] = head.split('|').map((x) => x.trim());
      return { name: cut(name, 60), place: cut(place, 60), source: cut(source, 60), text: cut(rest.join(' '), 600) };
    }).filter((t) => t.name && t.text),
  };
  // Drop empty values so the stored JSON stays clean.
  for (const k of Object.keys(p) as (keyof MoverProfile)[]) {
    const v = p[k];
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) delete p[k];
  }
  for (const t of p.testimonials || []) { if (!t.place) delete t.place; if (!t.source) delete t.source; }
  for (const r of p.extra_ratings || []) { if (!r.out_of) delete r.out_of; }
  return p;
}
