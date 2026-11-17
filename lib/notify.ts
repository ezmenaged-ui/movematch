import 'server-only';
import type { LeadRow } from './db';
import { craneText, elevatorText, parkingText, whenText } from './validate';
import { itemsSummary } from './items';
import { logPaused, messagesPaused } from './pause';

/**
 * Operator notifications. Every channel is optional and switches on when its
 * env vars are set — configure as many as you like:
 *
 *  Email (Gmail):   GMAIL_USER, GMAIL_APP_PASSWORD, NOTIFY_EMAIL (defaults to GMAIL_USER)
 *  Email (Resend):  RESEND_API_KEY, NOTIFY_EMAIL, RESEND_FROM (optional)
 *  WhatsApp:        CALLMEBOT_PHONE (e.g. 972501234567), CALLMEBOT_APIKEY   — free, personal alerts
 *  WhatsApp (Meta): WA_TOKEN, WA_PHONE_NUMBER_ID, WA_TO                    — official Cloud API
 *  Telegram:        TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 *  Any webhook:     NOTIFY_WEBHOOK_URL (gets JSON: { event, lead, text }) — Make/Zapier/Slack
 */

export type LeadEvent = 'new' | 'complete' | 'video';

const VARIANT_LABEL: Record<string, string> = { a: 'משפך A (/)', wizard: 'משפך B (/b)', form: 'משפך C (/c)', items: 'משפך D (/d)', choice: 'משפך E (/e)' };

function addr(a: Record<string, unknown> | null | undefined) {
  if (!a) return '';
  const parts = [a.city, a.address, a.floor ? `קומה ${a.floor}` : '', a.apartment ? `דירה ${a.apartment}` : '',
    elevatorText(a), craneText(a), parkingText(a)].filter(Boolean);
  return parts.join(', ');
}

export function leadText(event: LeadEvent, l: LeadRow, siteUrl: string) {
  const head = event === 'new'
    ? (l.status === 'complete' ? '🚚 ליד חדש (מלא)' : '🚚 ליד חדש')
    : event === 'complete' ? '✅ ליד הושלם' : '🎥 סרטון הועלה';
  const lines = [
    `${head} — MoveMatch${l.tender_no ? ` · מכרז ${l.tender_no}` : ''}`,
    `שם: ${l.name}`,
    `טלפון: ${l.phone}`,
    l.city ? `עיר: ${l.city}` : '',
    l.move_from ? `מאיפה: ${addr(l.move_from)}` : '',
    l.move_to ? `לאן: ${addr(l.move_to)}` : '',
    l.move_when ? `מתי: ${whenText(l.move_when as never)}` : '',
    l.items?.list?.length ? `פריטים (${l.items.list.reduce((n, i) => n + i.qty, 0)}): ${itemsSummary(l.items)}` : '',
    l.videos?.length ? `סרטונים: ${l.videos.length}` : '',
    l.video_skipped ? '⚠️ דילג על הסרטון — להתקשר כדי לקבל סרטון' : '',
    `גרסה: ${VARIANT_LABEL[l.variant] || l.variant} · שלב ${l.furthest_step} · ${l.status === 'complete' ? 'מלא' : 'חלקי'}`,
    l.utm_source ? `מקור: ${[l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).join(' / ')}` : '',
    `וואטסאפ ללקוח: https://wa.me/972${l.phone.slice(1)}`,
    siteUrl && l.client_code ? `דף המכרז של הלקוח: ${siteUrl}/t/${l.client_code}` : '',
    siteUrl && l.share_token ? `דף המכרז למובילים: ${siteUrl}/l/${l.share_token}` : '',
    siteUrl ? `כל הלידים: ${siteUrl}/admin` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

async function safe(name: string, fn: () => Promise<unknown>) {
  try { await fn(); } catch (e) { console.error(`[notify:${name}]`, e); }
}

export const siteUrl = () => process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');

export async function notifyLead(event: LeadEvent, lead: LeadRow) {
  const text = leadText(event, lead, siteUrl());
  const subject = text.split('\n')[0] + ` · ${lead.name} · ${lead.phone}`;
  await sendAll(subject, text, { event, lead });
}

/** Send one message on every configured channel. */
export async function sendAll(subject: string, text: string, payload: Record<string, unknown> = {}) {
  const env = process.env;
  if (messagesPaused()) return logPaused(`notification "${subject}"`);
  const jobs: Promise<void>[] = [];

  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) jobs.push(safe('gmail', async () => {
    const nodemailer = (await import('nodemailer')).default;
    const t = nodemailer.createTransport({ service: 'gmail', auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD } });
    await t.sendMail({ from: `MoveMatch <${env.GMAIL_USER}>`, to: env.NOTIFY_EMAIL || env.GMAIL_USER, subject, text });
  }));

  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) jobs.push(safe('resend', async () => {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.RESEND_FROM || 'MoveMatch <onboarding@resend.dev>', to: [env.NOTIFY_EMAIL], subject, text }),
    });
    if (!r.ok) throw new Error(`resend ${r.status} ${await r.text()}`);
  }));

  if (env.CALLMEBOT_PHONE && env.CALLMEBOT_APIKEY) jobs.push(safe('callmebot', async () => {
    const u = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(env.CALLMEBOT_PHONE!)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(env.CALLMEBOT_APIKEY!)}`;
    const r = await fetch(u);
    if (!r.ok) throw new Error(`callmebot ${r.status}`);
  }));

  if (env.WA_TOKEN && env.WA_PHONE_NUMBER_ID && env.WA_TO) jobs.push(safe('whatsapp-cloud', async () => {
    // Free-form text only delivers inside a 24h customer-service window; outside it Meta requires an
    // approved template. Set WA_TEMPLATE to a template name with one body parameter to use that instead.
    const body = env.WA_TEMPLATE
      ? { messaging_product: 'whatsapp', to: env.WA_TO, type: 'template', template: { name: env.WA_TEMPLATE, language: { code: env.WA_TEMPLATE_LANG || 'he' }, components: [{ type: 'body', parameters: [{ type: 'text', text: text.replace(/\n/g, ' | ').slice(0, 1000) }] }] } }
      : { messaging_product: 'whatsapp', to: env.WA_TO, type: 'text', text: { body: text } };
    const r = await fetch(`https://graph.facebook.com/v21.0/${env.WA_PHONE_NUMBER_ID}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${env.WA_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`wa ${r.status} ${await r.text()}`);
  }));

  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) jobs.push(safe('telegram', async () => {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
    });
    if (!r.ok) throw new Error(`telegram ${r.status}`);
  }));

  if (env.NOTIFY_WEBHOOK_URL) jobs.push(safe('webhook', async () => {
    const r = await fetch(env.NOTIFY_WEBHOOK_URL!, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, text }),
    });
    if (!r.ok) throw new Error(`webhook ${r.status}`);
  }));

  if (!jobs.length) console.warn('[notify] no channels configured — lead saved, see /admin');
  await Promise.all(jobs);
}

/** Email only (Gmail, else Resend) — for operator alerts that shouldn't go to every channel. */
export async function sendEmail(subject: string, text: string) {
  const env = process.env;
  if (messagesPaused()) return logPaused(`email "${subject}"`);
  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
    const nodemailer = (await import('nodemailer')).default;
    const t = nodemailer.createTransport({ service: 'gmail', auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD } });
    await t.sendMail({ from: `MoveMatch <${env.GMAIL_USER}>`, to: env.NOTIFY_EMAIL || env.GMAIL_USER, subject, text });
    return;
  }
  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.RESEND_FROM || 'MoveMatch <onboarding@resend.dev>', to: [env.NOTIFY_EMAIL], subject, text }),
    });
    if (!r.ok) throw new Error(`resend ${r.status}`);
    return;
  }
  throw new Error('no email channel configured');
}

/** Email to a specific address (e.g. a mover's password-reset link). Gmail, else Resend. */
export async function sendEmailTo(to: string, subject: string, text: string, html?: string) {
  const env = process.env;
  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
    const nodemailer = (await import('nodemailer')).default;
    const t = nodemailer.createTransport({ service: 'gmail', auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD } });
    await t.sendMail({ from: `MoveMatch <${env.GMAIL_USER}>`, to, subject, text, html });
    return;
  }
  if (env.RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.RESEND_FROM || 'MoveMatch <onboarding@resend.dev>', to: [to], subject, text, html }),
    });
    if (!r.ok) throw new Error(`resend ${r.status}`);
    return;
  }
  throw new Error('no email channel configured');
}
