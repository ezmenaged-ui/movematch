# MoveMatch

Hebrew (RTL) lead-generation site for apartment moves. Three landing-page variants for an A/B/C test share one design system and one lead backend.

Full page map (8 funnels, admin, movers panel, link pages): see **[PAGES.md](PAGES.md)**.

The lead is saved on the first page in every funnel. Short and old addresses (`/a`…`/d`, `/wizard`, `/form`) redirect to the `/photo` version.

**Stack:** Next.js 15 (App Router), plain CSS (Industry design system in `app/ds.css`), Supabase (Postgres and Storage), Vercel.

## How data flows
- The browser calls `POST /api/leads` and `PATCH /api/leads/:id` (Next API routes), and those routes call Supabase RPC functions.
- Leads live in the `movematch.leads` table, in a private schema that the public API cannot read.
- The anon key can only call `mm_create_lead`, `mm_update_lead` (which needs the per-lead `edit_token`) and the admin functions (which need `MM_ADMIN_SECRET`).
- Videos upload straight from the browser to the private bucket `movematch-videos`. Anonymous users can upload but cannot list or read. The admin page reads videos with signed URLs, using a header that carries the admin secret.
- After each lead event, notifications go out in the background through `after()`.

Schema SQL: `supabase/migrations/001_init.sql` (Supabase project `movematch`, ref `yhixrtzidvjfwdynapqp`).

## Lead notifications (`lib/notify.ts`)
Every channel switches on when its environment variables are set. You can turn on several at once.

| Channel | Env vars | Notes |
|---|---|---|
| Gmail | `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NOTIFY_EMAIL` | Requires an App Password (Google account → Security → 2-Step Verification → App passwords) |
| WhatsApp (CallMeBot) | `CALLMEBOT_PHONE`, `CALLMEBOT_APIKEY` | Free personal alerts. Send "I allow callmebot to send me messages" to +34 644 66 32 62 on WhatsApp to receive a key |
| WhatsApp Cloud API | `WA_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_TO`, `WA_TEMPLATE` | Official. Needs Meta Business verification and an approved template |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Free and instant |
| Webhook | `NOTIFY_WEBHOOK_URL` | Make, Zapier, Slack and similar |
| Resend email | `RESEND_API_KEY`, `NOTIFY_EMAIL` | |

Events: `new` fires on every new lead (including partial ones), `complete` fires when the wizard or form is finished, and `video` fires when a video arrives after completion.

## Other env vars
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `MM_ADMIN_SECRET` (must match `movematch.settings.admin_secret`), `ADMIN_PASSWORD`, plus these optional ones:
- `NEXT_PUBLIC_HERO_IMAGE`: for example `/hero.jpg` placed in `public/`
- `NEXT_PUBLIC_GTM_ID` (Tag Manager, GTM-XXXX), `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`. Events pushed to dataLayer: `lead_created`, `wizard_step`, `lead_complete` (each with `funnel`: a/b/c)
- `SITE_URL`: used for the admin link inside notifications

## Local dev
```bash
npm install
npm run dev
```
