# Leads for Services playbook (MoveMatch)

**What this is:** everything learned while building MoveMatch (movematch.co.il, a Hebrew reverse-tender marketplace for home moves in Israel) between 6 and 20 November 2026. It is written so that you, or an LLM, can load it at the start of a new project, for example painters, cleaners, handymen or AC technicians, and skip the mistakes and back-and-forth we already went through.

**How to use it:**
- **If you are an LLM starting a new vertical:** read sections 0 to 3 before you write any code. Use section 14 as the build order. Section 11 (QA) and section 6 (WhatsApp) are not optional: they exist because of a real account ban.
- **If you are a person:** section 1 is the one-page version. Section 14 is the checklist for the next vertical. Section 19 lists everything MoveMatch added late, with the day-1 question that would have caught it.
- **To actually start the next project:** use the agent kit in `starter-kit/` (eight Claude Code agents and a gated `/kickoff` process). Copy it into the new repo together with this file as `docs/PLAYBOOK.md`; see `starter-kit/README.md`.

**Sources:** the MoveMatch repository (code, migrations, `CLAUDE.md`, `PAGES.md`, `TRACKING.md`, `LEGAL_REVIEW.md`, commits and PRs #1 to #32), about 45 Claude Code chats from 8 to 20 November 2026 (a second, fuller pass over the owner's messages in every major chat was done for section 19), the "MoveMatch Launch Tracker" and "Message Map" artifacts. Where this document and the code disagree, the code is the source of truth; update this file.

---

## Contents

0. [Instructions for the LLM that builds the next one](#0-instructions-for-the-llm-that-builds-the-next-one)
1. [The 30 lessons (one-page version)](#1-the-30-lessons-one-page-version)
2. [Business model](#2-business-model)
3. [Product: who uses what](#3-product-who-uses-what)
4. [Funnel design (the client side)](#4-funnel-design-the-client-side)
5. [Visual design and copy](#5-visual-design-and-copy)
6. [Messaging: WhatsApp, SMS, email](#6-messaging-whatsapp-sms-email)
7. [Tech stack and setup, step by step](#7-tech-stack-and-setup-step-by-step)
8. [Data model](#8-data-model)
9. [Provider operations (movers / painters)](#9-provider-operations)
10. [Analytics and Google Ads](#10-analytics-and-google-ads)
11. [QA and release discipline](#11-qa-and-release-discipline)
12. [Legal and compliance (Israel)](#12-legal-and-compliance-israel)
13. [Working with Claude on a project like this](#13-working-with-claude-on-a-project-like-this)
14. [Build order for the next vertical](#14-build-order-for-the-next-vertical)
15. [Adapting it to painters](#15-adapting-it-to-painters)
16. [MoveMatch timeline (what happened when)](#16-movematch-timeline)
17. [Open items in MoveMatch on 20 Nov 2026](#17-open-items-in-movematch-on-20-nov-2026)
18. [Appendix: reference material](#18-appendix-reference-material)
19. [What we added late, and the day-1 question that would have caught it](#19-what-we-added-late-and-the-day-1-question-that-would-have-caught-it)

---

## 0. Instructions for the LLM that builds the next one

Follow these from the first message. Each one comes from something that went wrong or slowed us down.

1. **Ask multiple-choice questions when the brief is unclear.** The owner prefers AskUserQuestion with 2 to 4 concrete options and a recommended one first. Do not fill gaps with guesses or filler. Keep the question in plain words: twice the owner answered "I don't understand the question" when it was phrased in terms like GA4 step numbering. Say what changes for *them*, not for the code.
2. **Write the project rules file (`CLAUDE.md`) on day one** and keep it current. Every new chat reads it automatically. Copy the QA rules from section 11 into it before the first test.
3. **Never send a real message during testing.** Build the test-lead guard (section 11) *before* wiring WhatsApp. Test locally, where no credentials exist, so nothing can be sent.
4. **Ask before production deploys, database deletes and anything outward-facing** (sending emails, submitting templates to Meta, DNS). Show what will change. The owner says "deploy" or "yes" in one word; that is enough.
5. **One chat deploys at a time.** Several parallel chats deployed over each other's work on 11 and 14 November, and one chat's QA cleanup deleted another chat's test leads mid-test. Rule: every chat starts from the latest `main`, merges back to `main` through a PR, and deploys only from `main`.
6. **Never paste or ask for secrets in the chat.** Tell the owner exactly where to paste a key (Vercel → Settings → Environment Variables), and say "tell me when it's done".
7. **Walk the owner through consoles one screen at a time.** Twilio Trust Hub, Meta Business Manager, Google, Vercel DNS: ask for a screenshot after each screen, then say exactly which field gets which value and which button to press. Long multi-step instructions caused "I keep going in circles".
8. **Verify on the live site after every deploy** (pages return 200, the changed feature appears), and say plainly what you could not verify (for example admin pages behind a password).
9. **Supabase MCP approval prompts time out after about 60 seconds.** When a migration or delete times out, say so, confirm nothing was applied, and ask the owner to watch for the prompt on the retry.
10. **Keep a live tracker artifact** (tasks with owner: You / Claude / Meta / Waiting) and a "message map" of every automated message. The owner used both daily.
11. **Write all user-facing text in Hebrew, RTL, and check it in a browser on a phone width** before calling it done.
12. **Do not invent marketing claims** (star ratings, "thousands of customers", "save 30%"). Use only facts the owner can back up.

---

## 1. The 30 lessons (one-page version)

### Business and product
1. **The model that works:** client submits one request → it goes to several vetted local providers in that area → providers quote on a page → client sees all quotes on one live page and picks. You earn a commission per booked job.
2. **Share the client's name and phone with the provider.** We started by hiding them ("so movers can't go around me") and reversed it on 11 Nov: providers will not quote blind, and the commission terms (12 months, includes direct deals) protect you instead of hiding data.
3. **Do not claim you negotiate for the client** unless you do. "We negotiate for you" was removed everywhere on 13 Nov. The honest pitch: "upload the details once, get several quotes, pick the best price".
4. **Save the lead on the first screen** (name + phone). Everything after is a bonus. Abandoned leads are callable, and a 15-minute "didn't finish" email alerts the operator.
5. **Rich information beats more questions.** A video of the space, or a structured item list, lets providers quote without a site visit. Reward it (₪50 off for video + full list).
6. **Route by service area, not "everyone gets everything".** Providers pick areas at sign-up; a lead goes only to active providers whose areas contain the lead's city. Unknown city → nobody, and the operator is told to forward it by hand.
7. **City names have many spellings.** "רמת-גן", "ר"ג", "ראשון" all failed to match and silently reached no provider. Keep an alias list and treat hyphens as spaces. Before launching ads in a city, run its common spellings through the matcher.
8. **Close the tender after a fixed time** (MoveMatch: 12 hours) and block late offers on the server.
9. **One phone number = one open request per 30 days**, with an exemption table for the owner's test numbers.
10. **Public provider profiles build trust** but keep them low-key (footer link only). Gate the provider's phone behind "leave your name and mobile", log it for attribution, and send nothing.

### WhatsApp (the single biggest risk)
11. **A brand-new WhatsApp sender was disabled by Meta after one QA run:** 40 templates in 52 seconds, 23 to one person, 6 to a number with no WhatsApp, Marketing templates to people who never wrote. Section 6 explains how to never repeat it.
12. **Transactional messages must be Utility templates.** Marketing templates get silently dropped (error 63049) and are reviewed harder.
13. **Write the link into the template text, never into a variable.** Two templates with a link variable were rejected as SCAM.
14. **Throttle per recipient** (4 messages per 10 minutes) and have a global kill switch (`MESSAGES_PAUSED=1`).
15. **Every WhatsApp alert needs an SMS backup**, immediately on refusal or when Twilio's status callback reports "undelivered".
16. **Warm up a new number**: real people message it first; volume grows slowly; watch the quality rating weekly.
17. **A number registered on Twilio cannot also be used in the WhatsApp Business app** ("coexistence" only works the other way round, and Twilio's support is unclear). Plan for an admin inbox from the start.
18. **Use a local number** (Israeli prepaid SIM, +972). A +1 number looks like spam to Israelis.

### Engineering and process
19. **Stack that worked:** Next.js 15 App Router + plain CSS, Supabase (private schema, RPC functions only, private storage bucket), Vercel, Twilio (WhatsApp + SMS), Gmail App Password for email, GA4 + Google Ads, Claude Haiku for reading free text in the WhatsApp chat.
20. **Supabase Free is not enough once you take video.** 1 GB storage ≈ 2 to 5 four-minute videos. Upgrade to Pro ($25/month) before ads.
21. **Build a `/qa` test area that sends nothing** except the operator email, plus a `QA` name prefix guard enforced in code and database.
22. **Webhooks need a fallback auth.** Twilio signature checks failed behind the proxy, so every inbound WhatsApp was refused for a week and nobody noticed. Accept a secret `?k=` key too, and log refused calls.
23. **Ad blockers hide elements whose class names start with `ad-`.** The whole admin went blank. Never prefix classes with `ad-`.
24. **iPhone Safari ignores `width:100%` on date and time inputs.** Remove the native appearance.
25. **Passwords copied from WhatsApp carry invisible characters** (trailing spaces, RTL marks). Trim them on login. And make the "copy login message" button save the same password it copies.

### Marketing and analytics
26. **Name conversion events with Google's standard names** (`generate_lead`, `qualify_lead`, `close_convert_lead`) and fire `lead_complete` only after the backend saved the lead.
27. **Make `qualify_lead` the primary Ads conversion**, deduplicated in the database (`qualified_at`), Count: One.
28. **WhatsApp click-to-chat ads cannot be joined to a click id.** Measure them at ad-group level by the starter text, or by a `#code` in the starter.
29. **Fewer variants at launch.** Ten pages split the clicks ten ways. Start with two or three funnels with clearly different asks, one design each, plus WhatsApp.
30. **Target ads only where you have providers**, mobile first, and keep the new campaigns' conversion goals separate from other campaigns on the same Ads account.

---

## 2. Business model

### 2.1 The concept
A **reverse tender ("מכרז")** for a local home service:
1. The client fills in one request (where, when, what, plus a video or item list).
2. The system opens a tender with a number and a client page (`/t/<code>`).
3. Approved providers in the matching area get a WhatsApp alert with a personal link (`/l/<token>`) and quote on that page.
4. The client gets a WhatsApp on the first offer and on every further offer, always linking to the same tender page, which lists all offers cheapest first and updates live.
5. The client contacts the chosen provider directly (WhatsApp and call buttons on the offer).
6. The provider marks the job as booked; the operator records the final price; the provider pays commission.

### 2.2 Money
- **Commission:** 10% of the final price (after the ₪50 discount, before VAT) plus VAT, reported by the provider within 3 days and paid within 14 days against a tax invoice. It also applies to deals made directly with a client who came through the platform within 12 months of the tender. Stated in `/movers/terms` and accepted with a separate checkbox at sign-up; the accepted terms version and date are stored.
- **Client incentive:** ₪50 off for clients who send both a video and the full item list. Under the current terms the **provider** gives the discount. An open question: the owner once said MoveMatch would fund it. Decide this before launch in the next vertical and write it the same way in client terms, provider terms and the provider's lead page.
- **Admin money tab** (`/admin/money`): mark a job done with the final price, see 10% + VAT owed per provider, record payments, totals.
- **Running costs seen:** Supabase Pro $25/month; Vercel; Twilio (WhatsApp utility in Israel about $0.005 per message plus Twilio's fee; SMS a few cents each; an Israeli Twilio number was $15/month, so we used a prepaid SIM instead); `.co.il` domain about $65/year through Vercel; Claude Haiku for chat parsing (cents per chat).

### 2.3 Positioning and copy that survived
- Headline idea: get up to 5 quotes from vetted, rated movers; free; no obligation.
- Trust signals: providers' real Google / Midrag / Facebook ratings (never show a 0 rating; show only the sources a provider has).
- Removed: "we negotiate for you", unsupported numbers. Kept by owner decision: "all movers are rated".

### 2.4 Decisions that changed during the build (and why)

| Topic | First version | Final version | Why |
|---|---|---|---|
| Client contact to providers | Hidden; providers quote through the operator | Shared with approved providers via their personal link | Providers need to call; commission terms protect the business |
| Provider names on the client page | Blurred so clients can't bypass the operator | Shown with logo, ratings, profile | Trust; bypass is handled contractually |
| Operator alerts | CallMeBot (free personal WhatsApp bot) + Gmail | Twilio WhatsApp templates + SMS backup + Gmail | CallMeBot is a hobby service; official API needed anyway |
| Sending tenders | Operator copies a link to movers by hand | Automatic by service area | Scale |
| "We negotiate" copy | Everywhere | Removed | Not true; legal risk |
| Funnel B | Wizard with video | Wizard with item list, no video | Test a no-video path |
| Funnel C video | Required, then skippable | Skippable ("we'll call you for it") | Completion |
| Funnel D | Items then optional video | Required video first, then optional item list | Movers get the richest data |
| ₪50 rule | For a video | For video **and** full item list | Push for both |
| Video length | 90 seconds max | 4 minutes max per clip | A full walk-through takes about 3 minutes |
| Provider login | Email + password | Plus phone + SMS code for providers without email | Some movers have no email |
| Homepage | Funnel A, then B | D-photo, held from movers until `HOME_LEADS_LIVE=1` | Owner's own test area |

---

## 3. Product: who uses what

### 3.1 Surfaces

| Who | Pages | Purpose |
|---|---|---|
| Client | Landing pages `/a` … `/e` (photo and art designs), follow-up pages `/b/steps`, `/c/details`, `/d/steps`, `/e/steps` | Submit the request |
| Client | `/t/<code>` (all offers, live), `/t/<code>/<n>` (one offer as a formal quote), `/t/<code>/all`, `/t/<code>/continue` (finish missing details) | See and choose offers |
| Client | `/u/<id>` | Film or upload a video on the phone (QR hand-off from desktop, or add a video to a finished tender) |
| Client | WhatsApp chat (funnel F) | Whole request inside WhatsApp |
| Client | `/our-movers`, `/our-movers/<slug>` | Provider directory and profiles (footer link only) |
| Provider | WhatsApp alert → `/l/<token>` | Lead details, videos, client contact, offer form, no login needed |
| Provider | `/movers` panel: new leads with countdown, offers and booked jobs, history, calendar (week/day, per-employee colours, Google Calendar import/export), crew, profile | Run their side of the business |
| Provider | `/movers/join` (public sign-up), `/movers/terms` (agreement) | Join |
| Provider's crew | `/j/<token>` (job sheet with Waze links, `?lang=ru` for Russian) | Day-of-job information |
| Operator | `/admin` (leads with expandable cards, offers, instant multi-select filters), `/admin/inbox` (WhatsApp conversations), `/admin/movers` (roster, approvals, areas, public profiles, logins, prospects, phone reveals), `/admin/movers/areas` (who receives per area, city checker), `/admin/funnels` (per-funnel drop-off, photo vs art, by source), `/admin/money` | Run the marketplace |
| Owner testing | `/qa` (all funnels, sends nothing), homepage while held | Safe testing |

### 3.2 The operator alert set
- New complete lead: WhatsApp (inside the operator's 24h window) or SMS, plus email with every detail and links.
- New offer: same channels.
- Lead started but not finished within 15 minutes: email (every funnel except A, including WhatsApp chats), with phone and WhatsApp link.
- Video uploaded after completion: email.
- City not recognised: the alert says "אזור המוצא לא זוהה, לשלוח ידנית".
- Incoming WhatsApp to the business number: forwarded to the operator (with images), plus email; one SMS per burst when outside the operator's window.

### 3.3 Admin UX details the owner asked for
- Leads as one row each (date, name, route, status tags, funnel, video count, "call for video", offers count and lowest price), opening into a full card with an arrow.
- Cards must look like cards (clearly separate from the rows below).
- Filters apply instantly, each dropdown multi-select, filters kept in the URL.
- Copy buttons everywhere: copy link, copy ready message, send on WhatsApp.
- One button that both saves a provider's password and copies the login message (two separate buttons caused wrong passwords).

---

## 4. Funnel design (the client side)

### 4.1 The funnels we built

| Funnel | After name + phone | Video | Item list | Notes |
|---|---|---|---|---|
| A · Callback | Nothing; thank-you on the same page (asks city, optional home size) | No | No | Never goes to providers automatically; the operator calls. Most leads, most work. |
| B · Wizard + items | from → to → when → items | No | Required | Room-by-room item picker, "not on the list" add, disassembly/assembly answer required per item |
| C · One page | from, to, when and video on one page | Asked, can skip | No | Fastest detailed request; skipped video means a follow-up call |
| D · Video first | from → to → when → video (required) → items (optional, ₪50) | Required | Optional | Richest information; after filming on the phone the client returns to the computer |
| E · Client chooses | from → to → when → one page: ~3-minute video **or** item list | One of the two required | The other optional (₪50) | GA records `info_choice` |
| F · WhatsApp chat | Bot asks from (with home size) → to → when → video → name | Asked, can decline | No | Started from a Google Ads WhatsApp button; no web page |

Each web funnel exists in two designs (photo and illustrated) → 10 pages, plus F.

### 4.2 Rules that apply to every funnel
- **Same landing page for all web funnels.** Only what comes after the first screen differs, so the test isolates the follow-up.
- **Lead saved on the first screen.** Show "שמרנו את הפרטים. נחזור אליכם בכל מקרה."
- **UTM parameters and click ids (`gclid`, `gbraid`, `wbraid`) carried through every step** and stored on the lead.
- **The first page's city pre-fills the "from" city.**
- **Each address asks:** city (with suggestions), street, floor, apartment, elevator yes/no then size (small/medium/large), crane possible (yes/no/don't know), distance from truck parking to the entrance (up to 10 m, 10 to 30, 30 to 60, 60 to 100, over 100 m / no parking). The floor is asked only when there is no elevator in the chat flow.
- **Home size on the origin only**, Israeli room count including the living room: 1–1.5 · 2–2.5 · 3–3.5 · 4–4.5 · 5–5.5 · 6+ · private house. Required in B to E, optional in A.
- **Date:** future dates only, plus an "I'm flexible on the date" checkbox. **Time:** morning 7–11, noon 11–15, afternoon 15–19, plus "flexible on time". Small tip under it: flexibility can lower the price.
- **Video rules:** up to 4 minutes per clip, as many clips as they like, file container signature checked (non-video files rejected), resumable upload in 45 MB pieces, a shared filming guide on every video step.
- **QR hand-off:** on desktop, a QR code opens the same lead on the phone for filming. Videos appear on the desktop within seconds. If the video is the last step, the client can finish on the phone; if more steps follow (D), the phone says "the video arrived, now go back to the computer" and shows no finish button.
- **Phone Back button walks the steps** (each step gets a browser history entry). Back from step 2 returns to the landing page with the details filled and continues the same lead.
- **A finished request is never reopened.** Back after done goes to the landing page.
- **If the lead was deleted while the page was open** (for example by a QA cleanup), the last step opens a fresh lead with the same details instead of failing forever with "something went wrong".
- **The last step re-checks every step** (progress-bar jumps and browser Forward can skip checks).
- **Consent line under every first-step form:** SMS/WhatsApp updates about the tender, and sharing details with providers.
- **Honeypot field** against bots.
- **Done screen** summarises what was sent and says offers will arrive on the phone.
- **Tender page while waiting:** an animated walking mover with "אנחנו עובדים על זה במרץ 💪 … no need to wait here, we'll message you". Respects reduced-motion.

### 4.3 The WhatsApp chat funnel (F) in detail
- The ad's WhatsApp button opens a chat with a pre-typed starter (`היי, אני רוצה הצעת מחיר להובלה.`). The customer's own message opens Meta's 24-hour window, so the bot may reply with free-form session messages (no template).
- One question at a time. Closed questions (elevator, elevator size, crane, parking, home size, time of day) are **tap buttons or a pick-list** (Twilio Content quick-reply / list-picker, session-only, no Meta approval). If Twilio refuses the buttons, the plain-text question goes out instead.
- Simple answers (a floor number, yes/no, a city from the list, dates like 15/12, plain names) are parsed by code. Only free text goes to Claude Haiku (thinking off). A date without a time gets one time-of-day question. Voice notes get "please type or tap".
- One bot reply per customer message, throttled (`WA_CHAT_MAX` per 10 minutes). At most 2 reminders (20:30 and 10:00), only inside the window. Never start a conversation, never send templates from the chat.
- "נציג" hands the chat to the admin inbox; "הסר" stops it.
- The lead is created at the first answer, so an abandoned chat is still callable and triggers the 15-minute email.
- QA: a starter that begins with `QA ` (Latin letters, then a space) makes a test lead. Only the first message of a new chat counts; send "הסר" first if another chat is open from that phone.
- Ad attribution: the starter text identifies the ad. We first used three endings (`!`, `.`, `בבקשה`) as F1/F2/F3, then merged to one ad (F2). For several ads, put a `#code` at the end of each starter instead of relying on punctuation.

### 4.4 Funnel learnings
- **Ask closed questions as taps, not text fields.** Fewer errors, faster on phones, and they map cleanly to data.
- **The item picker should open on the room-by-room list**, with search on top, and every pick should clear the search box for the next item.
- **Require a disassembly/assembly answer for each picked item** (or "none needs it"), otherwise providers guess.
- **On phones, the sticky item bar must be one compact row** and step aside while typing.
- **Show each offer's price on the tender page list** (large, "כולל מע״מ", "best price" tag only with 2+ offers). Notes and phone sit inside the offer. Known weak spot: the cheapest headline price may exclude extras (packing, crane), so a later improvement is "what's included" chips on each card.

---

## 5. Visual design and copy

### 5.1 Design system
- **Hebrew, RTL, mobile first.** Fonts and tokens in one CSS file (`app/ds.css`, "Industry" design system), plain CSS, no framework. Icons: `lucide-react`.
- **Two themes for A/B testing:** "photo" (a real photo of movers loading a truck across the top on desktop, a close crop above the headline on phones) and "art" (sky background, illustrated movers and truck in one corner, building in the other). The theme is saved on the lead (`leads.theme`) and sent with every analytics event.
- **Keep the landing page's theme on every following page** of the same funnel (wizard steps, details page, thank-you). This was missed once and the owner had to ask for it.
- **The owner's mockup image is a reference, not an asset.** Rebuild the headline, form and logo as real HTML on top of the photo; remove text baked into the image.
- **Brand mark:** a map-pin with a house, used for logo, favicon, apple-touch icon and the Organization logo for Google results (without a favicon Google shows a generic globe).
- **No duplicate trust items at the top.** The owner removed the three header bullets as "feels doubled".

### 5.2 Gotchas we hit
- Ad blockers hide anything with class names starting `ad-` → the admin rendered blank.
- iPhone Safari keeps a native width on date/time inputs → `appearance: none`.
- RTL number display: "4.4/5" rendered as "5/ 4.4" until isolated.
- Room buttons need a 3-column grid on desktop; phones can keep a scrolling row.
- Accessibility: one `h1` per page, content in a `main` landmark, QR code with `role="img"` and a label, contrast on the logo teal, accent blue and small grey text. An automated axe scan of 17 public pages found 0 issues after those fixes. Pages that need a live lead were not scanned.

### 5.3 Copy rules
- Short, warm, practical Hebrew. Second person plural ("עוברים דירה?").
- Never promise prices, dates or numbers you cannot prove.
- Tell people what happens next ("ההצעות יגיעו אליכם לטלפון").
- WhatsApp texts: plain, informational (Utility tone), no hype, no emoji overload, opt-out line for providers ("כדי להפסיק לקבל עדכונים, השיבו הסר").

---

## 6. Messaging: WhatsApp, SMS, email

### 6.1 The ban, so nobody repeats it
On 12 Nov 2026 a QA run of all funnels on production sent **40 WhatsApp templates in 52 seconds** from a sender that had existed for one day and had never received a message. 23 went to the owner, 6 to a made-up number with no WhatsApp, and the provider alert template was in the Marketing category, sent to people who had never written to the number. Meta disabled the WhatsApp Business account for "breach of Terms of Acceptable Use".

What it looked like to Meta: a new account, a burst of identical messages every ~1.3 seconds, the same person hit repeatedly, invalid numbers, promotional messages to people who never engaged.

Recovery: an appeal in Meta Business Support Home ("Request review", with a short honest explanation: internal test, all recipients internal, throttling added, moving to Utility), a matching comment on the Twilio support ticket, and the fixes below. Meta restored the account the same day; the two templates with links in variables were later rejected as SCAM and replaced.

### 6.2 Rules (put them in `CLAUDE.md`)
- Message only people who opted in; honour "הסר"/STOP immediately (inbound webhook).
- Transactional = **Utility** templates. Marketing only for real promotions.
- **Link written into the template body** (`https://site/t/{{4}}`), never a whole URL in a variable.
- No bursts, no identical repeats, no invalid numbers, no retries.
- Per-recipient throttle: 4 WhatsApp per 10 minutes (`WA_MAX`, `WA_WINDOW_SEC`), stored in the database (`mm_wa_allow`).
- Global kill switch: `MESSAGES_PAUSED=1` stops all WhatsApp, SMS and lead emails; skipped sends are logged and **not queued**, so resuming sends no backlog. Provider password emails still work.
- Warm up a new or restored number: owner, family and each new provider send it a "שלום" first. Check the quality rating in WhatsApp Manager weekly.
- Test WhatsApp itself only when the number is healthy: one message to the owner's phone, then read the Twilio log before anything else.
- After any test, check Twilio error codes: 63005 content rejected, 63016 template not approved / outside window, 63024 no WhatsApp on that number, 63049 Meta declined a marketing message, 63051 sender locked.

### 6.3 Setting up WhatsApp (what actually worked)
1. **Number:** an Israeli prepaid SIM (019, Golan, Hot Mobile, Partner) registered in the business's name, put in a spare phone only to receive Meta's code. Do not install WhatsApp on it. Check how long a prepaid line stays alive without top-ups. (Twilio's Israeli number was $15/month and voice-only; a +1 number looks foreign.)
2. **Meta Business portfolio** (business.facebook.com) named after the brand; business verification started early (company certificate + address document; up to ~250 new recipients per day before verification).
3. **Twilio account upgraded** (not trial) and **Trust Hub business profile approved.** This took several rounds: the representative email must use the website's domain (error 18606), the address must match the companies registry character for character with no stray apartment number, ID type `CompanyNumber` for an Israeli ח.פ., and after several failed automatic checks Persona sends it to manual review. Keep the certificate of incorporation (תעודת התאגדות) or a company extract ready. When the console form locks a wrong field during review, email trusthub-verify@twilio.com with the profile SID and the corrections.
4. **WhatsApp sender in Twilio** connected to the Meta WhatsApp Business account, display name = brand.
5. **Templates** created in Twilio Content Template Builder, category Utility, language Hebrew, then approved by Meta (minutes to a day). Their content SIDs go into Vercel env vars (`TWILIO_TPL_*`).
6. **Webhooks:** inbound messages `/api/twilio/inbound`, delivery status `/api/twilio/status`. Both accept Twilio's signature **or** a secret `?k=` key (`TWILIO_WEBHOOK_KEY`), and log refused calls. Do not rotate the Twilio auth token casually: the sender and number use it.

### 6.4 The message map (MoveMatch)

| When | To | Channel | Template / text |
|---|---|---|---|
| Lead completed | Client | WhatsApp Utility, SMS fallback | `mm_client_tender_opened_v2`: tender number + link to the tender page |
| Lead completed | Each matching provider | WhatsApp Utility, SMS fallback | `mm_mover_new_lead_v2`: tender, requested date, details, link to `/l/<token>`, "השיבו הסר" |
| Lead completed | Operator | WhatsApp (inside the operator's 24h window) or SMS, plus email | `mm_op_lead_complete` / SMS text |
| First offer | Client | WhatsApp Utility | `mm_client_first_offer_v2`: route, price, link |
| Every later offer | Client | WhatsApp Utility | `mm_client_new_offer_v2`: price, number of offers, link to all offers |
| Every offer | Operator | WhatsApp / SMS + email | `mm_op_new_bid` |
| Started, not finished in 15 min | Operator | Email | Funnel, last step reached, phone, WhatsApp link |
| Customer writes to the business number | Operator | WhatsApp forward with image (inside window) or one SMS per burst, plus email | Operator replies by long-press → Reply on the alert |
| First message of a conversation (per 24h) | Customer | Session text | Automatic "thanks" once |
| Provider access | Provider | Email (from the operator's Gmail) | Login link, username, first password; WhatsApp login was dropped (would need its own template) |
| Provider phone login | Provider | SMS | 6-digit code, 10 minutes, 5 tries, 1/min and 5/hour |
| Crew schedule | Crew member | WhatsApp (sent by the provider) | Day schedule link, Hebrew or Russian |

Every client message links to the same live tender page, so even an old message shows all current offers.

### 6.5 The inbox
- Every message to and from the business number is stored (`wa_messages`), images served through a signed `/api/twilio/media`.
- The operator gets WhatsApp alerts only inside *their own* 24h window with the business number. One message from the operator's phone to the business number re-opens it ("✓ ההתראות בווטסאפ פעילות ל-24 השעות הקרובות"); otherwise alerts fall back to SMS.
- Replying to an alert (`OriginalRepliedMessageSid`) sends the reply to that customer from the business number, only within 24h of the customer's last message.
- `/admin/inbox` works as a phone home-screen app (login lasts 180 days) with conversations, images, delivery ticks and the remaining reply window.

---

## 7. Tech stack and setup, step by step

### 7.1 Stack
- **Next.js 15** (App Router, React 19, TypeScript), plain CSS, `lucide-react`, `qrcode`, `nodemailer`, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `server-only`.
- **Supabase** (Postgres + Storage + `pg_cron`), region eu-central-1 (Frankfurt). Data in a **private schema** (`movematch`) that the public API cannot read. The browser never talks to tables: Next API routes call **RPC functions** (`mm_create_lead`, `mm_update_lead` with a per-lead `edit_token`, admin functions gated by `MM_ADMIN_SECRET`).
- **Storage:** private bucket for videos; anonymous users can upload but not list or read; admin and providers read through signed URLs.
- **Vercel** for hosting, env vars, domains (the `.co.il` was bought and set up through Vercel; the registrar sends a "Verify your domain contact information" email that must be clicked within 15 days).
- **Twilio** for WhatsApp and SMS (see section 6).
- **Gmail** with an App Password for email alerts (Google shows it once; if lost, create a new one).
- **GA4** (gtag defined in `<head>` before hydration, or the first events are lost) and **Google Ads** (conversion import from GA4 plus an HTTPS offline-conversion file).
- **Claude Haiku** for parsing free-text answers in the WhatsApp chat (`ANTHROPIC_API_KEY`, `WA_AI_MODEL`); a simple parser takes over without a key.
- **GitHub** private repo, one PR per change, Vercel deploys from `main`.

### 7.2 Setup order for a new vertical
1. Domain (check availability first: `promatch.co.il` was already taken) and Vercel project.
2. GitHub repo, `CLAUDE.md` with project facts and QA rules, `PAGES.md` page map.
3. Supabase project on **Pro**; private schema; migrations from section 8; storage bucket; `pg_cron` jobs.
4. Vercel env vars (section 7.3). Make the deployment public (Vercel's deployment protection blocked ad visitors at first).
5. Email alerts (Gmail App Password) → the owner gets every lead from day one.
6. Funnels, tender page, provider link page, admin.
7. `/qa` test area and the test-lead guard, **before** any messaging.
8. Twilio: upgrade, Trust Hub profile, number, WhatsApp sender, Utility templates. Start this on day 1: approvals take days.
9. Messaging with throttle, kill switch and SMS backup.
10. Provider sign-up, approval, service areas, logins.
11. Legal pages, consent lines, accessibility statement; lawyer review.
12. Analytics and Ads conversions; launch tracker; launch with few variants.

### 7.3 Environment variables (MoveMatch names)

| Group | Variables |
|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `MM_ADMIN_SECRET` (must match `settings.admin_secret` in the DB) |
| Admin | `ADMIN_PASSWORD` (login at `/login`, cookie 180 days) |
| Site | `SITE_URL`, `NEXT_PUBLIC_HERO_IMAGE` |
| Email | `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NOTIFY_EMAIL` |
| Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_SMS_FROM`, `TWILIO_WEBHOOK_KEY`, `SMS_ENABLED`, `OPERATOR_WHATSAPP` |
| Templates | `TWILIO_TPL_MOVER_LEAD_V2`, `TWILIO_TPL_CLIENT_FIRST_V2`, `TWILIO_TPL_CLIENT_OPEN_V2`, `TWILIO_TPL_CLIENT_NEW_V2`, `TWILIO_TPL_OP_LEAD`, `TWILIO_TPL_OP_BID` |
| Safety switches | `MESSAGES_PAUSED`, `WA_MAX`, `WA_WINDOW_SEC`, `HOME_LEADS_LIVE`, `WA_FUNNEL_LIVE`, `WA_CHAT_MAX` |
| AI | `ANTHROPIC_API_KEY`, `WA_AI_MODEL` |
| Analytics | `NEXT_PUBLIC_GA_ID`, `GA4_API_SECRET`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `ADS_EXPORT_KEY`, `GA_DEBUG_LOG` |
| Local tests only | `MM_QUALIFY_TEST_LEADS` (never in Vercel) |

### 7.4 Scheduled jobs
- Every 5 minutes: abandoned-lead email (started > 15 minutes ago, < 24 hours, once per lead) and the WhatsApp chat reminders (`/api/cron/wa-funnel`).
- Nightly: retention (videos 30 days after the move date, 90 days when no date; tenders after 24 months; orphan uploads after 7 days).

### 7.5 Things the cloud environment could not do
- Open the live site or Google from the sandbox until the hosts were allowed (ask the owner to approve network access rather than testing only with faked calls).
- Sign in to Google Analytics / Ads (the owner did those screens, or ChatGPT built the campaigns from a brief).
- Reach whatsapp.com or the Israeli domain registry (we used Meta developer docs and Vercel's registrar instead).

---

## 8. Data model

The migrations in `supabase/migrations/` are the blueprint; copy them and rename the domain words. Main objects:

| Object | Purpose |
|---|---|
| `leads` | One request: name, phone, `variant` (funnel), `theme`, `entry` (`qa` / `home` / normal), `status` (partial / complete), `furthest_step`, `move_from` / `move_to` (JSON: city, address, floor, apartment, elevator, elevator size, crane, parking, rooms), `move_when` (date, flexible, time, flexible), `items`, `videos`, `video_skipped`, UTMs, click ids, GA client/session id, `is_test`, `qualified_at`, `booked_reported_at`, tender number, codes and tokens |
| `phone_cooldown` + `phone_cooldown_exempt` | One open request per phone per 30 days, with exempt test numbers |
| tenders / bids | Offers with price, available date or flexible, note; 12-hour deadline enforced in the DB |
| `movers` | Providers: status (prospect / pending / approved), `active`, `is_demo`, ratings (Google, Midrag, Facebook, extra sources), logo, public profile fields, slug, terms version accepted |
| `mover_service_areas` | Provider × area (10 fixed areas) |
| mover auth, phone OTP | Panel logins; phone + SMS code for providers without email |
| crew, jobs | Employees, calendar jobs, crew job sheets |
| commissions / payments | Final price, 10% + VAT owed, payments recorded |
| `mover_reveals` | Client name + mobile logged when they reveal a provider's phone on a profile |
| `wa_messages` | WhatsApp inbox |
| WhatsApp chat state | Funnel F step per phone, reminder schedule |
| `settings` | Admin secret and similar |

Patterns worth keeping:
- A database trigger marks test leads (`QA` name, `utm_source=qa`, the owner's phone, `/qa` entry), and provider-panel functions filter them out; only demo providers see test leads.
- The client tender page and the provider link page are reached by long random tokens, never sequential ids.
- Service-area values are a check constraint in SQL and a constant list in code; keep them identical.

---

## 9. Provider operations

### 9.1 Recruiting and onboarding
- Public sign-up `/movers/join`: company, contact, phone, WhatsApp consent + display consent (with "הסר" opt-out), required service areas, optional ratings with their links (self-reported, verified by the operator before approval), acceptance of the provider agreement with the commission sentence quoted and a link to the full terms.
- Accept pasted links (pull the URL out of share text, add `https://`, upgrade `http://`); never block a sign-up on optional fields.
- **Prospects:** companies you want but who have not joined are stored hidden (`status = 'prospect'`, inactive, no leads). When they sign up with the same phone, the sign-up fills that row and keeps the profile.
- Approve in `/admin/movers`, set areas, open panel access ("open access and send by email"), or phone login without email.
- First login forces a personal password. Test the whole first-login flow on a throwaway account before sending real credentials.
- Write each public profile from the provider's own website, sign-up notes and public reviews, using only facts found there. Ask for a sharp logo file; crop logos to the emblem when needed.

### 9.2 Routing
- 10 areas: ירושלים והסביבה, מרכז, השרון, שפלה, צפון, חיפה והקריות, דרום, באר שבע והנגב, יהודה ושומרון, אילת. A city on a border belongs to both.
- `/admin/movers/areas` shows, live from the DB, which providers receive each area, gaps, active providers with no areas, and a city checker.
- Before launching ads in a region, confirm at least two active providers cover it; exclude uncovered regions in Google Ads.

### 9.3 Roster hygiene
- Only real providers with real WhatsApp numbers are active. Test and demo providers stay `active = false`.
- Delete the demo provider and all demo leads before launch so reports start clean (we deleted 16 demo/test leads and a demo mover with 6 crew, 12 jobs and 4 offers on 20 Nov, with approval).

---

## 10. Analytics and Google Ads

### 10.1 Events
- `funnel_step` once per step reached, with `funnel`, `theme`, `variant_id`, `step_number`, `step_name` (`0_landing`, `1_contact`, `2_from`, …). Keep names stable; if a step changes, note the date (reports before and after are not comparable).
- `generate_lead`: name + phone saved.
- `lead_complete`: full details, fired only after the backend saved them.
- `qualify_lead`: rule in code (complete, not a test, real name, Israeli mobile, origin and destination with street, a date or flexible), recorded once per lead in the DB (`qualified_at`).
- `close_convert_lead`: a provider marked the job booked (server-side, once per lead).
- WhatsApp chat: `wa_conversation_start`, `wa_questionnaire_complete`, step events sent server-side.
- Every event carries `lead_id` (same as `/admin`), UTMs and `click_id_type`. Test leads send no GA or Ads events.

### 10.2 Google Ads setup
- GA4 custom dimensions for `funnel`, `variant_id`, `lead_id`, `info_choice`, `ad_group`, `click_id_type`, `utm_term`, `utm_content`.
- Import `qualify_lead` (Primary) and `lead_complete` (Secondary), Count: One. Do not count `generate_lead`.
- Booked moves: daily HTTPS upload of an offline-conversion CSV (`/api/ads/conversions?k=<ADS_EXPORT_KEY>`), conversion name "MM Booked Move".
- Auto-tagging on. Leave the URL suffix blank when the ad links carry their own tags.
- Bidding at launch: Maximize Clicks until there are conversions.
- If the Ads account has other campaigns (Binyan Ariel had Maximize Conversions), set the new conversion as a **campaign-specific goal** so other campaigns don't optimise for it.
- WhatsApp message assets: one per ad group, starter text copied exactly; mobile only; Israel, Hebrew. Measure cost per lead as Ads cost of that ad group ÷ leads with that `ad_group`.
- Check which GA4 property is linked to Ads (the site used one ID, the brief mentioned another).

### 10.3 Using ChatGPT for the ads
The owner built campaigns in ChatGPT from a pasted brief. A good brief contains: what the service is, the goal and main CTA, the exact final URLs per ad group (no homepage while it is held), the WhatsApp number and exact starter texts, devices, locations (only covered areas), language, conversion goal, and the facts allowed in copy (free, no obligation, several quotes from vetted local providers, offers arrive in WhatsApp; no specific prices or dates). Then paste ChatGPT's report back to Claude to check it.

### 10.4 Launch plan we settled on
- Two web funnels (D and E, photo design) plus F (one WhatsApp ad, about ₪50/day), city targeting to the centre of Israel and Jerusalem where providers exist.
- After the first 3 to 5 real leads: a "launch-day check" (Twilio error codes, Vercel logs, lead data complete, providers alerted, GA4 DebugView events).
- Raise budget slowly while watching the WhatsApp quality rating.

---

## 11. QA and release discipline

### 11.1 The QA rules (copy into `CLAUDE.md` of the new project)
0. Use the `/qa` test area for manual tests: nothing is sent except the lead email to the operator. It skips the 30-day phone rule, sends no analytics, shows a purple "סביבת בדיקות" strip, and is not indexed.
1. Prefer local QA (`next build && next start` against the same database, no Twilio/Gmail credentials). Production funnel tests only when the owner asks.
2. Every test lead is a test lead: name starting with `QA ` and/or `?utm_source=qa`. The guard (`isTestLead`) guarantees no WhatsApp to anyone and nothing to providers; client and operator get SMS only. Never remove or bypass it.
3. Test phone = the owner's own numbers, listed in the cooldown-exempt table. Never made-up numbers.
4. On production: one funnel at a time, at least 2 minutes apart, never loops or retries.
5. Test WhatsApp itself only when the number is healthy: one message to the owner, then check the Twilio log.
6. Only real providers active; demo providers inactive.
7. Ask before cleanup deletes and production deploys; show what will change.
8. After any QA: check Twilio error codes and Vercel logs, then delete the QA leads with approval.

### 11.2 Release rules
- One PR per change, merged to `main`, deployed from `main`. Never deploy a branch that is behind `main`.
- Before deploying, merge `main` into the working branch and re-run the build and type check.
- After deploying: check the changed pages return 200 on the live domain, `/admin` still asks for the password, and the specific change is visible.
- Test with the production configuration (for example with `ADMIN_PASSWORD` set): `/qa` once redirected to the admin login in production only, because the local run had no admin password.
- Hold new lead sources from providers until tested: the homepage (`HOME_LEADS_LIVE`) and the chat funnel (`WA_FUNNEL_LIVE`) stored leads as `entry = 'home'` until switched on.

---

## 12. Legal and compliance (Israel)

Drafted by Claude, **not approved by a lawyer** (see `LEGAL_REVIEW.md`). Have an Israeli lawyer review before scaling.

- **Operator identity** in one file (`lib/legal.ts`): company name, ח.פ., address, legal email, WhatsApp. Footers show the operator and company number. Check that the legal email actually receives mail (two different domains were in use at one point).
- **`/terms`:** operator, age/capacity, accurate details and the 30-day rule, prohibited conduct, user-content licence, IP, no endorsement and what is vetted, release after the deal, cancellations, the ₪50 promotion, third-party links, indemnity, changes, Israeli law and Jerusalem courts (check enforceability against consumers).
- **`/movers/terms` (provider agreement, versioned):** approval and vetting, service areas and routing, WhatsApp consent and display licence, the discount, commission after the discount, confidentiality (no marketing use, delete client data after the job), prohibited use, liability and indemnity, termination.
- **`/privacy`:** data controller, what is shared with providers (name and phone) and why, transfers abroad with countries (Supabase Frankfurt, Vercel functions in Washington DC) and safeguards, tracking technologies (GA4, Google tag, Google Ads, Meta Pixel) with opt-out links, security and breach handling under Amendment 13, retention periods, privacy contact, the phone-reveal logging.
- **`/accessibility`:** what was checked and how (automated axe, WCAG 2.0/2.1 A + AA), coordinator contact by role, 14-day response, update date. Don't claim a full audit you haven't done.
- **Anti-spam:** consent line on every form; the chat funnel only answers the client's own messages; any promotional message later needs its own opt-in.
- **Retention runs automatically** (nightly job), not by promise.

---

## 13. Working with Claude on a project like this

### 13.1 What worked
- **Claude Code cloud sessions** with the repo, Supabase MCP, Vercel and Twilio connected through the proxy, GitHub MCP for PRs and merges, Gmail for drafts (Claude drafts, the owner presses Send).
- **Artifacts as the shared workspace:** a launch tracker with tickable tasks (Claude reads and updates it from any chat) and a message map with comment threads.
- **Scheduled check-ins** ("remind me in 24 hours to double-check") through a scheduled task in the same chat.
- **Screenshots from the owner's phone** for every console screen, answered with "this field: this value; press Next; send me the next screen".
- **Short owner answers** ("deploy", "yes", "go") after Claude summarised exactly what would change.
- **ChatGPT for ad building**, with Claude writing the brief and checking the result.

### 13.2 What cost time
- **Parallel chats on the same codebase** overwrote each other's deploys and deleted each other's QA data. Use one chat per feature, all merging through `main`, and tell other chats when `main` changed.
- **The project was not in Git for the first days.** Create the GitHub repo first.
- **Questions phrased in technical terms** the owner could not answer. Rephrase in business terms with a recommended option.
- **Approval prompts timing out** (Supabase MCP asks the owner; no answer within ~60 seconds cancels it). Batch the deletes and tell the owner to watch for the prompt.
- **Testing with faked calls only.** Allow the sandbox to reach the live site and database early (with approval) so real end-to-end checks are possible.
- **The 5-hour usage limit** ended one long session mid-task; keep chats focused and hand off through the tracker and `CLAUDE.md`.

### 13.3 Owner preferences (carry them over)
- Multiple-choice questions when unclear; no filler.
- English chat for the owner is fine; Hebrew for anything customers or providers see. The owner sometimes writes in Hebrew; answer in the language of the message.
- Full clickable URLs, not paths, when the owner needs to open something.
- A CSV or table of every funnel and page when things get complicated.
- Ask before sending anything to anyone, and say what was and was not tested.

---

## 14. Build order for the next vertical

The fastest way to run this is the agent kit in `starter-kit/`: `/kickoff` takes you through entrepreneur → bizdev → product → design → marketing → developer → QA, with ops-legal starting after stage 1, and stops for your approval between stages. The list below is the same plan written out.

Use this as the plan. Each step lists what "done" means.

**Day 1: foundations and long-lead items**
1. Pick the name and domain; check `.co.il` and `.com` availability; buy through Vercel. Done: domain verified (click the registrar's contact-verification email).
2. GitHub repo + `CLAUDE.md` (project facts, QA rules from 11.1, WhatsApp rules from 6.2) + `PAGES.md`. Done: committed.
3. Start the slow approvals in parallel: Israeli prepaid SIM; Meta Business portfolio and business verification; Twilio upgrade and Trust Hub profile with the domain email, exact registry name and address, and the incorporation certificate ready.
4. Supabase project on Pro (EU region), private schema, base migrations. Vercel project, public deployment, env vars.

**Days 2 to 3: the request and the tender**
5. Landing page (one design to start, two if you want a design test), lead saved on step 1, consent line, UTMs and click ids.
6. One detailed funnel (wizard) with the vertical's questions (section 15), video with QR hand-off, done screen, tender page with live offers, provider link page with offer form and 12-hour deadline.
7. Admin: leads list with cards and filters, offers, providers roster with areas.
8. Email alerts to the operator, abandoned-lead email.
9. `/qa` area, test-lead guard in code and DB trigger, cooldown with exempt numbers, kill switch.

**Days 4 to 5: messaging**
10. Utility templates written with the link in the body; submit to Meta. Throttle, SMS backup, status callback, inbound webhook with `?k=` fallback and "הסר" handling, inbox.
11. One WhatsApp test to the owner, Twilio log check.

**Days 5 to 7: providers, legal, analytics**
12. Provider sign-up with areas and agreement checkbox, approval, logins (email and phone code), panel basics.
13. Legal pages and accessibility statement; lawyer review requested.
14. GA4 events and Ads conversions as in section 10; tracker artifact; message map.
15. Recruit real providers for the first target areas; warm up the WhatsApp number with them.
16. Delete all demo data. Launch with two funnels and one WhatsApp ad in covered areas only.

**Week 2:** launch-day check after 3 to 5 leads, compare funnels in `/admin/funnels`, public provider profiles, money tab, chat funnel if not yet built.

---

## 15. Adapting it to painters

What stays the same: the whole engine (lead → tender → providers by area → offers → choose → commission), the messaging rules, QA, legal structure, analytics.

What changes:

| Area | Moving | Painting (suggested starting point; confirm with real painters) |
|---|---|---|
| Location | From and to addresses | One address (city, street, floor, elevator, parking distance, occupied or empty) |
| Size | Rooms of the origin home | Rooms to paint, or approximate m² of walls; ceiling height (standard / high); also ceilings? |
| Scope questions | Elevator, crane, parking, items, disassembly | Interior / exterior; walls, ceilings, doors, window frames, railings; colour change (light→dark needs more coats); repairs before painting (cracks, damp/mould, plaster); paint type (regular, washable, anti-mould "סופרקריל"); who buys the paint; furniture to move and cover |
| Rich information | Walk-through video, item list | Short video or photos of each room, plus a room checklist with the above per room |
| Date | Move date + time window | Desired start date, flexible, days the home is available, whether it's occupied |
| Price shape | One price | Price + number of work days + what's included (materials, repairs, coats) |
| Incentive | ₪50 for video + full list | Same idea: a discount for photos/video + the full room checklist |
| Areas | 10 areas | Likely the same list; painters often cover a smaller radius, so check coverage per city |
| Provider vetting | Google / Midrag / Facebook ratings | Same, plus photos of past work, insurance, licensed contractor (קבלן רשום) where relevant |
| Templates | "הובלה", "מובילים", "מכרז הובלה" | New template names and texts for the new brand; submit them fresh as Utility |
| Copy | Moving vocabulary | Painting vocabulary; same honest promise: one request, several quotes, you choose |
| Public profiles | Trucks, crews, years | Years, team size, specialties, before/after photos |
| Crew sheet | Addresses with Waze, items | Address, rooms and scope, materials list |

Things to decide with the owner before building (ask as multiple choice):
1. Brand name and domain.
2. Which funnels at launch (suggest: one wizard with photos/video + room checklist, one quick-request funnel, the WhatsApp chat).
3. Who funds the client discount (provider or platform).
4. Commission rate (MoveMatch: 10% + VAT after discount).
5. First target areas, based on painters already willing to join.
6. Whether to reuse the MoveMatch codebase (fork and rename) or start a fresh repo from the same structure. Forking is faster; keep the two projects' Supabase, Vercel, Twilio sender and templates separate.

---

## 16. MoveMatch timeline

| Date (Nov 2026) | What happened |
|---|---|
| 6 to 7 | WhatsApp Business structure discussed; Admark (company site) and domain admarkgrowth.com set up, later used for the Twilio business email |
| 8 to 9 | "Movers leads operation": first site on Vercel, three funnels A/B/C sharing one landing page, lead saved on page 1, Gmail alerts, CallMeBot, admin with password, mover one-pager link, date/time step, QR hand-off to the phone, mover quote form, client offers page, site made public |
| 10 | WhatsApp setup plan: number options (prepaid SIM chosen), Meta Business portfolio |
| 11 | Twilio Trust Hub rejection fixed (domain email, registry name and address, manual review); domain movematch.co.il live; redesign with photo and art themes on all funnels; theme kept through every step; 12-hour tender countdown; 30-day phone cooldown; client contact shared with approved movers; walking-mover waiting animation; admin instant multi-select filters; ad-blocker blank admin fixed |
| 12 | Launch-readiness review; QA burst → WhatsApp account disabled; appeal; throttle and SMS backups for movers and operator; QA rules written into `CLAUDE.md`; test-lead guard; Meta reinstated the account; commission terms, retention job, money and funnel-performance tabs, mover ratings at sign-up |
| 13 | Legal rewrite and mover agreement; "we negotiate" removed; lead routing by service area; funnel B becomes the item-list funnel; accessibility fixes; GA4 gtag fix |
| 14 | Four Utility v2 templates approved and live; funnel E; videos up to 4 minutes; B/D QA fixes (Back button, closed requests, non-video files); lead recovery after deletion; mover calendar and crew page; clients can add a video to a finished tender |
| 16 | First real mover onboarded (Jerusalem); Facebook ratings; test leads hidden from real movers |
| 17 | Messaging kill switch; required video in D, crane and parking questions, filming guide, new ₪50 rule; D's "go back to the computer" after filming |
| 18 | Login copy-button fix; favicon; public mover profiles and directory; homepage held and `/qa` area; WhatsApp inbox; webhook `?k=` fix (inbound was refused since 11 Nov); funnel F (WhatsApp chat) with buttons, Haiku parsing, reminders, live to movers |
| 19 | Ads tracking: click ids, backend-confirmed events, `qualify_lead`, booked-move export; one WhatsApp ad (F2); launch tracker updated; Supabase Pro flagged as blocking |
| 20 | City aliases (hyphens, short names); "who receives per area" admin tab; home size on every funnel; phone + SMS-code login for movers without email; demo data deleted; offer-price presentation reviewed; launch planned for Sunday 22 Nov |

---

## 17. Open items in MoveMatch on 20 Nov 2026

- ~~Supabase upgrade to Pro~~: done by the owner on 20 Nov.
- Lawyer review of `/terms`, `/movers/terms`, `/privacy`, `/accessibility` and the Google data statement.
- Who funds the ₪50 discount (terms say the mover).
- `qualify_lead` as the Primary conversion after the first real leads, as a MoveMatch-only campaign goal; then the booked-move upload.
- Funnel F room-size question to be tested from the owner's phone; QA leads from that test to delete.
- Phone-login migration waiting for the owner's Supabase approval.
- Weekly WhatsApp quality-rating check.
- Possible improvement: "what's included" chips on offer cards, so the cheapest headline price isn't misleading.

---

## 18. Appendix: reference material

### 18.1 Approved Utility template texts (MoveMatch, Hebrew)
Rewrite these for the new brand and submit them fresh; keep the structure: greeting with name, what happened, the key facts, a link written into the body, sign-off, and for providers an opt-out line.

```
mm_client_tender_opened_v2
שלום {{1}}, בקשת ההובלה שלך התקבלה ונפתח עבורה מכרז מס׳ {{2}}.
הצעות המחיר מהמובילים יופיעו בדף המכרז שלך:
https://movematch.co.il/t/{{3}}
נעדכן אותך כאן כשתתקבל הצעה.
צוות MoveMatch

mm_mover_new_lead_v2
שלום {{1}}, התקבלה בקשה להצעת מחיר להובלה.
מכרז: {{2}}
מועד מבוקש: {{3}}
פרטים: {{4}}
לצפייה בפרטים ולהגשת הצעה: https://movematch.co.il/l/{{5}}
כדי להפסיק לקבל עדכונים על מכרזים, השיבו הסר.

mm_client_first_offer_v2
שלום {{1}}, התקבלה הצעת המחיר הראשונה במכרז ההובלה שלך.
מסלול: {{2}}
מחיר: ₪{{3}}
לצפייה בהצעה: https://movematch.co.il/t/{{4}}
נעדכן אותך כאן על כל הצעה נוספת.
צוות MoveMatch

mm_client_new_offer_v2
שלום {{1}}, התקבלה הצעת מחיר נוספת במכרז ההובלה שלך.
מחיר ההצעה: ₪{{2}}
מספר ההצעות במכרז: {{3}}
לצפייה בכל ההצעות: https://movematch.co.il/t/{{4}}
צוות MoveMatch
```

The two v1 templates rejected as SCAM had the full URL in a variable and more excited wording ("כבר כאן! 🎉").

### 18.2 The Meta appeal text that worked (adapt it)
> We are MoveMatch (movematch.co.il), a moving-quote marketplace in Israel. On 12 November 2026 between 15:42 and 15:44 UTC we ran a one-time internal test of our website's lead forms. All test submissions used the business owner's own phone number, so our approved templates went out about 40 times in one minute. Every recipient was internal: the owner, a family member and our test mover accounts. No customer or third party received a message. This was a testing mistake, not spam or bulk marketing. We have since added per-recipient throttling (max 4 messages per number per 10 minutes) and will recategorise our transactional alerts as Utility templates. We kindly ask you to restore our WhatsApp Business account and number.

### 18.3 Twilio error codes to check after every test
| Code | Meaning |
|---|---|
| 63005 | Content rejected |
| 63016 | Template not approved, or free-form message outside the 24h window |
| 63024 | The number has no WhatsApp |
| 63049 | Meta declined to deliver a marketing message |
| 63051 | Sender locked |
| 18606 (Trust Hub) | Representative email domain doesn't match the website domain |

### 18.4 Files to copy from the MoveMatch repo
| File | What it gives you |
|---|---|
| `CLAUDE.md` | QA rules and WhatsApp rules, ready to adapt |
| `lib/qa.ts` | Test-lead guard and the "held" switches |
| `lib/whatsapp.ts`, `lib/automations.ts`, `lib/alertSms.ts` | Sending, throttle, SMS backup, routing on lead complete and on bid |
| `lib/areas.ts` | Areas, city → area map, aliases, hyphen handling |
| `lib/qualify.ts`, `lib/client.ts`, `lib/gaServer.ts`, `lib/booked.ts` | Analytics events and conversion rules |
| `lib/inbox.ts`, `app/api/twilio/*` | Inbound, status callbacks, media, inbox |
| `lib/waFunnel.ts`, `lib/waAi.ts` | WhatsApp chat funnel |
| `lib/legal.ts` and the legal pages | Operator identity and legal texts (re-review for the new vertical) |
| `components/Wizard.tsx`, `VideoUploader.tsx`, `QrHandoff.tsx`, `AddressFields.tsx`, `WhenFields.tsx`, `ItemsPicker.tsx` | Funnel building blocks |
| `supabase/migrations/` | Schema, RPC functions, triggers, cron jobs |
| `PAGES.md`, `TRACKING.md`, `LEGAL_REVIEW.md` | Page map, tracking spec, legal checklist |

---

## 19. What we added late, and the day-1 question that would have caught it

MoveMatch's whole day-1 brief was one line: *"a movers leads operation; send every lead to my Gmail or ideally WhatsApp; I'm stepping away, make the decisions yourself; attached are design files."* Everything below was discovered afterwards (day 1 = 8 Nov 2026, day 13 = 20 Nov). Each row is now a question in one of the agents in `starter-kit/.claude/agents/`, so the next project answers it on day 1.

### 19.1 Business and supply

| Added late (day) | What happened | Day-1 question | Agent |
|---|---|---|---|
| Positioning (day 6) | The owner's own headline "we'll negotiate for you" was removed: we don't negotiate | What exactly do we promise, word for word, and can we keep it? | entrepreneur |
| Customer contact for providers (day 4) | Started hidden "so movers can't bypass me", reversed so providers can call | Do providers see the customer's name and phone? How do terms protect us? | bizdev |
| ₪50 incentive (day 4, changed day 10) | Added while reviewing the video page; rule changed from "video" to "video + full list"; who funds it still open at launch | Is there a customer incentive, what's the exact rule, who pays it? | entrepreneur |
| Provider input (day 10) | A potential mover's feedback made video required and added crane, parking distance and filming instructions after five funnels existed | Interview two providers: what do they need to quote without a visit? | bizdev |
| Tender deadline (day 4) | 12-hour countdown and server block on late offers | How long is a tender open, and what happens at zero? | bizdev / product |
| Service areas and routing (day 6) | Built when no real provider existed yet; city spellings failed silently on day 13 | Which areas, how many providers each, and test every city spelling before ads | bizdev |
| Ratings (days 4 to 9) | Google, Midrag, Facebook added one at a time; "rated by Midrag" replaced by "all rated" | Which rating sources do providers have, and what may we claim? | bizdev / design |
| Provider logins (days 5 to 13) | Copy button sent unsaved passwords; pasted passwords had hidden characters; phone + SMS login for movers without email | Email or phone login? One button that saves and copies the message | bizdev / developer |
| Invoicing (day 5) | Asked for real tax invoices, then removed as out of scope | Do we invoice providers in-system in v1? | bizdev |
| Public provider profiles (day 11) | Phone gated behind the customer's name for attribution; prospects hidden | Public profiles: yes/no; how do we attribute direct contact? | bizdev |

### 19.2 Product and design

| Added late (day) | What happened | Day-1 question | Agent |
|---|---|---|---|
| Separate URLs per funnel (days 2 and 5) | Asked for separate URLs for ad testing, then everything was reorganised into `/x/photo|art` with redirects | One URL per funnel and design, short redirects keeping UTMs, what's on the homepage | product |
| Funnel hypotheses (days 10 and 12) | Funnel C's video went required then back to optional; nobody remembered why three WhatsApp ads existed | What does each funnel or ad test, and how do we measure it? | product / marketing |
| Date, time and flexibility (day 2) | Added after the first funnels | Full question list per address and for the job, from the provider interviews | product |
| Elevator size, crane, parking, home size (days 4, 10, 13) | Each added in a separate session | (same) | product |
| Video rules (days 2, 5, 7, 10) | 1.5 min → 4 min; optional → required → optional; filming guide; "go back to the computer" | Photos or video, required where, max length, guide, desktop-to-phone hand-off | product / design |
| Item picker UX (day 4) | Long owner feedback: multi-select, prominent "pick from list", free add, sticky buttons, optional marked in red | Spec the picker completely before building | product / design |
| Abandonment email (day 4) | 15-minute "didn't finish" email for every funnel | Which operator alerts, on which events and channels? | product |
| Message map (day 5) | Owner kept asking "what happens when..." | Draw the message map before code | product |
| Theme carried through steps (day 4) | Follow-up pages lost the landing page's design | References and every screen state up front | design |
| Waiting states (day 4) | "Three dots" replaced by an honest walking-mover message | Design loading and waiting states, not just the happy path | design |
| Competitor references and mockups (days 4 and 5) | Competitor tender page, ChatGPT admin mockup and a provider-panel style arrived mid-build | Send every reference you have now | design |
| Page map (day 5) | "Give me a map of all my pages" became PAGES.md | Keep PAGES.md from day 1 | product |
| Admin reports (day 5) | Funnel performance tab and money tab requested | Which admin views and reports in v1? | product |
| WhatsApp chat funnel (day 11) | "Crazy idea": the whole funnel as a WhatsApp chat | Web form, WhatsApp chat, or both at launch? | product / marketing |
| AI cost in the chat (day 11) | Opus cost ~5 cents per test chat; switched to Haiku + plain-code parsing | Which model, and what may one chat cost? | product / developer |
| Chat tone (day 11) | Separate welcome + consent message; one bullet and emoji per sub-question; floor only without elevator | Write the chat script and tone before building | design |

### 19.3 Ops, legal and messaging

| Added late (day) | What happened | Day-1 question | Agent |
|---|---|---|---|
| GitHub (day 5) | The only copy outside Vercel was a backup file until then | Private repo on day 1, all work through PRs | ops-legal / developer |
| Business email on own domain (day 4) | Twilio rejected a gmail representative email; Zoho was paid, so free forwarding was set up | Do you have a mailbox on your website domain? | ops-legal |
| Company details (days 4 and 6) | Registry name, number and address needed for Twilio, footers and legal pages | Exact legal identity and documents ready on day 1 | entrepreneur / ops-legal |
| Twilio Trust Hub (day 4) | About 1.5 hours of "where do I click" screenshots | Start it on day 1 with a click-by-click checklist | ops-legal |
| Templates (days 4 to 7) | Two re-categorised as Marketing, two rejected as SCAM (link in a variable) | Utility wording, link in the body, submit on day 1 | ops-legal |
| Inbound webhook (day 11) | Every inbound WhatsApp was refused for a week, unnoticed | Test inbound on the day the sender connects; log refusals | ops-legal / qa |
| Operator 24-hour window (day 11) | Alerts came by SMS with a web link and the owner didn't know why | Explain the operator window up front | product |
| Legal texts (day 6) | Arrived as a big brief; still waiting for a lawyer at launch | Draft legal on day 1, lawyer booked, hosting countries known | ops-legal |
| Supabase plan (days 5 to 13) | Free plan filled after a few videos; owner deleted videos by hand; Pro was a launch blocker | Pro from day 1; storage math for media | ops-legal |
| Deploy permissions (days 4 and 6) | Production deploys blocked by permission checks; the owner had to come back later | Agree autonomy and deploy rules on day 1 | entrepreneur |
| Keys in the browser (day 11) | The owner expected Claude to set API keys in Google/Vercel; the cloud session couldn't | List which steps need the owner's hands | ops-legal |

### 19.4 QA and process

| Added late (day) | What happened | Day-1 question | Agent |
|---|---|---|---|
| Test-lead guard, throttle, kill switch, `/qa` (days 5, 10, 11) | All built after the WhatsApp ban; "pull the plug" requested on day 10 | Build safety before any sending code | developer / qa |
| Fake numbers (day 5) | The owner said the fake movers' numbers were fine to ping; that was part of the ban | QA refuses made-up numbers even when the owner allows them | qa |
| Ambiguous test data (day 5) | A real-looking lead ("משה") had to be guessed as test | Test-lead naming convention and owner test numbers on day 1 | qa |
| Test-mode copy (day 11) | A QA chat said "providers are receiving your details" and caused alarm | Test messages must say they are tests | qa / design |
| Parallel sessions (days 4, 7, 11) | Sessions overwrote each other's deploys and deleted each other's QA leads | One session deploys at a time; everything through `main` | developer |
| Questions in jargon (days 12 and 13) | The owner answered "I don't understand" to technical questions | Plain-language multiple choice, recommended option first | all |
| Tracker features (day 5) | Step-by-step cards, ranking, done collapsed, private notes box | Set up the tracker artifact this way from day 1 | marketing |
| Tracking retrofit (day 12) | Event renames, click ids, backend-confirmed conversions | Tracking plan approved before code | marketing |
| GA4 ↔ Ads hand-off (day 13) | ChatGPT couldn't verify the GA4 link; the owner went back and forth | Confirm property, Ads account and key events before launch | marketing |
