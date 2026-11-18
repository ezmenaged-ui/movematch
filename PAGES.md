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
| 9 | E · photo | `/e/photo` | `/e/steps` | Same wizard as D up to "when", then **one information page**: the client picks a full ~3-minute walk-through video of the apartment **or** the item list (that one is required; the other can be added as an optional extra). Videos under 3 minutes get a warning but can still be sent. Adding the other one too earns ₪50 off. |
| 10 | E · art | `/e/art` | `/e/steps` | Same as E, illustrated design. |

**Homepage `/`** shows **D · photo** (same page as `/d/photo`).

Each uploaded video may be up to 4 minutes long (C, D, E and the phone upload page `/u`). Every video step shows the same filming guide (`VideoGuide` in `components/VideoUploader.tsx`).

**₪50 discount** = the client sent both a video of the apartment and the full item list (`/terms` §11, `/movers/terms` §5). Mover lead pages show a note when a lead qualifies.

**Every address (from and to)** asks: floor, apartment, elevator (yes / stairs only, then size: small / medium / large), **crane possible?** (yes / no / don't know) and **distance from truck parking to the entrance** (up to 10 m, 10–30, 30–60, 60–100, over 100 m / no parking). Stored in `move_from` / `move_to` as `crane` and `parking`.

Short addresses forward automatically, and tracking parameters (`?utm_…`) are kept:
`/a` → `/a/photo` · `/b` → `/b/photo` · `/c` → `/c/photo` · `/d` → `/d/photo` · `/e` → `/e/photo` · old `/wizard` → `/b/photo` · old `/form` → `/c/photo`.

## 2. Admin (1): you

| Page | What it is |
|---|---|
| `/admin` | All leads, mover offers, sending tenders to movers and clients. |
| `/admin/movers` | Mover roster, sign-up approvals, ratings, panel logins (send access by email). |
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
