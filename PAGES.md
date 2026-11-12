# MoveMatch page map

Domain: `movematch.co.il`. Everything below hangs off that domain.

## 1. Funnels (8): 4 flows × 2 designs

Each funnel starts on its landing page, where the client gives name and phone (the lead is saved right there). Then it continues on the funnel's own follow-up page. **photo** = real-photo design, **art** = illustrated design.

| # | Funnel | Landing page | Follow-up page | What the client does |
|---|---|---|---|---|
| 1 | A · photo | `/a/photo` | none (thank-you on the same page) | Name, phone, city. We call back. |
| 2 | A · art | `/a/art` | none | Same as A, illustrated design. |
| 3 | B · photo | `/b/photo` | `/b/steps` | Step-by-step wizard: from → to → when → video (required). |
| 4 | B · art | `/b/art` | `/b/steps` | Same as B, illustrated design. |
| 5 | C · photo | `/c/photo` | `/c/details` | One page with from, to, when and video. |
| 6 | C · art | `/c/art` | `/c/details` | Same as C, illustrated design. |
| 7 | D · photo | `/d/photo` | `/d/steps` | Wizard with an item list (typed or picked); video optional. |
| 8 | D · art | `/d/art` | `/d/steps` | Same as D, illustrated design. |

**Homepage `/`** shows **D · photo** (same page as `/d/photo`).

Short addresses forward automatically, and tracking parameters (`?utm_…`) are kept:
`/a` → `/a/photo` · `/b` → `/b/photo` · `/c` → `/c/photo` · `/d` → `/d/photo` · old `/wizard` → `/b/photo` · old `/form` → `/c/photo`.

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
| `/movers/calendar` | Weekly calendar, add a move, Google Calendar import and export. |
| `/movers/crew` | Employees, and their day schedule on WhatsApp (Hebrew / Russian). |
| `/movers/profile` | Company name, contact name, logo, password change. |
| `/movers/login` · `/movers/forgot` · `/movers/reset` · `/movers/password` | Sign-in, forgot password, reset link, first-login password. |
| `/movers/join` | **Public** sign-up form for new movers (no login). |

Old `/mover/…` links forward to `/movers/…`.

## Pages opened from links in messages (not landing pages)

| Page | Who opens it | What it is |
|---|---|---|
| `/t/<code>` | Client | Their tender: all offers as they arrive. `/t/<code>/<n>` = one offer, `/all` = all offers, `/continue` = finish missing details. |
| `/l/<token>` | Mover (WhatsApp alert) | Lead details + offer form, without logging in to the panel. |
| `/j/<token>` | Crew member (WhatsApp) | Job sheet: hours, addresses with Waze, items. Add `?lang=ru` for Russian. |
| `/u/<id>` | Client | Film / upload the video from their phone (QR hand-off from desktop). |
| `/o/<token>` | Client | Old offers link; forwards to `/t/<code>`. |

## Legal

`/privacy` · `/terms` · `/accessibility`
