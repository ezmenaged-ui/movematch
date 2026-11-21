# Tracking: Google Ads + GA4 for funnels D, E, F

Last verified locally on 19 Nov 2026 (QA leads only, local server without Twilio/Gmail, so nothing was sent and no mover was alerted).

## 1. Funnel ladder (what each number means)

| Stage | D (`/d`) | E (`/e`) | F (WhatsApp) | Where it is counted |
|---|---|---|---|---|
| Ad / message click | Ads clicks | Ads clicks | Ads "message asset" clicks | Google Ads only |
| Conversation started | n/a | n/a | `wa_conversation_start` | GA4 (server) |
| Contact saved | `generate_lead` | `generate_lead` | `generate_lead` | GA4 |
| Questionnaire done | (same as submit) | (same as submit) | `wa_questionnaire_complete` | GA4 |
| **Submitted lead** | `lead_complete` | `lead_complete` | `lead_complete` | GA4 → Ads (import) |
| **Qualified lead** | `qualify_lead` | `qualify_lead` | `qualify_lead` | GA4 → Ads (import) + DB `qualified_at` |
| **Booked move** | `close_convert_lead` | `close_convert_lead` | `close_convert_lead` | GA4 (server) + Ads offline file |

Every lead event carries `lead_id` (= the lead's id in `/admin`), `funnel` (`d`/`e`/`f`), `theme`, `variant_id`
(`d-photo`, `e-art`, `f-whatsapp`…), `utm_source/medium/campaign/term/content` and `click_id_type` (`gclid`/`gbraid`/`wbraid`/`none`).
E adds `info_choice` (`video`/`items`); F adds `ad_group` (`F2` for the one live WhatsApp ad, see §4).

## 2. qualify_lead definition (lib/qualify.ts, same for all funnels)

All of: saved complete by the backend · real lead (not QA) · real name · Israeli mobile 05XXXXXXXX ·
origin city + street · destination city + street · moving date (or "flexible").
Video / item list is **not** required (D's list and F's video can be skipped). It is reported as `has_inventory`, so a
stricter rule can be added later without renaming the event. Candidate extra rules: origin city in a served area
(`lib/areas.ts`), move date within 90 days.

## 3. Dedupe

- `qualify_lead`: the database sets `leads.qualified_at` once (`mm_lead_mark`); only that first call fires the event. Verified: resubmitting a lead returns `new_qualified: false`.
- `lead_complete` / `generate_lead`: fired once per `lead_id` per browser (`trackOnce`). The same lead finished on two devices (QR hand-off) can still produce two `lead_complete` events, which is why **`qualify_lead` should be the primary Ads conversion**.
- `close_convert_lead`: once per lead (`leads.booked_reported_at`), only if a booked bid exists.
- In Google Ads set each imported conversion to **Count: One**.

## 4. Funnel F and click ids (finding)

A WhatsApp message-asset click does **not** pass a gclid into the chat, and the starter text is the same for every click.
So an F lead **cannot be joined to an individual click**. What is reliable:
- **Ad level**: since #26 (19 Nov 2026) funnel F has **one** WhatsApp ad and every starter ending (`.`, `!`, `בבקשה`) is labelled **F2**
  (the earlier F1/F2/F3 split was verified before that change; a `#code` in the starter, e.g. `#G1`, still gives its own label).
  To compare several F ads again, give each ad its own `#code` starter rather than relying on punctuation.
  Risk: a customer who edits the prefilled text loses the label (stored as unknown).
- **Google Ads side**: Ads counts message-asset clicks/conversations itself. F's GA4 events use a phone-hash user, so importing them into Ads
  will **not** attribute them to clicks. Measure F cost per lead as *(Ads cost of the F ad group) ÷ (F leads with that `ad_group` in GA4 or `/admin`)*.

## 5. Google Ads setup (to do in Ads / GA4)

1. Confirm the property: the site sends to **G-RTVGY3SM56** (Vercel `NEXT_PUBLIC_GA_ID`). The brief mentions G-DS7SFR0QWS. Check GA4 → Admin → Product links → Google Ads links on both; use the linked one (changing it is one Vercel variable plus a new `GA4_API_SECRET`).
2. GA4 → Admin → Custom definitions: event-scoped dimensions `funnel`, `variant_id`, `lead_id`, `info_choice`, `ad_group`, `click_id_type`, `utm_term`, `utm_content`.
3. GA4 → Key events: mark `qualify_lead` (primary) and `lead_complete`; optionally `close_convert_lead`.
4. Ads → Goals → Conversions → Import → GA4: `qualify_lead` = Primary, `lead_complete` = Secondary. Count: One.
5. Booked moves into Ads: set `ADS_EXPORT_KEY` (any random 24+ chars) in Vercel, then Ads → Conversions → Uploads → Schedules → HTTPS:
   `https://movematch.co.il/api/ads/conversions?k=<key>` daily, with conversion actions named exactly **MM Booked Move** (and **MM Qualified Lead** only if you don't import it from GA4, to avoid counting it twice). Rows = real leads with a gclid.
6. Ads auto-tagging must be ON (it adds the gclid).

Cost per completed lead = Ads cost ÷ `lead_complete`, and cost per qualified lead = Ads cost ÷ `qualify_lead`, split by `funnel`
(D, E: per campaign; F: the F2 ad group).

## 6. Sample payloads (captured locally)

```json
{"event":"qualify_lead","lead_id":"24029f92-…","funnel":"e","theme":"photo","variant_id":"e-photo","info_choice":"video",
 "has_video":true,"has_items":false,"has_inventory":true,"utm_source":"google","utm_medium":"cpc","utm_campaign":"mm-e-test",
 "utm_term":"hovala","utm_content":"ad1","click_id_type":"gclid"}
{"event":"lead_complete","lead_id":"7283117a-…","funnel":"d","variant_id":"d-photo","has_video":true,"has_items":false,"click_id_type":"gclid", "...":"utm_*"}
{"event":"qualify_lead","lead_id":"f4d64e1f-…","funnel":"f","variant_id":"f-whatsapp","ad_group":"F3","utm_source":"whatsapp",
 "utm_medium":"google_ads_message","utm_campaign":"F3","click_id_type":"none","has_inventory":false}
```

## 7. Test results

| Test | Result |
|---|---|
| E (item list): gclid + 5 UTMs + GA client/session id saved on the lead; `info_choice`, `lead_complete`, `qualify_lead` with `info_choice=items` | Pass |
| E (video): same, `info_choice=video` | Pass |
| D (required video, list skipped) | Pass |
| Backend refuses the final save: no `lead_complete`, no `qualify_lead` | Pass |
| Same lead submitted twice: second `new_qualified=false` | Pass |
| Complete lead missing destination + date: `qualified=false`, `missing=[destination, move_date]` | Pass |
| F chat (QA starter) → 5 events in order, lead complete, nothing to movers | Pass |
| Starter mapping (10 cases, before #26 merged all starters into F2) | Pass |
| Booking: no report before a booking, exactly one after, value + GA client id read (in a rolled-back transaction) | Pass |
| Ads CSV: 404 without the key; correct header; test leads excluded | Pass |
| Ads CSV contains a real lead | Not testable without a real lead (all test leads are excluded by design) |
| Hits actually received by GA4 | **Blocked here** (this environment can't reach Google). Verify after deploy in GA4 → DebugView |

## 8. After deploy: 10-minute check

1. Open `https://movematch.co.il/e?utm_source=qa&gclid=TEST123` with Google Tag Assistant, finish as `QA …` with 054-6677361 (QA = no movers).
2. GA4 DebugView: `generate_lead`, `info_choice`, `lead_complete`, `qualify_lead`, each with `lead_id`.
3. In `/admin`, the lead shows the same id. Then delete the QA lead.

## 9. The /f landing page (E + WhatsApp button)

- The page is funnel E's photo landing, so its form events are E's (`funnel=e`, `variant_id=e-photo`). To separate /f from /e/photo use
  GA4's **Landing page** dimension, or `leads.landing_path = '/f'` in the database (set when the visit starts on /f).
- The green button fires **`wa_cta_click`** (`funnel`, `theme`, `variant_id`, `landing_page: 'f'`, `placement: 'lead_card'`). It is a click,
  **not a lead**: no `generate_lead` / `lead_created`. Don't mark it as a key event or import it into Ads.
- If the visitor sends the prefilled message, the chat runs as funnel F and is labelled **`ad_group` / `utm_campaign` = FL**
  (`lib/waFunnel.ts` → `starterSource`), so it is not counted as the Google Ads WhatsApp ad (F2).

## Microsoft Clarity (session recordings)

`components/Clarity.tsx`, enabled by the env var `NEXT_PUBLIC_CLARITY_ID` (Clarity project ID). Free, no recording cap.
- Loads only on client funnel pages: `/`, `/a` … `/e` (incl. `/b/steps`, `/c/details` …), `/f`, `/u/<id>`, and for now (owner's request, 21 Nov 2026)
  the `/qa/<funnel>/<theme>` test area. Never on `/admin`, `/movers`, `/login`, `/t` `/j` `/l` `/o`.
- Only on `movematch.co.il`: never on `*.vercel.app` deployment URLs (headless bots hit those after every deploy) or localhost.
- Tag `env`: `qa` for sessions that entered through `/qa`, `live` otherwise. For real-visitor views filter Custom tags → `env` = `live`.
  /qa still sends nothing to GA4, GTM or the Meta Pixel.
- `strategy="lazyOnload"`: fetched after the page has loaded and the browser is idle, so the first screen is not slowed.
- Tags set from `track()` in `lib/client.ts` (queued until the script arrives): `funnel` (= `variant_id`, e.g. `b-photo`), `step`
  (every `step_name` reached, e.g. `4_when`), `landing` (landing page path, e.g. `/f` vs `/e/photo`), `wa_click` (`yes` when the /f WhatsApp button was tapped, also a Clarity event `wa_cta_click`), `lead_id`, `lead` (`generate_lead` / `lead_complete` / `qualify_lead`), plus Clarity events of the same names.
  In Clarity → Recordings → Filters → Custom tags: e.g. `funnel = d-art` and `step = 4_when` but not `step = 5_video` = people who dropped at the video step.
- Privacy: no name or phone is sent as a tag; keep the project's masking on "Balanced" (form inputs masked) or "Strict".
- Funnel F (the WhatsApp chat from the Google Ads message asset) has no web page, so it is never recorded; only `/f`'s button tap is.
