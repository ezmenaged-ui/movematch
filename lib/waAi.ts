import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { CITIES } from './validate';

/**
 * Claude reads the customer's free-text answers in the WhatsApp funnel (funnel F) and turns them into the same fields
 * the web funnels collect. Needs ANTHROPIC_API_KEY in Vercel. Model: WA_AI_MODEL (default claude-opus-5-5).
 * If the key is missing or a call fails, lib/waFunnel.ts falls back to a simple parser, so the chat never stalls.
 */

export type AddrPatch = {
  city: string | null; address: string | null; floor: string | null; apartment: string | null;
  elevator: boolean | null; elevator_type: 'small' | 'regular' | 'large' | null;
  crane: 'yes' | 'no' | 'unknown' | null; parking: 'p10' | 'p30' | 'p60' | 'p100' | 'far' | null;
};
export type WhenPatch = { date: string | null; date_flexible: boolean | null; time: 'morning' | 'noon' | 'afternoon' | null; time_flexible: boolean | null };
export type Reading = {
  intent: 'answer' | 'question' | 'human' | 'decline_video' | 'other';
  address: AddrPatch | null;
  when: WhenPatch | null;
  name: string | null;
  reply: string;
};

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] });
const str = nullable({ type: 'string' });
const ADDR = {
  type: 'object', additionalProperties: false,
  required: ['city', 'address', 'floor', 'apartment', 'elevator', 'elevator_type', 'crane', 'parking'],
  properties: {
    city: str, address: str, floor: str, apartment: str,
    elevator: nullable({ type: 'boolean' }),
    elevator_type: nullable({ type: 'string', enum: ['small', 'regular', 'large'] }),
    crane: nullable({ type: 'string', enum: ['yes', 'no', 'unknown'] }),
    parking: nullable({ type: 'string', enum: ['p10', 'p30', 'p60', 'p100', 'far'] }),
  },
};
const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['intent', 'address', 'when', 'name', 'reply'],
  properties: {
    intent: { type: 'string', enum: ['answer', 'question', 'human', 'decline_video', 'other'] },
    address: nullable(ADDR),
    when: nullable({
      type: 'object', additionalProperties: false, required: ['date', 'date_flexible', 'time', 'time_flexible'],
      properties: {
        date: nullable({ type: 'string', description: 'YYYY-MM-DD' }),
        date_flexible: nullable({ type: 'boolean' }),
        time: nullable({ type: 'string', enum: ['morning', 'noon', 'afternoon'] }),
        time_flexible: nullable({ type: 'boolean' }),
      },
    }),
    name: str,
    reply: { type: 'string' },
  },
};

// Stable text first (cached), the per-message details go in the user turn.
const SYSTEM = `You read one WhatsApp message from an Israeli customer who is filling in a home-moving request, in Hebrew, with a bot.
The bot asked one question; you turn the customer's answer into structured fields. Return JSON only, matching the schema.

Fields:
- address (when the bot is asking about the origin or destination address): fill every field the message states, null for anything not stated. Never guess.
  - city: the canonical name from this list when it is one of them (fix spelling and abbreviations: ת"א → תל אביב-יפו, ראשלצ → ראשון לציון, פ"ת → פתח תקווה, ב"ש → באר שבע, קרית → קריית). A place not on the list: write it as the customer did.
    ${CITIES.join(', ')}
  - address: street and house number only (e.g. "הרצל 12"). floor: a number as text ("0" for ground floor / קרקע, "-1" for basement). apartment: apartment number.
  - elevator: true if there is an elevator, false for stairs only. elevator_type: small (קטנה) / regular (בינונית, רגילה) / large (גדולה).
  - crane (מנוף): yes / no / unknown ("לא יודע").
  - parking = distance from where the truck can park to the building entrance: up to 10 m → p10, 10–30 → p30, 30–60 → p60, 60–100 → p100, over 100 m or no parking → far.
    When the bot listed numbered options 1–5 for parking, "1" = p10, "2" = p30, "3" = p60, "4" = p100, "5" = far. "צמוד לבניין", "ממש ליד" → p10.
- when (when the bot is asking about the moving date): date as YYYY-MM-DD (resolve relative dates against today's date given below; a date without a year is the next such date).
  "גמיש" / "לא יודע עדיין" → date_flexible true. A month or "סוף החודש" → a representative date plus date_flexible true.
  time: morning (בוקר, 7–11), noon (צהריים, 11–15), afternoon (אחה"צ, 15–19). "לא משנה" for the hour → time_flexible true.
- name: the customer's name when the bot asked for it (as written, without titles).
- intent: answer (the message answers the question, fully or partly); question (they ask something instead: price, how it works, who we are);
  human (they want a person / representative / to talk on the phone); decline_video (asked for a video, they say they can't or won't send one); other.
- reply: only for intent "question": a short, friendly Hebrew answer (1–2 sentences, no promises about prices or dates).
  Facts you may use: MoveMatch is a free service that sends the moving request to vetted movers in the customer's area; the movers send price offers,
  the customer compares and chooses, with no obligation. Prices depend on the details, which is why we ask. Otherwise reply is "".`;

let client: Anthropic | null = null;
export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY;

/** Read the customer's answer. Returns null when AI is off or the call fails (the caller uses the fallback parser). */
export async function readAnswer(args: { asking: string; question: string; message: string; today: string }): Promise<Reading | null> {
  if (!aiEnabled()) return null;
  client ??= new Anthropic({ timeout: 20_000, maxRetries: 1 });
  try {
    const r = await client.beta.messages.create({
      model: process.env.WA_AI_MODEL || 'claude-opus-5-5',
      max_tokens: 2000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      // If the model declines (safety classifier), the API re-runs the request on a fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Today (Israel): ${args.today}\nThe bot is asking about: ${args.asking}\nThe bot's question: ${args.question}\n\nCustomer's message:\n${args.message.slice(0, 1500)}`,
      }],
    });
    if (r.stop_reason === 'refusal' || r.stop_reason === 'max_tokens') { console.warn('[wa-ai] stop', r.stop_reason); return null; }
    const text = r.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    return JSON.parse(text) as Reading;
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error('[wa-ai]', e.status, e.message);
    else console.error('[wa-ai]', e instanceof Error ? e.message : e);
    return null;
  }
}
