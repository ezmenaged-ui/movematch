# MoveMatch page map

Domain: `movematch.co.il`. Everything below hangs off that domain.

## 1. Funnels (10): 5 flows × 2 designs

Each funnel starts on its landing page, where the client gives name and phone (the lead is saved right there). Then it continues on the funnel's own follow-up page. **photo** = real-photo design, **art** = illustrated design.

| # | Funnel | Landing page | Follow-up page | What the client does |
|---|---|---|---|---|
| 1 | A · photo | `/a/photo` | none (thank-you on the same page) | Name, phone, city. We call back. |
| 2 | A · art | `/a/art` | none | Same as A, illustrated design. |
| 3 | B · photo | `/b/photo` | `/b/steps` | Step-by-step wizard: from → to → when → items (picked from the room list, or added by the client). No video. |
| 4 | B · art | `/b/art` | `/b/steps` | Same as B, illustrated design. |
| 5 | C · photo | `/c/photo` | `/c/details` | One page with from, to, when and video (can be skipped: "we'll call you for the video"; no item list). |
| 6 | C · art | `/c/art` | `/c/details` | Same as C, illustrated design. |
| 7 | D · photo | `/d/photo` | `/d/steps` | Same wizard as B up to "when", then a **required video** step, then the item list (**optional**: filling it earns ₪50 off). |
| 8 | D · art | `/d/art` | `/d/steps` | Same as D, illustrated design. |
| 9 | E · photo | `/e/photo` | `/e/steps` | Same wizard as D up to "when", then **one information page**: the client picks a full ~3-minute walk-through video of the apartment **or** the item list (that one is required; the other can be added as an optional extra). Videos under 3 minutes get a warning but can still be sent. Adding the other one too earns ₪50 off. On desktop, a video filmed on the phone via the QR code sends the client back to the computer to finish (like D). |
| 10 | E · art | `/e/art` | `/e/steps` | Same as E, illustrated design. |

**/f · E with a WhatsApp option** (`app/f/page.tsx`): funnel E's photo landing page, unchanged, plus a WhatsApp block at the top of the
lead card ("רוצים לספר לנו על המעבר בוואטסאפ?", green "המשיכו בוואטסאפ" button, then "או השאירו פרטים כאן" above E's form).
The button opens `wa.me/<LEGAL.whatsapp>` (the business number) with the starter `היי, הגעתי דרך MoveMatch ואני רוצה לקבל הצעות מחיר להובלה. אשמח לספר על המעבר שלי בוואטסאפ.`
prefilled (not sent). That starter starts the chat bot below, labelled **FL** (not F2). The form is E's form: saved as variant `choice`,
continues to `/e/steps`, same GA4 events as `e-photo`; tell /f leads apart by `leads.landing_path = '/f'` or GA4's landing page.

**Funnel F · WhatsApp chat** (no page): the Google Ads WhatsApp button (message asset) opens a chat with a starter message
already typed, e.g. `היי, אני רוצה הצעת מחיר להובלה #G1` (`#G1` = ad-group code, saved as the lead's `utm_campaign`). There is one WhatsApp ad, starter `היי, אני רוצה הצעת מחיר להובלה.`, saved as
`utm_campaign` F2. The old variants (`…להובלה!`, `…להובלה בבקשה`, once F1 / F3) also count as F2. The customer taps
send and the bot asks, one at a time: from (incl. home size) → to → when → video → name (`lib/waFunnel.ts`; Claude reads the free-text answers, `lib/waAi.ts`).
Each address gets the same details as the web funnels; only what is missing is asked again. Done = a normal complete lead (`variant = 'chat'`):
tender opened, movers in the area alerted, the tender link sent in the chat. Reminders: at most 2 per chat, at 20:30 / 10:00, inside the
24h window only (`/api/cron/wa-funnel`, every 5 min). "נציג" hands the chat to `/admin/inbox`; "הסר" stops it. **Held from movers until `WA_FUNNEL_LIVE=1`** in Vercel: until then chat leads are stored with `entry = 'home'`
(real movers don't see them, no mover alert, the bot says the details are being passed on) and the operator forwards real ones by hand. Test: start the starter
with `QA` (or send it from the operator's phone) → QA test lead, nothing to movers. Closed questions use buttons; simple typed answers (a floor number, כן/לא, a city from the list, 15/12) are read by plain code,
and only free text goes to Claude Haiku 5.5. A date without a time of day gets one time question. Voice notes: "please type". Env: `ANTHROPIC_API_KEY` (without it a simple parser is used),
optional `WA_AI_MODEL` (default `claude-haiku-5-5`), `WA_CHAT_MAX` (bot replies per 10 min per customer, default 20), `GA4_API_SECRET` (server-side GA4 events).

**Homepage `/`** shows **D · photo** (same page as `/d/photo`), but for now it is the owner's **test area**: the client gets the
usual "tender opened" message and the operator gets the alert (phone + email), but **no mover is alerted** and real movers don't
see the lead in their panel (`entry = 'home'`, migration 023). Real ones are forwarded by hand from `/admin`.
To make the homepage live: set `HOME_LEADS_LIVE=1` in Vercel and redeploy.

**Test area `/qa`** (also `/QA`): a menu of all 10 funnels at `/qa/<funnel>/<theme>` (e.g. `/qa/b/art`; `/qa/b` → photo).
Safe to send to anyone: the lead is saved as a test lead (`entry = 'qa'`), the operator gets the **email only**, and **no WhatsApp
or SMS goes to anyone** (not the phone entered, not movers, not the operator). It skips the 30-day phone rule, sends no
GA4 / Google Ads events, and every page shows a purple "סביבת בדיקות" strip. Not indexed by Google.

Each uploaded video may be up to 4 minutes long (C, D, E and the phone upload page `/u`). Every video step shows the same filming guide (`VideoGuide` in `components/VideoUploader.tsx`).

**₪50 discount** = the client sent both a video of the apartment and the full item list (`/terms` §11, `/movers/terms` §5). Mover lead pages show a note when a lead qualifies.

**Home size (origin only)**: the "from" address starts with how many rooms the home has, Israeli count incl. the living room:
1–1.5 · 2–2.5 · 3–3.5 · 4–4.5 · 5–5.5 · 6+ · private house / cottage. Required in B, C, D, E (and their `/qa` and homepage copies); optional tiles
under the city on A's form; in F the bot asks it right after the street (tap pick-list `mm_chat_rooms`, or a typed "3", "3.5", "בית פרטי").
Stored as `move_from.rooms` (`r1`…`r6`, `house`; A saves `move_from = { city, rooms }`). Shown to movers (lead page, WhatsApp alert text, crew sheet) and in `/admin`.

**Every address (from and to)** asks, in two rows of two boxes: city + street, then house number + floor (since 21 Nov 2026; before that one "full address" box). Stored as `street` and `number`, plus `address` = "street number" for movers, emails and the crew sheet. Then: floor (always), elevator (yes / stairs only, the same two tiles on phone and desktop; with an elevator its size: small / medium / large; no apartment number since 21 Nov 2026), **crane possible?** (yes / no / don't know) and **distance from truck parking to the entrance** (up to 10 m, 10–30, 30–60, 60–100, over 100 m / no parking). Stored in `move_from` / `move_to` as `crane` and `parking`.

Short addresses forward automatically, and tracking parameters (`?utm_…`) are kept:
`/a` → `/a/photo` · `/b` → `/b/photo` · `/c` → `/c/photo` · `/d` → `/d/photo` · `/e` → `/e/photo` · old `/wizard` → `/b/photo` · old `/form` → `/c/photo`.

## 2. Admin (1): you

| Page | What it is |
|---|---|
| `/admin` | All leads, mover offers, sending tenders to movers and clients. |
| `/admin/inbox` | WhatsApp inbox: messages sent to the business number (with images) and replies from the business number (24h window). |
| `/admin/movers` | Mover roster, sign-up approvals, ratings, panel logins (send access by email). |
| `/admin/movers/areas` | Tab "מי מקבל לפי אזור": which active movers receive a new tender per area (live from the DB, same rule as `routeByArea` in `lib/automations.ts`), a city checker (`?city=`), gaps, and a mover × area table. |
| `/login` | Admin password page (remembered for 180 days). |

## 3. Movers panel (1): each mover sees only their own data

| Page | What it is |
|---|---|
| `/movers` | New leads (open tenders, countdown). |
| `/movers/offers` | Offers sent and booked moves. |
| `/movers/history` | Closed tenders and finished moves. |
| `/movers/leads/…` | One lead: addresses, items, videos, client contact, offer form, "the client chose me". |
| `/movers/calendar` | Google-style week / day calendar (`?v=day`), filterable by employee (`?c=<crew ids>`, one colour each); tapping a slot or a job opens a pop-up editor. Google Calendar import and export. |
| `/movers/crew` | Employees, and their day schedule on WhatsApp (Hebrew / Russian). |
| `/movers/profile` | Company name, contact name, logo, password change. |
| `/movers/login` · `/movers/forgot` · `/movers/reset` · `/movers/password` | Sign-in, forgot password, reset link, first-login password. |
| `/movers/join` | **Public** sign-up form for new movers (no login). Service areas are required. |
| `/movers/terms` | **Public** mover agreement (commission, ₪50 discount, confidentiality), accepted at sign-up. |

Old `/mover/…` links forward to `/movers/…`.

## 4. Our movers (public, low-key)

| Page | What it is |
|---|---|
| `/our-movers` | Directory of the movers: logo, people, tagline, ratings, areas. Linked only from the footer ("המובילים שלנו") of the landing pages, the legal pages and the client tender pages. |
| `/our-movers/<slug>` | One mover's profile: who they are, facts, about, promises, services, customer quotes, links. "Show phone": the client leaves name + mobile, we log it in `movematch.mover_reveals` (attribution) and show the number. **Nothing is sent** on a reveal. |

A profile is shown only when the mover is **active, approved, not a demo, has a slug and the profile switch is on** (migration 023).
The admin edits everything in `/admin/movers` → "פרופיל ציבורי"; movers edit their own tagline, names, intro, about and services in `/movers/profile`
(phone numbers and links are stripped). Reveals are listed at the bottom of `/admin/movers`.
**Prospects** (`status = 'prospect'`): companies that haven't joined yet. Hidden, inactive, never get leads. When they sign up at `/movers/join`
with the same phone, the sign-up fills that row (profile kept) and it goes to approval.

## Pages opened from links in messages (not landing pages)

| Page | Who opens it | What it is |
|---|---|---|
| `/t/<code>` | Client | Their tender: all offers as they arrive. `/t/<code>/<n>` = one offer, `/all` = all offers, `/continue` = finish missing details. |
| `/l/<token>` | Mover (WhatsApp alert) | Lead details + offer form, without logging in to the panel. |
| `/j/<token>` | Crew member (WhatsApp) | Job sheet: hours, addresses with Waze, items. Add `?lang=ru` for Russian. |
| `/u/<id>` | Client | Film / upload the video from their phone (QR hand-off from desktop). |
| `/o/<token>` | Client | Old offers link; forwards to `/t/<code>`. |

## Legal

`/privacy` · `/terms` · `/accessibility` · `/movers/terms` (mover agreement). Drafts awaiting a lawyer: `LEGAL_REVIEW.md`.

## Lead routing

A completed lead goes only to active movers whose service areas include the lead's origin area (`lib/areas.ts` maps cities to areas;
areas are stored in `movematch.mover_service_areas`, migration 013, edited in `/admin/movers`). A lead from a city we don't recognise
goes to no mover; the operator alert says so.
