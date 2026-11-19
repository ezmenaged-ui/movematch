# MoveMatch: notes for Claude

Hebrew RTL Next.js site on Vercel (project `movematch`, domain movematch.co.il) with Supabase (project ref `yhixrtzidvjfwdynapqp`, schema `movematch`).
Page map: `PAGES.md`. Database changes: `supabase/migrations/`.

## QA rules (mandatory: read before any test that creates leads, offers or messages)

On 12 Nov 2026 a QA run of all 8 funnels (there are now 10) on production sent **40 WhatsApp templates in 52 seconds** from a brand-new sender:
23 to one person, 6 to a number with no WhatsApp, and Marketing-category templates to people who had never written to the number.
Meta **disabled the WhatsApp Business account** (998316793318931, sender +972533891029) for "breach of Terms of Acceptable Use".
These rules exist so that never happens again.

0. **Use `/qa` for manual tests** (`/qa/<funnel>/<theme>`): nothing is sent except the lead email to the operator.
   The homepage `/` is also held from movers until `HOME_LEADS_LIVE=1` (see PAGES.md); `/a` … `/e` are live.
1. **Prefer local QA.** Run the site locally (`next build && next start`) against the same database. Locally there are no Twilio/Gmail
   credentials, so nothing is sent. Run production funnel tests only when the owner asks for them.
2. **Every test lead must be a test lead.** Use a name starting with `QA` (e.g. `QA משפך B צילום`) and/or `?utm_source=qa`.
   `lib/qa.ts` (`isTestLead`) then guarantees: **no WhatsApp to anyone, no message of any kind to movers**; the client "tender opened"
   and the operator alert go by **SMS only**. Never remove or bypass this guard, and never test with a non-QA name.
3. **Client phone in tests = the owner's number 054-6677361**, or the owner's second QA number 050-2612664 (both are exempt from the
   30-day duplicate rule, table `movematch.phone_cooldown_exempt`). Never use made-up
   numbers: they can belong to real people, and messages to numbers without WhatsApp are a spam signal.
4. **Pace production tests.** At most one funnel at a time with at least 2 minutes between submissions; never loop or retry sends.
   `lib/whatsapp.ts` also throttles to 4 WhatsApp messages per recipient per 10 minutes (`mm_wa_allow`), and that must stay on.
5. **Testing WhatsApp itself** (only after the owner says the number is healthy): one message, to the owner's number, then check
   the Twilio log (`api.twilio.com` Messages) before sending anything else. Never test WhatsApp by submitting funnels.
6. **Mover roster hygiene.** Only real movers with real WhatsApp numbers may be active. Test/fake movers stay `active = false`.
7. **Ask before cleanup deletes** and before production deploys; show the owner what will change.
8. **After any QA**: check the Twilio log for error codes (63005 content rejected, 63016 template not approved/outside window,
   63024 no WhatsApp, 63049 Meta declined marketing, 63051 sender locked) and Vercel logs, then delete the QA leads (with approval).

## WhatsApp rules we follow (Meta)

- Message only people who opted in (consent text is on every form), and honour "הסר"/STOP at once (`app/api/twilio/inbound`).
- Transactional messages use **Utility** templates; Marketing is only for promotions (it has hidden per-user caps and stricter review).
  `mm_mover_new_lead_v2` and `mm_client_first_offer_v2` are the Utility replacements, with the link written in the template text
  rather than in a variable. `mm_client_tender_opened_v2` and `mm_client_new_offer_v2` replace the two templates Meta rejected
  as SCAM. All four were approved by Meta (UTILITY) on 14 Nov 2026 and are live via these production env vars:
  `TWILIO_TPL_MOVER_LEAD_V2`, `TWILIO_TPL_CLIENT_FIRST_V2`, `TWILIO_TPL_CLIENT_OPEN_V2`, `TWILIO_TPL_CLIENT_NEW_V2`.
- Avoid spam signals: bursts, identical repeats, invalid numbers, retries, and URLs inside template variables.
- New or restored numbers: warm up. Real contacts message the number first, then volume grows slowly with real leads.
  Watch the quality rating in WhatsApp Manager.
- **Inbox / replying by hand** (`lib/inbox.ts`, migration 024, `/admin/inbox`): messages to the business number are saved, forwarded
  to the operator's WhatsApp (`OPERATOR_WHATSAPP`, only inside the operator's own 24h window, else SMS once per burst) and emailed
  with images attached. The operator answers by replying (long-press → Reply) to the alert: `OriginalRepliedMessageSid` maps it
  to the customer, and the reply goes out from the business number. Free-form replies only within 24h of the customer's last message.
  Only the first message of a conversation (per 24h) gets the automatic "thanks". Twilio media is served via the signed `/api/twilio/media`.
- **Funnel F (WhatsApp chat, `lib/waFunnel.ts`)**: closed questions (elevator, elevator size, crane, parking) go out as tap buttons / a pick-list (Twilio Content `mm_chat_*`, session-only; text fallback if refused). The bot only answers the customer's own messages (one reply per message, inside the 24h
  window opened by their starter message, throttled by `WA_CHAT_MAX`), plus at most 2 reminders (20:30 / 10:00, inside the window). Never add
  bot messages that start a conversation, and never send templates from the chat. Test only with a starter that begins with `QA`, from the
  owner's phone, one chat at a time.
- Every WhatsApp alert has an SMS backup (immediate on refusal, or via `/api/twilio/status` when Meta reports undelivered).

## Analytics (GA4 + Google Ads)

`lib/client.ts` → `trackStep` sends one `funnel_step` event per step reached, with `funnel`, `theme`, `variant_id`,
`step_number` and `step_name` (numbered, e.g. `3_to`). Steps: A `0_landing → 1_contact`; B `… 2_from 3_to 4_when 5_items 6_done` (before 13 Nov 2026: `5_video`);
C `… 2_details 3_done`; F (WhatsApp chat, sent from the server, `lib/gaServer.ts`) `1_start 2_to 3_when 4_video 5_name 6_done` with `ad_group`; D `… 2_from 3_to 4_when 5_video 6_items 7_done` (before 17 Nov 2026: `5_items 6_video`); E `… 2_from 3_to 4_when 5_info 6_done` (`6_done` carries `info_choice`: `video` or `items`; the choice itself also fires `info_choice`). Conversions: `generate_lead` (name + phone saved),
`lead_complete` (full details, fired only after the backend saved them), `qualify_lead` (Google's standard name; rule in `lib/qualify.ts`, once per
lead via `leads.qualified_at`) and `close_convert_lead` (a mover marked the job booked, server-side, `lib/booked.ts`). F also sends
`wa_conversation_start` and `wa_questionnaire_complete`. Every lead event carries `lead_id`. Full setup: `TRACKING.md`. Keep these names and parameters stable: GA4 reports and Google Ads conversions depend on them.
